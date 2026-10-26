import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { ResearchError } from "./types";

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
] satisfies [string, number][]) blocked.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [["::", 96], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["2001:db8::", 32]] satisfies [string, number][]) {
  blocked.addSubnet(address, prefix, "ipv6");
}

export async function publicUrl(raw: string, resolve = (hostname: string) => lookup(hostname, { all: true })) {
  const invalid = () => new ResearchError("unsafe_url", "Use a public business website URL without credentials or a private address.", undefined, 400);
  let url: URL;
  try { url = new URL(raw); } catch { throw invalid(); }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || isIP(hostname) || !hostname.includes(".") ||
      /\.(local|localhost|internal|lan|home|test|invalid)$/.test(hostname) || (url.port && !["80", "443"].includes(url.port))) throw invalid();
  let addresses;
  try { addresses = await resolve(hostname); } catch { throw new ResearchError("source_unavailable", "This website could not be found. Check the URL or paste source text."); }
  if (!addresses.length || addresses.some(({ address, family }) => (family === 6 && address.toLowerCase().includes("ffff:")) || blocked.check(address, family === 6 ? "ipv6" : "ipv4"))) throw invalid();
  url.hash = "";
  return url.href;
}
