import { z } from "zod";

export const CreateProductSchema = z.object({
  name: z.string().trim().min(1).max(120),
  name_lao: z.string().trim().max(120).optional(),
  price: z.number().min(0),
  cost: z.number().min(0).optional(),
  stock_count: z.number().int().min(0).default(0),
  sku: z.string().trim().max(64).optional(),
  photo_urls: z.array(z.string().url()).max(3).default([]),
});
export type CreateProduct = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;

export const ProductPhotoUploadSchema = z.object({
  mime_type: z.enum(["image/jpeg", "image/png"]),
});
export type ProductPhotoUpload = z.infer<typeof ProductPhotoUploadSchema>;
