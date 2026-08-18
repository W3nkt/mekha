import { Hono } from "hono";
import { CreateOrderSchema } from "@mekha/types";

import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { authenticatedRateLimit } from "../middleware/rateLimit";
import type { ApiEnv } from "../types";

export const ordersRoute = new Hono<ApiEnv>();

ordersRoute.use("*", requireAuth, authenticatedRateLimit);
ordersRoute.get("/", (context) => context.json({ data: [] }));

ordersRoute.post("/", async (context) => {
  const parsed = CreateOrderSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ຂໍ້ມູນຄຳສັ່ງບໍ່ຖືກຕ້ອງ", {
      fields: parsed.error.flatten().fieldErrors,
    });

  const supabase = createSupabaseClient(context.env);
  const user = context.get("user");
  const { data: seller, error: sellerError } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (sellerError)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!seller)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານຍັງບໍ່ໄດ້ລົງທະບຽນຮ້ານຄ້າ");

  // Prices and names are always resolved server-side from the seller's own
  // catalogue for items that reference a product_id -- never trust a
  // client-sent price. Items without a product_id are ad-hoc line items,
  // which the schema explicitly allows.
  const productIds = parsed.data.items.flatMap((item) =>
    item.product_id ? [item.product_id] : [],
  );
  let products: {
    id: string;
    name: string;
    name_lao: string | null;
    price: number;
    stock_count: number;
  }[] = [];
  if (productIds.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,name_lao,price,stock_count")
      .eq("seller_id", seller.id)
      .in("id", productIds);
    if (error)
      return apiError(context, 500, "INTERNAL_ERROR", "ໂຫລດສິນຄ້າບໍ່ສຳເລັດ");
    if ((data ?? []).length !== new Set(productIds).size)
      return apiError(context, 400, "BAD_REQUEST", "ພົບສິນຄ້າທີ່ບໍ່ຖືກຕ້ອງ");
    products = data ?? [];
  }
  const productById = new Map(products.map((product) => [product.id, product]));

  const items = parsed.data.items.map((item) => {
    const product = item.product_id
      ? productById.get(item.product_id)
      : undefined;
    const unitPrice = product ? product.price : item.unit_price;
    return {
      product_id: item.product_id ?? null,
      product_name: product ? product.name_lao || product.name : item.name,
      unit_price: unitPrice,
      quantity: item.quantity,
      line_total: unitPrice * item.quantity,
    };
  });
  const amount = items.reduce((sum, item) => sum + item.line_total, 0);

  const existingCustomer = await supabase
    .from("customers")
    .select("order_count")
    .eq("seller_id", seller.id)
    .eq("phone", parsed.data.customer_phone)
    .maybeSingle();
  if (existingCustomer.error)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບລູກຄ້າບໍ່ສຳເລັດ");

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert(
      {
        seller_id: seller.id,
        phone: parsed.data.customer_phone,
        name: parsed.data.customer_name,
        province: parsed.data.shipping_address.province_id,
        district: parsed.data.shipping_address.district_id,
        village_landmark: parsed.data.shipping_address.village_landmark,
        gps_lat: parsed.data.shipping_address.gps_lat ?? null,
        gps_lng: parsed.data.shipping_address.gps_lng ?? null,
        order_count: (existingCustomer.data?.order_count ?? 0) + 1,
      },
      { onConflict: "seller_id,phone" },
    )
    .select("id")
    .single();
  if (customerError)
    return apiError(context, 500, "INTERNAL_ERROR", "ບັນທຶກລູກຄ້າບໍ່ສຳເລັດ");

  const { data: nextNumber, error: counterError } = await supabase.rpc(
    "next_seller_order_number",
    { p_seller_id: seller.id },
  );
  if (counterError || typeof nextNumber !== "number")
    return apiError(context, 500, "INTERNAL_ERROR", "ສ້າງລະຫັດຄຳສັ່ງບໍ່ສຳເລັດ");
  const friendlyId = `ORD-${String(nextNumber).padStart(4, "0")}`;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      seller_id: seller.id,
      customer_id: customer.id,
      friendly_id: friendlyId,
      amount,
      payment_method: parsed.data.payment_method,
      delivery_address: parsed.data.shipping_address,
      note: parsed.data.note ?? null,
      status: "confirmed",
      seller_confirmed_at: new Date().toISOString(),
    })
    .select("id,friendly_id,status,amount,created_at")
    .single();
  if (orderError)
    return apiError(context, 500, "INTERNAL_ERROR", "ສ້າງຄຳສັ່ງບໍ່ສຳເລັດ");

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(items.map((item) => ({ ...item, order_id: order.id })));
  if (itemsError) {
    await supabase.from("orders").delete().eq("id", order.id);
    return apiError(context, 500, "INTERNAL_ERROR", "ບັນທຶກລາຍການສິນຄ້າບໍ່ສຳເລັດ");
  }

  const stockUpdates = await Promise.all(
    items
      .filter((item) => item.product_id)
      .map((item) => {
        const product = productById.get(item.product_id!);
        if (!product) return Promise.resolve(null);
        const nextStock = Math.max(0, product.stock_count - item.quantity);
        return supabase
          .from("products")
          .update({ stock_count: nextStock })
          .eq("id", product.id);
      }),
  );
  for (const result of stockUpdates) {
    if (result?.error)
      console.error(
        JSON.stringify({
          level: "error",
          event: "order_stock_decrement_failed",
          orderId: order.id,
          message: result.error.message,
        }),
      );
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    event: "order.created",
    entity_type: "order",
    entity_id: order.id,
    metadata: { seller_id: seller.id, friendly_id: friendlyId, amount },
  });

  return context.json(
    {
      order_id: order.id,
      status: order.status,
      tracking_friendly_id: order.friendly_id,
    },
    201,
  );
});
