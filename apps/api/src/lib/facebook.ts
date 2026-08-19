export const ORDER_INTENT_KEYWORDS = [
  "cf", "ຈອງ", "ຈ່ອງ", "ເອົາ", "ສັ່ງ", "order", "ออเดอร์", "จอง", "เอา",
] as const;

export const detectOrderIntent = (text: string) => {
  const normalized = text.trim().toLocaleLowerCase();
  return normalized.length > 0 && ORDER_INTENT_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.toLocaleLowerCase()),
  );
};

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const encryptionKey = async (secret: string) =>
  crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );

export const encryptPageToken = async (token: string, secret: string) => {
  if (!secret) throw new Error("META_TOKEN_ENCRYPTION_KEY is not configured");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(secret),
    new TextEncoder().encode(token),
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`;
};

export const verifyMetaSignature = async (rawBody: string, header: string | undefined, secret: string | undefined) => {
  if (!header?.startsWith("sha256=") || !secret) return false;
  const expected = new Uint8Array(await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    new TextEncoder().encode(rawBody),
  ));
  const provided = header.slice(7).toLowerCase();
  const expectedHex = [...expected].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return provided.length === expectedHex.length && [...provided].every((char, index) => char === expectedHex[index]);
};
