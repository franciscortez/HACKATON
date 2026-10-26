import { emailSchema } from "@/features/meeting-to-action/schemas/output.schema";
import { templateEmail } from "@/features/meeting-to-action/services/email-template";
import type { CheckedOutput, EmailDraft } from "@/features/meeting-to-action/types";
import { generateStructured, type ProviderEntry } from "@/lib/ai/provider";
import type { Settings } from "@/schemas/settings.schema";
import type { CostNote } from "@/types/run";

/**
 * Follow-up email in the workspace voice, written from the checked register (not the raw
 * transcript), so it cannot reintroduce guessed owners or dates.
 */
export async function draftEmail(args: {
  checked: CheckedOutput;
  settings: Settings;
  title?: string;
  providers?: ProviderEntry[];
}): Promise<{ email: EmailDraft; cost: CostNote | null }> {
  const { signOff, voice } = args.settings.brand;
  const fallback = templateEmail(args.checked, args.settings, args.title);
  try {
    const { object, cost } = await generateStructured({
      schema: emailSchema,
      system: `Write a short follow-up email from ${args.settings.name}. Voice: ${voice}
Use only the actions, owners and dates in the draft below. Do not add tasks, owners or dates.
Keep the "Needs an owner" section if it exists. End with exactly: ${signOff}`,
      prompt: `<draft>\nSubject: ${fallback.subject}\n\n${fallback.body}\n</draft>`,
      policy: args.settings.dataPolicy,
      providers: args.providers,
    });
    const body = object.body.trim().endsWith(signOff) ? object.body : `${object.body.trim()}\n\n${signOff}`;
    return { email: { subject: object.subject, body }, cost };
  } catch {
    return { email: fallback, cost: null };
  }
}
