import { describe, expect, it } from "vitest";
import { CreateSellerSchema } from "@mekha/types";

describe("@mekha/types web contract", () => {
  it("resolves and validates shared seller schemas", () => {
    expect(
      CreateSellerSchema.safeParse({
        business_name_lao: "ຮ້ານເມກຂາ",
        province: "VTE",
        district: "VTE-0101",
        phone: "+8562055555555",
      }).success,
    ).toBe(true);
  });
});
