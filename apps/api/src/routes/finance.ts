import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import { matchSettlement, parseSettlementCsv } from "../settlements";
import type { ApiEnv } from "../types";
export const financeRoute = new Hono<ApiEnv>();
financeRoute.post("/settlements", requireAuth, async (context) => {
  const csv = await context.req.text(); const lines = parseSettlementCsv(csv); if (!lines.length) return apiError(context, 400, "BAD_REQUEST", "Settlement CSV is empty");
  const supabase = createSupabaseClient(context.env); const seller = await supabase.from("seller_profiles").select("id").eq("owner_user_id", context.get("user").id).maybeSingle(); if (!seller.data) return apiError(context, 403, "FORBIDDEN", "Seller access required");
  const orders = await supabase.from("orders").select("id,tracking_number,amount").eq("seller_id", seller.data.id); if (orders.error) return apiError(context, 500, "INTERNAL_ERROR", "Orders lookup failed");
  const report = matchSettlement(lines, orders.data ?? []); for (const item of report.filter((line) => line.order_id && ["settled", "returned"].includes(line.action))) await supabase.from("orders").update({ status: item.action }).eq("id", item.order_id!);
  return context.json({ data: report, summary: { matched: report.filter((item) => item.matched && item.action === "settled").length, returned: report.filter((item) => item.action === "returned").length, discrepancies: report.filter((item) => item.action === "discrepancy").length, unmatched: report.filter((item) => item.action === "unmatched").length } });
});
