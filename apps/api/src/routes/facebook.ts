import { Hono } from "hono";
import { z } from "zod";
import type { Json } from "@mekha/types";

import { apiError } from "../lib/errors";
import { detectOrderIntent, encryptPageToken, verifyMetaSignature } from "../lib/facebook";
import { createSupabaseClient } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import type { ApiEnv } from "../types";

export const facebookRoute = new Hono<ApiEnv>();

const connectionSchema = z.object({
  page_id: z.string().trim().min(1).max(200),
  page_name: z.string().trim().max(200).optional(),
  page_access_token: z.string().trim().min(1),
});

facebookRoute.get("/webhook", (context) => {
  const mode = context.req.query("hub.mode");
  const token = context.req.query("hub.verify_token");
  const challenge = context.req.query("hub.challenge");
  if (mode === "subscribe" && token && token === context.env.META_VERIFY_TOKEN && challenge)
    return context.text(challenge);
  return apiError(context, 403, "FORBIDDEN", "Invalid webhook verification");
});

facebookRoute.post("/connect", requireAuth, async (context) => {
  const parsed = connectionSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success)
    return apiError(context, 400, "BAD_REQUEST", "Invalid Facebook page connection");
  if (!context.env.META_TOKEN_ENCRYPTION_KEY)
    return apiError(context, 503, "INTERNAL_ERROR", "Facebook integration is not configured");
  const supabase = createSupabaseClient(context.env);
  const seller = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("owner_user_id", context.get("user").id)
    .maybeSingle();
  if (seller.error) return apiError(context, 500, "INTERNAL_ERROR", "Seller lookup failed");
  if (!seller.data) return apiError(context, 403, "FORBIDDEN", "Seller profile required");
  const encrypted = await encryptPageToken(parsed.data.page_access_token, context.env.META_TOKEN_ENCRYPTION_KEY);
  const { data, error } = await supabase
    .from("facebook_integrations")
    .upsert({
      seller_id: seller.data.id,
      page_id: parsed.data.page_id,
      page_name: parsed.data.page_name ?? null,
      encrypted_page_access_token: encrypted,
      status: "connected",
      updated_at: new Date().toISOString(),
    }, { onConflict: "seller_id" })
    .select("id,page_id,page_name,status")
    .single();
  if (error) return apiError(context, 409, "CONFLICT", "Facebook page is already connected");
  return context.json({ data }, 201);
});

facebookRoute.get("/status", requireAuth, async (context) => {
  const supabase = createSupabaseClient(context.env);
  const { data, error } = await supabase
    .from("facebook_integrations")
    .select("id,page_id,page_name,status,created_at")
    .eq("seller_profiles.owner_user_id", context.get("user").id)
    .maybeSingle();
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Facebook status failed");
  return context.json({ data: data ?? null });
});

facebookRoute.get("/connect-url", requireAuth, (context) => {
  const appId = context.env.META_APP_ID;
  const redirectUri = context.env.META_REDIRECT_URI;
  if (!appId || !redirectUri)
    return apiError(context, 503, "INTERNAL_ERROR", "Facebook OAuth is not configured");
  const url = new URL("https://www.facebook.com/v23.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", crypto.randomUUID());
  url.searchParams.set("scope", "pages_read_engagement,pages_messaging,pages_manage_metadata");
  return context.json({ data: { url: url.toString() } });
});

facebookRoute.get("/messages", requireAuth, async (context) => {
  const supabase = createSupabaseClient(context.env);
  const { data, error } = await supabase
    .from("facebook_messages")
    .select("id,external_message_id,source,sender_name,sender_profile_url,message_text,post_id,intent_detected,order_id,received_at,facebook_integrations!inner(seller_profiles!inner(owner_user_id))")
    .eq("facebook_integrations.seller_profiles.owner_user_id", context.get("user").id)
    .order("received_at", { ascending: false })
    .limit(100);
  if (error) return apiError(context, 500, "INTERNAL_ERROR", "Facebook messages failed");
  return context.json({ data: (data ?? []).map(({ facebook_integrations: _integration, ...message }) => message) });
});

const webhookMessages = (payload: Record<string, unknown>) => {
  const messages: Array<{ pageId: string; id: string; source: "comment" | "messenger"; text: string; sender?: string; profile?: string; postId?: string; raw: Record<string, unknown> }> = [];
  for (const entry of (payload.entry as Array<Record<string, unknown>> | undefined) ?? []) {
    const pageId = String(entry.id ?? "");
    for (const change of (entry.changes as Array<Record<string, unknown>> | undefined) ?? []) {
      const value = (change.value as Record<string, unknown> | undefined) ?? {};
      const from = (value.from as Record<string, unknown> | undefined) ?? {};
      if (typeof value.message === "string" && typeof value.comment_id === "string")
        messages.push({ pageId, id: value.comment_id, source: "comment", text: value.message, sender: typeof from.name === "string" ? from.name : undefined, profile: typeof from.id === "string" ? `https://facebook.com/${from.id}` : undefined, postId: typeof value.post_id === "string" ? value.post_id : undefined, raw: value });
    }
    for (const event of (entry.messaging as Array<Record<string, unknown>> | undefined) ?? []) {
      const message = (event.message as Record<string, unknown> | undefined) ?? {};
      const sender = (event.sender as Record<string, unknown> | undefined) ?? {};
      if (typeof message.mid === "string" && typeof message.text === "string")
        messages.push({ pageId, id: message.mid, source: "messenger", text: message.text, sender: typeof sender.id === "string" ? sender.id : undefined, raw: event });
    }
  }
  return messages;
};

facebookRoute.post("/webhook", async (context) => {
  const rawBody = await context.req.text();
  if (!(await verifyMetaSignature(rawBody, context.req.header("x-hub-signature-256"), context.env.META_APP_SECRET)))
    return apiError(context, 403, "FORBIDDEN", "Invalid webhook signature");
  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const supabase = createSupabaseClient(context.env);
  for (const message of webhookMessages(payload)) {
    const integration = await supabase
      .from("facebook_integrations")
      .select("id,seller_id")
      .eq("page_id", message.pageId)
      .eq("status", "connected")
      .maybeSingle();
    if (integration.error || !integration.data) continue;
    const intent = detectOrderIntent(message.text);
    const stored = await supabase.from("facebook_messages").insert({
      integration_id: integration.data.id,
      external_message_id: message.id,
      source: message.source,
      sender_name: message.sender ?? null,
      sender_profile_url: message.profile ?? null,
      message_text: message.text,
      post_id: message.postId ?? null,
      intent_detected: intent,
      raw_payload: message.raw as Json,
    }).select("id").single();
    // The unique external_message_id makes retries idempotent, including
    // concurrent deliveries from Meta.
    if (stored.error || !stored.data) continue;
    let orderId: string | null = null;
    if (intent) {
      const draft = await supabase.from("orders").insert({
        seller_id: integration.data.seller_id,
        friendly_id: `FB-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        terms: { source: "facebook", message_id: message.id, text: message.text, sender: message.sender ?? null },
        amount: 0,
        delivery_fee: 0,
        status: "draft",
      }).select("id").single();
      if (draft.error) continue;
      orderId = draft.data.id;
      await supabase.from("facebook_messages").update({ order_id: orderId }).eq("id", stored.data.id);
    }
  }
  return context.json({ received: true });
});
