import { z } from "zod";

export const LaoPhoneSchema = z.string().regex(/^\+85620[0-9]{8}$/);

export const normalizeLaoPhone = (value: string): string | null => {
  const compact = value.replace(/[\s()-]/g, "");
  const digits = compact.startsWith("+") ? compact.slice(1) : compact;
  const normalized = digits.startsWith("020")
    ? `856${digits.slice(1)}`
    : digits;
  return /^85620[0-9]{8}$/.test(normalized) ? `+${normalized}` : null;
};

export const RequestOtpSchema = z.object({ phone: LaoPhoneSchema });
export type RequestOtp = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.object({
  phone: LaoPhoneSchema,
  token: z.string().regex(/^\d{6}$/),
});
export type VerifyOtp = z.infer<typeof VerifyOtpSchema>;
