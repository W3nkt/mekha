import { describe, expect, it } from "vitest";
import { CreateSellerSchema } from "@mekha/types";

describe("@mekha/types web contract", () => {
  it("resolves and validates shared seller schemas", () => {
    expect(
      CreateSellerSchema.safeParse({
        business_name: "Mekha",
        phone: "02055555555",
      }).success,
    ).toBe(true);
  });
});
