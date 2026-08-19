import { describe, expect, it } from "vitest";

import { evidencePdf } from "./evidence";

describe("dispute evidence export", () => {
  it("creates a PDF document containing evidence hashes", () => {
    const pdf = new TextDecoder().decode(evidencePdf(["Transaction Evidence Report", "abc123"]));
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("abc123");
    expect(pdf).toContain("%%EOF");
  });
});
