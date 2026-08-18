import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SellerTrustProfile, TrustSignal } from "@mekha/types";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  MapPin,
  Share2,
  ShoppingBag,
  Star,
  Store,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { ApiError, apiRequest } from "../lib/api";

const cautionCopy = {
  low: "ຕ່ຳ",
  medium: "ຄວນລະວັງ",
  high: "ສູງ",
  insufficient_information: "ຂໍ້ມູນຍັງບໍ່ພຽງພໍ",
} as const;

const verificationCopy = {
  verified: {
    title: "ຮ້ານນີ້ໄດ້ຮັບການກວດສອບຢ່າງເປັນທາງການ",
    detail: "Verified Seller — Identity and business confirmed",
    tone: "verified",
  },
  partial: {
    title: "ຮ້ານນີ້ໄດ້ຮັບການກວດສອບບາງສ່ວນ",
    detail: "Partially Verified",
    tone: "partial",
  },
  unverified: {
    title: "ຮ້ານນີ້ຍັງບໍ່ໄດ້ຮັບການກວດສອບ",
    detail: "Unverified — Seller has not submitted identity documents",
    tone: "unverified",
  },
} as const;

export const getVerification = (status: string) =>
  status === "verified"
    ? verificationCopy.verified
    : ["pending", "additional_info_required"].includes(status)
      ? verificationCopy.partial
      : verificationCopy.unverified;

const formatMonth = (date: string) =>
  new Intl.DateTimeFormat("lo-LA", { month: "long", year: "numeric" }).format(
    new Date(date),
  );

function Signal({ signal }: { signal: TrustSignal }) {
  const positive = signal.type === "positive";
  return (
    <li
      className={`trust-signal trust-signal--${positive ? "positive" : "warning"}`}
    >
      {positive ? (
        <CheckCircle2 aria-hidden="true" />
      ) : (
        <AlertTriangle aria-hidden="true" />
      )}
      <div>
        <strong>{signal.message_lo}</strong>
        <span>{signal.message_en}</span>
      </div>
    </li>
  );
}

export function SellerProfilePage() {
  const { id = "" } = useParams();
  const [shared, setShared] = useState(false);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const profile = useQuery({
    queryKey: ["seller-profile", id],
    queryFn: () =>
      apiRequest<{ data: SellerTrustProfile }>(`/v1/sellers/${id}`),
    enabled: Boolean(id),
  });

  useEffect(() => {
    const seller = profile.data?.data;
    if (!seller) return;
    const name = seller.business_name_lao || seller.business_name;
    document.title = `${name} | LaoTrust`;
    const values = {
      "og:title": `${name} | LaoTrust`,
      "og:description": `ກວດສອບສະຖານະ ແລະ ສັນຍານຄວາມໄວ້ວາງໃຈຂອງ ${name}`,
      "og:image": seller.logo_url || "/icons/icon-512.png",
    };
    for (const [property, content] of Object.entries(values)) {
      let meta = document.head.querySelector<HTMLMetaElement>(
        `meta[property="${property}"]`,
      );
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.append(meta);
      }
      meta.content = content;
    }
  }, [profile.data]);

  const share = async () => {
    const url = `${window.location.origin}/s/${id}`;
    try {
      if (navigator.share)
        await navigator.share({ title: document.title, url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 2200);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        throw error;
    }
  };

  if (profile.isLoading)
    return <div className="profile-loading skeleton" aria-label="ກຳລັງໂຫຼດ" />;
  if (profile.error instanceof ApiError && profile.error.status === 404)
    return (
      <div className="profile-state">
        <strong>404</strong>
        <h1>ບໍ່ພົບຜູ້ຂາຍ</h1>
        <Link to="/">ກັບໄປຄົ້ນຫາ</Link>
      </div>
    );
  if (!profile.data)
    return (
      <div className="profile-state">
        <h1>ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ</h1>
      </div>
    );

  const seller = profile.data.data;
  const verification = getVerification(seller.verification_status);
  const verifiedReviews = seller.reviews.filter(
    (review) => review.verified_transaction,
  );
  const otherReviews = seller.reviews.filter(
    (review) => !review.verified_transaction,
  );
  const metrics = [
    [seller.verified_order_count.toLocaleString(), "ສົ່ງສຳເລັດ"],
    [
      seller.on_time_rate === null ? "—" : `${seller.on_time_rate}%`,
      "ສົ່ງຕາມເວລາ",
    ],
    [
      seller.dispute_rate === null ? "—" : `${seller.dispute_rate}%`,
      "ອັດຕາຂໍ້ຂັດແຍ່ງ",
    ],
    [seller.months_active.toLocaleString(), "ເດືອນທີ່ເປີດຮ້ານ"],
  ];

  return (
    <article className="page-enter seller-profile-page">
      <header className="profile-identity">
        <div className="profile-avatar">
          {seller.logo_url ? <img src={seller.logo_url} alt="" /> : <Store />}
        </div>
        <div className="profile-name">
          <p className="eyebrow">LaoTrust seller profile</p>
          <h1>{seller.business_name_lao || seller.business_name}</h1>
          {seller.business_name_lao && <p>{seller.business_name}</p>}
        </div>
        <button
          className="profile-share"
          type="button"
          onClick={() => void share()}
        >
          <Share2 size={18} /> {shared ? "ສຳເນົາແລ້ວ!" : "ແຊຣ໌"}
        </button>
        <div className="profile-location">
          <MapPin size={17} />{" "}
          {[seller.district, seller.province].filter(Boolean).join(", ") ||
            "ບໍ່ລະບຸທີ່ຢູ່"}
          <span>ສະມາຊິກຕັ້ງແຕ່ {formatMonth(seller.created_at)}</span>
        </div>
      </header>

      <section
        className={`verification-band verification-band--${verification.tone}`}
      >
        <Check size={24} />
        <div>
          <h2>{verification.title}</h2>
          <p>{verification.detail}</p>
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section__heading">
          <div>
            <p className="eyebrow">Trust signals</p>
            <h2>ເຫດຜົນທີ່ຄວນພິຈາລະນາ</h2>
          </div>
          <strong
            className={`caution-label caution-label--${seller.caution_level}`}
          >
            ລະດັບຄວາມລະວັງ: {cautionCopy[seller.caution_level]}
          </strong>
        </div>
        <ul className="trust-signal-list">
          {seller.trust_signals.map((signal, index) => (
            <Signal key={`${signal.code}-${index}`} signal={signal} />
          ))}
        </ul>
      </section>

      <section className="profile-metrics" aria-label="ສະຖິຕິຜູ້ຂາຍ">
        {metrics.map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
            {value === "—" && <small>ຂໍ້ມູນບໍ່ພຽງພໍ</small>}
          </div>
        ))}
      </section>

      <section className="profile-section reviews-section">
        <p className="eyebrow">Buyer evidence</p>
        <h2>ຣີວິວຈາກຜູ້ຊື້</h2>
        {verifiedReviews.length === 0 && otherReviews.length === 0 && (
          <p className="muted-copy">ຍັງບໍ່ມີຣີວິວ.</p>
        )}
        {verifiedReviews.map((review) => (
          <div className="review-row" key={review.id}>
            <div className="review-stars" aria-label={`${review.rating} ດາວ`}>
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  size={16}
                  fill={index < review.rating ? "currentColor" : "none"}
                />
              ))}
            </div>
            <p>{review.review_text || "ຜູ້ຊື້ບໍ່ໄດ້ຂຽນຄຳເຫັນ"}</p>
            <button
              className="verified-order-badge"
              type="button"
              onClick={() =>
                setExpandedReview(
                  expandedReview === review.id ? null : review.id,
                )
              }
            >
              <CheckCircle2 size={15} /> ການຊື້ທີ່ຢືນຢັນ
            </button>
            {expandedReview === review.id && (
              <small>ການທົບທວນນີ້ເຊື່ອມຕໍ່ກັບ Safe Order ທີ່ຢືນຢັນ</small>
            )}
          </div>
        ))}
        {otherReviews.length > 0 && (
          <div className="unverified-reviews">
            <h3>ຣີວິວອື່ນໆ</h3>
            {otherReviews.map((review) => (
              <div className="review-row" key={review.id}>
                <p>{review.review_text || "ບໍ່ມີຄຳເຫັນ"}</p>
                <small>{review.rating} / 5 · ບໍ່ໄດ້ເຊື່ອມກັບ Safe Order</small>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="profile-actions">
        <Link className="primary-link" to={`/orders/new?seller=${seller.id}`}>
          <ShoppingBag size={18} /> ສ້າງ Safe Order
        </Link>
        <div>
          {seller.facebook_url && (
            <a href={seller.facebook_url} target="_blank" rel="noreferrer">
              <Globe2 size={18} /> Facebook <ExternalLink size={13} />
            </a>
          )}
          {seller.tiktok_url && (
            <a href={seller.tiktok_url} target="_blank" rel="noreferrer">
              <Clock3 size={18} /> TikTok <ExternalLink size={13} />
            </a>
          )}
        </div>
      </footer>
    </article>
  );
}
