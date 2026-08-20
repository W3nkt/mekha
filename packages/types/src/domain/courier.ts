import type { CourierName } from "../enums";

export type CODSettlementLine = {
  tracking_number: string;
  amount: number;
  status: "paid" | "returned" | "pending";
};

/** Contract implemented by every courier integration, including the mock adapter. */
export interface CourierAdapter {
  readonly name: CourierName;
  createShipment(order: { id: string; friendly_id: string }): Promise<{
    tracking_number: string;
  }>;
  getTrackingStatus(tracking_number: string): Promise<{
    status: string;
    updated_at: string;
  }>;
  parseCODSettlement(fileContent: string): Promise<CODSettlementLine[]>;
}
