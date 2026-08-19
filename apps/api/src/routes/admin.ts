import { Hono, type Context } from "hono";
import { z } from "zod";
import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { authenticatedRateLimit } from "../middleware/rateLimit";
import type { ApiEnv } from "../types";
import { reportActionSchema } from "./reports";

export const adminRoute = new Hono<ApiEnv>();
adminRoute.use(
  "*",
  requireAuth,
  authenticatedRateLimit,
  async (context, next) => {
    const supabase = createSupabaseClient(context.env);
    const { data } = await supabase
      .from("users")
      .select("role,status")
      .eq("id", context.get("user").id)
      .maybeSingle();
    if (data?.role !== "admin" || data.status !== "active")
      return apiError(context, 403, "FORBIDDEN", "Admin access required");
    await next();
  },
);

const querySchema = z.object({
  status: z
    .enum(["pending", "approved", "rejected", "additional_info_required"])
    .default("pending"),
  type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
const notesSchema = z.object({
  reviewer_notes: z.string().trim().max(1000).optional(),
});
const requiredNotesSchema = z.object({
  reviewer_notes: z.string().trim().min(1).max(1000),
});

adminRoute.get("/verifications", async (context) => {
  const parsed = querySchema.safeParse(context.req.query());
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "Invalid filters");
  const { page, status, type, from, to } = parsed.data;
  const start = (page - 1) * 20;
  const supabase = createSupabaseClient(context.env);
  let query = supabase
    .from("seller_verifications")
    .select(
      "id,seller_id,verification_type,status,created_at,seller_profiles(business_name,business_name_lao,phone)",
      { count: "exact" },
    )
    .eq("status", status)
    .order("created_at", { ascending: true })
    .range(start, start + 19);
  if (type) query = query.eq("verification_type", type);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  const { data, count, error } = await query;
  if (error)
    return apiError(
      context,
      500,
      "INTERNAL_ERROR",
      "Verification queue failed",
    );
  return context.json({ data, page, page_size: 20, total: count ?? 0 });
});

adminRoute.get("/verifications/:id", async (context) => {
  const supabase = createSupabaseClient(context.env);
  const { data, error } = await supabase
    .from("seller_verifications")
    .select(
      "*,seller_profiles(id,business_name,business_name_lao,phone,created_at,verification_status)",
    )
    .eq("id", context.req.param("id"))
    .maybeSingle();
  if (error)
    return apiError(
      context,
      500,
      "INTERNAL_ERROR",
      "Verification detail failed",
    );
  if (!data)
    return apiError(context, 404, "NOT_FOUND", "Verification not found");
  const path = data.document_paths?.[0];
  const signed = path
    ? await supabase.storage
        .from("verification-docs")
        .createSignedUrl(path, 300, { download: false })
    : null;
  if (signed?.error)
    return apiError(context, 500, "INTERNAL_ERROR", "Document link failed");
  const previous = await supabase
    .from("seller_verifications")
    .select("id,verification_type,status,reviewer_notes,created_at,reviewed_at")
    .eq("seller_id", data.seller_id)
    .neq("id", data.id)
    .order("created_at", { ascending: false })
    .limit(20);
  return context.json({
    data: {
      ...data,
      document_url: signed?.data.signedUrl ?? null,
      previous: previous.data ?? [],
    },
  });
});

async function decide(
  context: Context<ApiEnv>,
  action: "approve" | "reject" | "request_info",
) {
  const body = await context.req.json().catch(() => null);
  const schema = action === "approve" ? notesSchema : requiredNotesSchema;
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "Reason required");
  const supabase = createSupabaseClient(context.env);
  const id = context.req.param("id") ?? "";
  const adminId = context.get("user").id;
  const { data, error } = await supabase.rpc("admin_decide_verification", {
    p_verification_id: id,
    p_action: action,
    p_admin_id: adminId,
    p_reviewer_notes: parsed.data.reviewer_notes ?? null,
  });
  if (error) {
    const status =
      error.code === "P0002" ? 404 : error.code === "40001" ? 409 : 400;
    return apiError(
      context,
      status,
      status === 404
        ? "NOT_FOUND"
        : status === 409
          ? "CONFLICT"
          : "BAD_REQUEST",
      error.message,
    );
  }
  return context.json({ data });
}

adminRoute.post("/verifications/:id/approve", (context) =>
  decide(context, "approve"),
);
adminRoute.post("/verifications/:id/reject", (context) =>
  decide(context, "reject"),
);
adminRoute.post("/verifications/:id/request-info", (context) =>
  decide(context, "request_info"),
);

adminRoute.post("/sellers/:id/suspend", async (context) => {
  const parsed = requiredNotesSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "Reason required");
  const supabase = createSupabaseClient(context.env);
  const sellerId = context.req.param("id") ?? "";
  const { data, error } = await supabase.rpc("admin_suspend_seller", {
    p_seller_id: sellerId,
    p_admin_id: context.get("user").id,
    p_reason: parsed.data.reviewer_notes,
  });
  if (error)
    return apiError(
      context,
      error.code === "P0002" ? 404 : 400,
      error.code === "P0002" ? "NOT_FOUND" : "BAD_REQUEST",
      error.message,
    );
  return context.json({ data });
});

adminRoute.get("/audit-logs", async (context) => {
  const supabase = createSupabaseClient(context.env);
  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      "id,actor_id,event,entity_type,entity_id,metadata,created_at,users(phone)",
    )
    .like("event", "admin.%")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "Audit log failed");
  return context.json({ data });
});

const reportQuerySchema = z.object({
  status: z.enum(["pending", "under_review", "resolved", "dismissed"]).default("pending"),
  report_type: z.string().optional(),
  seller_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

adminRoute.get("/reports", async (context) => {
  const parsed = reportQuerySchema.safeParse(context.req.query());
  if (!parsed.success) return apiError(context, 400, "BAD_REQUEST", "Invalid report filters");
  const { status, report_type, seller_id, page } = parsed.data;
  let query = createSupabaseClient(context.env).from("reports").select("id,seller_id,order_id,report_type,description,evidence_paths,status,ai_classification,created_at,seller_profiles(business_name,business_name_lao)", { count: "exact" }).eq("status", status).order("created_at", { ascending: true }).range((page - 1) * 20, page * 20 - 1);
  if (report_type) query = query.eq("report_type", report_type);
  if (seller_id) query = query.eq("seller_id", seller_id);
  const { data, count, error } = await query;
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Report queue failed");
  return context.json({ data: data ?? [], page, page_size: 20, total: count ?? 0 });
});

adminRoute.get("/reports/:id", async (context) => {
  const supabase = createSupabaseClient(context.env);
  const { data, error } = await supabase.from("reports").select("*,seller_profiles(*),users!reports_reporter_id_fkey(phone)").eq("id", context.req.param("id")).maybeSingle();
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Report detail failed");
  if (!data) return apiError(context, 404, "NOT_FOUND", "Report not found");
  return context.json({ data });
});

adminRoute.post("/reports/:id/resolve", async (context) => {
  const parsed = reportActionSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return apiError(context, 400, "BAD_REQUEST", "Invalid moderation action");
  const supabase = createSupabaseClient(context.env);
  const id = context.req.param("id");
  const report = await supabase.from("reports").select("id,seller_id,report_type,status").eq("id", id).maybeSingle();
  if (!report.data) return apiError(context, 404, "NOT_FOUND", "Report not found");
  const status = parsed.data.action === "escalate" ? "under_review" : parsed.data.action === "dismiss" ? "dismissed" : "resolved";
  const updated = await supabase.from("reports").update({ status } as never).eq("id", id).select("id,status,seller_id").single();
  if (updated.error) return apiError(context, 500, "INTERNAL_ERROR", "Report update failed");
  if (parsed.data.action === "substantiate") {
    await supabase.from("risk_signals").insert({ seller_id: report.data.seller_id, signal_type: "MULTIPLE_REPORTS", severity: "critical", source_type: "report", evidence_id: report.data.id } as never);
  }
  await supabase.from("audit_logs").insert({ actor_id: context.get("user").id, event: `admin.report_${parsed.data.action}`, entity_type: "report", entity_id: id, metadata: { resolution: parsed.data.resolution ?? null } });
  return context.json({ data: updated.data });
});
