import { describe, expect, it } from "vitest";
import { detectSellerSearchType } from "./search";

describe("detectSellerSearchType", () => {
  it("detects six-digit seller IDs before phone numbers", () => {
    expect(detectSellerSearchType("123456")).toBe("seller_id");
  });

  it("detects Lao local and international phone numbers", () => {
    expect(detectSellerSearchType("29")).toBe("phone");
    expect(detectSellerSearchType("986")).toBe("phone");
    expect(detectSellerSearchType("020 5555 1234")).toBe("phone");
    expect(detectSellerSearchType("+8562055551234")).toBe("phone");
  });

  it("uses shop name for other values", () => {
    expect(detectSellerSearchType("ຮ້ານ ເມກຂາ")).toBe("shop_name");
  });
});
