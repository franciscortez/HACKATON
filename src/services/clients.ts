import harbourside from "@/data/clients/harbourside-accounting.json";
import leveric from "@/data/clients/leveric.json";
import { clientSchema, type ClientConfig } from "@/schemas/client.schema";

const clients: ClientConfig[] = [leveric, harbourside].map((raw) => clientSchema.parse(raw));

export function listClients(): ClientConfig[] {
  return clients;
}

export function getClient(id: string): ClientConfig | null {
  return clients.find((c) => c.id === id) ?? null;
}

/** Client config without contact details, safe to send to the browser. */
export function toPublicClient(client: ClientConfig) {
  return {
    ...client,
    team: client.team.map((m) => ({ name: m.name, aliases: m.aliases, role: m.role, slack: m.slack })),
  };
}

export type PublicClient = ReturnType<typeof toPublicClient>;
