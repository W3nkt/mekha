import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

export type OrderStatus = "draft" | "confirmed" | "packed" | "shipped" | "delivered" | "settled";
type Order = { id: string; customer: string; phone: string; product: string; amount: number; payment: string; status: OrderStatus; created: string };
const seed: Order[] = [
  { id: "ORD-0042", customer: "ນ້ອຍ ສົມວ່ານ", phone: "02012345678", product: "ໝາກເລັ່ນ ×2", amount: 40000, payment: "COD", status: "shipped", created: "3 ຊ.ໂມງທີ່ຜ່ານມາ" },
  { id: "ORD-0041", customer: "ວ້ອນ ຄຳໃໝ", phone: "02098765432", product: "ເຄື່ອງສຳອາງ ×3", amount: 75000, payment: "COD", status: "confirmed", created: "6 ຊ.ໂມງທີ່ຜ່ານມາ" },
];
const statusLabel: Record<OrderStatus, string> = { draft: "ຮ່າງ", confirmed: "ຢືນຢັນ", packed: "ຈັດແລ້ວ", shipped: "ກຳລັງສົ່ງ", delivered: "ສົ່ງແລ້ວ", settled: "ຮັບເງິນແລ້ວ" };
const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = { draft: "confirmed", confirmed: "packed", packed: "shipped", shipped: "delivered", delivered: "settled" };

export function OrdersListPage() {
  const [tab, setTab] = useState<"all" | "action" | "shipping" | "done">("all"); const [query, setQuery] = useState("");
  const orders = useMemo(() => seed.filter((order) => { const matchesTab = tab === "all" || (tab === "action" && ["draft", "confirmed"].includes(order.status)) || (tab === "shipping" && order.status === "shipped") || (tab === "done" && ["delivered", "settled"].includes(order.status)); return matchesTab && `${order.id} ${order.customer} ${order.phone}`.toLowerCase().includes(query.toLowerCase()); }), [query, tab]);
  return <section className="page-enter orders-page"><div className="seller-section-topbar"><h1>ຄຳສັ່ງທັງໝົດ ({orders.length})</h1><Link className="primary-link" to="/dashboard/orders/new">+ ໃໝ່</Link></div><input className="orders-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ຄົ້ນຫາເລກຄຳສັ່ງ, ຊື່, ເບີໂທ" /><div className="order-tabs">{([["all", "ທັງໝົດ"], ["action", "ຕ້ອງດຳເນີນການ"], ["shipping", "ກຳລັງສົ່ງ"], ["done", "ສຳເລັດ"]] as const).map(([value, label]) => <button className={tab === value ? "is-active" : ""} key={value} type="button" onClick={() => setTab(value)}>{label}</button>)}</div>{orders.length ? <div className="order-list">{orders.map((order) => <Link className="order-card" to={`/dashboard/orders/${order.id}`} key={order.id}><div><strong>{order.id}</strong><span>{order.payment} · {statusLabel[order.status]}</span></div><b>{order.customer} · {order.phone}</b><small>{order.product} · {order.amount.toLocaleString()} ₭ · {order.created}</small></Link>)}</div> : <div className="seller-empty-state">ຍັງບໍ່ມີຄຳສັ່ງ<Link className="primary-link" to="/dashboard/orders/new">ສ້າງຄຳສັ່ງ</Link></div>}</section>;
}

export function OrderDetailPage() {
  const { id = "ORD-0042" } = useParams(); const order = seed.find((item) => item.id === id) ?? seed[0]; const [status, setStatus] = useState<OrderStatus>(order.status); const next = nextStatus[status];
  return <section className="page-enter order-detail-page"><Link to="/dashboard/orders">← ຄຳສັ່ງ</Link><div className="seller-section-topbar"><h1>{order.id}</h1><span className="order-status-badge">{statusLabel[status]}</span></div><p>ສ້າງ: {order.created}</p><div className="order-timeline">{(Object.keys(statusLabel) as OrderStatus[]).map((step) => <span className={step === status ? "is-current" : ""} key={step}>{statusLabel[step]}</span>)}</div><div className="order-detail-card"><h2>ລູກຄ້າ: {order.customer}</h2><a href={`tel:${order.phone}`}>{order.phone}</a><p>{order.product}</p><strong>{order.amount.toLocaleString()} ₭ · {order.payment}</strong></div>{next ? <button className="primary-link" type="button" onClick={() => setStatus(next)}>{statusLabel[next]}</button> : <p>ຄຳສັ່ງສຳເລັດແລ້ວ</p>}</section>;
}
