import { z } from "zod";

const range = z.object({ start: z.number(), end: z.number() });

export const versionSchema = z.object({
  n: z.number().int().min(1),
  source: z.enum(["upload", "hand", "claude"]),
  label: z.string(),
  summary: z.string().nullable(),
  changedRange: range.nullable(),
  createdAt: z.string(),
});

/** One imported video. Its files live in media/<id>/. */
export const mediaSchema = z.object({
  id: z.string().regex(/^m\d{1,2}$/),
  name: z.string(),
  file: z.string(),
  durationS: z.number(),
  width: z.number(),
  height: z.number(),
  hasAudio: z.boolean(),
  language: z.string().nullable(),
});

export const projectSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  name: z.string(),
  media: z.array(mediaSchema),
  sessionId: z.string().nullable(),
  versions: z.array(versionSchema),
  current: z.number().int().min(1),
  status: z.enum(["DRAFT", "EDITED", "APPROVED"]),
  job: z.object({ kind: z.string(), startedAt: z.string() }).nullable(),
});
