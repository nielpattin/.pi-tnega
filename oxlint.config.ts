import { defineConfig } from "oxlint";

export default defineConfig({
   options: {
      typeAware: true,
      typeCheck: true,
   },
   env: {
      builtin: true,
   },
   ignorePatterns: ["skills/**", "**/pi-mcp-adapter/**", "preciseVerboseReporter.ts"],
   rules: {
      "eslint/no-control-regex": "off",
   },
});
