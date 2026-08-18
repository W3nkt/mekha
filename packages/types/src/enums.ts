export const OrderStatus = [
  "draft",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "settled",
  "returned",
  "disputed",
] as const;
export type OrderStatus = (typeof OrderStatus)[number];

export const VerificationStatus = [
  "unverified",
  "pending",
  "verified",
  "rejected",
  "suspended",
  "additional_info_required",
] as const;
export type VerificationStatus = (typeof VerificationStatus)[number];

export const CautionLevel = [
  "low",
  "medium",
  "high",
  "insufficient_information",
] as const;
export type CautionLevel = (typeof CautionLevel)[number];

export const ReportType = [
  "product_not_received",
  "wrong_product",
  "misleading_description",
  "suspected_fake_seller",
  "payment_issue",
  "seller_impersonation",
  "suspicious_advertisement",
  "other",
] as const;
export type ReportType = (typeof ReportType)[number];

export const CourierName = ["anousith", "hal", "mixay"] as const;
export type CourierName = (typeof CourierName)[number];

export const SubscriptionPlan = ["free", "standard", "pro"] as const;
export type SubscriptionPlan = (typeof SubscriptionPlan)[number];

export const PaymentMethod = ["cod", "bank_transfer", "qr", "other"] as const;
export type PaymentMethod = (typeof PaymentMethod)[number];

export const TrustSignalType = ["positive", "warning", "critical"] as const;
export type TrustSignalType = (typeof TrustSignalType)[number];
