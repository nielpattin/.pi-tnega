import type { ColorScheme, PresetDef } from "./types.ts";
import { getDefaultColors } from "./theme.ts";

const DEFAULT_COLORS: ColorScheme = getDefaultColors();

export const DEFAULT_LAYOUT: PresetDef = {
   leftSegments: ["path", "git"],
   rightSegments: ["skills"],
   secondarySegments: ["shell_mode", "context_pct", "cache_read", "cost"],
   secondaryRightSegments: ["model", "thinking"],
   tertiarySegments: ["extension_statuses"],
   separator: "thin",
   colors: DEFAULT_COLORS,
   segmentOptions: {
      model: { showThinkingLevel: false },
      path: { mode: "full" },
      git: { showBranch: true, showStaged: true, showUnstaged: true, showUntracked: true },
   },
};
