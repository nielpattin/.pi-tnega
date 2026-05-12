import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { resolveDefaultMode, normalizeMode, persistMode, type CavemanMode } from "./config";

const KEY = "caveman";

const REINFORCEMENT: Record<string, string> = {
   lite: `CAVEMAN LITE ACTIVE. Apply these rules every response. Do not revert after many turns.

Drop: filler (just/really/basically/actually/simply/essentially), hedging ("might be worth", "you could consider"), pleasantries ("sure", "certainly", "of course", "happy to").
Keep: articles (a/an/the), full sentences, professional register.
Use: short synonyms (big not extensive, fix not "implement a solution for").
Technical terms exact. Code blocks unchanged.

Pattern: [thing] [action] [reason]. [next step].
Not: "Sure! I'd be happy to help with that. The issue you're experiencing is likely caused by..."
Yes: "Bug in auth middleware. Token expiry check uses < not <=. Fix:"

Drop caveman for: security warnings, irreversible actions, multi-step sequences where omission risks misread, if user asks to clarify.
Code/commits/PRs: write normal.
Stop: "stop caveman" or "normal mode".`,
   full: `CAVEMAN FULL ACTIVE. Apply these rules every response. Do not revert after many turns.

Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging.
Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for").
Technical terms exact. Code blocks unchanged. Errors quoted exact.

Pattern: [thing] [action] [reason]. [next step].
Not: "Sure! I'd be happy to help with that. The issue you're experiencing is likely caused by..."
Yes: "Bug in auth middleware. Token expiry check uses < not <=. Fix:"

Drop caveman for: security warnings, irreversible actions, multi-step sequences where omission risks misread, if user asks to clarify.
Code/commits/PRs: write normal.
Stop: "stop caveman" or "normal mode".`,
   ultra: `CAVEMAN ULTRA ACTIVE. Apply these rules every response. Do not revert after many turns.

Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging, conjunctions (and/but/or) when causality clear.
Fragments OK. Short synonyms. Technical terms exact.
Abbreviate prose words: DB/auth/config/req/res/fn/impl.
Arrows for causality: X → Y. One word when one word enough.
Code symbols, function names, API names, error strings: never abbreviate.

Pattern: [thing] [action] [reason]. [next step].
Not: "Sure! I'd be happy to help with that. The issue you're experiencing is likely caused by..."
Yes: "Bug in auth middleware. Token expiry check uses < not <=. Fix:"

Drop caveman for: security warnings, irreversible actions, multi-step sequences where omission risks misread, if user asks to clarify.
Code/commits/PRs: write normal.
Stop: "stop caveman" or "normal mode".`,
};

let activeMode: CavemanMode | null = null;

function statusLabel(mode: CavemanMode | null): string | undefined {
   if (!mode) return undefined;
   return `caveman: ${mode}`;
}

function updateStatus(ui: ExtensionContext["ui"]) {
   ui.setStatus(KEY, statusLabel(activeMode));
}

export default function (pi: ExtensionAPI) {
   // --- Session start: auto-activate from settings ---
   pi.on("session_start", (_event, ctx) => {
      activeMode = resolveDefaultMode();
      updateStatus(ctx.ui);
   });

   // --- Commands ---
   pi.registerCommand("caveman", {
      description: "Toggle caveman mode (lite/full/ultra)",
      handler: async (args, ctx) => {
         const arg = args?.trim().toLowerCase();

         // No args: toggle on/off
         if (!arg) {
            if (activeMode) {
               activeMode = null;
               persistMode(null);
               ctx.ui.notify("Caveman off. Normal mode.", "info");
            } else {
               activeMode = resolveDefaultMode();
               persistMode(activeMode);
               ctx.ui.notify(`Caveman ${activeMode} active.`, "info");
            }
            updateStatus(ctx.ui);
            return;
         }

         // Parse mode arg
         const mode = normalizeMode(arg);
         if (mode === null) {
            activeMode = null;
            persistMode(null);
            ctx.ui.notify("Caveman off. Normal mode.", "info");
         } else if (mode === undefined) {
            ctx.ui.notify(`Unknown mode: ${arg}. Use: lite/full/ultra/off`, "warning");
         } else {
            activeMode = mode;
            persistMode(mode);
            ctx.ui.notify(`Caveman ${mode} active.`, "info");
         }
         updateStatus(ctx.ui);
      },
   });

   // --- Before agent start: inject caveman rules when active ---
   pi.on("before_agent_start", (event, _ctx) => {
      if (!activeMode) return {};

      const reinforcement = REINFORCEMENT[activeMode];
      if (!reinforcement) return {};

      return {
         systemPrompt:
            event.systemPrompt +
            "\n\n" +
            reinforcement +
            "\nActive every response. Off only: 'stop caveman' or 'normal mode'. Code/commits/security: write normal.",
      };
   });

   // --- Input: detect mode commands in natural language ---
   pi.on("input", (event, ctx) => {
      const prompt = event.text?.trim().toLowerCase() || "";

      // Natural language activation
      if (
         /\b(activate|enable|turn on|start|talk like)\b.*\bcaveman\b/i.test(prompt) ||
         /\bcaveman\b.*\b(mode|activate|enable|turn on|start)\b/i.test(prompt)
      ) {
         if (!/\b(stop|disable|turn off|deactivate)\b/i.test(prompt)) {
            if (!activeMode) {
               activeMode = resolveDefaultMode();
               persistMode(activeMode);
               updateStatus(ctx.ui);
            }
         }
      }

      // Natural language deactivation
      if (
         /\b(stop|disable|deactivate|turn off)\b.*\bcaveman\b/i.test(prompt) ||
         /\bcaveman\b.*\b(stop|disable|deactivate|turn off)\b/i.test(prompt) ||
         /\bnormal mode\b/i.test(prompt)
      ) {
         if (activeMode) {
            activeMode = null;
            persistMode(null);
            updateStatus(ctx.ui);
         }
      }
   });
}
