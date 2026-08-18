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
  query: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SellerSearch = z.infer<typeof SellerSearchSchema>;
