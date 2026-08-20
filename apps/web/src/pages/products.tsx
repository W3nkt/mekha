import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Camera,
  Minus,
  MoveLeft,
  MoveRight,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Product } from "@mekha/types";

import { ApiError, apiRequest } from "../lib/api";
import { supabase } from "../lib/supabase";

const MAX_PHOTOS = 3;

export function stockBadge(
  stockCount: number,
): { tone: "low" | "out"; label: string } | null {
  if (stockCount <= 0) return { tone: "out", label: "ໝົດສ໊ຕ໊ອກ" };
  if (stockCount <= 5) return { tone: "low", label: "ສ໊ຕ໊ອກໃກ້ໝົດ" };
  return null;
}

export function profitMargin(
  price: number,
  cost: number | null,
): { percent: number; perUnit: number } | null {
  if (cost === null || !Number.isFinite(cost) || price <= 0) return null;
  return {
    percent: Math.round(((price - cost) / price) * 100),
    perUnit: price - cost,
  };
}

async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Resize failed"))),
      type,
      0.85,
    );
  });
}

function useSellerToken() {
  const navigate = useNavigate();
  return async function accessToken() {
    const session = supabase
      ? (await supabase.auth.getSession()).data.session
      : null;
    if (!session) {
      navigate(`/login?return=${encodeURIComponent("/dashboard/products")}`, {
        replace: true,
      });
      return null;
    }
    return session.access_token;
  };
}

function ProductCard({
  product,
  onDelete,
}: {
  product: Product;
  onDelete: (id: string) => void;
}) {
  const badge = stockBadge(product.stock_count);
  return (
    <div className="product-card">
      <Link
        className="product-card__link"
        to={`/dashboard/products/${product.id}`}
      >
        <div className="product-photo" aria-hidden="true">
          {product.photo_urls[0] ? (
            <img src={product.photo_urls[0]} alt="" />
          ) : (
            <Package size={22} />
          )}
        </div>
        <div className="product-card__body">
          <div className="product-card__heading">
            <h2>{product.name_lao || product.name}</h2>
            {badge && (
              <span className={`mk-stock-badge mk-stock-badge--${badge.tone}`}>
                {badge.label}
              </span>
            )}
          </div>
          <div className="product-meta">
            <span>ລາຄາ: {product.price.toLocaleString()} ₭</span>
            {product.cost !== null && (
              <span>ຕົ້ນທຶນ: {product.cost.toLocaleString()} ₭</span>
            )}
            <span>ຄົງເຫຼືອ: {product.stock_count} ຊິ້ນ</span>
          </div>
        </div>
      </Link>
      <button
        className="product-card__delete"
        type="button"
        aria-label="ລຶບສິນຄ້າ"
        onClick={() => onDelete(product.id)}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export function ProductListPage() {
  const accessToken = useSellerToken();
  const [query, setQuery] = useState("");

  const products = useQuery({
    queryKey: ["seller-products"],
    queryFn: async () => {
      const token = await accessToken();
      if (!token) throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
      return apiRequest<{ data: Product[] }>("/v1/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  });

  async function remove(id: string) {
    const token = await accessToken();
    if (!token) return;
    await apiRequest(`/v1/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await products.refetch();
  }

  const list = products.data?.data ?? [];
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? list.filter((product) =>
        `${product.name} ${product.name_lao ?? ""}`
          .toLowerCase()
          .includes(needle),
      )
    : list;

  return (
    <div className="page-enter product-list-page">
      <header className="product-list-header">
        <h1>ສິນຄ້າ ({list.length})</h1>
        <Link className="mk-button mk-button--primary mk-button--nowrap" to="/dashboard/products/new">
          <Plus size={18} /> ເພີ່ມສິນຄ້າ
        </Link>
      </header>
      <label className="product-search-box">
        <Search size={18} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ຄົ້ນຫາສິນຄ້າ..."
        />
      </label>
      {products.isLoading && (
        <div className="profile-loading skeleton" aria-label="ກຳລັງໂຫຼດ" />
      )}
      {!products.isLoading && filtered.length === 0 && (
        <div className="search-message">
          <Package size={30} aria-hidden="true" />
          <h2>{list.length === 0 ? "ຍັງບໍ່ມີສິນຄ້າ" : "ບໍ່ພົບສິນຄ້ານີ້"}</h2>
          {list.length === 0 && (
            <Link className="primary-link" to="/dashboard/products/new">
              ເພີ່ມສິນຄ້າທຳອິດ
            </Link>
          )}
        </div>
      )}
      {filtered.length > 0 && (
        <div className="product-list">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onDelete={(id) => void remove(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const accessToken = useSellerToken();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stockCount, setStockCount] = useState("0");
  const [sku, setSku] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const products = useQuery({
    queryKey: ["seller-products"],
    enabled: isEdit,
    queryFn: async () => {
      const token = await accessToken();
      if (!token) throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
      return apiRequest<{ data: Product[] }>("/v1/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  });

  useEffect(() => {
    if (!isEdit || !products.data) return;
    const product = products.data.data.find((item) => item.id === id);
    if (!product) return;
    setName(product.name_lao || product.name);
    setPrice(String(product.price));
    setCost(product.cost === null ? "" : String(product.cost));
    setStockCount(String(product.stock_count));
    setSku(product.sku ?? "");
    setPhotos(product.photo_urls);
  }, [products.data, id, isEdit]);

  async function addPhoto(file?: File) {
    if (!file || photos.length >= MAX_PHOTOS) return;
    if (!["image/jpeg", "image/png"].includes(file.type))
      return setError("ຮັບສະເພາະຮູບ JPG ຫຼື PNG");
    setError("");
    setUploading(true);
    try {
      const blob = await resizeImage(file);
      const token = await accessToken();
      if (!token || !supabase) return;
      const signed = await apiRequest<{
        upload_url: string;
        token: string;
        path: string;
        public_url: string;
      }>("/v1/products/photo-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mime_type: blob.type }),
      });
      const uploaded = await supabase.storage
        .from("product-photos")
        .uploadToSignedUrl(signed.path, signed.token, blob, {
          contentType: blob.type,
        });
      if (uploaded.error) throw uploaded.error;
      setPhotos((current) => [...current, signed.public_url]);
    } catch {
      setError("ອັບໂຫລດຮູບບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(index: number) {
    setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsedPrice = Number(price);
    if (!name.trim()) return setError("ກະລຸນາໃສ່ຊື່ສິນຄ້າ");
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0)
      return setError("ລາຄາຂາຍບໍ່ຖືກຕ້ອງ");
    setSaving(true);
    setError("");
    try {
      const token = await accessToken();
      if (!token) return;
      const payload = {
        name: name.trim(),
        price: parsedPrice,
        cost: cost.trim() ? Number(cost) : undefined,
        stock_count: Math.max(0, Math.trunc(Number(stockCount)) || 0),
        sku: sku.trim() || undefined,
        photo_urls: photos,
      };
      if (isEdit) {
        await apiRequest(`/v1/products/${id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/v1/products", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      }
      navigate("/dashboard/products");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ບັນທຶກສິນຄ້າບໍ່ສຳເລັດ");
    } finally {
      setSaving(false);
    }
  }

  const margin = profitMargin(Number(price) || 0, cost.trim() ? Number(cost) : null);

  return (
    <div className="page-enter product-form-page">
      <header>
        <p className="eyebrow">Product catalogue</p>
        <h1>{isEdit ? "ແກ້ໄຂສິນຄ້າ" : "ເພີ່ມສິນຄ້າ"}</h1>
      </header>
      <div className="product-photo-field">
        <span className="mk-field__label">ຮູບສິນຄ້າ</span>
        <div className="product-photo-list">
          {photos.map((url, index) => (
            <div className="product-photo-thumb" key={url}>
              <img src={url} alt="" />
              <div className="product-photo-thumb__actions">
                <button
                  type="button"
                  disabled={index === 0}
                  aria-label="ຍ້າຍໄປກ່ອນ"
                  onClick={() => movePhoto(index, -1)}
                >
                  <MoveLeft size={14} />
                </button>
                <button
                  type="button"
                  aria-label="ລຶບຮູບ"
                  onClick={() => removePhoto(index)}
                >
                  <X size={14} />
                </button>
                <button
                  type="button"
                  disabled={index === photos.length - 1}
                  aria-label="ຍ້າຍໄປຫຼັງ"
                  onClick={() => movePhoto(index, 1)}
                >
                  <MoveRight size={14} />
                </button>
              </div>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="product-photo-add">
              {uploading ? <span>ກຳລັງອັບໂຫລດ…</span> : <Camera size={22} />}
              <input
                type="file"
                accept="image/jpeg,image/png"
                capture="environment"
                disabled={uploading}
                onChange={(event) => {
                  void addPhoto(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      </div>
      <form className="product-form" onSubmit={(event) => void submit(event)}>
        <label className="mk-field mk-field--wide">
          <span className="mk-field__label">ຊື່ສິນຄ້າ *</span>
          <input
            className="mk-input"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="mk-field">
          <span className="mk-field__label">ລາຄາຂາຍ * (₭)</span>
          <input
            className="mk-input"
            required
            inputMode="numeric"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </label>
        <label className="mk-field">
          <span className="mk-field__label">ຕົ້ນທຶນ (₭)</span>
          <input
            className="mk-input"
            inputMode="numeric"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
          />
          <span className="mk-field__helper">ສ່ວນຕົວ — ຜູ້ຊື້ບໍ່ເຫັນ</span>
        </label>
        <label className="mk-field">
          <span className="mk-field__label">ຈຳນວນສ໊ຕ໊ອກ</span>
          <div className="product-stock-stepper">
            <button
              type="button"
              aria-label="ຫຼຸດຈຳນວນ"
              onClick={() =>
                setStockCount(String(Math.max(0, Math.trunc(Number(stockCount) || 0) - 1)))
              }
            >
              <Minus size={16} />
            </button>
            <input
              className="mk-input"
              inputMode="numeric"
              value={stockCount}
              onChange={(event) => setStockCount(event.target.value)}
            />
            <button
              type="button"
              aria-label="ເພີ່ມຈຳນວນ"
              onClick={() => setStockCount(String(Math.trunc(Number(stockCount) || 0) + 1))}
            >
              <Plus size={16} />
            </button>
          </div>
        </label>
        <label className="mk-field mk-field--wide">
          <span className="mk-field__label">SKU / ລະຫັດສິນຄ້າ</span>
          <input
            className="mk-input"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
          />
        </label>
        {margin && (
          <p className="product-margin mk-field--wide">
            ກຳໄລ: {margin.percent}% ({margin.perUnit.toLocaleString()} ₭ ຕໍ່ຊິ້ນ)
          </p>
        )}
        {error && (
          <p className="form-error mk-field--wide" role="alert">
            {error}
          </p>
        )}
        <div className="dashboard-edit-form-actions mk-field--wide">
          <button className="mk-button mk-button--primary" disabled={saving}>
            {saving ? "ກຳລັງບັນທຶກ…" : "ບັນທຶກສິນຄ້າ"}
          </button>
          <Link className="mk-button mk-button--ghost" to="/dashboard/products">
            ຍົກເລີກ
          </Link>
        </div>
      </form>
    </div>
  );
}
