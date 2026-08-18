import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  CloudOff,
  LocateFixed,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import type { CreateOrder, PaymentMethod } from "@mekha/types";

import { ApiError, apiRequest } from "../lib/api";
import { supabase } from "../lib/supabase";
import {
  offlineDb,
  type CachedCustomer,
  type CachedPlace,
  type CachedProduct,
} from "../lib/offlineDb";

export function computeOrderTotal(
  items: { unit_price: number; quantity: number }[],
): number {
  return items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
}

const rawDigits = (value: string) => value.replace(/[^\d]/g, "");
const phoneDigits = (value: string) => rawDigits(value).slice(-8);

export function findCustomerByPhone(
  customers: CachedCustomer[],
  phone: string,
): CachedCustomer | undefined {
  const target = phoneDigits(phone);
  if (target.length < 8) return undefined;
  return customers.find((customer) => phoneDigits(customer.phone) === target);
}

const paymentLabels: Record<PaymentMethod, string> = {
  cod: "ເກັບເງິນປາຍທາງ (COD)",
  bank_transfer: "ໂອນເງິນ",
  qr: "QR",
  other: "ອື່ນໆ",
};

async function syncPendingOrders(token: string) {
  const pending = await offlineDb.pendingOrders.orderBy("createdAt").toArray();
  for (const order of pending) {
    try {
      await apiRequest("/v1/orders", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(order.payload),
      });
      await offlineDb.pendingOrders.delete(order.localId);
    } catch {
      await offlineDb.pendingOrders.update(order.localId, {
        attempts: order.attempts + 1,
      });
    }
  }
}

export function OrderEntryPage() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [products, setProducts] = useState<CachedProduct[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});

  const [phone, setPhone] = useState("");
  const [matches, setMatches] = useState<CachedCustomer[]>([]);
  const [selected, setSelected] = useState<CachedCustomer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [provinces, setProvinces] = useState<CachedPlace[]>([]);
  const [districts, setDistricts] = useState<CachedPlace[]>([]);
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [villageLandmark, setVillageLandmark] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [note, setNote] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ friendlyId: string; queued: boolean } | null>(
    null,
  );
  const pendingCount = useRef(0);

  async function accessToken() {
    const session = supabase
      ? (await supabase.auth.getSession()).data.session
      : null;
    if (!session) {
      navigate(`/login?return=${encodeURIComponent("/dashboard/orders/new")}`, {
        replace: true,
      });
      return null;
    }
    return session.access_token;
  }

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const token = await accessToken();
      if (!token) return;

      try {
        const response = await apiRequest<{ data: CachedProduct[] }>(
          "/v1/products",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setProducts(response.data);
        await offlineDb.products.bulkPut(response.data);
      } catch {
        setProducts(await offlineDb.products.toArray());
      }

      if (supabase) {
        try {
          const [p, d] = await Promise.all([
            supabase
              .from("lao_provinces")
              .select("id,name_lo,name_en,sort_order")
              .order("sort_order"),
            supabase
              .from("lao_districts")
              .select("id,province_id,name_lo,name_en,sort_order")
              .order("sort_order"),
          ]);
          if (p.data) {
            setProvinces(p.data);
            await offlineDb.provinces.bulkPut(p.data);
          }
          if (d.data) {
            setDistricts(d.data);
            await offlineDb.districts.bulkPut(d.data);
          }
        } catch {
          setProvinces(await offlineDb.provinces.toArray());
          setDistricts(await offlineDb.districts.toArray());
        }
      } else {
        setProvinces(await offlineDb.provinces.toArray());
        setDistricts(await offlineDb.districts.toArray());
      }

      pendingCount.current = await offlineDb.pendingOrders.count();
      if (pendingCount.current > 0) void syncPendingOrders(token);
    })();
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    void (async () => {
      const token = await accessToken();
      if (token) void syncPendingOrders(token);
    })();
  }, [isOnline]);

  useEffect(() => {
    const digits = rawDigits(phone);
    if (digits.length < 3) {
      setMatches([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        const local = await offlineDb.customers
          .filter((customer) => rawDigits(customer.phone).startsWith(digits))
          .toArray();
        setMatches(local);
        if (!isOnline) return;
        try {
          const token = await accessToken();
          if (!token) return;
          const remote = await apiRequest<{ data: CachedCustomer[] }>(
            `/v1/customers/search?phone_prefix=${encodeURIComponent(phone.trim())}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          setMatches(remote.data);
          await offlineDb.customers.bulkPut(remote.data);
        } catch {
          // Local matches already shown; nothing further to do offline.
        }
      })();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [phone, isOnline]);

  function selectCustomer(customer: CachedCustomer) {
    setSelected(customer);
    setPhone(customer.phone);
    setCustomerName(customer.name ?? "");
    setProvince(customer.province ?? "");
    setDistrict(customer.district ?? "");
    setVillageLandmark(customer.village_landmark ?? "");
    setGps(
      customer.gps_lat !== null && customer.gps_lng !== null
        ? { lat: customer.gps_lat, lng: customer.gps_lng }
        : null,
    );
    setMatches([]);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      setGps({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });
  }

  const filteredProducts = useMemo(() => {
    const needle = productQuery.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) =>
      `${product.name} ${product.name_lao ?? ""}`.toLowerCase().includes(needle),
    );
  }, [products, productQuery]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, quantity]) => quantity > 0)
        .map(([productId, quantity]) => {
          const product = products.find((item) => item.id === productId);
          return product
            ? {
                product_id: product.id,
                name: product.name_lao || product.name,
                quantity,
                unit_price: product.price,
              }
            : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [cart, products],
  );

  const total = computeOrderTotal(cartItems);

  function setQuantity(productId: string, quantity: number) {
    setCart((current) => ({ ...current, [productId]: Math.max(0, quantity) }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (cartItems.length === 0) return setError("ກະລຸນາເລືອກສິນຄ້າຢ່າງໜ້ອຍ 1 ລາຍການ");
    if (phoneDigits(phone).length < 8) return setError("ກະລຸນາໃສ່ເບີໂທລູກຄ້າໃຫ້ຖືກຕ້ອງ");
    if (!customerName.trim()) return setError("ກະລຸນາໃສ່ຊື່ລູກຄ້າ");
    if (!province || !district) return setError("ກະລຸນາເລືອກແຂວງ ແລະ ເມືອງ");
    if (!villageLandmark.trim()) return setError("ກະລຸນາໃສ່ບ້ານ ຫຼື ຈຸດສັງເກດ");

    const provinceRow = provinces.find((row) => row.id === province);
    const districtRow = districts.find((row) => row.id === district);
    if (!provinceRow || !districtRow)
      return setError("ແຂວງ ຫຼື ເມືອງບໍ່ຖືກຕ້ອງ");

    setError("");
    setSubmitting(true);
    const payload: CreateOrder = {
      customer_name: customerName.trim(),
      customer_phone: phone.trim(),
      shipping_address: {
        province_id: provinceRow.id,
        province_name_lo: provinceRow.name_lo,
        province_name_en: provinceRow.name_en,
        district_id: districtRow.id,
        district_name_lo: districtRow.name_lo,
        district_name_en: districtRow.name_en,
        village_landmark: villageLandmark.trim(),
        gps_lat: gps?.lat,
        gps_lng: gps?.lng,
      },
      payment_method: paymentMethod,
      items: cartItems,
      note: note.trim() || undefined,
    };

    try {
      const token = await accessToken();
      if (!token) return;
      const response = await apiRequest<{
        order_id: string;
        status: string;
        tracking_friendly_id: string;
      }>("/v1/orders", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      setSuccess({ friendlyId: response.tracking_friendly_id, queued: false });
    } catch (err) {
      const isNetworkError = !(err instanceof ApiError);
      if (isNetworkError || !isOnline) {
        await offlineDb.pendingOrders.add({
          localId: crypto.randomUUID(),
          payload,
          createdAt: new Date().toISOString(),
          attempts: 0,
        });
        setSuccess({ friendlyId: "", queued: true });
      } else {
        setError(err instanceof ApiError ? err.message : "ສ້າງຄຳສັ່ງບໍ່ສຳເລັດ");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setCart({});
    setPhone("");
    setSelected(null);
    setCustomerName("");
    setProvince("");
    setDistrict("");
    setVillageLandmark("");
    setGps(null);
    setPaymentMethod("cod");
    setNote("");
    setSuccess(null);
  }

  if (success) {
    return (
      <div className="page-enter order-success">
        <div className="order-success__mark">
          <Check size={30} />
        </div>
        {success.queued ? (
          <>
            <h1>ຄຳສັ່ງຖືກບັນທຶກໄວ້</h1>
            <p>ບໍ່ມີການເຊື່ອມຕໍ່ — ຄຳສັ່ງຈະຖືກສົ່ງອັດຕະໂນມັດເມື່ອກັບມາອອນລາຍ.</p>
          </>
        ) : (
          <>
            <h1>ສຳເລັດ!</h1>
            <p className="order-success__id">{success.friendlyId}</p>
          </>
        )}
        <div className="dashboard-edit-form-actions">
          <button className="mk-button mk-button--primary" onClick={resetForm}>
            ສ້າງຄຳສັ່ງໃໝ່
          </button>
          <Link className="mk-button mk-button--ghost" to="/dashboard">
            ກັບໄປແດຊບອດ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="page-enter order-entry-page"
      onSubmit={(event) => void submit(event)}
    >
      <header className="order-entry-header">
        <h1>ສ້າງຄຳສັ່ງ</h1>
        {!isOnline && (
          <span className="order-offline-chip">
            <CloudOff size={14} /> ບໍ່ມີການເຊື່ອມຕໍ່
          </span>
        )}
      </header>

      <label className="product-search-box">
        <Search size={18} aria-hidden="true" />
        <input
          value={productQuery}
          onChange={(event) => setProductQuery(event.target.value)}
          placeholder="ຄົ້ນຫາສິນຄ້າ..."
        />
      </label>
      <div className="order-product-list">
        {filteredProducts.map((product) => {
          const quantity = cart[product.id] ?? 0;
          return (
            <div className="order-product-row" key={product.id}>
              <div>
                <strong>{product.name_lao || product.name}</strong>
                <span>
                  {product.price.toLocaleString()} ₭ ·{" "}
                  <span className={product.stock_count === 0 ? "order-stock--out" : undefined}>
                    {product.stock_count} ເຫຼືອ
                  </span>
                </span>
              </div>
              <div className="product-stock-stepper">
                <button
                  type="button"
                  aria-label="ຫຼຸດຈຳນວນ"
                  onClick={() => setQuantity(product.id, quantity - 1)}
                >
                  <Minus size={16} />
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  aria-label="ເພີ່ມຈຳນວນ"
                  onClick={() => setQuantity(product.id, quantity + 1)}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <section className="order-customer-section">
        <p className="eyebrow">Customer</p>
        <h2>ລູກຄ້າ</h2>
        <label className="mk-field mk-field--wide">
          <span className="mk-field__label">ເບີໂທ *</span>
          <input
            className="mk-input"
            inputMode="tel"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              setSelected(null);
            }}
            placeholder="020XXXXXXXX"
          />
        </label>
        {matches.length > 0 && !selected && (
          <div className="order-customer-matches">
            {matches.map((customer) => (
              <button
                type="button"
                key={customer.id}
                onClick={() => selectCustomer(customer)}
              >
                {customer.phone} — {customer.name || "—"} ({customer.order_count} ຄຳສັ່ງ)
              </button>
            ))}
          </div>
        )}
        <label className="mk-field mk-field--wide">
          <span className="mk-field__label">ຊື່ *</span>
          <input
            className="mk-input"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
          />
        </label>
        <label className="mk-field">
          <span className="mk-field__label">ແຂວງ *</span>
          <select
            className="mk-input"
            value={province}
            onChange={(event) => {
              setProvince(event.target.value);
              setDistrict("");
            }}
          >
            <option value="">ເລືອກແຂວງ</option>
            {provinces.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name_lo}
              </option>
            ))}
          </select>
        </label>
        <label className="mk-field">
          <span className="mk-field__label">ເມືອງ *</span>
          <select
            className="mk-input"
            disabled={!province}
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
          >
            <option value="">ເລືອກເມືອງ</option>
            {districts
              .filter((row) => row.province_id === province)
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name_lo}
                </option>
              ))}
          </select>
        </label>
        <label className="mk-field mk-field--wide">
          <span className="mk-field__label">ບ້ານ / ຈຸດສັງເກດ *</span>
          <input
            className="mk-input"
            value={villageLandmark}
            onChange={(event) => setVillageLandmark(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="order-location-button mk-field--wide"
          onClick={useCurrentLocation}
        >
          <LocateFixed size={16} />{" "}
          {gps ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : "ໃຊ້ທີ່ຕັ້ງປັດຈຸບັນ"}
        </button>
      </section>

      <section className="order-payment-section">
        <label className="mk-field mk-field--wide">
          <span className="mk-field__label">ການຈ່າຍ</span>
          <select
            className="mk-input"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
          >
            <option value="cod">{paymentLabels.cod}</option>
            <option value="bank_transfer">{paymentLabels.bank_transfer}</option>
            <option value="qr">{paymentLabels.qr}</option>
          </select>
        </label>
        <label className="mk-field mk-field--wide">
          <span className="mk-field__label">ໝາຍເຫດ</span>
          <textarea
            className="mk-input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </section>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <footer className="order-entry-footer">
        <span>ຍອດລວມ: {total.toLocaleString()} ₭</span>
        <button className="mk-button mk-button--primary" disabled={submitting}>
          {submitting ? "ກຳລັງບັນທຶກ…" : "ຢືນຢັນຄຳສັ່ງ"}
        </button>
      </footer>
    </form>
  );
}
