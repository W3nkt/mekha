import { z } from "zod";

export const CustomerSearchSchema = z.object({
  phone_prefix: z.string().trim().min(3).max(15),
});
export type CustomerSearch = z.infer<typeof CustomerSearchSchema>;
