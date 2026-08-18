import { describe, expect, it } from "vitest";
import { computeOrderTotal, findCustomerByPhone } from "./order-entry";

describe("computeOrderTotal", () => {
  it("sums unit price times quantity across line items", () => {
    expect(
      computeOrderTotal([
        { unit_price: 40000, quantity: 2 },
        { unit_price: 25000, quantity: 1 },
      ]),
    ).toBe(105000);
  });

  it("returns 0 for an empty cart", () => {
    expect(computeOrderTotal([])).toBe(0);
  });
});

describe("findCustomerByPhone", () => {
  const customers = [
    {
      id: "1",
      phone: "02055551234",
      name: "ນ້ອຍ",
      province: null,
      district: null,
      village_landmark: null,
      gps_lat: null,
      gps_lng: null,
      order_count: 3,
    },
  ];

  it("matches an exact phone number", () => {
    expect(findCustomerByPhone(customers, "02055551234")?.name).toBe("ນ້ອຍ");
  });

  it("matches across local and international formatting", () => {
    expect(findCustomerByPhone(customers, "+8562055551234")?.name).toBe("ນ້ອຍ");
    expect(findCustomerByPhone(customers, "020 5555 1234")?.name).toBe("ນ້ອຍ");
  });

  it("returns undefined when no customer matches", () => {
    expect(findCustomerByPhone(customers, "020 9999 9999")).toBeUndefined();
  });

  it("returns undefined for a too-short query so it doesn't over-match while typing", () => {
    expect(findCustomerByPhone(customers, "020")).toBeUndefined();
  });
});
