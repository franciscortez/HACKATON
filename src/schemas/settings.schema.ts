import { z } from "zod";

/** Workspace settings shared by every tool: who is writing, how they sound, what rules apply. */
export const settingsSchema = z.object({
  name: z.string().min(1),
  region: z.string(),
  brand: z.object({ voice: z.string(), signOff: z.string().min(1) }),
  rules: z.array(z.string()).default([]),
  dataPolicy: z.enum(["cloud-ok", "local-only"]),
});

export type Settings = z.infer<typeof settingsSchema>;
