import type {
  CautionLevel,
  Database,
  TrustSignal,
  TrustSignalType,
} from "@mekha/types";

type Tables = Database["public"]["Tables"];
type SellerProfile = Tables["seller_profiles"]["Row"];
type SellerVerification = Tables["seller_verifications"]["Row"];
type SellerIdentifier = Tables["seller_identifiers"]["Row"];
type RiskSignal = Tables["risk_signals"]["Row"];

export type TrustEngineInput = {
  seller: SellerProfile;
  verifications: SellerVerification[];
  identifiers: SellerIdentifier[];
  orderStats: {
    total: number;
    verified: number;
    dispute_count: number;
    on_time_count: number | null;
  };
  reviewStats: { avg_rating: number; count: number };
  reportStats: { unresolved: number; total: number };
  riskSignals: RiskSignal[];
  profileChangeCount: number;
  evaluatedAt: string;
};

export type TrustEngineResult = {
  caution_level: CautionLevel;
  verification_status: "verified" | "partially_verified" | "unverified";
  signals: TrustSignal[];
  stats: {
    verified_order_count: number;
    on_time_rate: number | null;
    dispute_rate: number | null;
    months_active: number;
  };
};

const messages = {
  IDENTITY_VERIFIED: {
    lo: "ຢືນຢັນຕົວຕົນແລ້ວ",
    en: "Identity document verified",
  },
  BUSINESS_VERIFIED: {
    lo: "ຂໍ້ມູນທຸລະກິດຢືນຢັນ",
    en: "Business registration verified",
  },
  ETRUST_VERIFIED: {
    lo: "ລົງທະບຽນ E-Trust ແລ້ວ",
    en: "E-Trust registration verified",
  },
  LONG_HISTORY: {
    lo: "ດຳເນີນຮ້ານຫຼາຍກວ່າ 6 ເດືອນ",
    en: "Seller has more than six months of history",
  },
  HIGH_ORDER_COUNT: {
    lo: "ມີປະຫວັດສົ່ງຄຳສັ່ງຊື້ຈຳນວນຫຼາຍ",
    en: "High number of verified deliveries",
  },
  STRONG_REVIEWS: {
    lo: "ຄຳຕິຊົມດີຈາກຜູ້ຊື້",
    en: "Strong feedback from verified buyers",
  },
  LOW_DISPUTE_RATE: { lo: "ອັດຕາການຂັດແຍ້ງຕ່ຳ", en: "Low dispute rate" },
  PAYMENT_IDENTITY_MATCH: {
    lo: "ຂໍ້ມູນການຈ່າຍເງິນກົງກັນ",
    en: "Payment identity matches verified identity",
  },
  SOCIAL_VERIFIED: {
    lo: "ບັນຊີໂຊຊຽນທີ່ຢືນຢັນ",
    en: "At least one social account is verified",
  },
  NEW_SELLER: {
    lo: "ຮ້ານເປີດໃໝ່ (ຕ່ຳກວ່າ 30 ວັນ)",
    en: "Seller registered less than 30 days ago",
  },
  LOW_ORDER_COUNT: {
    lo: "ປະຫວັດການຂາຍໜ້ອຍ",
    en: "Limited verified sales history",
  },
  HIGH_DISPUTE_RATE: { lo: "ອັດຕາການຂັດແຍ້ງສູງ", en: "High dispute rate" },
  MULTIPLE_REPORTS: {
    lo: "ໄດ້ຮັບລາຍງານຫຼາຍຄັ້ງ",
    en: "Multiple unresolved reports",
  },
  PAYMENT_IDENTITY_MISMATCH: {
    lo: "ຂໍ້ມູນການຈ່າຍເງິນບໍ່ກົງ",
    en: "Payment identity differs from verified identity",
  },
  SUSPICIOUS_CHANGES: {
    lo: "ຂໍ້ມູນຮ້ານຖືກແກ້ໄຂບໍ່ດົນມານີ້",
    en: "Profile changed repeatedly in the last seven days",
  },
  IDENTITY_MISMATCH: {
    lo: "ຊື່ໃນເອກະສານບໍ່ກົງກັບຊື່ຮ້ານ",
    en: "Verified identity name differs from the profile name",
  },
  ACCOUNT_SUSPENDED_HISTORY: {
    lo: "ບັນຊີເຄີຍຖືກລະງັບ",
    en: "Account has previously been suspended",
  },
  NO_VERIFICATION: {
    lo: "ຍັງບໍ່ໄດ້ສົ່ງເອກະສານ",
    en: "No verification documents submitted",
  },
  EXTERNAL_RISK_SIGNAL: {
    lo: "ພົບສັນຍານທີ່ຄວນກວດສອບເພີ່ມ",
    en: "An additional signal requires review",
  },
} as const satisfies Record<string, { lo: string; en: string }>;

const normalizeIdentity = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();

const submittedName = (verification: SellerVerification | undefined) => {
  const data = verification?.submitted_data;
  if (!data || Array.isArray(data) || typeof data !== "object") return null;
  for (const key of ["full_name", "legal_name", "name"]) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
};

const addSignal = (
  signals: TrustSignal[],
  code: keyof typeof messages,
  type: TrustSignalType,
) => {
  const message = messages[code];
  signals.push({ code, type, message_lo: message.lo, message_en: message.en });
};

export function computeCautionLevel(signals: TrustSignal[]): CautionLevel {
  const criticals = signals.filter(({ type }) => type === "critical");
  const warnings = signals.filter(({ type }) => type === "warning");
  const positives = signals.filter(({ type }) => type === "positive");
  const codes = new Set(signals.map(({ code }) => code));
  const coldStartOnly = warnings.every(({ code }) =>
    ["NEW_SELLER", "LOW_ORDER_COUNT", "NO_VERIFICATION"].includes(code),
  );

  if (criticals.length > 0 || codes.has("MULTIPLE_REPORTS")) return "high";
  if (warnings.length > 0 && coldStartOnly && positives.length === 0)
    return "insufficient_information";
  if (warnings.length >= 3) return "high";
  if (warnings.length >= 1) return "medium";
  if (positives.length >= 3) return "low";
  return "insufficient_information";
}

export function computeTrustProfile(
  input: TrustEngineInput,
): TrustEngineResult {
  const { seller, identifiers, orderStats, reviewStats, reportStats } = input;
  const signals: TrustSignal[] = [];
  const identityVerification = input.verifications.find(
    ({ verification_type, status }) =>
      verification_type.toLowerCase().includes("identity") &&
      status === "approved",
  );
  const identityName = submittedName(identityVerification);
  const verified = (type: string) =>
    identifiers.find(
      (identifier) =>
        identifier.type === type &&
        identifier.verification_status === "verified",
    );
  const paymentIdentity = identifiers.find(
    ({ type }) => type === "payment_identity",
  );
  const ageMs =
    new Date(input.evaluatedAt).getTime() -
    new Date(seller.created_at).getTime();
  const daysActive = Math.max(0, ageMs / 86_400_000);
  const disputeRate =
    orderStats.total > 0 ? orderStats.dispute_count / orderStats.total : null;

  if (identityVerification) addSignal(signals, "IDENTITY_VERIFIED", "positive");
  if (verified("business_registration"))
    addSignal(signals, "BUSINESS_VERIFIED", "positive");
  if (seller.etrust_id && verified("e_trust"))
    addSignal(signals, "ETRUST_VERIFIED", "positive");
  if (daysActive > 180) addSignal(signals, "LONG_HISTORY", "positive");
  if (orderStats.verified >= 50)
    addSignal(signals, "HIGH_ORDER_COUNT", "positive");
  if (reviewStats.count >= 10 && reviewStats.avg_rating >= 4)
    addSignal(signals, "STRONG_REVIEWS", "positive");
  if (disputeRate !== null && disputeRate < 0.02)
    addSignal(signals, "LOW_DISPUTE_RATE", "positive");
  if (verified("social_account"))
    addSignal(signals, "SOCIAL_VERIFIED", "positive");

  if (identityName && paymentIdentity) {
    addSignal(
      signals,
      normalizeIdentity(identityName) ===
        normalizeIdentity(paymentIdentity.value)
        ? "PAYMENT_IDENTITY_MATCH"
        : "PAYMENT_IDENTITY_MISMATCH",
      normalizeIdentity(identityName) ===
        normalizeIdentity(paymentIdentity.value)
        ? "positive"
        : "warning",
    );
  }
  if (daysActive < 30 && orderStats.verified < 5)
    addSignal(signals, "NEW_SELLER", "warning");
  if (orderStats.verified < 5) addSignal(signals, "LOW_ORDER_COUNT", "warning");
  if (disputeRate !== null && disputeRate > 0.05)
    addSignal(signals, "HIGH_DISPUTE_RATE", "warning");
  if (reportStats.unresolved >= 3)
    addSignal(signals, "MULTIPLE_REPORTS", "warning");
  if (input.profileChangeCount > 3)
    addSignal(signals, "SUSPICIOUS_CHANGES", "warning");
  if (
    identityName &&
    ![seller.business_name, seller.business_name_lao]
      .filter((name): name is string => Boolean(name))
      .some(
        (name) => normalizeIdentity(name) === normalizeIdentity(identityName),
      )
  )
    addSignal(signals, "IDENTITY_MISMATCH", "warning");
  if (input.verifications.length === 0)
    addSignal(signals, "NO_VERIFICATION", "warning");

  for (const risk of input.riskSignals) {
    const code = risk.signal_type.toUpperCase();
    if (signals.some((signal) => signal.code === code)) continue;
    const type: TrustSignalType = ["positive", "warning", "critical"].includes(
      risk.severity,
    )
      ? (risk.severity as TrustSignalType)
      : "warning";
    if (Object.hasOwn(messages, code))
      addSignal(signals, code as keyof typeof messages, type);
    else {
      const message = messages.EXTERNAL_RISK_SIGNAL;
      signals.push({
        code,
        type,
        message_lo: message.lo,
        message_en: message.en,
      });
    }
  }

  const hasApprovedIdentity = Boolean(identityVerification);
  const hasAnyApproved = input.verifications.some(
    ({ status }) => status === "approved",
  );
  return {
    caution_level: computeCautionLevel(signals),
    // A submitted-but-not-yet-reviewed verification must not itself confer
    // "partially_verified" - that would let any seller show a trust badge
    // to buyers the moment they upload a document, before anyone checks it.
    verification_status: hasApprovedIdentity
      ? "verified"
      : hasAnyApproved
        ? "partially_verified"
        : "unverified",
    signals,
    stats: {
      verified_order_count: orderStats.verified,
      on_time_rate:
        orderStats.verified >= 10 && orderStats.on_time_count !== null
          ? Math.round(
              (orderStats.on_time_count / orderStats.verified) * 1000,
            ) / 10
          : null,
      dispute_rate:
        disputeRate === null ? null : Math.round(disputeRate * 1000) / 10,
      months_active: Math.max(0, Math.floor(ageMs / 2_629_746_000)),
    },
  };
}
