import { describe, expect, it } from "vitest";
import { buildCsv, formatDateDMY, toCsvRow } from "./csv";

describe("toCsvRow", () => {
  it("joins plain values with commas", () => {
    expect(toCsvRow(["a", 1, "b"])).toBe("a,1,b");
  });

  it("quotes and escapes values containing commas or quotes", () => {
    expect(toCsvRow(["ຮ້ານ, ນ້ອຍ", 'say "hi"'])).toBe(
      '"ຮ້ານ, ນ້ອຍ","say ""hi"""',
    );
  });

  it("renders null and undefined as an empty field", () => {
    expect(toCsvRow([null, undefined, "x"])).toBe(",,x");
  });
});

describe("buildCsv", () => {
  it("puts comment lines first, then the header row, then data rows", () => {
    const csv = buildCsv(
      ["a", "b"],
      [
        [1, 2],
        [3, 4],
      ],
      ["# comment"],
    );
    expect(csv.split("\r\n")).toEqual(["# comment", "a,b", "1,2", "3,4"]);
  });

  it("still renders a header-only CSV when there are no rows", () => {
    expect(buildCsv(["a", "b"], [])).toBe("a,b");
  });
});

describe("formatDateDMY", () => {
  it("formats an ISO date string as DD/MM/YYYY", () => {
    expect(formatDateDMY("2026-08-17T09:30:00.000Z")).toBe("17/08/2026");
  });

  it("pads single-digit days and months", () => {
    expect(formatDateDMY("2026-01-05T00:00:00.000Z")).toBe("05/01/2026");
  });
});
