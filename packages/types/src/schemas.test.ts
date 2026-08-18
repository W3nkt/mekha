import { describe, expect, it } from "vitest";
import {
  CreateOrderSchema,
  CreateReportSchema,
  CreateReviewSchema,
  CreateSellerSchema,
  RequestOtpSchema,
  TrustCheckSchema,
  VerifyOtpSchema,
  type CourierAdapter,
  type OrderWithAddress,
} from "./index";

describe("shared API schemas", () => {
  it("validates seller input", () => {
    expect(
      CreateSellerSchema.parse({
        business_name: "Mekha Shop",
        phone: "02055555555",
      }),
    ).toMatchObject({ business_name: "Mekha Shop" });
    expect(() =>
      CreateSellerSchema.parse({ business_name: "x", phone: "bad" }),
    ).toThrow();
  });

  it("rejects an invalid trust query type", () => {
    expect(() =>
      TrustCheckSchema.parse({
        query_type: "invalid_type",
        query_value: "test",
      }),
    ).toThrow();
  });

  it("validates OTP requests and verification", () => {
    expect(
      RequestOtpSchema.safeParse({ phone: "+8562055555555" }).success,
    ).toBe(true);
    expect(
      VerifyOtpSchema.safeParse({ phone: "02055555555", token: "123456" })
        .success,
    ).toBe(true);
    expect(
      VerifyOtpSchema.safeParse({ phone: "02055555555", token: "123" }).success,
    ).toBe(false);
  });

  it("validates reviews and reports", () => {
    expect(
      CreateReviewSchema.safeParse({ order_id: crypto.randomUUID(), rating: 5 })
        .success,
    ).toBe(true);
    expect(
      CreateReportSchema.safeParse({
        report_type: "other",
        description: "A sufficiently detailed report",
      }).success,
    ).toBe(true);
    expect(
      CreateReportSchema.safeParse({
        report_type: "invalid",
        description: "too short",
      }).success,
    ).toBe(false);
  });

  it("validates orders and Lao addresses", () => {
    const result = CreateOrderSchema.safeParse({
      customer_name: "Noy",
      customer_phone: "02055555555",
      payment_method: "cod",
      shipping_address: {
        province_id: "VTE",
        province_name_lo: "ວຽງຈັນ",
        province_name_en: "Vientiane Capital",
        district_id: "VTE-0101",
        district_name_lo: "ຈັນທະບູລີ",
        district_name_en: "Chanthabuly",
        village_landmark: "Near the market",
      },
      items: [{ name: "Shirt", quantity: 1, unit_price: 100000 }],
    });
    expect(result.success).toBe(true);
  });

  it("defines the complete courier adapter contract", async () => {
    const adapter: CourierAdapter = {
      name: "anousith",
      async createShipment(_order: OrderWithAddress) {
        return { tracking_number: "TEST-1", label_pdf_base64: "cGRm" };
      },
      async getTrackingStatus(tracking_number: string) {
        return {
          status: tracking_number ? "pending" : "unknown",
          updated_at: new Date(0).toISOString(),
        };
      },
      async parseCODSettlement() {
        return [{ tracking_number: "TEST-1", amount: 100, status: "pending" }];
      },
    };
    expect((await adapter.getTrackingStatus("TEST-1")).status).toBe("pending");
  });
});
