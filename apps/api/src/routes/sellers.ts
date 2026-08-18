import { Hono } from "hono";
import { SellerSearchSchema, type CautionLevel } from "@mekha/types";

import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import type { ApiEnv } from "../types";

export const sellersRoute = new Hono<ApiEnv>();

sellersRoute.get("/", (context) => context.json({ data: [] }));

const profileFields =
  "id,business_name,business_name_lao,province,logo_url,verification_status" as const;

const phoneCandidates = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const laoDigits = digits.startsWith("856") ? `0${digits.slice(3)}` : digits;
  const internationalDigits = laoDigits.startsWith("0")
    ? `856${laoDigits.slice(1)}`
    : laoDigits;
  return [...new Set([value.trim(), laoDigits, `+${internationalDigits}`])];
};

sellersRoute.get("/search", async (context) => {
  const parsed = SellerSearchSchema.safeParse(context.req.query());
  if (!parsed.success) {
    return apiError(context, 400, "BAD_REQUEST", "Invalid seller search", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const { q, type, limit } = parsed.data;
  const literalPattern = q.replace(/[\\%_]/g, "\\$&");
  const supabase = createSupabaseClient(context.env);
  const baseQuery = () =>
    supabase
      .from("seller_profiles")
      .select(profileFields)
      .neq("verification_status", "suspended")
      .limit(limit);

  const profileResponses =
    type === "shop_name"
      ? await Promise.all([
          baseQuery().ilike("business_name", `%${literalPattern}%`),
          baseQuery().ilike("business_name_lao", `%${literalPattern}%`),
        ])
      : [
          type === "phone"
            ? await baseQuery().in("phone", phoneCandidates(q))
            : await baseQuery().eq("etrust_id", q),
        ];

  const failedProfileQuery = profileResponses.find(({ error }) => error);
  if (failedProfileQuery?.error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "seller_search_failed",
        requestId: context.get("requestId"),
        message: failedProfileQuery.error.message,
      }),
    );
    return apiError(context, 500, "INTERNAL_ERROR", "Seller search failed");
  }

  const profiles = Array.from(
    new Map(
      profileResponses
        .flatMap(({ data }) => data ?? [])
        .map((profile) => [profile.id, profile]),
    ).values(),
  ).slice(0, limit);

  if (profiles.length === 0) return context.json({ data: [] });

  const sellerIds = profiles.map(({ id }) => id);
  const [ordersResponse, risksResponse] = await Promise.all([
    supabase
      .from("orders")
      .select("seller_id")
      .in("seller_id", sellerIds)
      .in("status", ["delivered", "settled"]),
    supabase
      .from("risk_signals")
      .select("seller_id,severity")
      .in("seller_id", sellerIds)
      .eq("is_active", true)
      .eq("status", "active"),
  ]);

  if (ordersResponse.error || risksResponse.error) {
    return apiError(context, 500, "INTERNAL_ERROR", "Seller trust data failed");
  }

  const orderCounts = new Map<string, number>();
  for (const order of ordersResponse.data ?? []) {
    orderCounts.set(
      order.seller_id,
      (orderCounts.get(order.seller_id) ?? 0) + 1,
    );
  }
  const caution = new Map<string, CautionLevel>();
  for (const risk of risksResponse.data ?? []) {
    const next: CautionLevel =
      risk.severity === "critical"
        ? "high"
        : risk.severity === "warning"
          ? "medium"
          : "low";
    const current = caution.get(risk.seller_id);
    if (
      !current ||
      next === "high" ||
      (next === "medium" && current === "low")
    ) {
      caution.set(risk.seller_id, next);
    }
  }

  return context.json({
    data: profiles.map((profile) => ({
      ...profile,
      verified_order_count: orderCounts.get(profile.id) ?? 0,
      caution_level: caution.get(profile.id) ?? "insufficient_information",
    })),
  });
});

const signalMessages = {
  identity_verified: {
    lo: "ຢືນຢັນຕົວຕົນແລ້ວ",
    en: "Identity document verified by the LaoTrust team",
  },
  orders_delivered: {
    lo: "ມີຄຳສັ່ງຊື້ທີ່ສົ່ງສຳເລັດ",
    en: "Has verified completed deliveries",
  },
  new_seller: {
    lo: "ຮ້ານເປີດໃໝ່ — ລົງທະບຽນບໍ່ເຖິງ 30 ມື້",
    en: "New seller — registered less than 30 days ago",
  },
  unverified: {
    lo: "ຜູ້ຂາຍຍັງບໍ່ໄດ້ສົ່ງເອກະສານຢືນຢັນ",
    en: "Seller has not submitted identity documents",
  },
  reported_warning: {
    lo: "ພົບສັນຍານທີ່ຄວນກວດສອບເພີ່ມ",
    en: "A signal requires additional checking before payment",
  },
} as const;

sellersRoute.get("/:id", async (context) => {
  const sellerId = context.req.param("id");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sellerId,
    )
  ) {
    return apiError(context, 404, "NOT_FOUND", "Seller not found");
  }

  const supabase = createSupabaseClient(context.env);
  const profileResponse = await supabase
    .from("seller_profiles")
    .select(
      "id,business_name,business_name_lao,description,province,district,logo_url,verification_status,facebook_url,tiktok_url,created_at",
    )
    .eq("id", sellerId)
    .neq("verification_status", "suspended")
    .maybeSingle();

  if (profileResponse.error) {
    return apiError(context, 500, "INTERNAL_ERROR", "Seller profile failed");
  }
  if (!profileResponse.data) {
    return apiError(context, 404, "NOT_FOUND", "Seller not found");
  }

  const [
    verifiedOrders,
    totalOrders,
    disputes,
    risks,
    verifiedReviews,
    unverifiedReviews,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .in("status", ["delivered", "settled"]),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .eq("status", "disputed"),
    supabase
      .from("risk_signals")
      .select("signal_type,severity")
      .eq("seller_id", sellerId)
      .eq("is_active", true)
      .eq("status", "active"),
    supabase
      .from("reviews")
      .select("id,rating_overall,review_text,verified_transaction,created_at")
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .eq("verified_transaction", true)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("reviews")
      .select("id,rating_overall,review_text,verified_transaction,created_at")
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .eq("verified_transaction", false)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (
    verifiedOrders.error ||
    totalOrders.error ||
    disputes.error ||
    risks.error ||
    verifiedReviews.error ||
    unverifiedReviews.error
  ) {
    return apiError(context, 500, "INTERNAL_ERROR", "Seller trust data failed");
  }

  const verifiedOrderCount = verifiedOrders.count ?? 0;
  const totalOrderCount = totalOrders.count ?? 0;
  const disputeCount = disputes.count ?? 0;
  const ageMs =
    Date.now() - new Date(profileResponse.data.created_at).getTime();
  const monthsActive = Math.max(0, Math.floor(ageMs / 2_629_746_000));
  const trustSignals = [];
  if (profileResponse.data.verification_status === "verified") {
    trustSignals.push({
      type: "positive" as const,
      code: "identity_verified",
      message_lo: signalMessages.identity_verified.lo,
      message_en: signalMessages.identity_verified.en,
    });
  } else {
    trustSignals.push({
      type: "warning" as const,
      code: "unverified",
      message_lo: signalMessages.unverified.lo,
      message_en: signalMessages.unverified.en,
    });
  }
  if (verifiedOrderCount > 0)
    trustSignals.push({
      type: "positive" as const,
      code: "orders_delivered",
      message_lo: `${signalMessages.orders_delivered.lo} ${verifiedOrderCount} ຄຳສັ່ງ`,
      message_en: `${verifiedOrderCount} verified completed deliveries`,
    });
  if (ageMs < 30 * 86_400_000)
    trustSignals.push({
      type: "warning" as const,
      code: "new_seller",
      message_lo: signalMessages.new_seller.lo,
      message_en: signalMessages.new_seller.en,
    });
  for (const risk of risks.data ?? [])
    trustSignals.push({
      type: risk.severity,
      code: risk.signal_type,
      message_lo: signalMessages.reported_warning.lo,
      message_en: signalMessages.reported_warning.en,
    });
  const cautionLevel: CautionLevel = (risks.data ?? []).some(
    ({ severity }) => severity === "critical",
  )
    ? "high"
    : (risks.data ?? []).some(({ severity }) => severity === "warning")
      ? "medium"
      : verifiedOrderCount > 0 ||
          profileResponse.data.verification_status === "verified"
        ? "low"
        : "insufficient_information";

  return context.json({
    data: {
      ...profileResponse.data,
      caution_level: cautionLevel,
      trust_signals: trustSignals,
      verified_order_count: verifiedOrderCount,
      months_active: monthsActive,
      on_time_rate: null,
      dispute_rate: totalOrderCount
        ? Math.round((disputeCount / totalOrderCount) * 1000) / 10
        : null,
      reviews: [
        ...(verifiedReviews.data ?? []),
        ...(unverifiedReviews.data ?? []),
      ].map((review) => ({
        id: review.id,
        rating: review.rating_overall ?? 0,
        review_text: review.review_text,
        verified_transaction: review.verified_transaction,
        created_at: review.created_at,
      })),
    },
  });
});
