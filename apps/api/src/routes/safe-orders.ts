import { Hono } from "hono";
import { CreateSafeOrderSchema } from "@mekha/types";

import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { publicRateLimit } from "../middleware/rateLimit";
import type { ApiEnv } from "../types";

export const safeOrdersRoute = new Hono<ApiEnv>();
safeOrdersRoute.use("*", publicRateLimit);

const token = () => crypto.randomUUID().replaceAll("-", "").slice(0, 12);

safeOrdersRoute.post("/", async (context) => {
  const parsed = CreateSafeOrderSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "Invalid Safe Order details", { fields: parsed.error.flatten().fieldErrors });
  const input = parsed.data;
  const supabase = createSupabaseClient(context.env);
  const { data: seller, error: sellerError } = await supabase
    .from("seller_profiles")
    .select("id,business_name,business_name_lao,verification_status")
    .eq("id", input.seller_id)
    .neq("verification_status", "suspended")
    .maybeSingle();
  if (sellerError) return apiError(context, 500, "INTERNAL_ERROR", "Seller lookup failed");
  if (!seller) return apiError(context, 404, "NOT_FOUND", "Seller not found");

  const createdAt = new Date().toISOString();
  const total = input.unit_price * input.quantity;
  const safeUrl = token();
  const terms = {
    product_name: input.product_name,
    unit_price: input.unit_price,
    quantity: input.quantity,
    delivery_fee: input.delivery_fee,
    payment_method: input.payment_method,
    expected_delivery: input.expected_delivery ?? null,
    return_terms: input.return_terms ?? null,
    buyer_name: input.buyer_name,
    buyer_phone: input.buyer_phone,
  };
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      seller_id: seller.id,
      friendly_id: `SAFE-${safeUrl.toUpperCase()}`,
      amount: total,
      delivery_fee: input.delivery_fee,
      payment_method: input.payment_method,
      terms,
      safe_order_url: safeUrl,
      buyer_confirmed_at: createdAt,
      status: "draft",
      note: "Safe Order created by buyer",
    })
    .select("id,friendly_id,safe_order_url,status,created_at,buyer_confirmed_at,seller_confirmed_at")
    .single();
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Safe Order creation failed");
  const item = await supabase.from("order_items").insert({
    order_id: order.id,
    product_name: input.product_name,
    quantity: input.quantity,
    unit_price: input.unit_price,
    line_total: total,
  });
  if (item.error) {
    await supabase.from("orders").delete().eq("id", order.id);
    return apiError(context, 500, "INTERNAL_ERROR", "Safe Order creation failed");
  }
  return context.json({
    data: {
      ...order,
      seller: { id: seller.id, business_name: seller.business_name, business_name_lao: seller.business_name_lao },
      share_url: `${new URL(context.req.url).origin}/order/${order.safe_order_url}`,
    },
  }, 201);
});

safeOrdersRoute.get("/:safeUrl", async (context) => {
  const supabase = createSupabaseClient(context.env);
  const { data, error } = await supabase
    .from("orders")
    .select("id,friendly_id,safe_order_url,status,amount,delivery_fee,payment_method,terms,created_at,buyer_confirmed_at,seller_confirmed_at,seller_profiles(id,business_name,business_name_lao,province,verification_status),order_items(product_name,quantity,unit_price,line_total)")
    .eq("safe_order_url", context.req.param("safeUrl"))
    .maybeSingle();
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Safe Order lookup failed");
  if (!data || data.seller_profiles?.verification_status === "suspended") return apiError(context, 404, "NOT_FOUND", "Safe Order not found");
  return context.json({ data });
});

safeOrdersRoute.post("/:id/confirm", requireAuth, async (context) => {
  const supabase = createSupabaseClient(context.env);
  const { data: seller } = await supabase.from("seller_profiles").select("id").eq("owner_user_id", context.get("user").id).maybeSingle();
  if (!seller) return apiError(context, 403, "FORBIDDEN", "Seller profile required");
  const current = await supabase.from("orders").select("id,seller_id,seller_confirmed_at,status").eq("id", context.req.param("id")).eq("seller_id", seller.id).maybeSingle();
  if (current.error) return apiError(context, 500, "INTERNAL_ERROR", "Safe Order lookup failed");
  if (!current.data) return apiError(context, 404, "NOT_FOUND", "Safe Order not found");
  if (current.data.seller_confirmed_at) return apiError(context, 409, "CONFLICT", "Safe Order terms are already locked");
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("orders").update({ seller_confirmed_at: now, status: "confirmed" }).eq("id", current.data.id).select("id,status,buyer_confirmed_at,seller_confirmed_at").single();
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Safe Order confirmation failed");
  return context.json({ data });
});

safeOrdersRoute.post("/:id/request-change", requireAuth, async (context) => {
  const body = await context.req.json().catch(() => ({})) as { note?: unknown };
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "Seller requested a change";
  const supabase = createSupabaseClient(context.env);
  const { data: seller } = await supabase.from("seller_profiles").select("id").eq("owner_user_id", context.get("user").id).maybeSingle();
  if (!seller) return apiError(context, 403, "FORBIDDEN", "Seller profile required");
  const { data, error } = await supabase.from("orders").update({ note, status: "draft" }).eq("id", context.req.param("id")).eq("seller_id", seller.id).is("seller_confirmed_at", null).select("id,status,note").single();
  if (error || !data) return apiError(context, 404, "NOT_FOUND", "Safe Order not found");
  return context.json({ data });
});
