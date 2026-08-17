// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import i18n from "./i18n";

describe("language preferences", () => {
  afterEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage("lo");
  });

  it("uses Lao as the source and fallback language", () => {
    expect(i18n.options.fallbackLng).toContain("lo");
    expect(i18n.t("app.name", { lng: "lo" })).toBe("ຂາຍດີ");
  });

  it("persists a selected language", async () => {
    await i18n.changeLanguage("en");
    expect(localStorage.getItem("mekha-language")).toBe("en");
    expect(i18n.t("nav.orders")).toBe("Orders");
  });
});
