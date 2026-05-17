import type { SeparatorDef } from "./types.ts";
import { getSeparatorChars } from "./icons.ts";

export function getSeparator(): SeparatorDef {
   const chars = getSeparatorChars();

   return {
      left: chars.thinLeft,
      right: chars.thinRight,
      endCaps: {
         left: chars.right,
         right: chars.left,
         useBgAsFg: true,
      },
   };
}
