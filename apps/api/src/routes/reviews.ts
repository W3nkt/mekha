import { Hono } from "hono";
import { CreateReviewSchema } from "@mekha/types";

import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { publicRateLimit } from "../middleware/rateLimit";
import type { ApiEnv } from "../types";

export const reviewsRoute = new Hono<ApiEnv>();
reviewsRoute.use("*", publicRateLimit);

reviewsRoute.get("/sellers/:id/reviews", async (context) => {
  const sellerId = context.req.param("id");
  const verified = context.req.query("verified");
  const page = Math.max(1, Number(context.req.query("page") ?? "1") || 1);
  const limit = 20;
  let query = createSupabaseClient(context.env)
    .from("reviews")
    .select("id,seller_id,order_id,rating_overall,rating_description,rating_delivery,rating_communication,review_text,verified_transaction,created_at", { count: "exact" })
    .eq("seller_id", sellerId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (verified === "true") query = query.eq("verified_transaction", true);
  if (verified === "false") query = query.eq("verified_transaction", false);
  const { data, count, error } = await query;
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Reviews unavailable");
  return context.json({ data, total: count ?? 0, page, page_size: limit });
});

reviewsRoute.post("/reviews", requireAuth, async (context) => {
  const parsed = CreateReviewSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return apiError(context, 400, "BAD_REQUEST", "Invalid review", { fields: parsed.error.flatten().fieldErrors });
  const input = parsed.data;
  const user = context.get("user");
  const supabase = createSupabaseClient(context.env);
  let sellerId = input.seller_id ?? "";
  let verified = false;
  let order: { id: string; seller_id: string; buyer_id: string | null; seller_confirmed_at: string | null; status: string } | null = null;
  if (input.order_id) {
    const response = await supabase.from("orders").select("id,seller_id,buyer_id,seller_confirmed_at,status").eq("id", input.order_id).maybeSingle();
    if (response.error) return apiError(context, 500, "INTERNAL_ERROR", "Order lookup failed");
    order = response.data;
    if (!order) return apiError(context, 404, "NOT_FOUND", "Order not found");
    sellerId = order.seller_id;
    if (order.buyer_id && order.buyer_id !== user.id) return apiError(context, 403, "FORBIDDEN", "Only the buyer can review this order");
    const seller = await supabase.from("seller_profiles").select("owner_user_id").eq("id", sellerId).maybeSingle();
    if (seller.data?.owner_user_id === user.id) return apiError(context, 403, "FORBIDDEN", "Seller cannot review their own order");
    verified = Boolean(order.seller_confirmed_at && ["delivered", "settled"].includes(order.status));
    const existing = await supabase.from("reviews").select("id").eq("buyer_id", user.id).eq("order_id", order.id).maybeSingle();
    if (existing.error) return apiError(context, 500, "INTERNAL_ERROR", "Review lookup failed");
    if (existing.data) return apiError(context, 409, "CONFLICT", "You already reviewed this order");
  }
  if (!sellerId) return apiError(context, 400, "BAD_REQUEST", "Seller is required");
  const recent = await supabase.from("reviews").select("id", { count: "exact", head: true }).eq("buyer_id", user.id).gte("created_at", new Date(Date.now() - 60 * 60_000).toISOString());
  if ((recent.count ?? 0) >= 10) return apiError(context, 429, "TOO_MANY_REQUESTS", "Too many reviews");
  const { data, error } = await supabase.from("reviews").insert({ buyer_id: user.id, seller_id: sellerId, order_id: input.order_id ?? null, rating_overall: input.rating, rating_description: input.rating_description ?? null, rating_delivery: input.rating_delivery ?? null, rating_communication: input.rating_communication ?? null, review_text: input.comment ?? null, verified_transaction: verified, status: "active" }).select("id,seller_id,order_id,rating_overall,review_text,verified_transaction,created_at").single();
  if (error) return apiError(context, error.code === "23505" ? 409 : 500, error.code === "23505" ? "CONFLICT" : "INTERNAL_ERROR", "Review creation failed");
  await supabase.from("audit_logs").insert({ actor_id: user.id, event: "review.created", entity_type: "review", entity_id: data.id, metadata: { seller_id: sellerId, order_id: input.order_id ?? null, verified_transaction: verified } });
  return context.json({ data }, 201);
});

reviewsRoute.delete("/reviews/:id", requireAuth, async (context) => {
  const supabase = createSupabaseClient(context.env);
  const review = await supabase.from("reviews").select("id,seller_id").eq("id", context.req.param("id")).maybeSingle();
  if (review.error) return apiError(context, 500, "INTERNAL_ERROR", "Review lookup failed");
  if (!review.data) return apiError(context, 404, "NOT_FOUND", "Review not found");
  const seller = await supabase.from("seller_profiles").select("owner_user_id").eq("id", review.data.seller_id).maybeSingle();
  if (seller.data?.owner_user_id !== context.get("user").id) return apiError(context, 403, "FORBIDDEN", "Only the seller can flag this review");
  const { data, error } = await supabase.from("reviews").update({ status: "hidden" }).eq("id", review.data.id).select("id,status").single();
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Review moderation failed");
  await supabase.from("audit_logs").insert({ actor_id: context.get("user").id, event: "review.hidden", entity_type: "review", entity_id: review.data.id, metadata: {} });
  return context.json({ data });
});
