import type { CautionLevel } from "@mekha/types";
export type TrustBadgeProps = {
  status: "verified" | "partially_verified" | "unverified";
  caution: CautionLevel;
  label?: string;
};
const labels: Record<TrustBadgeProps["status"], string> = {
  verified: "Verified",
  partially_verified: "Partially verified",
  unverified: "Unverified",
};
export function TrustBadge({ status, caution, label }: TrustBadgeProps) {
  return (
    <span
      className={`mk-trust-badge mk-trust-badge--${status} mk-caution--${caution}`}
    >
      <span aria-hidden="true">●</span>
      {label ?? labels[status]}
    </span>
  );
}
