import { z } from "zod";

export const VerificationTypeSchema = z.enum([
  "identity",
  "business_registration",
  "e_trust",
  "social_account",
  "payment_identity",
]);

export const VerificationUploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mime_type: z.enum(["image/jpeg", "image/png", "application/pdf"]),
  verification_type: VerificationTypeSchema,
});

export const SubmitVerificationSchema = z.object({
  verification_type: VerificationTypeSchema,
  document_path: z.string().min(1).max(500),
  file_hash: z.string().regex(/^[a-f0-9]{64}$/),
  notes: z.string().trim().max(500).optional(),
});

export type VerificationType = z.infer<typeof VerificationTypeSchema>;
