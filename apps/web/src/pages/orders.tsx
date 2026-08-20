import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Printer, Search } from "lucide-react";
import { OrderStatusBadge, AddressDisplay, Button } from "@mekha/ui";
import type { OrderStatus } from "@mekha/types";

import { ApiError, apiRequest } from "../lib/api";
import { supabase } from "../lib/supabase";
import { LabelPrintSheet, type PrintableLabel } from "./labels";

async function accessToken(navigate: (to: string) => void, returnTo: string) {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session) {
    navigate(`/login?return=${encodeURIComponent(returnTo)}`);
    return null;
  }
  return session.access_token;
}

type OrderSummary = {
  id: string;
  friendly_id: string;
  status: OrderStatus;
  payment_method: string;
  amount: number;
  delivery_fee: number;
  created_at: string;
  tracking_number: string | null;
  courier: string | null;
  customer: { name: string | null; phone: string } | null;
  items: { product_name: string; quantity: number }[];
};

const TABS: { key: string; label: string; statuses?: OrderStatus[] }[] = [
  { key: "all", label: "ທັງໝົດ" },
  { key: "action", label: "ຕ້ອງການດຳເນີນການ", statuses: ["draft", "confirmed", "packed"] },
  { key: "shipped", label: "ກຳລັງສົ່ງ", statuses: ["shipped"] },
  { key: "done", label: "ສຳເລັດ", statuses: ["delivered", "settled"] },
];

const currency = (value: number) => `${value.toLocaleString()} ₭`;
const timeAgo = (iso: string) => {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} ນາທີທີ່ຜ່ານມາ`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ຊ.ໂມງທີ່ຜ່ານມາ`;
  return `${Math.round(hours / 24)} ມື້ທີ່ຜ່ານມາ`;
};

export function OrderListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [labels, setLabels] = useState<PrintableLabel[] | null>(null);
  const [actionError, setActionError] = useState("");

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
  const orders = useQuery({
    queryKey: ["orders", tab, q],
    queryFn: async () => {
      const token = await accessToken(navigate, "/dashboard/orders");
      if (!token) throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
      const params = new URLSearchParams();
      if (activeTab.statuses) params.set("status", activeTab.statuses.join(","));
      if (q.trim()) params.set("q", q.trim());
      return apiRequest<{ data: OrderSummary[]; total: number }>(
        `/v1/orders?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
    },
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function printSelected() {
    setActionError("");
    const token = await accessToken(navigate, "/dashboard/orders");
    if (!token) return;
    try {
      const result = await apiRequest<{ data: PrintableLabel[] }>("/v1/orders/labels", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_ids: [...selected] }),
      });
      setLabels(result.data);
      setSelected(new Set());
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "ພິມໃບຕາດບໍ່ສຳເລັດ");
    }
  }

  async function markPackedSelected() {
    setActionError("");
    const token = await accessToken(navigate, "/dashboard/orders");
    if (!token) return;
    const ids = [...selected];
    const results = await Promise.allSettled(
      ids.map((id) =>
        apiRequest(`/v1/orders/${id}/status`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: "packed" }),
        }),
      ),
    );
    if (results.some((result) => result.status === "rejected"))
      setActionError("ບາງຄຳສັ່ງອັບເດດບໍ່ສຳເລັດ");
    setSelected(new Set());
    await queryClient.invalidateQueries({ queryKey: ["orders"] });
  }

  return (
    <div className="page-enter dashboard-page orders-page">
      {labels && <LabelPrintSheet labels={labels} onClose={() => setLabels(null)} />}
      <header className="profile-identity">
        <div className="profile-name">
          <p className="eyebrow">Seller OS</p>
          <h1>ຄຳສັ່ງທັງໝົດ ({orders.data?.total ?? 0})</h1>
        </div>
      </header>

      <label className="seller-search-box orders-search">
        <Search size={19} aria-hidden="true" />
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="ຄົ້ນຫາລະຫັດ, ຊື່ ຫຼື ເບີໂທ"
        />
      </label>

      <div className="order-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={t.key === tab}
            className={`order-tab${t.key === tab ? " is-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}

      {selected.size > 0 && (
        <div className="order-bulk-bar">
          <span>{selected.size} ຖືກເລືອກ</span>
          <Button variant="secondary" onClick={() => void markPackedSelected()}>
            ໝາຍວ່າຈັດແພັກແລ້ວ
          </Button>
          <Button onClick={() => void printSelected()}>
            <Printer size={16} /> ພິມໃບຕາດ
          </Button>
        </div>
      )}

      {orders.isLoading && <div className="profile-loading skeleton" aria-label="ກຳລັງໂຫຼດ" />}
      {orders.isError && <p className="form-error">ໂຫລດຄຳສັ່ງບໍ່ສຳເລັດ</p>}
      {orders.data && orders.data.data.length === 0 && (
        <div className="search-message">
          <p>ຍັງບໍ່ມີຄຳສັ່ງ</p>
          <Link className="primary-link" to="/dashboard/orders/new">
            ສ້າງຄຳສັ່ງທຳອິດ
          </Link>
        </div>
      )}

      <div className="order-list">
        {orders.data?.data.map((order) => (
          <div className="order-card" key={order.id}>
            <input
              type="checkbox"
              aria-label={`ເລືອກ ${order.friendly_id}`}
              checked={selected.has(order.id)}
              onChange={() => toggleSelect(order.id)}
            />
            <Link to={`/dashboard/orders/${order.id}`} className="order-card__body">
              <div className="order-card__head">
                <strong>{order.friendly_id}</strong>
                <span className="order-card__payment">
                  {order.payment_method === "cod" ? "COD" : order.payment_method}
                </span>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="order-card__customer">
                {order.customer?.name ?? "—"} · {order.customer?.phone ?? "—"}
              </p>
              <p className="order-card__items">
                {order.items.map((item) => `${item.product_name} ×${item.quantity}`).join(", ")}
              </p>
              <div className="order-card__foot">
                <strong>{currency(order.amount)}</strong>
                <span>{timeAgo(order.created_at)}</span>
              </div>
            </Link>
          </div>
        ))}
      </div>

    </div>
  );
}

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  packed: "ຈັດແພັກແລ້ວ",
  shipped: "ຈັດສົ່ງ",
  delivered: "ຮັບເຄື່ອງແລ້ວ",
  settled: "ຢືນຢັນຮັບເງິນ COD",
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [labels, setLabels] = useState<PrintableLabel[] | null>(null);

  const order = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const token = await accessToken(navigate, `/dashboard/orders/${id}`);
      if (!token) throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
      return apiRequest<{
        data: {
          id: string;
          friendly_id: string;
          status: OrderStatus;
          payment_method: string;
          amount: number;
          delivery_fee: number;
          created_at: string;
          note: string | null;
          tracking_number: string | null;
          courier: string | null;
          delivery_address: Parameters<typeof AddressDisplay>[0]["address"] | null;
          customers: { id: string; name: string | null; phone: string } | null;
          order_items: { id: string; product_name: string; quantity: number; unit_price: number; line_total: number }[];
        };
      }>(`/v1/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    },
    enabled: Boolean(id),
  });

  async function transition(status: OrderStatus) {
    setBusy(true);
    setError("");
    try {
      const token = await accessToken(navigate, `/dashboard/orders/${id}`);
      if (!token) return;
      await apiRequest(`/v1/orders/${id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      await queryClient.invalidateQueries({ queryKey: ["order", id] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ອັບເດດສະຖານະບໍ່ສຳເລັດ");
    } finally {
      setBusy(false);
    }
  }

  async function printLabel() {
    setBusy(true);
    setError("");
    try {
      const token = await accessToken(navigate, `/dashboard/orders/${id}`);
      if (!token || !id) return;
      const result = await apiRequest<{ data: PrintableLabel[] }>("/v1/orders/labels", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_ids: [id] }),
      });
      setLabels(result.data);
      await queryClient.invalidateQueries({ queryKey: ["order", id] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ພິມໃບຕາດບໍ່ສຳເລັດ");
    } finally {
      setBusy(false);
    }
  }

  if (order.isLoading) return <div className="profile-loading skeleton" aria-label="ກຳລັງໂຫຼດ" />;
  if (!order.data) return <p className="form-error">ບໍ່ພົບຄຳສັ່ງນີ້</p>;
  const data = order.data.data;

  const STEPS: OrderStatus[] = ["draft", "confirmed", "packed", "shipped", "delivered", "settled"];
  const currentIndex = STEPS.indexOf(data.status);
  const nextStatus: OrderStatus | null =
    currentIndex >= 0 && currentIndex < STEPS.length - 1 ? STEPS[currentIndex + 1] : null;

  return (
    <article className="page-enter dashboard-page order-detail">
      {labels && <LabelPrintSheet labels={labels} onClose={() => setLabels(null)} />}
      <header className="profile-identity">
        <div className="profile-name">
          <p className="eyebrow">ORDER</p>
          <h1>{data.friendly_id}</h1>
        </div>
        <OrderStatusBadge status={data.status} />
      </header>

      {!["returned", "disputed", "settled"].includes(data.status) && (
        <ol className="order-timeline">
          {STEPS.map((step, index) => (
            <li key={step} className={index <= currentIndex ? "is-done" : ""}>
              {step}
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <section className="dashboard-section">
        <p className="eyebrow">Items</p>
        {data.order_items.map((item) => (
          <div className="order-item-row" key={item.id}>
            <span>
              {item.product_name} ×{item.quantity}
            </span>
            <span>{currency(item.line_total)}</span>
          </div>
        ))}
        <div className="order-item-row">
          <span>ຄ່າສົ່ງ</span>
          <span>{currency(data.delivery_fee)}</span>
        </div>
        <div className="order-item-row order-item-row--total">
          <strong>ລວມ</strong>
          <strong>{currency(data.amount)}</strong>
        </div>
      </section>

      <section className="dashboard-section">
        <p className="eyebrow">ລູກຄ້າ</p>
        <p>{data.customers?.name ?? "—"}</p>
        {data.customers?.phone && <a href={`tel:${data.customers.phone}`}>{data.customers.phone}</a>}
        {data.delivery_address && <AddressDisplay address={data.delivery_address} />}
      </section>

      {data.tracking_number && (
        <section className="dashboard-section">
          <p className="eyebrow">ໃບຕາດ</p>
          <p>
            {data.courier} {data.tracking_number}
          </p>
        </section>
      )}

      <footer className="order-detail-actions">
        {(data.status === "confirmed" || data.status === "packed") && (
          <Button variant="secondary" disabled={busy} onClick={() => void printLabel()}>
            <Printer size={16} /> ພິມໃບຕາດ
          </Button>
        )}
        {nextStatus && ACTION_LABELS[nextStatus] && (
          <Button disabled={busy} onClick={() => void transition(nextStatus)}>
            {ACTION_LABELS[nextStatus]}
          </Button>
        )}
        {!["returned", "disputed", "settled"].includes(data.status) && (
          <Button variant="ghost" disabled={busy} onClick={() => void transition("returned")}>
            ໝາຍວ່າສົ່ງຄືນ
          </Button>
        )}
      </footer>
    </article>
  );
}
