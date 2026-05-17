import { loadThemeConfig } from "./theme.ts";

export interface IconSet {
   pi: string;
   model: string;
   folder: string;
   branch: string;
   git: string;
   tokens: string;
   context: string;
   cost: string;
   time: string;
   agents: string;
   cache: string;
   input: string;
   output: string;
   host: string;
   session: string;
   auto: string;
   warning: string;
   skills: string;
}

// Separator characters
export const SEP_DOT = " · ";

// Thinking level display text (Unicode/ASCII)
export const THINKING_TEXT_UNICODE: Record<string, string> = {
   minimal: "[min]",
   low: "[low]",
   medium: "[med]",
   high: "[high]",
   xhigh: "[xhi]",
};

// Thinking level display text (Nerd Fonts - with icons)
export const THINKING_TEXT_NERD: Record<string, string> = {
   minimal: "\u{F0E7} min", // lightning bolt
   low: "\u{F10C} low", // circle outline
   medium: "\u{F192} med", // dot circle
   high: "\u{F111} high", // circle
   xhigh: "\u{F06D} xhi", // fire
};

// Get thinking text based on font support
export function getThinkingText(level: string): string | undefined {
   if (hasNerdFonts()) {
      return THINKING_TEXT_NERD[level];
   }
   return THINKING_TEXT_UNICODE[level];
}

// Nerd Font icons (matching oh-my-pi exactly)
export const NERD_ICONS: IconSet = {
   pi: "\uE22C", // nf-oct-pi (stylized pi icon)
   model: "\uEC19", // nf-md-chip (model/AI chip)
   folder: "\uF115", // nf-fa-folder_open
   branch: "\uF126", // nf-fa-code_fork (git branch)
   git: "\uF1D3", // nf-fa-git (git logo)
   tokens: "\uE26B", // nf-seti-html (tokens symbol)
   context: "\uE70F", // nf-dev-database (database)
   cost: "\uF155", // nf-fa-dollar
   time: "\uF017", // nf-fa-clock_o
   agents: "\uF0C0", // nf-fa-users
   cache: "\uF1C0", // nf-fa-database (cache)
   input: "\uF090", // nf-fa-sign_in (input arrow)
   output: "\uF08B", // nf-fa-sign_out (output arrow)
   host: "\uF109", // nf-fa-laptop (host)
   session: "\uF550", // nf-md-identifier (session id)
   auto: "\u{F0068}", // nf-md-lightning_bolt (auto-compact)
   warning: "\uF071", // nf-fa-warning
   skills: "\uF085", // nf-fa-gears (tools/skills)
};

// ASCII/Unicode fallback icons (matching oh-my-pi)
export const ASCII_ICONS: IconSet = {
   pi: "π",
   model: "",
   folder: "",
   branch: "",
   git: "⎇",
   tokens: "⊛",
   context: "",
   cost: "$",
   time: "◷",
   agents: "AG",
   cache: "cache",
   input: "in:",
   output: "out:",
   host: "host",
   session: "id",
   auto: "AC",
   warning: "!",
   skills: "SK",
};

type PartialIconSet = Partial<IconSet>;

function sanitizeUserIconOverrides(value: unknown): PartialIconSet {
   if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {};
   }

   const sanitized: PartialIconSet = {};
   const validKeys = Object.keys(NERD_ICONS) as Array<keyof IconSet>;
   for (const key of validKeys) {
      const icon = (value as Record<string, unknown>)[key];
      if (typeof icon === "string") {
         sanitized[key] = icon;
      }
   }

   return sanitized;
}

// Separator characters
export interface SeparatorChars {
   left: string;
   right: string;
   thinLeft: string;
   thinRight: string;
}

export const NERD_SEPARATORS: SeparatorChars = {
   left: "\uE0B0", //
   right: "\uE0B2", //
   thinLeft: "\uE0B1", //
   thinRight: "\uE0B3", //
};

export const ASCII_SEPARATORS: SeparatorChars = {
   left: ">",
   right: "<",
   thinLeft: "|",
   thinRight: "|",
};

// Detect Nerd Font support (check TERM or specific env var)
export function hasNerdFonts(): boolean {
   // User can set this env var to force Nerd Fonts
   if (process.env.STATION_BAR_NERD_FONTS === "1") return true;
   if (process.env.STATION_BAR_NERD_FONTS === "0") return false;

   // Check for Ghostty (survives into tmux via GHOSTTY_RESOURCES_DIR)
   if (process.env.GHOSTTY_RESOURCES_DIR) return true;

   // Check common terminals known to support Nerd Fonts (case-insensitive)
   const term = (process.env.TERM_PROGRAM || "").toLowerCase();
   const nerdTerms = ["iterm", "wezterm", "kitty", "ghostty", "alacritty"];
   return nerdTerms.some((t) => term.includes(t));
}

export function getIcons(): IconSet {
   const baseIcons = hasNerdFonts() ? NERD_ICONS : ASCII_ICONS;
   return {
      ...baseIcons,
      ...sanitizeUserIconOverrides(loadThemeConfig().icons),
   };
}

export function getSeparatorChars(): SeparatorChars {
   return hasNerdFonts() ? NERD_SEPARATORS : ASCII_SEPARATORS;
}
