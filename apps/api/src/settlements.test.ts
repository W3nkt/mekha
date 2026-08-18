import { describe, expect, it } from "vitest";
import { matchSettlement, parseSettlementCsv } from "./settlements";
describe("COD settlements", () => {
  it("parses and settles within 100 LAK", () => { const lines = parseSettlementCsv("tracking_number,recipient_name,delivery_date,cod_amount,status\nANS-1,Noy,2026-08-15,55050,delivered"); const result = matchSettlement(lines, [{ id: "o1", tracking_number: "ANS-1", amount: 55000 }]); expect(result[0].action).toBe("settled"); });
  it("flags discrepancies and unmatched rows", () => { const lines = parseSettlementCsv("tracking_number,recipient_name,delivery_date,cod_amount,status\nANS-1,Noy,,45000,delivered\nANS-X,, ,0,delivered"); const result = matchSettlement(lines, [{ id: "o1", tracking_number: "ANS-1", amount: 55000 }]); expect(result.map((item) => item.action)).toEqual(["discrepancy", "unmatched"]); });
});
