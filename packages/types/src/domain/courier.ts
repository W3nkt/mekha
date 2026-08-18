import type { CourierName } from "../enums";
import type { OrderWithAddress } from "./order";

export type CODSettlementLine = {
  tracking_number: string;
  amount: number;
  status: "paid" | "returned" | "pending";
};

/** Contract implemented by every courier integration, including the mock adapter. */
export interface CourierAdapter {
  readonly name: CourierName;
  createShipment(order: OrderWithAddress): Promise<{
    tracking_number: string;
    label_pdf_base64: string;
  }>;
  getTrackingStatus(tracking_number: string): Promise<{
    status: string;
    updated_at: string;
  }>;
  parseCODSettlement(fileContent: string): Promise<CODSettlementLine[]>;
}
