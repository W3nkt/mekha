import { describe, expect, it } from "vitest";
import { profitMargin, stockBadge } from "./products";

describe("stockBadge", () => {
  it("shows no badge when stock is comfortably above the low-stock threshold", () => {
    expect(stockBadge(6)).toBeNull();
    expect(stockBadge(100)).toBeNull();
  });

  it("shows an amber low-stock badge at or below 5 units", () => {
    expect(stockBadge(5)).toEqual({ tone: "low", label: "ສ໊ຕ໊ອກໃກ້ໝົດ" });
    expect(stockBadge(1)).toEqual({ tone: "low", label: "ສ໊ຕ໊ອກໃກ້ໝົດ" });
  });

  it("shows a red out-of-stock badge at zero", () => {
    expect(stockBadge(0)).toEqual({ tone: "out", label: "ໝົດສ໊ຕ໊ອກ" });
  });
});

describe("profitMargin", () => {
  it("computes percent margin and per-unit profit", () => {
    expect(profitMargin(45000, 30000)).toEqual({ percent: 33, perUnit: 15000 });
  });

  it("returns null when cost is unknown", () => {
    expect(profitMargin(45000, null)).toBeNull();
  });

  it("returns null when price is zero to avoid dividing by zero", () => {
    expect(profitMargin(0, 100)).toBeNull();
  });
});
