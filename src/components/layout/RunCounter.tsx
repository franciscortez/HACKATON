"use client";

import { useEffect, useState } from "react";
import { useClient } from "@/components/layout/ClientContext";
import { USAGE_EVENT, getUsage } from "@/services/usage";

export function RunCounter() {
  const { client } = useClient();
  const [used, setUsed] = useState(0);

  useEffect(() => {
    if (!client) return;
    const update = () => setUsed(getUsage(client.id, new Date()));
    update();
    window.addEventListener(USAGE_EVENT, update);
    return () => window.removeEventListener(USAGE_EVENT, update);
  }, [client]);

  if (!client) return null;
  return (
    <span className="label text-ink-soft" aria-label="Runs used this month">
      Runs {used} / {client.usage.runsPerMonth}
    </span>
  );
}
