/**
 * Tokens Per Second Extension - displays a live tok/s reading while the
 * assistant is streaming, then keeps the final reading when the message ends.
 *
 * The footer displays:
 * - ↑{input tokens} ↓{output tokens} ${total cost} | {tps} tok/s {time} | {model}
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  let messageStartAt = 0;
  let ttftMs = 0;
  let streamedChars = 0;
  let lastOutputTokens = 0;
  let lastElapsedSeconds = 0;
  let agentRunning = false;

  const estimateTokensFromChars = (chars: number): number => {
    if (chars <= 0) return 0;
    return Math.max(1, Math.round(chars / 4));
  };

  const formatTps = (outputTokens: number, elapsedSeconds: number): string => {
    if (outputTokens > 0 && elapsedSeconds > 0) {
      return (outputTokens / elapsedSeconds).toFixed(2);
    }
    return "--";
  };

  const getElapsedSeconds = (now = Date.now(), includeWaitWhenNoTtft = false): number => {
    if (messageStartAt === 0) return 0;
    if (ttftMs === 0) {
      return includeWaitWhenNoTtft ? Math.max(0, (now - messageStartAt) / 1000) : 0;
    }
    return Math.max(0, (now - messageStartAt - ttftMs) / 1000);
  };

  const update = (ctx: ExtensionContext) => {
    if (!ctx.hasUI) return;

    const theme = ctx.ui.theme;
    const label = agentRunning ? "live" : "final";
    const prefix = theme.fg("muted", `${label} `);

    ctx.ui.setStatus("tps", prefix + theme.fg("accent", `${formatTps(lastOutputTokens, lastElapsedSeconds)} tok/s`));
    ctx.ui.setStatus("streaming-time", prefix + theme.fg("accent", `${lastElapsedSeconds.toFixed(2)}s`));
  };

  const reset = (ctx: ExtensionContext) => {
    messageStartAt = 0;
    ttftMs = 0;
    streamedChars = 0;
    lastOutputTokens = 0;
    lastElapsedSeconds = 0;
    agentRunning = false;
    update(ctx);
  };

  pi.on("session_start", async (_event, ctx) => {
    reset(ctx);
  });

  pi.on("agent_start", async (_event, ctx) => {
    agentRunning = true;
    update(ctx);
  });

  pi.on("agent_end", async (_event, ctx) => {
    agentRunning = false;
    update(ctx);
  });

  pi.on("message_start", async (event, ctx) => {
    if (event.message.role !== "assistant") return;

    messageStartAt = event.message.timestamp;
    ttftMs = 0;
    streamedChars = 0;
    lastOutputTokens = 0;
    lastElapsedSeconds = 0;
    update(ctx);
  });

  pi.on("message_update", async (event, ctx) => {
    if (event.message.role !== "assistant" || messageStartAt === 0) return;

    if (event.assistantMessageEvent.type === "done" || event.assistantMessageEvent.type === "error") {
      return;
    }

    if (ttftMs === 0 && event.assistantMessageEvent.type !== "start") {
      ttftMs = Date.now() - messageStartAt;
    }

    if (event.assistantMessageEvent.type === "text_delta") {
      streamedChars += event.assistantMessageEvent.delta.length;
    }

    if (event.assistantMessageEvent.type === "thinking_delta") {
      streamedChars += event.assistantMessageEvent.delta.length;
    }

    if (event.assistantMessageEvent.type === "toolcall_delta") {
      streamedChars += event.assistantMessageEvent.delta.length;
    }

    lastOutputTokens = Math.max(
      event.assistantMessageEvent.partial.usage.output ?? 0,
      estimateTokensFromChars(streamedChars),
    );
    lastElapsedSeconds = getElapsedSeconds();
    update(ctx);
  });

  pi.on("message_end", async (event, ctx) => {
    if (event.message.role !== "assistant") return;

    lastOutputTokens = event.message.usage.output ?? 0;
    lastElapsedSeconds = getElapsedSeconds(Date.now(), true);

    if (event.message.stopReason !== "toolUse") {
      update(ctx);
    }

    messageStartAt = 0;
    ttftMs = 0;
    streamedChars = 0;
  });
}
