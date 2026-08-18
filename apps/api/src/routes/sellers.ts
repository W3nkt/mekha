import { Hono } from "hono";
import {
  CreateSellerSchema,
  SellerSearchSchema,
  type CautionLevel,
} from "@mekha/types";
import { computeTrustProfile } from "@mekha/utils";

import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import type { ApiEnv } from "../types";
import { requireAuth } from "../middleware/auth";

export const sellersRoute = new Hono<ApiEnv>();

sellersRoute.get("/", (context) => context.json({ data: [] }));

sellersRoute.post("/", requireAuth, async (context) => {
  const parsed = CreateSellerSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ຂໍ້ມູນຮ້ານຄ້າບໍ່ຖືກຕ້ອງ", {
      fields: parsed.error.flatten().fieldErrors,
    });
  const user = context.get("user");
  if (user.phone !== parsed.data.phone)
    return apiError(
      context,
      403,
      "PHONE_MISMATCH",
      "ເບີໂທບໍ່ກົງກັບເບີທີ່ຢືນຢັນ",
    );
  const supabase = createSupabaseClient(context.env);
  const existing = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (existing.error)
    return apiError(context, 500, "INTERNAL_ERROR", "ບໍ່ສາມາດກວດສອບບັນຊີໄດ້");
  if (existing.data)
    return apiError(context, 409, "SELLER_EXISTS", "ບັນຊີນີ້ມີຮ້ານຄ້າແລ້ວ");
  const { data: location } = await supabase
    .from("lao_districts")
    .select("id,province_id")
    .eq("id", parsed.data.district)
    .eq("province_id", parsed.data.province)
    .maybeSingle();
  if (!location)
    return apiError(
      context,
      400,
      "INVALID_LOCATION",
      "ແຂວງ ຫຼື ເມືອງບໍ່ຖືກຕ້ອງ",
    );
  const upsertUser = await supabase
    .from("users")
    .upsert(
      { id: user.id, phone: user.phone, role: "seller" },
      { onConflict: "id" },
    );
  if (upsertUser.error)
    return apiError(context, 500, "INTERNAL_ERROR", "ບໍ່ສາມາດສ້າງໂປຣໄຟລ໌ໄດ້");
  const { data: seller, error } = await supabase
    .from("seller_profiles")
    .insert({
      ...parsed.data,
      business_name: parsed.data.business_name || parsed.data.business_name_lao,
      owner_user_id: user.id,
      verification_status: "unverified",
    })
    .select()
    .single();
  if (error)
    return apiError(
      context,
      error.code === "23505" ? 409 : 500,
      error.code === "23505" ? "SELLER_EXISTS" : "INTERNAL_ERROR",
      error.code === "23505"
        ? "ບັນຊີນີ້ມີຮ້ານຄ້າແລ້ວ"
        : "ບໍ່ສາມາດສ້າງຮ້ານຄ້າໄດ້",
    );
  const related = await Promise.all([
    supabase
      .from("subscriptions")
      .insert({ seller_id: seller.id, plan: "free", status: "active" }),
    supabase.from("audit_logs").insert({
      actor_id: user.id,
      event: "seller.created",
      entity_type: "seller_profile",
      entity_id: seller.id,
      metadata: { source: "phone_registration" },
    }),
  ]);
  if (related.some(({ error: relatedError }) => relatedError)) {
    await supabase.from("seller_profiles").delete().eq("id", seller.id);
    console.error(
      JSON.stringify({
        event: "seller_registration_related_write_failed",
        sellerId: seller.id,
      }),
    );
    return apiError(context, 500, "INTERNAL_ERROR", "ບໍ່ສາມາດສ້າງຮ້ານຄ້າໄດ້");
  }
  return context.json({ data: seller }, 201);
});

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
    .select("*")
    .eq("id", sellerId)
    .neq("verification_status", "suspended")
    .maybeSingle();

  if (profileResponse.error) {
    return apiError(context, 500, "INTERNAL_ERROR", "Seller profile failed");
  }
  if (!profileResponse.data) {
    return apiError(context, 404, "NOT_FOUND", "Seller not found");
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [
    verifications,
    identifiers,
    verifiedOrders,
    totalOrders,
    disputes,
    ratings,
    unresolvedReports,
    totalReports,
    risks,
    profileChanges,
    verifiedReviews,
    unverifiedReviews,
  ] = await Promise.all([
    supabase.from("seller_verifications").select("*").eq("seller_id", sellerId),
    supabase.from("seller_identifiers").select("*").eq("seller_id", sellerId),
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
      .from("reviews")
      .select("rating_overall")
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .eq("verified_transaction", true)
      .not("rating_overall", "is", null)
      .limit(1000),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .in("status", ["pending", "under_review"]),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId),
    supabase
      .from("risk_signals")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("is_active", true)
      .eq("status", "active"),
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", "seller_profile")
      .eq("entity_id", sellerId)
      .gte("created_at", sevenDaysAgo),
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
    verifications.error ||
    identifiers.error ||
    verifiedOrders.error ||
    totalOrders.error ||
    disputes.error ||
    ratings.error ||
    unresolvedReports.error ||
    totalReports.error ||
    risks.error ||
    profileChanges.error ||
    verifiedReviews.error ||
    unverifiedReviews.error
  ) {
    return apiError(context, 500, "INTERNAL_ERROR", "Seller trust data failed");
  }

  const reviewRatings = (ratings.data ?? []).flatMap(({ rating_overall }) =>
    rating_overall === null ? [] : [rating_overall],
  );
  const engine = computeTrustProfile({
    seller: profileResponse.data,
    verifications: verifications.data ?? [],
    identifiers: identifiers.data ?? [],
    orderStats: {
      total: totalOrders.count ?? 0,
      verified: verifiedOrders.count ?? 0,
      dispute_count: disputes.count ?? 0,
      on_time_count: null,
    },
    reviewStats: {
      count: reviewRatings.length,
      avg_rating: reviewRatings.length
        ? reviewRatings.reduce((sum, rating) => sum + rating, 0) /
          reviewRatings.length
        : 0,
    },
    reportStats: {
      unresolved: unresolvedReports.count ?? 0,
      total: totalReports.count ?? 0,
    },
    riskSignals: risks.data ?? [],
    profileChangeCount: profileChanges.count ?? 0,
    evaluatedAt: new Date().toISOString(),
  });

  const {
    id,
    business_name,
    business_name_lao,
    description,
    province,
    district,
    logo_url,
    facebook_url,
    tiktok_url,
    created_at,
  } = profileResponse.data;

  return context.json({
    data: {
      id,
      business_name,
      business_name_lao,
      description,
      province,
      district,
      logo_url,
      facebook_url,
      tiktok_url,
      created_at,
      verification_status: engine.verification_status,
      caution_level: engine.caution_level,
      trust_signals: engine.signals,
      ...engine.stats,
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
