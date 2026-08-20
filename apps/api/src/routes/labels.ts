import { Hono } from "hono";
import { CreateLabelsSchema } from "@mekha/types";

const PRINTABLE_STATUSES = new Set(["confirmed", "packed"]);

import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { authenticatedRateLimit } from "../middleware/rateLimit";
import { getCourierAdapter } from "../couriers";
import type { ApiEnv } from "../types";

export const labelsRoute = new Hono<ApiEnv>();
labelsRoute.use("*", requireAuth, authenticatedRateLimit);

labelsRoute.post("/labels", async (context) => {
  const parsed = CreateLabelsSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ");

  const supabase = createSupabaseClient(context.env);
  const user = context.get("user");
  const { data: seller, error: sellerError } = await supabase
    .from("seller_profiles")
    .select("id,business_name,business_name_lao,phone")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (sellerError)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານຍັງບໍ່ໄດ້ລົງທະບຽນຮ້ານຄ້າ");

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id,friendly_id,status,amount,delivery_fee,payment_method,delivery_address,customers(name,phone),order_items(product_name,quantity)",
    )
    .eq("seller_id", seller.id)
    .in("id", parsed.data.order_ids);
  if (ordersError)
    return apiError(context, 500, "INTERNAL_ERROR", "ໂຫລດຄຳສັ່ງບໍ່ສຳເລັດ");
  if ((orders ?? []).length !== parsed.data.order_ids.length)
    return apiError(context, 400, "BAD_REQUEST", "ພົບຄຳສັ່ງທີ່ບໍ່ຖືກຕ້ອງ");
  const invalid = (orders ?? []).find(
    (order) => !PRINTABLE_STATUSES.has(order.status),
  );
  if (invalid)
    return apiError(
      context,
      400,
      "INVALID_TRANSITION",
      `ຄຳສັ່ງ ${invalid.friendly_id} ບໍ່ພ້ອມພິມໃບຕາດ (ສະຖານະ: ${invalid.status})`,
    );

  const adapter = getCourierAdapter(context.env);
  const labels = await Promise.all(
    (orders ?? []).map(async (order) => {
      const shipment = await adapter.createShipment({
        id: order.id,
        friendly_id: order.friendly_id,
      });
      return { order, shipment };
    }),
  );

  const now = new Date().toISOString();
  for (const { order, shipment } of labels) {
    await supabase
      .from("orders")
      .update({
        status: "shipped",
        tracking_number: shipment.tracking_number,
        courier: adapter.name,
      })
      .eq("id", order.id);
    await supabase.from("courier_labels").insert({
      order_id: order.id,
      courier: adapter.name,
      tracking_number: shipment.tracking_number,
      status: "printed",
    });
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    event: "order.labels_printed",
    entity_type: "order",
    entity_id: null,
    metadata: { order_ids: parsed.data.order_ids, courier: adapter.name, at: now },
  });

  return context.json({
    data: labels.map(({ order, shipment }) => ({
      order_id: order.id,
      friendly_id: order.friendly_id,
      tracking_number: shipment.tracking_number,
      courier: adapter.name,
      seller: {
        name: seller.business_name_lao || seller.business_name,
        phone: seller.phone,
      },
      customer: order.customers,
      address: order.delivery_address,
      items: order.order_items,
      amount: order.amount,
      delivery_fee: order.delivery_fee,
      is_cod: order.payment_method === "cod",
    })),
  });
});
