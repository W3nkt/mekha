import { Hono, type Context } from "hono";
import { z } from "zod";
import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { authenticatedRateLimit } from "../middleware/rateLimit";
import type { ApiEnv } from "../types";

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
  const current = await supabase
    .from("seller_verifications")
    .select("id,seller_id,verification_type,status")
    .eq("id", id)
    .maybeSingle();
  if (!current.data)
    return apiError(context, 404, "NOT_FOUND", "Verification not found");
  const status =
    action === "approve"
      ? "approved"
      : action === "reject"
        ? "rejected"
        : "additional_info_required";
  const update = await supabase
    .from("seller_verifications")
    .update({
      status,
      reviewer_notes: parsed.data.reviewer_notes ?? null,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (update.error)
    return apiError(context, 500, "INTERNAL_ERROR", "Decision failed");
  if (!update.data)
    return apiError(
      context,
      409,
      "CONFLICT",
      "Verification was already reviewed",
    );
  if (action === "approve") {
    const approved = await supabase
      .from("seller_verifications")
      .select("verification_type")
      .eq("seller_id", current.data.seller_id)
      .eq("status", "approved");
    const types = new Set(
      (approved.data ?? []).map((row) => row.verification_type),
    );
    const profileStatus =
      types.has("identity") && types.has("business_registration")
        ? "verified"
        : types.has("identity")
          ? "partially_verified"
          : "unverified";
    await supabase
      .from("seller_profiles")
      .update({ verification_status: profileStatus })
      .eq("id", current.data.seller_id);
    const identifierType =
      current.data.verification_type === "identity"
        ? "phone"
        : current.data.verification_type === "business_registration"
          ? "business_registration"
          : current.data.verification_type === "social_account"
            ? "social_account"
            : current.data.verification_type === "payment_identity"
              ? "payment_identity"
              : "e_trust";
    await supabase
      .from("seller_identifiers")
      .update({ verification_status: "verified" })
      .eq("seller_id", current.data.seller_id)
      .eq("type", identifierType);
  }
  const reason = parsed.data.reviewer_notes ?? null;
  const writes = await Promise.all([
    supabase.from("moderation_actions").insert({
      admin_user_id: adminId,
      entity_type: "verification",
      entity_id: id,
      action,
      reason,
      metadata: { seller_id: current.data.seller_id },
    }),
    supabase.from("audit_logs").insert({
      actor_id: adminId,
      event: `admin.verification_${action}`,
      entity_type: "seller_verification",
      entity_id: id,
      metadata: { seller_id: current.data.seller_id, reason },
    }),
  ]);
  if (writes.some((result) => result.error))
    return apiError(context, 500, "INTERNAL_ERROR", "Audit trail failed");
  return context.json({ data: { id, status } });
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
  const adminId = context.get("user").id;
  const updated = await supabase
    .from("seller_profiles")
    .update({ verification_status: "suspended" })
    .eq("id", sellerId);
  if (updated.error)
    return apiError(context, 500, "INTERNAL_ERROR", "Suspend failed");
  await Promise.all([
    supabase.from("moderation_actions").insert({
      admin_user_id: adminId,
      entity_type: "seller",
      entity_id: sellerId,
      action: "suspend",
      reason: parsed.data.reviewer_notes,
    }),
    supabase.from("audit_logs").insert({
      actor_id: adminId,
      event: "admin.seller_suspended",
      entity_type: "seller_profile",
      entity_id: sellerId,
      metadata: { reason: parsed.data.reviewer_notes },
    }),
  ]);
  return context.json({ data: { id: sellerId, status: "suspended" } });
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
