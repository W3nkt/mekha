import { Hono, type Context } from "hono";
import { requireAuth } from "../middleware/auth";
import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import type { ApiEnv } from "../types";

export const normalizePhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("856")) return `+${digits}`;
  if (digits.startsWith("0")) return `+856${digits.slice(1)}`;
  return `+856${digits}`;
};

export const customersRoute = new Hono<ApiEnv>();
customersRoute.use("*", requireAuth);

const ownedSellerId = async (context: Context<ApiEnv>, requested: string | null) => {
  const supabase = createSupabaseClient(context.env);
  const result = await supabase.from("seller_profiles").select("id").eq("id", requested ?? "").eq("owner_user_id", context.get("user").id).maybeSingle();
  return { supabase, sellerId: result.data?.id, error: result.error };
};

customersRoute.get("/", async (context) => {
  const { supabase, sellerId, error } = await ownedSellerId(context, context.req.query("seller_id") ?? null);
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Customer lookup failed");
  if (!sellerId) return apiError(context, 403, "FORBIDDEN", "Seller access required");
  const query = context.req.query("q")?.trim();
  let request = supabase.from("customers").select("*").eq("seller_id", sellerId).order("updated_at", { ascending: false });
  if (query) request = request.or(`name.ilike.%${query}%,phone.ilike.%${normalizePhone(query)}%`);
  const result = await request;
  if (result.error) return apiError(context, 500, "INTERNAL_ERROR", "Customer lookup failed");
  return context.json({ data: result.data });
});

customersRoute.get("/:id", async (context) => {
  const { supabase, sellerId, error } = await ownedSellerId(context, context.req.query("seller_id") ?? null);
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Customer lookup failed");
  if (!sellerId) return apiError(context, 403, "FORBIDDEN", "Seller access required");
  const result = await supabase.from("customers").select("*").eq("id", context.req.param("id")).eq("seller_id", sellerId).maybeSingle();
  if (result.error) return apiError(context, 500, "INTERNAL_ERROR", "Customer lookup failed");
  if (!result.data) return apiError(context, 404, "NOT_FOUND", "Customer not found");
  return context.json({ data: result.data });
});

customersRoute.patch("/:id", async (context) => {
  const { supabase, sellerId, error } = await ownedSellerId(context, context.req.query("seller_id") ?? null);
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Customer update failed");
  if (!sellerId) return apiError(context, 403, "FORBIDDEN", "Seller access required");
  const body = await context.req.json().catch(() => null) as Record<string, unknown> | null;
  const update = {
    name: typeof body?.name === "string" ? body.name : undefined,
    province: typeof body?.province === "string" ? body.province : undefined,
    district: typeof body?.district === "string" ? body.district : undefined,
    village_landmark: typeof body?.village_landmark === "string" ? body.village_landmark : undefined,
    notes: typeof body?.notes === "string" ? body.notes : undefined,
    gps_lat: typeof body?.gps_lat === "number" ? body.gps_lat : undefined,
    gps_lng: typeof body?.gps_lng === "number" ? body.gps_lng : undefined,
  };
  const result = await supabase.from("customers").update(update).eq("id", context.req.param("id")).eq("seller_id", sellerId).select().maybeSingle();
  if (result.error) return apiError(context, 400, "BAD_REQUEST", "Customer update failed");
  if (!result.data) return apiError(context, 404, "NOT_FOUND", "Customer not found");
  return context.json({ data: result.data });
});
