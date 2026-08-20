import { Hono, type Context } from "hono";
import {
  CreateOrderSchema,
  isValidOrderTransition,
  normalizeLaoPhone,
  OrderListQuerySchema,
  UpdateOrderStatusSchema,
  type OrderStatus,
  type OrderUpdate,
} from "@mekha/types";

import { apiError } from "../lib/errors";
import { createSupabaseClient } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { authenticatedRateLimit } from "../middleware/rateLimit";
import type { ApiEnv } from "../types";

export const ordersRoute = new Hono<ApiEnv>();

ordersRoute.use("*", requireAuth, authenticatedRateLimit);

const ownedSellerId = async (context: Context<ApiEnv>) => {
  const supabase = createSupabaseClient(context.env);
  const { data, error } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("owner_user_id", context.get("user").id)
    .maybeSingle();
  return { supabase, sellerId: data?.id ?? null, error };
};

const orderListFields =
  "id,friendly_id,status,payment_method,amount,delivery_fee,created_at,tracking_number,courier,customers(name,phone),order_items(product_name,quantity)";

ordersRoute.get("/", async (context) => {
  const parsed = OrderListQuerySchema.safeParse(context.req.query());
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ຄຳຮ້ອງຂໍບໍ່ຖືກຕ້ອງ");
  const { supabase, sellerId, error } = await ownedSellerId(context);
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!sellerId)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານຍັງບໍ່ໄດ້ລົງທະບຽນຮ້ານຄ້າ");

  const { status, q, page, limit } = parsed.data;
  let query = supabase
    .from("orders")
    .select(orderListFields, { count: "exact" })
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (status?.length) query = query.in("status", status);
  if (q) {
    const literal = q.replace(/[\\%_]/g, "\\$&");
    const matchingCustomers = await supabase
      .from("customers")
      .select("id")
      .eq("seller_id", sellerId)
      .or(`name.ilike.%${literal}%,phone.ilike.%${literal}%`);
    const customerIds = (matchingCustomers.data ?? []).map((row) => row.id);
    const orFilters = [`friendly_id.ilike.%${literal}%`];
    if (customerIds.length) orFilters.push(`customer_id.in.(${customerIds.join(",")})`);
    query = query.or(orFilters.join(","));
  }
  const { data, error: listError, count } = await query;
  if (listError)
    return apiError(context, 500, "INTERNAL_ERROR", "ໂຫລດຄຳສັ່ງບໍ່ສຳເລັດ");
  return context.json({
    data: (data ?? []).map((order) => ({
      id: order.id,
      friendly_id: order.friendly_id,
      status: order.status,
      payment_method: order.payment_method,
      amount: order.amount,
      delivery_fee: order.delivery_fee,
      created_at: order.created_at,
      tracking_number: order.tracking_number,
      courier: order.courier,
      customer: order.customers,
      items: order.order_items,
    })),
    total: count ?? 0,
    page,
    limit,
  });
});

ordersRoute.get("/:id", async (context) => {
  const orderId = context.req.param("id");
  const { supabase, sellerId, error } = await ownedSellerId(context);
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!sellerId)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານຍັງບໍ່ໄດ້ລົງທະບຽນຮ້ານຄ້າ");
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id,friendly_id,status,payment_method,amount,delivery_fee,created_at,updated_at,note,tracking_number,courier,delivery_address,customers(id,name,phone),order_items(id,product_name,quantity,unit_price,line_total),courier_labels(id,courier,tracking_number,status,created_at)",
    )
    .eq("id", orderId)
    .eq("seller_id", sellerId)
    .maybeSingle();
  if (orderError)
    return apiError(context, 500, "INTERNAL_ERROR", "ໂຫລດຄຳສັ່ງບໍ່ສຳເລັດ");
  if (!order) return apiError(context, 404, "NOT_FOUND", "ບໍ່ພົບຄຳສັ່ງນີ້");
  return context.json({ data: order });
});

ordersRoute.patch("/:id/status", async (context) => {
  const orderId = context.req.param("id");
  const parsed = UpdateOrderStatusSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ");
  const { supabase, sellerId, error } = await ownedSellerId(context);
  if (error)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບຮ້ານຄ້າບໍ່ສຳເລັດ");
  if (!sellerId)
    return apiError(context, 403, "FORBIDDEN", "ທ່ານຍັງບໍ່ໄດ້ລົງທະບຽນຮ້ານຄ້າ");

  const { data: existing, error: existingError } = await supabase
    .from("orders")
    .select("id,status")
    .eq("id", orderId)
    .eq("seller_id", sellerId)
    .maybeSingle();
  if (existingError)
    return apiError(context, 500, "INTERNAL_ERROR", "ໂຫລດຄຳສັ່ງບໍ່ສຳເລັດ");
  if (!existing) return apiError(context, 404, "NOT_FOUND", "ບໍ່ພົບຄຳສັ່ງນີ້");
  const currentStatus = existing.status as OrderStatus;
  if (!isValidOrderTransition(currentStatus, parsed.data.status))
    return apiError(
      context,
      400,
      "INVALID_TRANSITION",
      `ບໍ່ສາມາດປ່ຽນສະຖານະຈາກ ${currentStatus} ເປັນ ${parsed.data.status} ໄດ້`,
    );

  const update: OrderUpdate = { status: parsed.data.status };
  if (parsed.data.tracking_number) update.tracking_number = parsed.data.tracking_number;
  if (parsed.data.courier) update.courier = parsed.data.courier;

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update(update)
    .eq("id", orderId)
    .select("id,status,tracking_number,courier")
    .single();
  if (updateError)
    return apiError(context, 500, "INTERNAL_ERROR", "ອັບເດດສະຖານະບໍ່ສຳເລັດ");

  await supabase.from("audit_logs").insert({
    actor_id: context.get("user").id,
    event: "order.status_changed",
    entity_type: "order",
    entity_id: orderId,
    metadata: { from: existing.status, to: parsed.data.status },
  });

  return context.json({ data: updated });
});

ordersRoute.post("/", async (context) => {
  const parsed = CreateOrderSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "ຂໍ້ມູນຄຳສັ່ງບໍ່ຖືກຕ້ອງ", {
      fields: parsed.error.flatten().fieldErrors,
    });
  const customerPhone = normalizeLaoPhone(parsed.data.customer_phone);
  if (!customerPhone)
    return apiError(context, 400, "BAD_REQUEST", "ເບີໂທລູກຄ້າບໍ່ຖືກຕ້ອງ");

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
    .eq("phone", customerPhone)
    .maybeSingle();
  if (existingCustomer.error)
    return apiError(context, 500, "INTERNAL_ERROR", "ກວດສອບລູກຄ້າບໍ່ສຳເລັດ");

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert(
      {
        seller_id: seller.id,
        phone: customerPhone,
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
