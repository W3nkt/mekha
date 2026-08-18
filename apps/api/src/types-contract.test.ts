import { describe, expect, it } from "vitest";
import { CreateSellerSchema } from "@mekha/types";

describe("@mekha/types API contract", () => {
  it("resolves and rejects invalid shared seller input", () => {
    expect(
      CreateSellerSchema.safeParse({ business_name: "x", phone: "bad" })
        .success,
    ).toBe(false);
  });
});
