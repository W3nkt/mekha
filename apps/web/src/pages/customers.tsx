import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Phone, Search } from "lucide-react";
import { OrderStatusBadge } from "@mekha/ui";
import type { OrderStatus } from "@mekha/types";

import { ApiError, apiRequest } from "../lib/api";
import { supabase } from "../lib/supabase";

async function accessToken(navigate: (to: string) => void, returnTo: string) {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session) {
    navigate(`/login?return=${encodeURIComponent(returnTo)}`);
    return null;
  }
  return session.access_token;
}

type Customer = {
  id: string;
  phone: string;
  name: string | null;
  province: string | null;
  district: string | null;
  order_count: number;
  last_order_at: string;
};

const dateOnly = (iso: string) => new Date(iso).toLocaleDateString("lo-LA");

export function CustomerListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const token = await accessToken(navigate, "/dashboard/customers");
      if (!token) throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
      return apiRequest<{ data: Customer[] }>("/v1/customers", {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  });

  const filtered = (customers.data?.data ?? []).filter((customer) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return (
      customer.phone.includes(needle) ||
      (customer.name ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <div className="page-enter dashboard-page">
      <header className="profile-identity">
        <div className="profile-name">
          <p className="eyebrow">Seller OS</p>
          <h1>ລູກຄ້າ ({customers.data?.data.length ?? 0})</h1>
        </div>
      </header>

      <label className="seller-search-box orders-search">
        <Search size={19} aria-hidden="true" />
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="ຄົ້ນຫາ..." />
      </label>

      {customers.isLoading && <div className="profile-loading skeleton" aria-label="ກຳລັງໂຫຼດ" />}
      {customers.isError && <p className="form-error">ໂຫລດລູກຄ້າບໍ່ສຳເລັດ</p>}
      {customers.data && filtered.length === 0 && <p className="search-message">ບໍ່ພົບລູກຄ້າ</p>}

      <div className="order-list">
        {filtered.map((customer) => (
          <Link className="order-card customer-card" key={customer.id} to={`/dashboard/customers/${customer.id}`}>
            <strong>{customer.name ?? "—"}</strong>
            <span>{customer.phone}</span>
            <span className="customer-card__meta">
              {customer.order_count} ຄຳສັ່ງ · ຊື້ລ່າສຸດ {dateOnly(customer.last_order_at)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const customer = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const token = await accessToken(navigate, `/dashboard/customers/${id}`);
      if (!token) throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
      return apiRequest<{
        data: Customer & {
          village_landmark: string | null;
          total_spent: number;
          returned_or_disputed_count: number;
          orders: { id: string; friendly_id: string; status: OrderStatus; amount: number; created_at: string }[];
        };
      }>(`/v1/customers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    },
    enabled: Boolean(id),
  });

  if (customer.isLoading) return <div className="profile-loading skeleton" aria-label="ກຳລັງໂຫຼດ" />;
  if (!customer.data) return <p className="form-error">ບໍ່ພົບລູກຄ້ານີ້</p>;
  const data = customer.data.data;

  return (
    <article className="page-enter dashboard-page">
      <header className="profile-identity">
        <div className="profile-name">
          <p className="eyebrow">CUSTOMER</p>
          <h1>{data.name ?? "—"}</h1>
        </div>
        <a className="mk-button mk-button--secondary" href={`tel:${data.phone}`}>
          <Phone size={16} /> ໂທ
        </a>
      </header>

      <section className="dashboard-section">
        <p className="eyebrow">ທີ່ຢູ່</p>
        <p>
          {[data.district, data.province].filter(Boolean).join(", ") || "ບໍ່ລະບຸ"}
          {data.village_landmark ? ` · ${data.village_landmark}` : ""}
        </p>
      </section>

      <section className="dashboard-stats" aria-label="ສະຖິຕິລູກຄ້າ">
        <div>
          <strong>{data.order_count}</strong>
          <span>ຄຳສັ່ງທັງໝົດ</span>
        </div>
        <div>
          <strong>{data.total_spent.toLocaleString()} ₭</strong>
          <span>ລາຍຈ່າຍລວມ</span>
        </div>
        <div>
          <strong>{data.returned_or_disputed_count}</strong>
          <span>ກັບຄືນ/ຂໍ້ຂັດແຍ່ງ</span>
        </div>
      </section>

      <section className="dashboard-section">
        <p className="eyebrow">ຄຳສັ່ງທັງໝົດ</p>
        <div className="order-list">
          {data.orders.map((order) => (
            <Link className="order-card customer-order-row" key={order.id} to={`/dashboard/orders/${order.id}`}>
              <span>{order.friendly_id}</span>
              <OrderStatusBadge status={order.status} />
              <strong>{order.amount.toLocaleString()} ₭</strong>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
