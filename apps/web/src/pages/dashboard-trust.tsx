import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

type Badge = { status: string; months_active: number; verified_order_count: number; on_time_rate: number | null; dispute_rate: number | null; badge_image_url: string; widget_embed_code: string };
export function DashboardTrustPage() {
  const [sellerId, setSellerId] = useState("");
  const [badge, setBadge] = useState<Badge | null>(null);
  const [error, setError] = useState("");
  async function load() { try { const result = await apiRequest<{ data: Badge }>(`/v1/sellers/${sellerId}/badge`); setBadge(result.data); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load badge"); } }
  useEffect(() => { if (sellerId) void load(); }, [sellerId]);
  return <main className="page-enter"><h1>Your trust badge</h1><label>Seller ID<input value={sellerId} onChange={(event) => setSellerId(event.target.value)} placeholder="Seller UUID" /></label>{badge && <section><h2>{badge.status.replace("_", " ")}</h2><p>{badge.verified_order_count} verified orders · {badge.months_active} months active</p><p>On-time delivery: {badge.on_time_rate === null ? "—" : `${Math.round(badge.on_time_rate * 100)}%`} · Disputes: {badge.dispute_rate === null ? "—" : `${(badge.dispute_rate * 100).toFixed(1)}%`}</p><img src={badge.badge_image_url} alt="KhaiDee verified seller badge" width={600} /><p><a href={badge.badge_image_url} download>Download badge PNG</a></p><textarea readOnly value={badge.widget_embed_code} /></section>}{error && <p role="alert">{error}</p>}</main>;
}
