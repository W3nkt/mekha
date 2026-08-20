import { Hono } from "hono";
import { CustomerSearchSchema } from "@mekha/types";

import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { authenticatedRateLimit } from "../middleware/rateLimit";
import type { ApiEnv } from "../types";

export const customersRoute = new Hono<ApiEnv>();

customersRoute.use("*", requireAuth, authenticatedRateLimit);

customersRoute.get("/", async (context) => {
  const supabase = createSupabaseClient(context.env);
  const seller = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("owner_user_id", context.get("user").id)
    .maybeSingle();
  if (seller.error) return apiError(context, 500, "INTERNAL_ERROR", "Seller lookup failed");
  if (!seller.data) return apiError(context, 403, "FORBIDDEN", "Seller profile required");
  const { data, error } = await supabase
    .from("customers")
    .select("id,phone,name,province,district,village_landmark,gps_lat,gps_lng,order_count,updated_at")
    .eq("seller_id", seller.data.id)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Customers unavailable");
  return context.json({
    data: (data ?? []).map((customer) => ({ ...customer, last_order_at: customer.updated_at })),
  });
});

customersRoute.get("/:id", async (context) => {
  const customerId = context.req.param("id");
  const supabase = createSupabaseClient(context.env);
  const seller = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("owner_user_id", context.get("user").id)
    .maybeSingle();
  if (seller.error) return apiError(context, 500, "INTERNAL_ERROR", "Seller lookup failed");
  if (!seller.data) return apiError(context, 403, "FORBIDDEN", "Seller profile required");
  const { data: customer, error } = await supabase
    .from("customers")
    .select(
      "id,phone,name,province,district,village_landmark,gps_lat,gps_lng,order_count,updated_at",
    )
    .eq("id", customerId)
    .eq("seller_id", seller.data.id)
    .maybeSingle();
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Customer lookup failed");
  if (!customer) return apiError(context, 404, "NOT_FOUND", "Customer not found");
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id,friendly_id,status,amount,created_at")
    .eq("seller_id", seller.data.id)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (ordersError) return apiError(context, 500, "INTERNAL_ERROR", "Orders lookup failed");
  const total_spent = (orders ?? [])
    .filter((order) => order.status === "settled")
    .reduce((sum, order) => sum + order.amount, 0);
  const returned_or_disputed_count = (orders ?? []).filter((order) =>
    ["returned", "disputed"].includes(order.status),
  ).length;
  return context.json({
    data: {
      ...customer,
      last_order_at: customer.updated_at,
      total_spent,
      returned_or_disputed_count,
      orders: orders ?? [],
    },
  });
});

customersRoute.get("/search", async (context) => {
  const parsed = CustomerSearchSchema.safeParse(context.req.query());
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ຄຳຄົ້ນຫາບໍ່ຖືກຕ້ອງ");

  const requestedSellerId = context.req.query("seller_id");
  const supabase = createSupabaseClient(context.env);
  const { data: seller, error: sellerError } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("owner_user_id", context.get("user").id)
    .maybeSingle();
  if (sellerError)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານຍັງບໍ່ໄດ້ລົງທະບຽນຮ້ານຄ້າ");
  if (requestedSellerId && requestedSellerId !== seller.id)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານບໍ່ມີສິດເບິ່ງລູກຄ້ານີ້");

  const prefix = parsed.data.phone_prefix.replace(/[\\%_]/g, "\\$&");
  const { data, error } = await supabase
    .from("customers")
    .select(
      "id,phone,name,province,district,village_landmark,gps_lat,gps_lng,order_count",
    )
    .eq("seller_id", seller.id)
    .ilike("phone", `${prefix}%`)
    .order("order_count", { ascending: false })
    .limit(10);
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "ຄົ້ນຫາລູກຄ້າບໍ່ສຳເລັດ");
  return context.json({ data });
});
