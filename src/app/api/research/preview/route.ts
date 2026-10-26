import { readPreview } from "@/services/research/preview";
import { getSettings } from "@/services/settings";
export async function GET(request: Request) {
  if(getSettings().dataPolicy==="local-only")return Response.json({error:{code:"local_preview_blocked",message:"Cloud website previews are disabled by local-only policy."}},{status:403});
  try {
    const bytes = await readPreview(new URL(request.url).searchParams.get("token") ?? "", process.env.APIFY_API_KEY ?? "");
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" } });
  } catch { return Response.json({ error: { code: "preview_unavailable", message: "This saved website preview is unavailable." } }, { status: 404 }); }
}
