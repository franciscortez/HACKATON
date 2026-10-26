import { describe, expect, it } from "vitest";
import { GET as getClients } from "@/app/api/clients/route";
import { GET as getClientById } from "@/app/api/clients/[clientId]/route";
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
    expect(body.tools[0]).toMatchObject({ slug: "meeting-to-action", index: "01", status: "NEXT" });
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

describe("GET /api/clients", () => {
  it("lists clients without email addresses", async () => {
    const res = await getClients();
    const body = await res.json();
    expect(body.clients).toHaveLength(2);
    expect(JSON.stringify(body)).not.toContain("email");
  });

  it("returns one client", async () => {
    const res = await getClientById(req("/api/clients/leveric"), ctx({ clientId: "leveric" }));
    expect(res.status).toBe(200);
    expect((await res.json()).client.team).toHaveLength(4);
  });

  it("404s an unknown client", async () => {
    const res = await getClientById(req("/api/clients/x"), ctx({ clientId: "x" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("client_not_found");
  });
});
