import { z } from "zod";

export const teamMemberSchema = z.object({
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  role: z.string(),
  email: z.string().optional(),
  slack: z.string().optional(),
});

export const clientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  industry: z.string(),
  region: z.string(),
  synthetic: z.boolean(),
  brand: z.object({ voice: z.string(), signOff: z.string() }),
  team: z.array(teamMemberSchema).min(1),
  rules: z.array(z.string()).default([]),
  usage: z.object({ runsPerMonth: z.number().int().positive() }),
  dataPolicy: z.enum(["cloud-ok", "local-only"]),
  tools: z.object({
    "research-to-call-brief": z.object({
      enabled: z.boolean(), maxRunUsd: z.number().positive().max(0.1), runsPerMonth: z.number().int().positive().max(20),
    }).optional(),
  }).optional(),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;
export type ClientConfig = z.infer<typeof clientSchema>;
