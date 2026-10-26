import { templateEmail } from "@/features/meeting-to-action/services/email-template";
import type { Action, MeetingOutput } from "@/features/meeting-to-action/types";
import type { Settings } from "@/schemas/settings.schema";

/**
 * Applies a reviewer's register edit. Unless the reviewer has written the email by hand, the
 * email is rebuilt from the edited register so it can never contradict the approved owners and dates.
 */
export function applyRegisterEdit(
  output: MeetingOutput,
  actions: Action[],
  opts: { emailEdited: boolean; settings: Settings; title?: string },
): MeetingOutput {
  const next = { ...output, actions };
  return opts.emailEdited ? next : { ...next, email: templateEmail(next, opts.settings, opts.title) };
}
