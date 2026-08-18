import { z } from "zod";

export const LaoPhoneSchema = z.string().regex(/^(\+856|0)[0-9]{8,10}$/);

export const RequestOtpSchema = z.object({ phone: LaoPhoneSchema });
export type RequestOtp = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.object({
  phone: LaoPhoneSchema,
  token: z.string().regex(/^\d{6}$/),
});
export type VerifyOtp = z.infer<typeof VerifyOtpSchema>;
