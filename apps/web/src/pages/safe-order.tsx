import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ApiError, apiRequest } from "../lib/api";

type Seller = { id: string; business_name: string; business_name_lao: string | null; verification_status: string };
type SafeOrder = { id: string; friendly_id: string; status: string; amount: number; delivery_fee: number; payment_method: string; terms: Record<string, unknown>; created_at: string; buyer_confirmed_at: string | null; seller_confirmed_at: string | null; seller_profiles?: Seller; order_items?: Array<{ product_name: string; quantity: number; unit_price: number; line_total: number }> };

export function SafeOrderCreatePage() {
  const [params] = useSearchParams();
  const sellerId = params.get("seller") ?? "";
  const [seller, setSeller] = useState<Seller | null>(null);
  const [form, setForm] = useState({ product_name: "", unit_price: "", quantity: "1", delivery_fee: "0", payment_method: "cod", expected_delivery: "", return_terms: "", buyer_name: "", buyer_phone: "" });
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => { if (sellerId) void apiRequest<{ data: Seller }>(`/v1/sellers/${sellerId}`).then((response) => setSeller(response.data)).catch(() => setError("ບໍ່ພົບຮ້ານຄ້ານີ້")); }, [sellerId]);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const total = (Number(form.unit_price) || 0) * (Number(form.quantity) || 0) + (Number(form.delivery_fee) || 0);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    try {
      const response = await apiRequest<{ data: { share_url: string } }>("/v1/orders", { method: "POST", body: JSON.stringify({ seller_id: sellerId, product_name: form.product_name, unit_price: Number(form.unit_price), quantity: Number(form.quantity), delivery_fee: Number(form.delivery_fee), payment_method: form.payment_method, expected_delivery: form.expected_delivery || undefined, return_terms: form.return_terms || undefined, buyer_name: form.buyer_name, buyer_phone: form.buyer_phone }) });
      setShareUrl(response.data.share_url);
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "ສ້າງ Safe Order ບໍ່ສຳເລັດ"); }
  }
  if (shareUrl) return <section className="page-enter profile-state"><h1>ສ້າງ Safe Order ສຳເລັດ</h1><p>ແບ່ງປັນລິ້ງນີ້ໃຫ້ຮ້ານຄ້າ:</p><code>{shareUrl}</code><button type="button" onClick={() => void navigator.clipboard.writeText(shareUrl)}>ສຳເນົາລິ້ງ</button></section>;
  return <form className="page-enter safe-order-form" onSubmit={(event) => void submit(event)}><p className="eyebrow">LaoTrust Safe Order</p><h1>ສ້າງ Safe Order</h1><p>{seller?.business_name_lao || seller?.business_name || sellerId}</p><label>ສິນຄ້າ<input required value={form.product_name} onChange={(event) => update("product_name", event.target.value)} /></label><label>ລາຄາຕໍ່ໜ່ວຍ<input required type="number" min="0" value={form.unit_price} onChange={(event) => update("unit_price", event.target.value)} /></label><label>ຈຳນວນ<input required type="number" min="1" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} /></label><label>ຄ່າສົ່ງ<input type="number" min="0" value={form.delivery_fee} onChange={(event) => update("delivery_fee", event.target.value)} /></label><label>ວິທີຈ່າຍ<select value={form.payment_method} onChange={(event) => update("payment_method", event.target.value)}><option value="cod">COD</option><option value="bank_transfer">ໂອນເງິນ</option><option value="qr">QR</option></select></label><label>ຄາດວ່າຈະໄດ້ຮັບ<input type="date" value={form.expected_delivery} onChange={(event) => update("expected_delivery", event.target.value)} /></label><label>ເງື່ອນໄຂການຄືນ<textarea value={form.return_terms} onChange={(event) => update("return_terms", event.target.value)} /></label><label>ຊື່ຜູ້ຊື້<input required value={form.buyer_name} onChange={(event) => update("buyer_name", event.target.value)} /></label><label>ເບີໂທ<input required type="tel" value={form.buyer_phone} onChange={(event) => update("buyer_phone", event.target.value)} /></label><strong>ລວມ: {total.toLocaleString()} ₭</strong>{error && <p className="form-error" role="alert">{error}</p>}<button className="mk-button mk-button--primary">ສ້າງ Safe Order</button><Link to={`/seller/${sellerId}`}>ກັບໄປໂປຣໄຟລ໌</Link></form>;
}

export function SafeOrderPage() {
  const { safeUrl = "" } = useParams();
  const [order, setOrder] = useState<SafeOrder | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void apiRequest<{ data: SafeOrder }>(`/v1/orders/${safeUrl}`).then((response) => setOrder(response.data)).catch(() => setError("ບໍ່ພົບ Safe Order ນີ້")); }, [safeUrl]);
  if (error) return <div className="profile-state"><h1>{error}</h1></div>;
  if (!order) return <div className="profile-loading skeleton" aria-label="Loading" />;
  const seller = order.seller_profiles;
  return <article className="page-enter profile-section safe-order-view"><p className="eyebrow">Safe Order {order.friendly_id}</p><h1>{seller?.business_name_lao || seller?.business_name}</h1><p>ສະຖານະ: {order.status === "confirmed" ? "ຢືນຢັນແລ້ວ" : "ລໍຖ້າຮ້ານຢືນຢັນ"}</p>{order.order_items?.map((item) => <p key={item.product_name}>{item.product_name} × {item.quantity} — {item.line_total.toLocaleString()} ₭</p>)}<h2>ລວມ: {(order.amount + order.delivery_fee).toLocaleString()} ₭</h2><p>ສ້າງເມື່ອ: {new Date(order.created_at).toLocaleString("lo-LA")}</p>{order.seller_confirmed_at && <p>ຢືນຢັນໂດຍຮ້ານ: {new Date(order.seller_confirmed_at).toLocaleString("lo-LA")}</p>}</article>;
}
