import type { CourierAdapter } from "@mekha/types";
import { parseCodSettlementCsv } from "./csv";

/** Used in development, staging, and CI until a real Anousith API integration exists. */
export class MockCourierAdapter implements CourierAdapter {
  readonly name = "anousith" as const;

  async createShipment(order: { id: string; friendly_id: string }) {
    return {
      tracking_number: `MOCK-${order.friendly_id}-${Date.now().toString(36).toUpperCase()}`,
    };
  }

  async getTrackingStatus(_tracking_number: string) {
    return { status: "in_transit", updated_at: new Date().toISOString() };
  }

  async parseCODSettlement(fileContent: string) {
    return parseCodSettlementCsv(fileContent);
  }
}
