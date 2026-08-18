import { z } from "zod";

export const CreateReviewSchema = z.object({
  order_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});
export type CreateReview = z.infer<typeof CreateReviewSchema>;
