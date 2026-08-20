import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import { TrustBadge } from "@mekha/ui";
import type {
  SellerSearchResponse,
  SellerSearchResult,
  SellerSearch,
} from "@mekha/types";
import { Link, useSearchParams } from "react-router-dom";

import { apiRequest } from "../lib/api";
import { SellerAvatar } from "../components/SellerAvatar";

export const detectSellerSearchType = (query: string): SellerSearch["type"] => {
  const value = query.trim();
  if (/^\d{6}$/.test(value)) return "seller_id";
  if (/^(?:0|\+856)/.test(value)) return "phone";
  return "shop_name";
};

const cautionLabels = {
  low: "ຄວາມສ່ຽງຕ່ຳ",
  medium: "ຄວນກວດສອບເພີ່ມ",
  high: "ຄວາມສ່ຽງສູງ",
  insufficient_information: "ຂໍ້ມູນຍັງບໍ່ພຽງພໍ",
} as const;

function SellerCard({ seller }: { seller: SellerSearchResult }) {
  const verified = seller.verification_status === "verified";
  return (
    <Link className="seller-card" to={`/seller/${seller.id}`}>
      <div className="seller-logo" aria-hidden="true">
        <SellerAvatar logoUrl={seller.logo_url} iconSize={24} />
      </div>
      <div className="seller-card__body">
        <div className="seller-card__heading">
          <div>
            <h2>{seller.business_name_lao || seller.business_name}</h2>
            {seller.business_name_lao && <p>{seller.business_name}</p>}
          </div>
          <TrustBadge
            status={verified ? "verified" : "unverified"}
            caution={seller.caution_level}
            label={verified ? "ຢືນຢັນແລ້ວ" : "ຍັງບໍ່ຢືນຢັນ"}
          />
        </div>
        <div className="seller-meta">
          <span>{seller.province || "ບໍ່ລະບຸແຂວງ"}</span>
          <span>
            <ShoppingBag size={15} /> {seller.verified_order_count}{" "}
            ຄຳສັ່ງຊື້ຢືນຢັນ
          </span>
          <span
            className={`caution-text caution-text--${seller.caution_level}`}
          >
            {cautionLabels[seller.caution_level]}
          </span>
        </div>
      </div>
    </Link>
  );
}

function SearchSkeletons() {
  return (
    <div className="seller-results" aria-label="ກຳລັງຄົ້ນຫາ" aria-busy="true">
      {[0, 1, 2].map((item) => (
        <div className="seller-card seller-card--skeleton" key={item}>
          <span className="skeleton skeleton--logo" />
          <span className="skeleton skeleton--wide" />
          <span className="skeleton skeleton--short" />
        </div>
      ))}
    </div>
  );
}

export function SellerSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [input, setInput] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery.trim());

  useEffect(() => {
    setInput(urlQuery);
    setDebouncedQuery(urlQuery.trim());
  }, [urlQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = input.trim();
      setDebouncedQuery(next);
      setSearchParams(next ? { q: next } : {}, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [input, setSearchParams]);

  const type = detectSellerSearchType(debouncedQuery);
  const results = useQuery({
    queryKey: ["seller-search", debouncedQuery, type],
    enabled: debouncedQuery.length >= 2,
    queryFn: () =>
      apiRequest<SellerSearchResponse>(
        `/v1/sellers/search?q=${encodeURIComponent(debouncedQuery)}&type=${type}`,
      ),
  });

  return (
    <div className="page-enter seller-search-page">
      <section className="search-hero">
        <span className="search-hero__mark" aria-hidden="true">
          <ShieldCheck size={22} />
        </span>
        <p className="eyebrow">ຄົ້ນຫາກ່ອນຊື້</p>
        <h1>ກວດສອບຜູ້ຂາຍໃຫ້ໝັ້ນໃຈ</h1>
        <p>ຄົ້ນຫາດ້ວຍຊື່ຮ້ານ, ເບີໂທ ຫຼື ລະຫັດຜູ້ຂາຍ</p>
        <label className="seller-search-box">
          <span className="sr-only">ຄົ້ນຫາຜູ້ຂາຍ</span>
          <Search size={21} aria-hidden="true" />
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="ພິມຊື່ຮ້ານ, 020… ຫຼື ລະຫັດ 6 ຕົວ"
            autoComplete="off"
          />
        </label>
      </section>

      {results.isFetching && <SearchSkeletons />}
      {results.isError && (
        <div className="search-message" role="alert">
          <h2>ຄົ້ນຫາບໍ່ສຳເລັດ</h2>
          <p>ກະລຸນາກວດສອບອິນເຕີເນັດ ແລ້ວລອງໃໝ່.</p>
        </div>
      )}
      {!results.isFetching && results.data?.data.length === 0 && (
        <div className="search-message">
          <Store size={30} aria-hidden="true" />
          <h2>ບໍ່ພົບຜູ້ຂາຍນີ້</h2>
          <p>ຮ້ານຂອງທ່ານບໍ? ລົງທະບຽນເພື່ອສ້າງຄວາມໜ້າເຊື່ອຖື.</p>
          <Link className="primary-link" to="/register">
            ລົງທະບຽນຮ້ານ
          </Link>
        </div>
      )}
      {!results.isFetching && Boolean(results.data?.data.length) && (
        <section className="seller-results" aria-live="polite">
          <p className="result-count">ພົບ {results.data?.data.length} ຜູ້ຂາຍ</p>
          {results.data?.data.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </section>
      )}
      {!debouncedQuery && (
        <div className="search-hint">
          <p>ເຄັດລັບ</p>
          <span>ໃຊ້ເບີໂທທີ່ຜູ້ຂາຍໃຫ້ທ່ານ ເພື່ອຜົນທີ່ຊັດເຈນທີ່ສຸດ.</span>
        </div>
      )}
    </div>
  );
}
