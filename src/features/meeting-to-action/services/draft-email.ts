import { emailSchema } from "@/features/meeting-to-action/schemas/output.schema";
import { groupByOwner } from "@/features/meeting-to-action/services/export";
import type { CheckedOutput, EmailDraft } from "@/features/meeting-to-action/types";
import { generateStructured, type ProviderEntry } from "@/lib/ai/provider";
import type { ClientConfig } from "@/schemas/client.schema";
import type { CostNote } from "@/types/run";

/** Plain follow-up email built from the checked register. Used when no model can draft one. */
export function templateEmail(checked: CheckedOutput, client: ClientConfig, title = "the meeting"): EmailDraft {
  const lines = ["Hi team,", "", `Here are the actions from ${title}.`];
  for (const group of groupByOwner(checked.actions, client)) {
    lines.push("", group.owner === "Unassigned" ? "Needs an owner:" : `${group.owner}:`);
    for (const a of group.actions) lines.push(`- ${a.task}${a.due === "No date" ? "" : ` (due ${a.due})`}`);
  }
  if (checked.decisions.length) lines.push("", "Decisions:", ...checked.decisions.map((d) => `- ${d.text}`));
  lines.push("", client.brand.signOff);
  return { subject: `Actions from ${title}`, body: lines.join("\n") };
}

/**
 * Follow-up email in the client's voice, written from the checked register (not the raw
 * transcript), so it cannot reintroduce guessed owners or dates.
 */
export async function draftEmail(args: {
  checked: CheckedOutput;
  client: ClientConfig;
  title?: string;
  providers?: ProviderEntry[];
}): Promise<{ email: EmailDraft; cost: CostNote | null }> {
  const fallback = templateEmail(args.checked, args.client, args.title);
  try {
    const { object, cost } = await generateStructured({
      schema: emailSchema,
      system: `Write a short follow-up email for ${args.client.name}. Voice: ${args.client.brand.voice}
Use only the actions, owners and dates in the draft below. Do not add tasks, owners or dates.
Keep the "Needs an owner" section if it exists. End with exactly: ${args.client.brand.signOff}`,
      prompt: `<draft>\nSubject: ${fallback.subject}\n\n${fallback.body}\n</draft>`,
      policy: args.client.dataPolicy,
      providers: args.providers,
    });
    const body = object.body.trim().endsWith(args.client.brand.signOff) ? object.body : `${object.body.trim()}\n\n${args.client.brand.signOff}`;
    return { email: { subject: object.subject, body }, cost };
  } catch {
    return { email: fallback, cost: null };
  }
}
