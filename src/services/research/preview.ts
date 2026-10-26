import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
const reference = z.object({ store: z.string().regex(/^[a-zA-Z0-9]+$/), key: z.enum(["brand-home", "brand-entry"]), expires: z.number() });
const sign = (body: string, secret: string) => createHmac("sha256", secret).update(`research-preview:${body}`).digest("base64url");
export function previewToken(store: string, key: "brand-home" | "brand-entry", secret: string, now = Date.now()) {
  const body = Buffer.from(JSON.stringify(reference.parse({ store, key, expires: now + 7 * 86400000 }))).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}
export async function readPreview(token: string, secret: string, fetcher = fetch) {
  if (!secret || token.length > 1000) throw new Error("Preview unavailable");
  const [body, signature, extra] = token.split(".");
  const expected = Buffer.from(sign(body ?? "", secret));
  const supplied = Buffer.from(signature ?? "");
  if (extra || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error("Invalid preview");
  const ref = reference.parse(JSON.parse(Buffer.from(body, "base64url").toString()));
  if (ref.expires < Date.now()) throw new Error("Preview expired");
  const response = await fetcher(`https://api.apify.com/v2/key-value-stores/${ref.store}/records/${ref.key}`, {
    headers: { Authorization: `Bearer ${secret}` }, redirect: "error", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok || response.headers.get("content-type")?.split(";")[0] !== "image/jpeg" || Number(response.headers.get("content-length")) > 3000000) throw new Error("Preview unavailable");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Preview unavailable");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 3000000) throw new Error("Preview too large"); chunks.push(value); }
  } finally { await reader.cancel(); }
  const bytes = Buffer.concat(chunks);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error("Invalid image");
  return bytes;
}
