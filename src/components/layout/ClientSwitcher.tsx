"use client";

import { useClient } from "@/components/layout/ClientContext";

export function ClientSwitcher() {
  const { clients, client, setClientId } = useClient();
  return (
    <label className="flex items-center gap-2">
      <span className="label text-ink-soft">Client</span>
      <select
        aria-label="Client"
        value={client?.id ?? ""}
        onChange={(e) => setClientId(e.target.value)}
        className="border border-rule-l bg-white px-2 py-1 text-sm font-medium"
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.synthetic ? " (synthetic)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
