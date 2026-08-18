import { describe, expect, it } from "vitest";
import { normalizePhone } from "./customers";

describe("customer phone normalization", () => {
  it.each([["02020123456", "+8562020123456"], ["+856 20 20123456", "+8562020123456"], ["8562020123456", "+8562020123456"]])("normalizes %s", (input, expected) => expect(normalizePhone(input)).toBe(expected));
});
