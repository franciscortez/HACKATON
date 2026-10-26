import { z } from "zod";

/** What the model returns. Unknown owners and dates must come back as null, never guessed. */
export const extractionSchema = z.object({
  actions: z.array(
    z.object({
      task: z.string().describe("Starts with a verb, under 120 characters"),
      owner: z.string().nullable().describe("Name of the person who agreed to do it, or null if nobody was named"),
      dueText: z.string().nullable().describe("Deadline exactly as said in the meeting, or null if none was said"),
      priority: z.enum(["urgent", "normal"]),
      quote: z.string().describe("Exact words from the transcript that show this action"),
      timestamp: z.string().nullable().describe("m:ss timestamp of the quote, or null"),
    }),
  ),
  decisions: z.array(z.object({ text: z.string(), quote: z.string() })),
  openQuestions: z.array(z.object({ text: z.string(), quote: z.string() })),
});

export const flagSchema = z.enum(["owner-unknown", "date-unknown", "owner-not-in-transcript", "ambiguous"]);

export const actionSchema = z.object({
  id: z.string(),
  task: z.string(),
  /** A person in the meeting, or "Unassigned". */
  owner: z.string(),
  /** ISO date (YYYY-MM-DD), or "No date". */
  due: z.string(),
  dueText: z.string().nullable(),
  priority: z.enum(["urgent", "normal"]),
  quote: z.string(),
  timestamp: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  flags: z.array(flagSchema),
});

export const emailSchema = z.object({ subject: z.string(), body: z.string() });

export const outputSchema = z.object({
  actions: z.array(actionSchema),
  /** Speakers plus anyone named as an owner: the choices offered when reviewing owners. */
  people: z.array(z.string()),
  decisions: z.array(z.object({ text: z.string(), quote: z.string(), verified: z.boolean() })),
  openQuestions: z.array(z.object({ text: z.string(), quote: z.string(), verified: z.boolean() })),
  email: emailSchema,
  warnings: z.array(z.enum(["no-speakers"])),
});
