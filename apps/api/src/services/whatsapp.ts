import type { ApiBindings } from "../types";
export type WhatsAppComponent = { type: "body" | "button"; parameters?: Array<{ type: "text"; text: string }> };
export const WHATSAPP_TEMPLATES = { order_confirmed: "order_confirmed", order_shipped: "order_shipped", cod_collected: "cod_collected", safe_order_new: "safe_order_new", dispute_opened: "dispute_opened" } as const;
export async function sendWhatsAppMessage(to: string | null | undefined, templateName: string, components: WhatsAppComponent[], env: ApiBindings) {
  if (!to || !env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN || env.WHATSAPP_OPT_OUT?.includes(to)) return false;
  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, { method: "POST", headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: { name: templateName, language: { code: "lo" }, components } }) });
    if (!response.ok) console.error(JSON.stringify({ event: "whatsapp_send_failed", templateName, to, status: response.status }));
    return response.ok;
  } catch (error) { console.error(JSON.stringify({ event: "whatsapp_send_error", templateName, message: error instanceof Error ? error.message : String(error) })); return false; }
}
