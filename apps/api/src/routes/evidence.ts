import { Hono, type Context } from "hono";
import { z } from "zod";

import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import { publicRateLimit } from "../middleware/rateLimit";
import { requireAuth } from "../middleware/auth";
import type { ApiEnv } from "../types";

export const evidenceRoute = new Hono<ApiEnv>();
evidenceRoute.use("*", publicRateLimit);

const evidenceType = z.enum(["payment_receipt", "delivery_photo", "screenshot", "invoice", "document", "other"]);
const uploadSchema = z.object({ filename: z.string().trim().min(1).max(180), mime_type: z.enum(["image/jpeg", "image/png", "application/pdf"]) });
const confirmSchema = z.object({ type: evidenceType, storage_path: z.string().min(1), file_hash: z.string().regex(/^[a-f0-9]{64}$/), mime_type: z.string(), file_size_bytes: z.number().int().nonnegative().max(10 * 1024 * 1024) });
const orderId = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

const ownedOrPublicOrder = async (context: Context<ApiEnv>, id: string) => {
  const supabase = createSupabaseClient(context.env);
  return { supabase, result: await supabase.from("orders").select("id,seller_id,amount,delivery_fee,terms,status,created_at,buyer_confirmed_at,seller_confirmed_at,friendly_id").eq("id", id).maybeSingle() };
};

evidenceRoute.post("/:id/evidence/upload-url", async (context) => {
  const id = context.req.param("id");
  if (!orderId(id)) return apiError(context, 404, "NOT_FOUND", "Order not found");
  const parsed = uploadSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return apiError(context, 400, "BAD_REQUEST", "Invalid evidence file");
  const { supabase, result } = await ownedOrPublicOrder(context, id);
  if (result.error) return apiError(context, 500, "INTERNAL_ERROR", "Order lookup failed");
  if (!result.data) return apiError(context, 404, "NOT_FOUND", "Order not found");
  const extension = parsed.data.mime_type === "application/pdf" ? "pdf" : parsed.data.mime_type === "image/png" ? "png" : "jpg";
  const path = `${id}/${crypto.randomUUID()}-${parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}.${extension}`;
  const signed = await supabase.storage.from("order-evidence").createSignedUploadUrl(path);
  if (signed.error) return apiError(context, 500, "INTERNAL_ERROR", "Evidence upload URL failed");
  return context.json({ path, token: signed.data.token, upload_url: signed.data.signedUrl, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() });
});

evidenceRoute.post("/:id/evidence", async (context) => {
  const id = context.req.param("id");
  if (!orderId(id)) return apiError(context, 404, "NOT_FOUND", "Order not found");
  const parsed = confirmSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return apiError(context, 400, "BAD_REQUEST", "Invalid evidence confirmation");
  if (!parsed.data.storage_path.startsWith(`${id}/`)) return apiError(context, 400, "BAD_REQUEST", "Evidence path does not match order");
  const { supabase, result } = await ownedOrPublicOrder(context, id);
  if (result.error) return apiError(context, 500, "INTERNAL_ERROR", "Order lookup failed");
  if (!result.data) return apiError(context, 404, "NOT_FOUND", "Order not found");
  const downloaded = await supabase.storage.from("order-evidence").download(parsed.data.storage_path);
  if (downloaded.error || !downloaded.data) return apiError(context, 400, "BAD_REQUEST", "Uploaded evidence was not found");
  const digest = await crypto.subtle.digest("SHA-256", await downloaded.data.arrayBuffer());
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== parsed.data.file_hash) {
    await supabase.storage.from("order-evidence").remove([parsed.data.storage_path]);
    return apiError(context, 422, "UNPROCESSABLE_ENTITY", "Evidence hash mismatch");
  }
  const uploadedBy = context.get("user")?.id ?? null;
  const { data, error } = await supabase.from("order_evidence").insert({ order_id: id, type: parsed.data.type, storage_path: parsed.data.storage_path, file_hash: hash, file_size_bytes: downloaded.data.size, mime_type: parsed.data.mime_type, uploaded_by: uploadedBy }).select("id,order_id,type,storage_path,file_hash,file_size_bytes,mime_type,uploaded_by,created_at").single();
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Evidence record failed");
  const audit = await supabase.from("audit_logs").insert({ actor_id: uploadedBy, event: "order.evidence_uploaded", entity_type: "order_evidence", entity_id: data.id, metadata: { order_id: id, type: data.type, file_hash: hash } });
  if (audit.error) return apiError(context, 500, "INTERNAL_ERROR", "Evidence audit failed");
  return context.json({ data }, 201);
});

evidenceRoute.get("/:id/evidence", async (context) => {
  const id = context.req.param("id");
  if (!orderId(id)) return apiError(context, 404, "NOT_FOUND", "Order not found");
  const supabase = createSupabaseClient(context.env);
  const { data, error } = await supabase.from("order_evidence").select("id,order_id,type,file_hash,file_size_bytes,mime_type,uploaded_by,created_at,storage_path").eq("order_id", id).order("created_at", { ascending: true });
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Evidence lookup failed");
  const signed = await Promise.all((data ?? []).map(async (item) => ({ ...item, view_url: (await supabase.storage.from("order-evidence").createSignedUrl(item.storage_path, 1800)).data?.signedUrl ?? null })));
  return context.json({ data: signed });
});

const pdfEscape = (value: string) => value.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7E]/g, "?");
export const evidencePdf = (lines: string[]) => {
  const content = `BT /F1 11 Tf 48 760 Td ${lines.map((line, index) => `${index ? "0 -16 Td " : ""}(${pdfEscape(line)}) Tj`).join(" ")} ET`;
  const objects = [`<< /Type /Catalog /Pages 2 0 R >>`, `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let output = "%PDF-1.4\n"; const offsets = [0];
  for (let index = 0; index < objects.length; index++) { offsets.push(output.length); output += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`; }
  const xref = output.length; output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`; for (let index = 1; index < offsets.length; index++) output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`; output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(output);
};

export const disputesRoute = new Hono<ApiEnv>();
disputesRoute.get("/:id/export", requireAuth, async (context) => {
  const supabase = createSupabaseClient(context.env);
  const dispute = await supabase.from("disputes").select("id,order_id,status,summary,created_at,orders(friendly_id,amount,delivery_fee,status,created_at,buyer_confirmed_at,seller_confirmed_at)").eq("id", context.req.param("id")).maybeSingle();
  if (dispute.error) return apiError(context, 500, "INTERNAL_ERROR", "Dispute lookup failed");
  if (!dispute.data) return apiError(context, 404, "NOT_FOUND", "Dispute not found");
  const evidence = await supabase.from("order_evidence").select("type,file_hash,uploaded_by,created_at").eq("order_id", dispute.data.order_id).order("created_at", { ascending: true });
  if (evidence.error) return apiError(context, 500, "INTERNAL_ERROR", "Evidence lookup failed");
  const order = dispute.data.orders;
  const lines = ["Transaction Evidence Report", `Dispute: ${dispute.data.id}`, `Order: ${order?.friendly_id ?? dispute.data.order_id}`, `Status: ${dispute.data.status}`, `Amount: ${order?.amount ?? 0}`, `Delivery fee: ${order?.delivery_fee ?? 0}`, `Created: ${order?.created_at ?? ""}`, `Buyer confirmed: ${order?.buyer_confirmed_at ?? ""}`, `Seller confirmed: ${order?.seller_confirmed_at ?? ""}`, `Summary: ${dispute.data.summary ?? ""}`, "Evidence:", ...(evidence.data ?? []).map((item) => `- ${item.type} | ${item.file_hash} | ${item.created_at}`)];
  return new Response(evidencePdf(lines), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="dispute-${dispute.data.id}.pdf"` } });
});
