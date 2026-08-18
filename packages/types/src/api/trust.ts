import { z } from "zod";

export const TrustCheckSchema = z.object({
  query_type: z.enum(["shop_name", "phone", "seller_id", "profile_link"]),
  query_value: z.string().trim().min(1).max(200),
});
export type TrustCheck = z.infer<typeof TrustCheckSchema>;
