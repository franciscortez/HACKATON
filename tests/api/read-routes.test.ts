import { describe, expect, it } from "vitest";
import { GET as getTools } from "@/app/api/tools/route";
import { GET as getToolBySlug } from "@/app/api/tools/[slug]/route";

const req = (path: string) => new Request(`http://localhost${path}`) as never;
const ctx = <T extends object>(params: T) => ({ params: Promise.resolve(params) }) as never;

describe("GET /api/tools", () => {
  it("lists all 10 tools in order", async () => {
    const res = await getTools();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tools).toHaveLength(10);
    expect(body.tools[0]).toMatchObject({ slug: "meeting-to-action", index: "01", status: "LIVE" });
  });
});

describe("GET /api/tools/{slug}", () => {
  it("returns one tool", async () => {
    const res = await getToolBySlug(req("/api/tools/meeting-to-action"), ctx({ slug: "meeting-to-action" }));
    expect(res.status).toBe(200);
    expect((await res.json()).tool.name).toBe("Meeting to action");
  });

  it("404s an unknown tool with the shared error shape", async () => {
    const res = await getToolBySlug(req("/api/tools/unknown"), ctx({ slug: "unknown" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "tool_not_found", message: expect.any(String) },
    });
  });
});
