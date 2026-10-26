import raw from "@/data/settings.json";
import { settingsSchema, type Settings } from "@/schemas/settings.schema";

const settings = settingsSchema.parse(raw);

export function getSettings(): Settings {
  return settings;
}
