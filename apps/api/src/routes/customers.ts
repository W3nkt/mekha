import { Hono } from "hono";
import { CustomerSearchSchema } from "@mekha/types";

import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { authenticatedRateLimit } from "../middleware/rateLimit";
import type { ApiEnv } from "../types";

export const customersRoute = new Hono<ApiEnv>();

customersRoute.use("*", requireAuth, authenticatedRateLimit);

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
