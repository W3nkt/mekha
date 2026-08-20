import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Clipboard,
  Download,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";

import { apiRequest, ApiError } from "../lib/api";
import { supabase } from "../lib/supabase";

type Badge = {
  status: string;
  months_active: number;
  verified_order_count: number;
  on_time_rate: number | null;
  dispute_rate: number | null;
  badge_image_url: string;
  widget_embed_code: string;
};

const statusContent: Record<string, { label: string; description: string }> = {
  verified: {
    label: "ຮ້ານຄ້າຢືນຢັນແລ້ວ",
    description: "ຂໍ້ມູນຮ້ານ ແລະ ປະຫວັດຄຳສັ່ງຊື້ຜ່ານເງື່ອນໄຂຂອງ Mekha",
  },
  partially_verified: {
    label: "ຢືນຢັນບາງສ່ວນ",
    description: "ຮ້ານຜ່ານການຢືນຢັນແລ້ວ ແລະ ກຳລັງສ້າງປະຫວັດການຂາຍ",
  },
  unverified: {
    label: "ຍັງບໍ່ໄດ້ຢືນຢັນ",
    description: "ສົ່ງຂໍ້ມູນຢືນຢັນຮ້ານເພື່ອເພີ່ມຄວາມໝັ້ນໃຈໃຫ້ລູກຄ້າ",
  },
};

const formatRate = (value: number | null, digits = 0) =>
  value === null ? "—" : `${(value * 100).toFixed(digits)}%`;

export function DashboardTrustPage() {
  const navigate = useNavigate();
  const [badge, setBadge] = useState<Badge | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!supabase) return;
      const session = (await supabase.auth.getSession()).data.session;
      if (!session)
        return navigate("/login?return=/dashboard/trust", { replace: true });
      try {
        const me = await apiRequest<{ data: { id: string } }>(
          "/v1/sellers/me",
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        const result = await apiRequest<{ data: Badge }>(
          `/v1/sellers/${me.data.id}/badge`,
        );
        setBadge(result.data);
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 404)
          return navigate("/register", { replace: true });
        setError(
          caught instanceof Error ? caught.message : "ບໍ່ສາມາດໂຫຼດປ້າຍໄດ້",
        );
      }
    })();
  }, [navigate]);

  async function copyEmbedCode() {
    if (!badge) return;
    await navigator.clipboard.writeText(badge.widget_embed_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const status = badge
    ? (statusContent[badge.status] ?? statusContent.unverified)
    : statusContent.unverified;
  const isVerified = badge?.status === "verified";

  return (
    <main className="page-enter trust-page">
      <header className="trust-page__header">
        <p className="eyebrow">TRUST</p>
        <h1>ຄວາມໄວ້ໃຈຂອງຮ້ານ</h1>
        <p>ຕິດຕາມສະຖານະ ແລະ ແບ່ງປັນປ້າຍຮັບຮອງໃຫ້ລູກຄ້າ</p>
      </header>

      {!badge && !error && (
        <div className="trust-page__loading skeleton" aria-label="ກຳລັງໂຫຼດ" />
      )}

      {badge && (
        <>
          <section className={`trust-summary trust-summary--${badge.status}`}>
            <div className="trust-summary__icon" aria-hidden="true">
              {isVerified ? (
                <ShieldCheck size={28} />
              ) : (
                <ShieldQuestion size={28} />
              )}
            </div>
            <div className="trust-summary__copy">
              <span>ສະຖານະປັດຈຸບັນ</span>
              <h2>{status.label}</h2>
              <p>{status.description}</p>
            </div>
          </section>

          <section className="trust-metrics" aria-label="ສະຖິຕິຄວາມໄວ້ໃຈ">
            <div>
              <strong>{badge.verified_order_count}</strong>
              <span>ອໍເດີຢືນຢັນ</span>
            </div>
            <div>
              <strong>{badge.months_active}</strong>
              <span>ເດືອນທີ່ໃຊ້ງານ</span>
            </div>
            <div>
              <strong>{formatRate(badge.on_time_rate)}</strong>
              <span>ສົ່ງກົງເວລາ</span>
            </div>
            <div>
              <strong>{formatRate(badge.dispute_rate, 1)}</strong>
              <span>ຂໍ້ຂັດແຍ່ງ</span>
            </div>
          </section>

          <section className="trust-badge-section">
            <div className="trust-section-heading">
              <div>
                <h2>ປ້າຍຮັບຮອງຮ້ານ</h2>
                <p>ນຳໄປໃຊ້ໃນໜ້າຮ້ານ ຫຼື ໂພສຂາຍສິນຄ້າ</p>
              </div>
              <a
                className="mk-button mk-button--primary mk-button--nowrap"
                href={badge.badge_image_url}
                download
              >
                <Download size={17} aria-hidden="true" />
                ດາວໂຫຼດ PNG
              </a>
            </div>
            <div className="trust-badge-preview">
              <img src={badge.badge_image_url} alt="ປ້າຍຮັບຮອງຮ້ານຈາກ Mekha" />
            </div>
          </section>

          <section className="trust-embed-section">
            <div className="trust-section-heading">
              <div>
                <h2>ຕິດປ້າຍໃນເວັບໄຊ</h2>
                <p>ຄັດລອກ code ນີ້ໄປວາງໃນໜ້າເວັບຂອງຮ້ານ</p>
              </div>
              <button
                className="mk-button mk-button--secondary mk-button--nowrap"
                type="button"
                onClick={() => void copyEmbedCode()}
              >
                {copied ? (
                  <Check size={17} aria-hidden="true" />
                ) : (
                  <Clipboard size={17} aria-hidden="true" />
                )}
                {copied ? "ຄັດລອກແລ້ວ" : "ຄັດລອກ code"}
              </button>
            </div>
            <textarea
              aria-label="Widget embed code"
              readOnly
              value={badge.widget_embed_code}
            />
          </section>
        </>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
