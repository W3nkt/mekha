import type { OrderStatus } from "@mekha/types";
export function OrderStatusBadge({
  status,
  label,
}: {
  status: OrderStatus;
  label?: string;
}) {
  return (
    <span className={`mk-order-status mk-order-status--${status}`}>
      <span aria-hidden="true">{status === "disputed" ? "!" : "●"}</span>
      {label ?? status}
    </span>
  );
}
