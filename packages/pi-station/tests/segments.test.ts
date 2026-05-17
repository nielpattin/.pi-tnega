import { describe, test, expect } from "vitest";

// Mock theme that just returns text as-is
const mockTheme = {
   fg: (_color: string, text: string) => text,
};

// Helper to create mock segment context
function createMockCtx(overrides: Record<string, any> = {}) {
   return {
      usageStats: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 },
      autoCompactEnabled: false,
      contextPercent: 0,
      contextTokens: 0,
      contextWindow: 0,
      customCompactionEnabled: false,
      theme: mockTheme,
      colors: {},
      ...overrides,
   };
}

// Import segments from the module
import { SEGMENTS } from "../segments.ts";

describe("cache_read segment", () => {
   test("shows cost next to cache tokens when cost exists", () => {
      const ctx = createMockCtx({
         usageStats: { input: 10000, output: 5000, cacheRead: 405000, cacheWrite: 0, cost: 0.105 },
      });
      const result = SEGMENTS.cache_read.render(ctx as any);
      expect(result.visible).toBe(true);
      expect(result.content).toContain("C:405k | $0.105");
   });

   test("shows only cache tokens when cost is 0", () => {
      const ctx = createMockCtx({
         usageStats: { input: 10000, output: 5000, cacheRead: 405000, cacheWrite: 0, cost: 0 },
      });
      const result = SEGMENTS.cache_read.render(ctx as any);
      expect(result.visible).toBe(true);
      expect(result.content).toContain("C:405k");
      expect(result.content).not.toContain("$");
   });

   test("hides when no cache read tokens", () => {
      const ctx = createMockCtx({
         usageStats: { input: 10000, output: 5000, cacheRead: 0, cacheWrite: 0, cost: 0.105 },
      });
      const result = SEGMENTS.cache_read.render(ctx as any);
      expect(result.visible).toBe(false);
   });
});

describe("cost segment (auto)", () => {
   test("shows only (auto) without cost", () => {
      const ctx = createMockCtx({
         autoCompactEnabled: true,
         usageStats: { input: 10000, output: 5000, cacheRead: 405000, cacheWrite: 0, cost: 0.105 },
      });
      const result = SEGMENTS.cost.render(ctx as any);
      expect(result.visible).toBe(true);
      expect(result.content).toContain("(auto)");
      expect(result.content).not.toContain("$");
   });

   test("hides when auto compact disabled", () => {
      const ctx = createMockCtx({
         autoCompactEnabled: false,
         usageStats: { input: 10000, output: 5000, cacheRead: 405000, cacheWrite: 0, cost: 0.105 },
      });
      const result = SEGMENTS.cost.render(ctx as any);
      expect(result.visible).toBe(false);
   });
});
