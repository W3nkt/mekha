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
