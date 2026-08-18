import { Hono } from "hono";

import { requireAuth } from "../middleware/auth";
import { authenticatedRateLimit } from "../middleware/rateLimit";
import type { ApiEnv } from "../types";
import { getCourierAdapter } from "../couriers";

export const ordersRoute = new Hono<ApiEnv>();

ordersRoute.use("*", requireAuth, authenticatedRateLimit);
ordersRoute.get("/", (context) => context.json({ data: [] }));
ordersRoute.post("/labels", async (context) => {
  const body = await context.req.json().catch(() => null) as { order_ids?: string[]; format?: "thermal" | "a4" } | null;
  if (!Array.isArray(body?.order_ids) || body.order_ids.length === 0 || body.order_ids.length > 30)
    return context.json({ error: "order_ids must contain 1-30 orders", code: "BAD_REQUEST" }, 400);
  const seller = context.get("user");
  const supabase = (await import("../lib/supabase")).createSupabaseClient(context.env);
  const orders = await supabase.from("orders").select("*").in("id", body.order_ids);
  if (orders.error) return context.json({ error: "Orders lookup failed", code: "INTERNAL_ERROR" }, 500);
  const adapter = getCourierAdapter(context.env);
  const shipments = await Promise.all((orders.data ?? []).map(async (order) => {
    const result = await adapter.createShipment({ ...order, shipping_address: (order.delivery_address ?? {}) as never });
    await supabase.from("courier_labels").insert({ order_id: order.id, courier: adapter.name, tracking_number: result.tracking_number, status: "pending" });
    await supabase.from("orders").update({ status: "shipped", tracking_number: result.tracking_number }).eq("id", order.id);
    return { order_id: order.id, tracking: result.tracking_number, pdf_base64: result.label_pdf_base64 };
  }));
  return context.json({ format: body.format ?? "thermal", data: shipments, requested_by: seller.id });
});
