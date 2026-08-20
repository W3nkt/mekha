import type { CODSettlementLine } from "@mekha/types";

const STATUS_MAP: Record<string, CODSettlementLine["status"]> = {
  delivered: "paid",
  paid: "paid",
  settled: "paid",
  returned: "returned",
  refused: "returned",
};

/** Anousith settlement CSV: tracking_number,recipient_name,delivery_date,cod_amount,status,remarks */
export function parseCodSettlementCsv(fileContent: string): CODSettlementLine[] {
  const lines = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0].split(",").map((cell) => cell.trim().toLowerCase());
  const trackingIndex = header.indexOf("tracking_number");
  const amountIndex = header.indexOf("cod_amount");
  const statusIndex = header.indexOf("status");
  if (trackingIndex === -1 || amountIndex === -1)
    throw new Error("CSV is missing tracking_number or cod_amount columns");

  const dataLines = lines.slice(1);
  return dataLines.flatMap((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    const trackingNumber = cells[trackingIndex];
    if (!trackingNumber) return [];
    const amount = Number(cells[amountIndex]);
    const rawStatus = (statusIndex >= 0 ? cells[statusIndex] : "").toLowerCase();
    return [
      {
        tracking_number: trackingNumber,
        amount: Number.isFinite(amount) ? amount : 0,
        status: STATUS_MAP[rawStatus] ?? "pending",
      },
    ];
  });
}
