import { z } from "zod";
import { CourierName, OrderStatus, PaymentMethod } from "../enums";

export const LaoAddressSchema = z.object({
  province_id: z.string().min(1),
  province_name_lo: z.string().min(1),
  province_name_en: z.string().min(1),
  district_id: z.string().min(1),
  district_name_lo: z.string().min(1),
  district_name_en: z.string().min(1),
  village_landmark: z.string().trim().min(1).max(300),
  gps_lat: z.number().min(-90).max(90).optional(),
  gps_lng: z.number().min(-180).max(180).optional(),
});
export type LaoAddress = z.infer<typeof LaoAddressSchema>;

export const CreateOrderItemSchema = z.object({
  product_id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(150),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
});
export type CreateOrderItem = z.infer<typeof CreateOrderItemSchema>;

export const CreateOrderSchema = z.object({
  customer_name: z.string().trim().min(1).max(100),
  customer_phone: z.string().regex(/^(\+856|0)[0-9]{8,10}$/),
  shipping_address: LaoAddressSchema,
  payment_method: z.enum(PaymentMethod),
  items: z.array(CreateOrderItemSchema).min(1).max(100),
  note: z.string().max(500).optional(),
});
export type CreateOrder = z.infer<typeof CreateOrderSchema>;

export const CreateSafeOrderSchema = z.object({
  seller_id: z.string().uuid(),
  product_name: z.string().trim().min(1).max(150),
  unit_price: z.number().nonnegative(),
  quantity: z.number().int().positive().max(1000),
  delivery_fee: z.number().nonnegative().max(100000000),
  payment_method: z.enum(PaymentMethod),
  expected_delivery: z.string().date().optional(),
  return_terms: z.string().trim().max(500).optional(),
  buyer_name: z.string().trim().min(1).max(100),
  buyer_phone: z.string().regex(/^(\+856|0)[0-9]{8,10}$/),
});
export type CreateSafeOrder = z.infer<typeof CreateSafeOrderSchema>;

export const OrderListQuerySchema = z.object({
  status: z
    .string()
    .transform((value) => value.split(",").filter(Boolean))
    .pipe(z.array(z.enum(OrderStatus)))
    .optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type OrderListQuery = z.infer<typeof OrderListQuerySchema>;

const FORWARD_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["confirmed"],
  confirmed: ["packed", "shipped"],
  packed: ["shipped"],
  shipped: ["delivered"],
  delivered: ["settled"],
  settled: [],
  returned: [],
  disputed: [],
};
export const isValidOrderTransition = (
  from: OrderStatus,
  to: OrderStatus,
): boolean =>
  FORWARD_ORDER_TRANSITIONS[from].includes(to) ||
  ((to === "returned" || to === "disputed") && from !== to);

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(OrderStatus),
  tracking_number: z.string().trim().min(1).max(60).optional(),
  courier: z.enum(CourierName).optional(),
});
export type UpdateOrderStatus = z.infer<typeof UpdateOrderStatusSchema>;

export const CreateLabelsSchema = z.object({
  order_ids: z.array(z.string().uuid()).min(1).max(30),
});
export type CreateLabels = z.infer<typeof CreateLabelsSchema>;

export const ImportSettlementSchema = z.object({
  courier: z.enum(CourierName),
  file_content: z.string().min(1).max(2_000_000),
});
export type ImportSettlement = z.infer<typeof ImportSettlementSchema>;
