import { describe, expect, it } from "vitest";
import { clientSchema } from "@/schemas/client.schema";
import { getClient, listClients } from "@/services/clients";

describe("client configs", () => {
  it("loads both seeded clients", () => {
    const ids = listClients().map((c) => c.id);
    expect(ids).toEqual(["leveric", "harbourside-accounting"]);
  });

  it("marks Harbourside as synthetic and Leveric as real", () => {
    expect(getClient("harbourside-accounting")?.synthetic).toBe(true);
    expect(getClient("leveric")?.synthetic).toBe(false);
  });

  it("returns null for an unknown client", () => {
    expect(getClient("nope")).toBeNull();
  });

  it("rejects a config without a team", () => {
    const { team: _team, ...withoutTeam } = getClient("leveric")!;
    expect(clientSchema.safeParse(withoutTeam).success).toBe(false);
  });
});
