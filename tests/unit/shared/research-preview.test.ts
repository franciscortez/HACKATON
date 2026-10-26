import { expect, test, vi } from "vitest";
import { previewToken, readPreview } from "@/services/research/preview";
test("preview signatures reject tampering, expiry and arbitrary store access", async () => {
  const fetcher = vi.fn();
  const token = previewToken("store123", "brand-home", "secret", 0);
  await expect(readPreview(token, "secret", fetcher)).rejects.toThrow();
  const current = previewToken("store123", "brand-home", "secret");
  await expect(readPreview(current + "x", "secret", fetcher)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
test("preview fetches only a signed Apify record and rejects HTML", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("<script>evil</script>", { headers: { "Content-Type": "text/html" } }));
  await expect(readPreview(previewToken("store123", "brand-home", "secret"), "secret", fetcher)).rejects.toThrow();
  expect(fetcher.mock.calls[0][0]).toBe("https://api.apify.com/v2/key-value-stores/store123/records/brand-home");
});
