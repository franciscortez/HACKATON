import { groupByOwner } from "@/features/meeting-to-action/services/export";
import type { CheckedOutput, EmailDraft } from "@/features/meeting-to-action/types";
import type { ClientConfig } from "@/schemas/client.schema";

/** Plain follow-up email built from the register. Pure, so the browser can rebuild it after edits. */
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
