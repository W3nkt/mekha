import { describe, expect, it } from "vitest";
import { detectOrderIntent } from "./facebook";
describe("Facebook order intent", () => { it.each(["CF ຂໍ 2", "ຂໍສັ່ງ", "order please", "จอง 1", "ເອົາແນ່"])("detects %s", (text) => expect(detectOrderIntent(text)).toBe(true)); it("ignores ordinary comments", () => expect(detectOrderIntent("ງາມຫຼາຍ")).toBe(false)); });
