import { describe, expect, it } from "vitest";

import { phoneSearchFragments } from "./sellers";

describe("phoneSearchFragments", () => {
  it("rejects phone searches without at least two digits", () => {
    expect(phoneSearchFragments("--")).toEqual([]);
    expect(phoneSearchFragments("2")).toEqual([]);
  });

  it("keeps short digit fragments for contains matching", () => {
    expect(phoneSearchFragments("29")).toEqual(["29"]);
    expect(phoneSearchFragments("986")).toEqual(["986"]);
  });

  it("matches local Lao prefixes against E.164 storage", () => {
    expect(phoneSearchFragments("020")).toEqual(["020", "+85620"]);
  });

  it("matches international input against local and E.164 storage", () => {
    expect(phoneSearchFragments("+856 20")).toEqual([
      "85620",
      "+85620",
      "020",
    ]);
  });
});
