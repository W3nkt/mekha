import { Hono } from "hono";
import { z } from "zod";
import { CreateReportSchema } from "@mekha/types";
import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { publicRateLimit } from "../middleware/rateLimit";
import type { ApiEnv } from "../types";
import { classifyReport, summarizeEvidence } from "../services/ai";

export const reportsRoute = new Hono<ApiEnv>();
reportsRoute.use("*", publicRateLimit);

reportsRoute.post("/reports", requireAuth, async (context) => {
  const parsed = CreateReportSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return apiError(context, 400, "BAD_REQUEST", parsed.error.issues[0]?.message ?? "Invalid report");
  const supabase = createSupabaseClient(context.env);
  const reporterId = context.get("user").id;
  const { data: reporter } = await supabase.from("users").select("phone").eq("id", reporterId).maybeSingle();
  const phone = parsed.data.reporter_phone ?? reporter?.phone;
  if (!phone) return apiError(context, 400, "BAD_REQUEST", "Reporter phone is required");
  const sinceDay = new Date(Date.now() - 86_400_000).toISOString();
  const sinceMonth = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [daily, monthly] = await Promise.all([
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("reporter_id", reporterId).gte("created_at", sinceDay),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("reporter_id", reporterId).eq("seller_id", parsed.data.seller_id).gte("created_at", sinceMonth),
  ]);
  if ((daily.count ?? 0) >= 5) return apiError(context, 429, "TOO_MANY_REQUESTS", "You have submitted too many reports today");
  if ((monthly.count ?? 0) >= 3) return apiError(context, 429, "TOO_MANY_REQUESTS", "Too many reports against this seller this month");
  if (parsed.data.order_id) {
    const order = await supabase.from("orders").select("id,seller_id,buyer_id").eq("id", parsed.data.order_id).maybeSingle();
    if (!order.data || order.data.seller_id !== parsed.data.seller_id || (order.data.buyer_id && order.data.buyer_id !== reporterId)) return apiError(context, 400, "BAD_REQUEST", "Order is not linked to this seller or reporter");
  }
  const evidencePaths = [...parsed.data.evidence_paths, ...parsed.data.evidence_urls];
  const previous = await supabase.from("reports").select("id", { count: "exact", head: true }).eq("reporter_id", reporterId).eq("seller_id", parsed.data.seller_id).gte("created_at", sinceDay);
  const ai = await classifyReport(context.env, { category: parsed.data.report_type, description: parsed.data.description, evidence_count: evidencePaths.length, previous_count: previous.count ?? 0 });
  const { data, error } = await supabase.from("reports").insert({ reporter_id: reporterId, reporter_phone: phone, reporter_ip: context.req.header("cf-connecting-ip") ?? null, seller_id: parsed.data.seller_id, order_id: parsed.data.order_id ?? null, report_type: parsed.data.report_type, description: parsed.data.description, evidence_paths: evidencePaths, ai_classification: ai } as never).select("id,created_at,status,report_type,seller_id").single();
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Report submission failed");
  await supabase.from("audit_logs").insert({ actor_id: reporterId, event: "report.created", entity_type: "report", entity_id: data.id, metadata: { seller_id: data.seller_id, ai_classification: ai } });
  return context.json({ data: { ...data, reference: `RPT-${new Date(data.created_at).toISOString().slice(0, 10).replaceAll("-", "")}-${data.id.slice(0, 6).toUpperCase()}` } }, 201);
});

reportsRoute.get("/reports/:id", requireAuth, async (context) => {
  const supabase = createSupabaseClient(context.env);
  const { data, error } = await supabase.from("reports").select("*,seller_profiles(id,business_name,business_name_lao,phone)").eq("id", context.req.param("id")).eq("reporter_id", context.get("user").id).maybeSingle();
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Report lookup failed");
  if (!data) return apiError(context, 404, "NOT_FOUND", "Report not found");
  return context.json({ data });
});

export const reportActionSchema = z.object({ action: z.enum(["dismiss", "substantiate", "escalate"]), resolution: z.string().trim().max(2000).optional() });
export { summarizeEvidence };
