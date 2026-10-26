"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PublicClient } from "@/services/clients";
import { safeGet, safeSet } from "@/lib/storage";

interface ClientState {
  clients: PublicClient[];
  client: PublicClient | null;
  setClientId: (id: string) => void;
}

const Ctx = createContext<ClientState>({ clients: [], client: null, setClientId: () => {} });
const KEY = "workbench:client";

export function ClientProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<PublicClient[]>([]);
  const [clientId, setId] = useState("");

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((body: { clients: PublicClient[] }) => {
        setClients(body.clients);
        const saved = safeGet<string>(KEY, "");
        setId(body.clients.some((c) => c.id === saved) ? saved : (body.clients[0]?.id ?? ""));
      })
      .catch(() => setClients([]));
  }, []);

  const setClientId = (id: string) => {
    setId(id);
    safeSet(KEY, id);
  };

  const client = clients.find((c) => c.id === clientId) ?? null;
  return <Ctx.Provider value={{ clients, client, setClientId }}>{children}</Ctx.Provider>;
}

export function useClient() {
  return useContext(Ctx);
}
