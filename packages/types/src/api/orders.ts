import { z } from "zod";
import { PaymentMethod } from "../enums";

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
