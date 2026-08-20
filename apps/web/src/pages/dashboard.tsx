import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Check,
  Circle,
  Copy,
  Pencil,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import type { SellerDashboardChecklist, SellerDashboardProfile } from "@mekha/types";

import { ApiError, apiRequest } from "../lib/api";
import { SellerAvatar } from "../components/SellerAvatar";
import { supabase } from "../lib/supabase";
import { getVerification } from "./seller-profile";

const planLabel = { free: "Free", standard: "Standard", pro: "Pro" } as const;
const badgeTone = {
  verified: "verified",
  partial: "partially_verified",
  unverified: "unverified",
} as const;
const badgeLabel = {
  verified: "ຢືນຢັນແລ້ວ",
  partial: "ກຳລັງກວດສອບ",
  unverified: "ຍັງບໍ່ຢືນຢັນ",
} as const;

export type ChecklistStep = {
  key: keyof SellerDashboardChecklist;
  label: string;
  done: boolean;
  cta?: { label: string; to: string };
  waitingLabel?: string;
};

export function buildChecklistSteps(
  checklist: SellerDashboardChecklist,
): ChecklistStep[] {
  return [
    {
      key: "profile_created",
      label: "ສ້າງໂປຣໄຟລ໌",
      done: checklist.profile_created,
    },
    {
      key: "verification_submitted",
      label: "ສົ່ງເອກະສານຢືນຢັນ",
      done: checklist.verification_submitted,
      cta: { label: "ສົ່ງດຽວນີ້", to: "/seller/verify" },
    },
    {
      key: "verification_approved",
      label: "ໄດ້ຮັບການຢືນຢັນ",
      done: checklist.verification_approved,
      waitingLabel: "ລໍຖ້ານຳໝ້ານ",
    },
    {
      key: "first_order_created",
      label: "ສ້າງ Safe Order ທຳອິດ",
      done: checklist.first_order_created,
      cta: { label: "ລອງດຽວນີ້", to: "/dashboard/orders/new" },
    },
  ];
}

type Place = { id: string; province_id?: string; name_lo: string };
type EditForm = {
  business_name: string;
  business_name_lao: string;
  description: string;
  province: string;
  district: string;
  facebook_url: string;
  tiktok_url: string;
};

export function SellerDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState(false);
  const [places, setPlaces] = useState<{
    provinces: Place[];
    districts: Place[];
  }>({ provinces: [], districts: [] });

  async function accessToken() {
    const session = supabase
      ? (await supabase.auth.getSession()).data.session
      : null;
    if (!session) {
      navigate(`/login?return=${encodeURIComponent(location.pathname)}`, {
        replace: true,
      });
      return null;
    }
    return session.access_token;
  }

  const profile = useQuery({
    queryKey: ["seller-dashboard"],
    queryFn: async () => {
      const token = await accessToken();
      if (!token) throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
      return apiRequest<{ data: SellerDashboardProfile }>("/v1/sellers/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  });

  useEffect(() => {
    if (profile.error instanceof ApiError && profile.error.status === 404) {
      navigate("/register", { replace: true });
    }
  }, [profile.error, navigate]);

  useEffect(() => {
    void (async () => {
      if (!supabase) return;
      const [p, d] = await Promise.all([
        supabase.from("lao_provinces").select("id,name_lo").order("sort_order"),
        supabase
          .from("lao_districts")
          .select("id,province_id,name_lo")
          .order("sort_order"),
      ]);
      setPlaces({ provinces: p.data ?? [], districts: d.data ?? [] });
    })();
  }, []);

  const placeName = (kind: "provinces" | "districts", id: string | null) =>
    places[kind].find((place) => place.id === id)?.name_lo ?? id ?? "";

  function openEdit(seller: SellerDashboardProfile) {
    setFormError("");
    setForm({
      business_name: seller.business_name ?? "",
      business_name_lao: seller.business_name_lao ?? "",
      description: seller.description ?? "",
      province: seller.province ?? "",
      district: seller.district ?? "",
      facebook_url: seller.facebook_url ?? "",
      tiktok_url: seller.tiktok_url ?? "",
    });
    setEditing(true);
  }

  async function saveEdit(event: React.FormEvent, sellerId: string) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setFormError("");
    try {
      const token = await accessToken();
      if (!token) return;
      const payload: Record<string, string> = {
        business_name_lao: form.business_name_lao,
        description: form.description,
        province: form.province,
        district: form.district,
      };
      if (form.business_name) payload.business_name = form.business_name;
      if (form.facebook_url) payload.facebook_url = form.facebook_url;
      if (form.tiktok_url) payload.tiktok_url = form.tiktok_url;
      await apiRequest(`/v1/sellers/${sellerId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      await profile.refetch();
      setEditing(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "ບັນທຶກຮ້ານຄ້າບໍ່ສຳເລັດ",
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  if (profile.isLoading)
    return <div className="profile-loading skeleton" aria-label="ກຳລັງໂຫຼດ" />;
  if (!profile.data) {
    if (profile.error instanceof ApiError && profile.error.status === 404)
      return null;
    return (
      <div className="profile-state">
        <h1>ໂຫຼດແດຊບອດບໍ່ສຳເລັດ</h1>
      </div>
    );
  }

  const seller = profile.data.data;
  const verification = getVerification(seller.verification_status);
  const steps = buildChecklistSteps(seller.checklist);
  const doneCount = steps.filter((step) => step.done).length;
  const publicUrl = `${window.location.origin}/s/${seller.id}`;
  const stats = [
    [seller.stats.total_orders.toLocaleString(), "ຄຳສັ່ງທັງໝົດ"],
    [seller.stats.verified_orders.toLocaleString(), "ຄຳສັ່ງທີ່ຢືນຢັນ"],
    [`₭${seller.stats.mtd_revenue.toLocaleString()}`, "ລາຍໄດ້ເດືອນນີ້"],
    [seller.stats.total_customers.toLocaleString(), "ຈຳນວນຜູ້ຊື້"],
  ] as const;

  return (
    <article className="page-enter dashboard-page">
      <header className="profile-identity">
        <div className="profile-avatar">
          <SellerAvatar logoUrl={seller.logo_url} />
        </div>
        <div className="profile-name">
          <p className="eyebrow">LaoTrust seller dashboard</p>
          <h1>{seller.business_name_lao || seller.business_name}</h1>
        </div>
        <div className="dashboard-identity-actions">
          <span
            className={`mk-trust-badge mk-trust-badge--${badgeTone[verification.tone]}`}
          >
            <ShieldCheck size={14} /> {badgeLabel[verification.tone]}
          </span>
          <span className="dashboard-plan-chip">
            {planLabel[seller.subscription_plan]}
          </span>
        </div>
        <div className="profile-location">
          <Link className="dashboard-public-link" to={`/s/${seller.id}`}>
            ເບິ່ງໂປຣໄຟລ໌ສາທາລະນະ
          </Link>
        </div>
      </header>

      {doneCount < steps.length && (
        <section className="dashboard-section">
          <p className="eyebrow">Onboarding</p>
          <h2>ຂັ້ນຕອນເລີ່ມຕົ້ນ</h2>
          <div className="dashboard-checklist__bar">
            <div
              className="dashboard-checklist__bar-fill"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
          {steps.map((step) => (
            <div
              key={step.key}
              className={`dashboard-checklist__step${step.done ? " is-done" : ""}`}
            >
              <span>
                {step.done ? <Check size={18} /> : <Circle size={18} />}
                {step.label}
              </span>
              {step.done ? (
                <small>ສຳເລັດ</small>
              ) : step.cta ? (
                <Link to={step.cta.to}>{step.cta.label}</Link>
              ) : (
                <small>{step.waitingLabel}</small>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="dashboard-stats" aria-label="ສະຖິຕິຮ້ານຄ້າ">
        {stats.map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="dashboard-section">
        <div className="profile-section__heading">
          <div>
            <p className="eyebrow">Profile</p>
            <h2>ຂໍ້ມູນຮ້ານຄ້າ</h2>
          </div>
          {!editing && (
            <button
              className="dashboard-edit-toggle"
              type="button"
              onClick={() => openEdit(seller)}
            >
              <Pencil size={15} /> ແກ້ໄຂ
            </button>
          )}
        </div>
        {saved && <p className="dashboard-toast">ບັນທຶກສຳເລັດ</p>}
        {editing && form && (
          <form
            className="dashboard-edit-form"
            onSubmit={(event) => void saveEdit(event, seller.id)}
          >
            <label className="mk-field">
              <span className="mk-field__label">ຊື່ຮ້ານພາສາລາວ *</span>
              <input
                className="mk-input"
                required
                minLength={2}
                maxLength={100}
                value={form.business_name_lao}
                onChange={(event) =>
                  setForm({ ...form, business_name_lao: event.target.value })
                }
              />
            </label>
            <label className="mk-field">
              <span className="mk-field__label">ຊື່ຮ້ານພາສາອັງກິດ</span>
              <input
                className="mk-input"
                maxLength={100}
                value={form.business_name}
                onChange={(event) =>
                  setForm({ ...form, business_name: event.target.value })
                }
              />
            </label>
            <label className="mk-field mk-field--wide">
              <span className="mk-field__label">ລາຍລະອຽດ</span>
              <textarea
                className="mk-input"
                maxLength={200}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </label>
            <label className="mk-field">
              <span className="mk-field__label">ແຂວງ *</span>
              <select
                className="mk-input"
                required
                value={form.province}
                onChange={(event) =>
                  setForm({
                    ...form,
                    province: event.target.value,
                    district: "",
                  })
                }
              >
                <option value="">ເລືອກແຂວງ</option>
                {places.provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name_lo}
                  </option>
                ))}
              </select>
            </label>
            <label className="mk-field">
              <span className="mk-field__label">ເມືອງ *</span>
              <select
                className="mk-input"
                required
                disabled={!form.province}
                value={form.district}
                onChange={(event) =>
                  setForm({ ...form, district: event.target.value })
                }
              >
                <option value="">ເລືອກເມືອງ</option>
                {places.districts
                  .filter((district) => district.province_id === form.province)
                  .map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name_lo}
                    </option>
                  ))}
              </select>
            </label>
            <label className="mk-field">
              <span className="mk-field__label">Facebook</span>
              <input
                className="mk-input"
                type="url"
                placeholder="https://facebook.com/..."
                value={form.facebook_url}
                onChange={(event) =>
                  setForm({ ...form, facebook_url: event.target.value })
                }
              />
            </label>
            <label className="mk-field">
              <span className="mk-field__label">TikTok</span>
              <input
                className="mk-input"
                type="url"
                placeholder="https://tiktok.com/@..."
                value={form.tiktok_url}
                onChange={(event) =>
                  setForm({ ...form, tiktok_url: event.target.value })
                }
              />
            </label>
            {formError && (
              <p className="form-error mk-field--wide" role="alert">
                {formError}
              </p>
            )}
            <div className="dashboard-edit-form-actions">
              <button
                className="mk-button mk-button--primary"
                disabled={saving}
              >
                {saving ? "ກຳລັງບັນທຶກ…" : "ບັນທຶກ"}
              </button>
              <button
                className="mk-button mk-button--ghost"
                type="button"
                onClick={() => setEditing(false)}
              >
                ຍົກເລີກ
              </button>
            </div>
          </form>
        )}
        {!editing && (
          <p className="muted-copy">
            {[placeName("districts", seller.district), placeName("provinces", seller.province)]
              .filter(Boolean)
              .join(", ") || "ບໍ່ລະບຸທີ່ຢູ່"}
          </p>
        )}
      </section>

      <section className="dashboard-section">
        <p className="eyebrow">Sharing tools</p>
        <h2>ແຊຣ໌ຮ້ານຄ້າ</h2>
        <div className="dashboard-share__row">
          <input readOnly value={publicUrl} onFocus={(e) => e.target.select()} />
          <button
            className="mk-button mk-button--secondary"
            type="button"
            onClick={() => void copyLink(publicUrl)}
          >
            <Copy size={15} /> {copied ? "ສຳເນົາແລ້ວ!" : "ສຳເນົາ"}
          </button>
        </div>
        <p className="dashboard-share__placeholder">
          ລະຫັດ QR ແລະ ປ້າຍຄວາມໜ້າເຊື່ອຖືສຳລັບດາວໂຫລດ ຈະມາໃນໄວໆນີ້.
        </p>
      </section>

      <footer className="profile-actions">
        <Link className="primary-link" to="/dashboard/orders/new">
          <ShoppingBag size={18} /> ສ້າງ Safe Order
        </Link>
      </footer>
    </article>
  );
}
