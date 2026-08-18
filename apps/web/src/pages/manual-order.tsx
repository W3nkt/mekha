import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Line = { id: string; name: string; price: number; stock: number; quantity: number };
export const calculateOrderTotal = (lines: Pick<Line, "price" | "quantity">[]) => lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
export const normalizeCustomerPhone = (phone: string) => phone.replace(/\D/g, "").replace(/^856/, "0");

const starterProducts: Line[] = [
  { id: "demo-a", name: "ສິນຄ້າ A", price: 40000, stock: 8, quantity: 0 },
  { id: "demo-b", name: "ສິນຄ້າ B", price: 25000, stock: 0, quantity: 0 },
];

export function ManualOrderPage() {
  const [lines, setLines] = useState(starterProducts);
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState("cod");
  const [saved, setSaved] = useState(false);
  const total = useMemo(() => calculateOrderTotal(lines), [lines]);
  const update = (id: string, delta: number) => setLines((items) => items.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item));
  const submit = () => {
    const order = { id: crypto.randomUUID(), lines: lines.filter((line) => line.quantity), customer_phone: normalizeCustomerPhone(phone), payment_method: payment, total, status: "pending_sync", created_at: new Date().toISOString() };
    const queue = JSON.parse(localStorage.getItem("mekha-order-sync-queue") || "[]") as unknown[];
    localStorage.setItem("mekha-order-sync-queue", JSON.stringify([...queue, order]));
    setSaved(true);
  };
  if (saved) return <section className="page-enter order-success"><h1>ບັນທຶກຄຳສັ່ງແລ້ວ</h1><p>ບໍ່ມີການເຊື່ອມຕໍ່ — ຄຳສັ່ງຈະຖືກສົ່ງຫຼັງຈາກອອນລາຍ</p><strong>ORD-{Date.now().toString().slice(-4)}</strong><Link className="primary-link" to="/dashboard/orders">ກັບໄປຄຳສັ່ງ</Link></section>;
  return <form className="page-enter manual-order-form" onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <div className="seller-section-topbar"><h1>ສ້າງຄຳສັ່ງ</h1><Link to="/dashboard/orders">ຍົກເລີກ</Link></div>
    <label>ຄົ້ນຫາສິນຄ້າ<input placeholder="ຄົ້ນຫາສິນຄ້າ..." /></label>
    <div className="manual-product-list">{lines.map((line) => <div className="manual-product" key={line.id}><div><strong>{line.name}</strong><small>{line.price.toLocaleString()} ₭ · <span className={line.stock === 0 ? "stock-empty" : ""}>{line.stock} ເຫຼືອ</span></small></div><div className="quantity-stepper"><button type="button" onClick={() => update(line.id, -1)} aria-label="Decrease">−</button><b>{line.quantity}</b><button type="button" onClick={() => update(line.id, 1)} aria-label="Increase">+</button></div></div>)}</div>
    <label>ລູກຄ້າ — ເບີໂທ<input required inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="020XXXXXXXX" /></label>
    <label>ການຈ່າຍ<select value={payment} onChange={(event) => setPayment(event.target.value)}><option value="cod">COD</option><option value="bank_transfer">ໂອນເງິນ</option><option value="qr">QR</option></select></label>
    <div className="manual-order-total"><span>ຍອດລວມ</span><strong>{total.toLocaleString()} ₭</strong></div><button className="primary-link" type="submit" disabled={!lines.some((line) => line.quantity > 0)}>ຢືນຢັນຄຳສັ່ງ</button>
  </form>;
}
