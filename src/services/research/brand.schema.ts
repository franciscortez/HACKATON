import { z } from "zod";
const observation = z.object({ value: z.string().max(240), selector: z.string().max(180), role: z.string().max(80), sourceId: z.string() });
export const brandSchema = z.object({
  colors: z.array(observation.extend({ value: z.string().regex(/^rgba?\([\d.,\s%]+\)$/) })).max(8),
  fonts: z.array(observation).max(6),
  imagery: z.array(observation).max(4),
  actions: z.array(observation).max(5),
  logo: observation.nullable(),
  preview: z.string().regex(/^\/api\/research\/preview\?token=[\w.-]+$/).nullable(),
});
export type Brand = z.infer<typeof brandSchema>;
export const emptyBrand = (): Brand => ({ colors: [], fonts: [], imagery: [], actions: [], logo: null, preview: null });
