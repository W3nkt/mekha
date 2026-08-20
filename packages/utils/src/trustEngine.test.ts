import { describe, expect, it } from "vitest";
import type { Database, TrustSignal } from "@mekha/types";
import {
  computeCautionLevel,
  computeTrustProfile,
  type TrustEngineInput,
} from "./trustEngine";

type Tables = Database["public"]["Tables"];

const seller = (
  overrides: Partial<Tables["seller_profiles"]["Row"]> = {},
): Tables["seller_profiles"]["Row"] => ({
  id: "00000000-0000-4000-8000-000000000001",
  owner_user_id: "00000000-0000-4000-8000-000000000002",
  business_name: "Nok Somvang",
  business_name_lao: null,
  description: null,
  province: null,
  district: null,
  logo_url: null,
  order_counter: 0,
  phone: null,
  verification_status: "unverified",
  etrust_id: null,
  facebook_url: null,
  tiktok_url: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const verification = (
  overrides: Partial<Tables["seller_verifications"]["Row"]> = {},
): Tables["seller_verifications"]["Row"] => ({
  id: "00000000-0000-4000-8000-000000000003",
  seller_id: "00000000-0000-4000-8000-000000000001",
  verification_type: "identity_document",
  submitted_data: { full_name: "Nok Somvang" },
  document_paths: null,
  status: "approved",
  reviewed_by: null,
  reviewer_notes: null,
  reviewed_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const identifier = (
  type: string,
  value = "Nok Somvang",
  overrides: Partial<Tables["seller_identifiers"]["Row"]> = {},
): Tables["seller_identifiers"]["Row"] => ({
  id: `identifier-${type}`,
  seller_id: "00000000-0000-4000-8000-000000000001",
  type,
  value,
  verification_status: "verified",
  created_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const riskSignal = (signal_type: string): Tables["risk_signals"]["Row"] => ({
  id: `risk-${signal_type}`,
  seller_id: "00000000-0000-4000-8000-000000000001",
  signal_type,
  severity: "warning",
  source_type: "system",
  evidence_id: null,
  is_active: true,
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
});

const input = (
  overrides: Partial<TrustEngineInput> = {},
): TrustEngineInput => ({
  seller: seller(),
  verifications: [],
  identifiers: [],
  orderStats: { total: 10, verified: 10, dispute_count: 1, on_time_count: 8 },
  reviewStats: { avg_rating: 0, count: 0 },
  reportStats: { unresolved: 0, total: 0 },
  riskSignals: [],
  profileChangeCount: 0,
  evaluatedAt: "2026-08-18T00:00:00.000Z",
  ...overrides,
});

const codes = (value: TrustEngineInput) =>
  computeTrustProfile(value).signals.map(({ code }) => code);

describe("positive trust signals", () => {
  it("implements every positive trigger", () => {
    const result = codes(
      input({
        seller: seller({ etrust_id: "ET-123" }),
        verifications: [verification()],
        identifiers: [
          identifier("business_registration"),
          identifier("e_trust"),
          identifier("payment_identity"),
          identifier("social_account", "facebook.com/nok"),
        ],
        orderStats: {
          total: 100,
          verified: 100,
          dispute_count: 1,
          on_time_count: 95,
        },
        reviewStats: { avg_rating: 4.5, count: 10 },
      }),
    );

    expect(result).toEqual(
      expect.arrayContaining([
        "IDENTITY_VERIFIED",
        "BUSINESS_VERIFIED",
        "ETRUST_VERIFIED",
        "LONG_HISTORY",
        "HIGH_ORDER_COUNT",
        "STRONG_REVIEWS",
        "LOW_DISPUTE_RATE",
        "PAYMENT_IDENTITY_MATCH",
        "SOCIAL_VERIFIED",
      ]),
    );
  });

  it("honors positive boundaries and false conditions", () => {
    expect(
      codes(
        input({
          orderStats: {
            total: 50,
            verified: 50,
            dispute_count: 1,
            on_time_count: 0,
          },
        }),
      ),
    ).not.toContain("LOW_DISPUTE_RATE");
    expect(
      codes(
        input({
          orderStats: {
            total: 50,
            verified: 50,
            dispute_count: 0,
            on_time_count: 0,
          },
        }),
      ),
    ).toContain("HIGH_ORDER_COUNT");
    expect(
      codes(input({ reviewStats: { avg_rating: 3.99, count: 10 } })),
    ).not.toContain("STRONG_REVIEWS");
    expect(
      codes(input({ reviewStats: { avg_rating: 4, count: 9 } })),
    ).not.toContain("STRONG_REVIEWS");
    expect(
      codes(
        input({ seller: seller({ created_at: "2026-02-19T00:00:00.000Z" }) }),
      ),
    ).not.toContain("LONG_HISTORY");
  });
});

describe("warning trust signals", () => {
  it("implements every warning trigger", () => {
    const result = codes(
      input({
        seller: seller({
          business_name: "Different Shop",
          created_at: "2026-08-13T00:00:00.000Z",
        }),
        verifications: [verification()],
        identifiers: [identifier("payment_identity", "Vone Khamla")],
        orderStats: {
          total: 10,
          verified: 4,
          dispute_count: 1,
          on_time_count: 0,
        },
        reportStats: { unresolved: 3, total: 3 },
        profileChangeCount: 4,
        riskSignals: [riskSignal("ACCOUNT_SUSPENDED_HISTORY")],
      }),
    );
    expect(result).toEqual(
      expect.arrayContaining([
        "NEW_SELLER",
        "LOW_ORDER_COUNT",
        "HIGH_DISPUTE_RATE",
        "MULTIPLE_REPORTS",
        "PAYMENT_IDENTITY_MISMATCH",
        "SUSPICIOUS_CHANGES",
        "IDENTITY_MISMATCH",
        "ACCOUNT_SUSPENDED_HISTORY",
      ]),
    );
    expect(
      codes(
        input({
          orderStats: {
            total: 0,
            verified: 10,
            dispute_count: 0,
            on_time_count: 0,
          },
        }),
      ),
    ).toContain("NO_VERIFICATION");
  });

  it("honors warning boundaries and suppresses NEW_SELLER for active sellers", () => {
    const activeNewSeller = input({
      seller: seller({ created_at: "2026-08-13T00:00:00.000Z" }),
      orderStats: { total: 5, verified: 5, dispute_count: 0, on_time_count: 0 },
    });
    expect(codes(activeNewSeller)).not.toContain("NEW_SELLER");
    expect(
      codes(
        input({
          orderStats: {
            total: 20,
            verified: 20,
            dispute_count: 1,
            on_time_count: 0,
          },
        }),
      ),
    ).not.toContain("HIGH_DISPUTE_RATE");
    expect(codes(input({ profileChangeCount: 3 }))).not.toContain(
      "SUSPICIOUS_CHANGES",
    );
    expect(
      codes(input({ reportStats: { unresolved: 2, total: 4 } })),
    ).not.toContain("MULTIPLE_REPORTS");
  });
});

describe("independent false conditions", () => {
  const absentCases: Array<[string, TrustEngineInput]> = [
    ["IDENTITY_VERIFIED", input()],
    ["BUSINESS_VERIFIED", input()],
    ["ETRUST_VERIFIED", input({ identifiers: [identifier("e_trust")] })],
    [
      "LONG_HISTORY",
      input({ seller: seller({ created_at: "2026-02-19T00:00:00.000Z" }) }),
    ],
    [
      "HIGH_ORDER_COUNT",
      input({
        orderStats: {
          total: 49,
          verified: 49,
          dispute_count: 0,
          on_time_count: 0,
        },
      }),
    ],
    ["STRONG_REVIEWS", input({ reviewStats: { avg_rating: 4, count: 9 } })],
    [
      "LOW_DISPUTE_RATE",
      input({
        orderStats: {
          total: 50,
          verified: 50,
          dispute_count: 1,
          on_time_count: 0,
        },
      }),
    ],
    ["PAYMENT_IDENTITY_MATCH", input({ verifications: [verification()] })],
    ["SOCIAL_VERIFIED", input()],
    [
      "NEW_SELLER",
      input({
        seller: seller({ created_at: "2026-08-13T00:00:00.000Z" }),
        orderStats: {
          total: 5,
          verified: 5,
          dispute_count: 0,
          on_time_count: 0,
        },
      }),
    ],
    [
      "LOW_ORDER_COUNT",
      input({
        orderStats: {
          total: 5,
          verified: 5,
          dispute_count: 0,
          on_time_count: 0,
        },
      }),
    ],
    [
      "HIGH_DISPUTE_RATE",
      input({
        orderStats: {
          total: 20,
          verified: 20,
          dispute_count: 1,
          on_time_count: 0,
        },
      }),
    ],
    ["MULTIPLE_REPORTS", input({ reportStats: { unresolved: 2, total: 4 } })],
    [
      "PAYMENT_IDENTITY_MISMATCH",
      input({
        verifications: [verification()],
        identifiers: [identifier("payment_identity")],
      }),
    ],
    ["SUSPICIOUS_CHANGES", input({ profileChangeCount: 3 })],
    ["IDENTITY_MISMATCH", input({ verifications: [verification()] })],
    ["ACCOUNT_SUSPENDED_HISTORY", input()],
    ["NO_VERIFICATION", input({ verifications: [verification()] })],
  ];

  it.each(absentCases)(
    "does not emit %s without its trigger",
    (code, value) => {
      expect(codes(value)).not.toContain(code);
    },
  );
});

describe("caution level", () => {
  const signal = (type: TrustSignal["type"], code: string): TrustSignal => ({
    type,
    code,
    message_lo: "ສັນຍານ",
    message_en: "Signal",
  });

  it("covers critical, warning, positive, and empty combinations", () => {
    expect(computeCautionLevel([signal("critical", "CRITICAL")])).toBe("high");
    expect(
      computeCautionLevel([
        signal("warning", "A"),
        signal("warning", "B"),
        signal("warning", "C"),
      ]),
    ).toBe("high");
    expect(computeCautionLevel([signal("warning", "A")])).toBe("medium");
    expect(
      computeCautionLevel([
        signal("warning", "A"),
        signal("positive", "P1"),
        signal("positive", "P2"),
      ]),
    ).toBe("medium");
    expect(
      computeCautionLevel([
        signal("positive", "P1"),
        signal("positive", "P2"),
        signal("positive", "P3"),
      ]),
    ).toBe("low");
    expect(computeCautionLevel([])).toBe("insufficient_information");
  });
});

describe("required UAT scenarios", () => {
  it("rates a fully verified established seller low", () => {
    const result = computeTrustProfile(
      input({
        verifications: [verification()],
        identifiers: [identifier("business_registration")],
        orderStats: {
          total: 100,
          verified: 100,
          dispute_count: 1,
          on_time_count: 95,
        },
        reviewStats: { avg_rating: 4.5, count: 12 },
      }),
    );
    expect(result.caution_level).toBe("low");
  });

  it("does not report partially_verified for a submitted-but-unreviewed verification", () => {
    const result = computeTrustProfile(
      input({
        verifications: [verification({ status: "pending" })],
      }),
    );
    expect(result.verification_status).toBe("unverified");
  });

  it("reports partially_verified once any verification is approved, verified once identity is", () => {
    const partial = computeTrustProfile(
      input({
        verifications: [
          verification({ verification_type: "business_registration" }),
        ],
      }),
    );
    expect(partial.verification_status).toBe("partially_verified");

    const full = computeTrustProfile(
      input({ verifications: [verification()] }),
    );
    expect(full.verification_status).toBe("verified");
  });

  it("uses insufficient information for a new unverified seller", () => {
    const result = computeTrustProfile(
      input({
        seller: seller({ created_at: "2026-08-13T00:00:00.000Z" }),
        orderStats: {
          total: 0,
          verified: 0,
          dispute_count: 0,
          on_time_count: 0,
        },
      }),
    );
    expect(result.caution_level).toBe("insufficient_information");
    expect(result.signals.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "NEW_SELLER",
        "LOW_ORDER_COUNT",
        "NO_VERIFICATION",
      ]),
    );
  });

  it("detects a payment identity mismatch", () => {
    const result = computeTrustProfile(
      input({
        verifications: [verification()],
        identifiers: [identifier("payment_identity", "Vone Khamla")],
      }),
    );
    expect(result.caution_level).toBe("medium");
    expect(result.signals.map(({ code }) => code)).toContain(
      "PAYMENT_IDENTITY_MISMATCH",
    );
  });

  it("escalates multiple unresolved reports", () => {
    const result = computeTrustProfile(
      input({
        orderStats: {
          total: 0,
          verified: 0,
          dispute_count: 0,
          on_time_count: 0,
        },
        reportStats: { unresolved: 4, total: 4 },
      }),
    );
    expect(result.caution_level).toBe("high");
    expect(result.signals.map(({ code }) => code)).toContain(
      "MULTIPLE_REPORTS",
    );
  });

  it("is deterministic and runs well under five milliseconds per input", () => {
    const value = input();
    expect(computeTrustProfile(value)).toEqual(computeTrustProfile(value));
    const started = performance.now();
    for (let index = 0; index < 1_000; index += 1) computeTrustProfile(value);
    expect((performance.now() - started) / 1_000).toBeLessThan(5);
  });

  it("keeps all signal messages human-readable without percentages", () => {
    const result = computeTrustProfile(
      input({
        seller: seller({ created_at: "2026-08-13T00:00:00.000Z" }),
        orderStats: {
          total: 10,
          verified: 0,
          dispute_count: 1,
          on_time_count: 0,
        },
        reportStats: { unresolved: 4, total: 4 },
      }),
    );
    for (const signal of result.signals) {
      expect(signal.message_lo).not.toMatch(/%/);
      expect(signal.message_en).not.toMatch(/%/);
      expect(signal.message_lo.length).toBeGreaterThan(3);
    }
  });
});
