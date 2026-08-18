import { describe, expect, it } from "vitest";
import { calculateOrderTotal, normalizeCustomerPhone } from "./manual-order";

describe("manual order helpers", () => {
  it("calculates line totals", () => expect(calculateOrderTotal([{ price: 40000, quantity: 1 }, { price: 25000, quantity: 1 }])).toBe(65000));
  it("normalizes Lao phone formats for deduplication", () => expect(normalizeCustomerPhone("+856 20 1234 5678")).toBe("02012345678"));
});
