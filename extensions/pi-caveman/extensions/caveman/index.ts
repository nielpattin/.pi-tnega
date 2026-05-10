import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { resolveDefaultMode, normalizeMode, persistMode, type CavemanMode } from "./config";

const KEY = "caveman";

const REINFORCEMENT: Record<string, string> = {
   lite: "CAVEMAN LITE. Drop filler/hedging. Keep articles + full sentences. Professional but tight.",
   full: "CAVEMAN ACTIVE. Drop articles/filler/pleasantries/hedging. Fragments OK. Short synonyms. Technical terms exact.",
   ultra: "CAVEMAN ULTRA. Abbreviate prose (DB/auth/config/req/res/fn/impl). Strip conjunctions. Arrows for causality. Code symbols never abbreviate.",
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

   pi.registerCommand("caveman-commit", {
      description: "Generate terse caveman commit message",
      handler: async (_args, ctx) => {
         ctx.ui.notify("Use /skill:caveman-commit for commit message generation.", "info");
      },
   });

   pi.registerCommand("caveman-review", {
      description: "One-line caveman code review",
      handler: async (_args, ctx) => {
         ctx.ui.notify("Use /skill:caveman-review for code review.", "info");
      },
   });

   pi.registerCommand("caveman-compress", {
      description: "Compress a memory file to caveman format",
      handler: async (args, ctx) => {
         if (!args?.trim()) {
            ctx.ui.notify("Usage: /caveman-compress <filepath>", "warning");
            return;
         }
         ctx.ui.notify("Use /skill:compress for file compression.", "info");
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
