export const ORDER_INTENT_KEYWORDS = ["cf", "ຈອງ", "ຈ່ອງ", "ເອົາ", "ສັ່ງ", "order", "ອອເດີ", "จอง", "เอา"] as const;
export const detectOrderIntent = (text: string) => ORDER_INTENT_KEYWORDS.some((keyword) => text.toLocaleLowerCase().includes(keyword.toLocaleLowerCase()));
export const verifyFacebookSignature = async (rawBody: string, signature: string | undefined, secret: string) => {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), new TextEncoder().encode(rawBody));
  const actual = signature.slice(7); const hex = Array.from(new Uint8Array(expected), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (actual.length !== hex.length) return false;
  let mismatch = 0; for (let index = 0; index < hex.length; index += 1) mismatch |= actual.charCodeAt(index) ^ hex.charCodeAt(index); return mismatch === 0;
};
