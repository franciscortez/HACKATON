"use client";

import type { EmailDraft } from "@/features/meeting-to-action/types";

export function EmailDraftEditor({ email, onChange }: { email: EmailDraft; onChange: (email: EmailDraft) => void }) {
  return (
    <section aria-label="Follow-up email">
      <p className="mb-3 text-sm text-ink-soft">Rebuilt from the register until you edit it here.</p>
      <div className="border border-rule-l bg-white">
        <label className="flex items-center gap-3 border-b border-rule-l px-3 py-2">
          <span className="label text-ink-soft">Subject</span>
          <input
            aria-label="Email subject"
            value={email.subject}
            onChange={(e) => onChange({ ...email, subject: e.target.value })}
            className="flex-1 bg-transparent font-medium focus:outline-none"
          />
        </label>
        <textarea
          aria-label="Email body"
          value={email.body}
          onChange={(e) => onChange({ ...email, body: e.target.value })}
          className="min-h-96 w-full resize-y bg-transparent p-3 leading-relaxed focus:outline-none"
        />
      </div>
    </section>
  );
}
