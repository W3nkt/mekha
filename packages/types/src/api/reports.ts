import { z } from "zod";
import { ReportType } from "../enums";

export const CreateReportSchema = z.object({
  seller_id: z.string().uuid().optional(),
  report_type: z.enum(ReportType),
  description: z.string().trim().min(10).max(2000),
  reporter_phone: z
    .string()
    .regex(/^(\+856|0)[0-9]{8,10}$/)
    .optional(),
  evidence_urls: z.array(z.string().url()).max(10).default([]),
});
export type CreateReport = z.infer<typeof CreateReportSchema>;
