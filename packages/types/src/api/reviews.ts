import { z } from "zod";

export const CreateReviewSchema = z.object({
  order_id: z.string().uuid().optional(),
  seller_id: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  rating_description: z.number().int().min(1).max(5).optional(),
  rating_delivery: z.number().int().min(1).max(5).optional(),
  rating_communication: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(1000).optional(),
}).refine((value) => Boolean(value.order_id || value.seller_id), { message: "order_id or seller_id is required" });
export type CreateReview = z.infer<typeof CreateReviewSchema>;
