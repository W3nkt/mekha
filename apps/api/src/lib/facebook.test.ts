import { describe, expect, it } from "vitest";

import { detectOrderIntent, verifyMetaSignature } from "./facebook";

describe("Facebook order intent", () => {
  it.each(["CF", "ຈອງ 2 ອັນ", "ຂໍເອົາ", "ສັ່ງ", "order please", "ออเดอร์", "จอง"])(
    "detects %s",
    (message) => expect(detectOrderIntent(message)).toBe(true),
  );

  it("does not classify ordinary conversation as an order", () => {
    expect(detectOrderIntent("ສະບາຍດີ ຂອບໃຈ")).toBe(false);
  });

  it("verifies Meta HMAC signatures", async () => {
    const body = JSON.stringify({ hello: "world" });
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode("secret"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
    const hex = [...signature].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    await expect(verifyMetaSignature(body, `sha256=${hex}`, "secret")).resolves.toBe(true);
    await expect(verifyMetaSignature(body, `sha256=${hex}`, "wrong")).resolves.toBe(false);
  });
});
