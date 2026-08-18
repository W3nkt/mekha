import { z } from "zod";
import { LaoPhoneSchema } from "./auth";

export const CreateSellerSchema = z.object({
  business_name: z.string().trim().min(2).max(100),
  business_name_lao: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
  province: z.string().trim().optional(),
  district: z.string().trim().optional(),
  phone: LaoPhoneSchema,
  facebook_url: z.string().url().optional(),
  tiktok_url: z.string().url().optional(),
});
export type CreateSeller = z.infer<typeof CreateSellerSchema>;

export const UpdateSellerSchema = CreateSellerSchema.omit({
  phone: true,
}).partial();
export type UpdateSeller = z.infer<typeof UpdateSellerSchema>;

export const SellerSearchSchema = z.object({
  q: z.string().trim().min(1).max(100),
  type: z.enum(["shop_name", "phone", "seller_id"]),
  limit: z.coerce.number().int().min(1).max(20).default(20),
});
export type SellerSearch = z.infer<typeof SellerSearchSchema>;

export const SellerSearchResultSchema = z.object({
  id: z.string().uuid(),
  business_name: z.string(),
  business_name_lao: z.string().nullable(),
  province: z.string().nullable(),
  logo_url: z.string().nullable(),
  verification_status: z.string(),
  verified_order_count: z.number().int().nonnegative(),
  caution_level: z.enum(["low", "medium", "high", "insufficient_information"]),
});
export type SellerSearchResult = z.infer<typeof SellerSearchResultSchema>;

export const SellerSearchResponseSchema = z.object({
  data: z.array(SellerSearchResultSchema),
});
export type SellerSearchResponse = z.infer<typeof SellerSearchResponseSchema>;
