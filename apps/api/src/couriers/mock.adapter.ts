import type { CourierAdapter, OrderWithAddress } from "@mekha/types";

const pdfFor = (tracking: string, order: OrderWithAddress) => {
  const text = `KHAIDEE / KhaiDee\\n${tracking}\\nOrder ${order.id}\\nCOD ${order.amount}`;
  const objects = [`1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj`, `2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj`, `3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 298 420] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj`, `4 0 obj<< /Length ${text.length + 48} >>stream\nBT /F1 14 Tf 24 380 Td (${text.replace(/[()]/g, "")}) Tj ET\nendstream endobj`, `5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj`];
  const body = `%PDF-1.4\n${objects.join("\n")}\ntrailer<< /Root 1 0 R >>\n%%EOF`;
  return btoa(body);
};

export class MockCourierAdapter implements CourierAdapter {
  readonly name = "anousith" as const;
  async createShipment(order: OrderWithAddress) { const tracking_number = `MOCK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; return { tracking_number, label_pdf_base64: pdfFor(tracking_number, order) }; }
  async getTrackingStatus(tracking_number: string) { return { status: "created", updated_at: new Date().toISOString() }; }
  async parseCODSettlement() { return []; }
}
