import { z } from "zod";
import { ReportType } from "../enums";

export const CreateReportSchema = z.object({
  seller_id: z.string().uuid(),
  order_id: z.string().uuid().optional(),
  report_type: z.enum(ReportType),
  description: z.string().trim().min(50).max(2000),
  reporter_phone: z
    .string()
    .regex(/^(\+856|0)[0-9]{8,10}$/)
    .optional(),
  evidence_urls: z.array(z.string().url()).max(10).default([]),
  evidence_paths: z.array(z.string().trim().min(1)).max(10).default([]),
}).superRefine((value, ctx) => {
  if (value.evidence_urls.length === 0 && value.evidence_paths.length === 0)
    ctx.addIssue({ code: "custom", path: ["evidence_paths"], message: "At least one evidence file is required" });
});
export type CreateReport = z.infer<typeof CreateReportSchema>;
