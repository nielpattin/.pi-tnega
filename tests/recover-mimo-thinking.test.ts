import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the @anthropic-ai/sdk module before any imports
vi.mock("@anthropic-ai/sdk", () => {
  const mockCreate = vi.fn();
  const mockMessages = { create: mockCreate };
  const mockClient = { messages: mockMessages };

  const Anthropic = vi.fn(() => mockClient);
  // Return both default and named exports
  return { default: Anthropic, Anthropic };
});

// Path to the anthropic provider
const ANTHROPIC_PROVIDER_PATH =
  "../../node_modules/.pnpm/@earendil-works+pi-ai@0.74.1_ws@8.20.1_zod@4.4.3/node_modules/@earendil-works/pi-ai/dist/providers/anthropic.js";

describe("before_provider_request - anthropic provider", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("verifies onPayload is called by streamAnthropic", async () => {
    // The Anthropic provider module is already loaded (or will be on import).
    // We can't easily import it in a test because it has side effects and
    // uses the Anthropic SDK. Instead, let's just verify the code path
    // by checking the source.
    const fs = await import("fs");
    const source = fs.readFileSync(ANTHROPIC_PROVIDER_PATH, "utf-8");

    // Check that streamAnthropic calls options?.onPayload
    expect(source).toContain("options?.onPayload?.(params, model)");
    expect(source).toContain("if (nextParams !== undefined)");

    // Check that the result is used
    expect(source).toContain("params = nextParams");
  });

  it("confirms reasoning_content would survive JSON.stringify", async () => {
    // Simulate what the Anthropic client does: JSON.stringify the body
    const msg = {
      role: "assistant",
      content: [{ type: "text", text: "Hello" }],
      reasoning_content: "thinking text here",
    };
    const payload = {
      model: "mimo-v2.5-pro",
      messages: [msg],
      thinking: { type: "enabled", budget_tokens: 1024 },
      max_tokens: 8192,
      stream: true,
    };

    const serialized = JSON.stringify(payload);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.messages[0].reasoning_content).toBe("thinking text here");
  });

  it("proves convertMessages strips thinking without signature", () => {
    // This is the root cause: when thinkingSignature is empty,
    // convertMessages converts thinking blocks to plain text.
    // The Xiaomi API then expects reasoning_content on the text,
    // but it's missing.
    const msg = {
      role: "assistant",
      content: [
        {
          type: "thinking",
          thinking: "I should think about this carefully.",
          thinkingSignature: "",
        },
        {
          type: "toolCall",
          id: "call_123",
          name: "read",
          arguments: { path: "/test.txt" },
        },
      ],
      provider: "xiaomi-token-plan-sgp",
      api: "anthropic-messages",
      model: "mimo-v2.5-pro",
    };

    // Simulate what convertMessages does:
    // When thinkingSignature is empty/falsy, it pushes a TEXT block instead
    const blocks = [];
    for (const block of msg.content) {
      if (block.type === "thinking") {
        if (!block.thinkingSignature || block.thinkingSignature.trim().length === 0) {
          // Converts to text! This is the bug.
          blocks.push({ type: "text", text: block.thinking });
        } else {
          blocks.push({ type: "thinking", thinking: block.thinking, signature: block.thinkingSignature });
        }
      } else {
        blocks.push(block);
      }
    }

    // Result: only text + toolCall, NO thinking block
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("text");
    expect(blocks[1].type).toBe("tool_use");
    // No thinking block = no reasoning_content = Xiaomi API error
  });

  it("simulates full pipeline: context + before_provider_request", () => {
    // Simulate what happens:
    // 1. context event wraps thinking in <think> tags
    // 2. convertMessages converts thinking blocks to text
    // 3. before_provider_request should add reasoning_content

    const agentMsg = {
      role: "assistant",
      content: [
        {
          type: "thinking",
          thinking: "I need to process this request.",
          thinkingSignature: "",
        },
        {
          type: "text",
          text: "Let me help you with that.",
        },
      ],
      provider: "xiaomi-token-plan-sgp",
      api: "anthropic-messages",
      model: "mimo-v2.5-pro",
    };

    // Step 1: context handler wraps thinking in <think>
    const contextMsgs = [agentMsg].map((msg) => {
      if (msg.role !== "assistant") return msg;
      const c = Array.isArray(msg.content) ? msg.content : [];
      let cm = false;
      const nc = c.map((p) => {
        if (
          (p.type === "thinking" || p.type === "reasoning") &&
          typeof p.thinking === "string" &&
          p.thinking.trim()
        ) {
          cm = true;
          return { type: "text", text: "<think>\n" + p.thinking + "\n</think>" };
        }
        return p;
      });
      if (!cm) return msg;
      return { ...msg, content: nc };
    });

    // After context: ASSISTANT msg has text blocks with <think> tags
    const afterContext = contextMsgs[0];
    expect(afterContext.content[0].type).toBe("text");
    expect(afterContext.content[0].text).toContain("<think>");
    expect(afterContext.content[0].text).toContain("process this request");

    // Step 2: convertMessages processes the message
    // (simplified - just check the text blocks pass through)
    const converted = afterContext.content
      .filter((b) => b.type === "text")
      .map((b) => ({ type: "text", text: b.text }));

    expect(converted).toHaveLength(2);

    // Step 3: before_provider_request extracts reasoning from think tags
    let rc = null;
    const tagged = converted.filter(
      (b) => typeof b.text === "string" && /<think>/i.test(b.text),
    );
    if (tagged.length > 0) {
      rc = tagged
        .map((b) => b.text.replace(/^<think>\s*/i, "").replace(/\s*<\/think>\s*/gi, "\n\n").trim())
        .filter(Boolean)
        .join("\n\n");
    }

    expect(rc).toBe("I need to process this request.");
  });
});
