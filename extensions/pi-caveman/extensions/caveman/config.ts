import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const MODES = ["lite", "full", "ultra"] as const;

export type CavemanMode = (typeof MODES)[number];

const SETTINGS_PATH = join(homedir(), ".pi", "agent", "settings.json");

export function resolveDefaultMode(): CavemanMode | null {
   try {
      if (existsSync(SETTINGS_PATH)) {
         const settings = JSON.parse(readFileSync(SETTINGS_PATH, "utf8"));
         const mode = typeof settings.caveman === "string" ? settings.caveman.toLowerCase() : null;
         if (mode === "off") return null;
         if (mode && MODES.includes(mode as CavemanMode)) return mode as CavemanMode;
      }
   } catch {
      // Settings missing or invalid — fall through
   }
   return "full";
}

export function persistMode(mode: CavemanMode | null): void {
   try {
      const raw = existsSync(SETTINGS_PATH) ? readFileSync(SETTINGS_PATH, "utf8") : "{}";
      const settings = JSON.parse(raw);
      settings.caveman = mode ?? "off";
      writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");
   } catch {
      // Silent fail — settings write is best-effort
   }
}

/** Returns the resolved mode, null to deactivate, or undefined if arg is unknown. */
export function normalizeMode(input: string): CavemanMode | null | undefined {
   const lower = input.trim().toLowerCase();
   if (lower === "off" || lower === "stop") return null;
   if (MODES.includes(lower as CavemanMode)) return lower as CavemanMode;
   return undefined;
}
