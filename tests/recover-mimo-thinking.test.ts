import assert from "node:assert/strict";
import test from "node:test";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import recoverMimoThinking from "../extensions/recover-mimo-thinking.ts";

type Handler = (event: any, ctx?: any) => any;

function createPi(): { on: (name: string, handler: Handler) => void; handlers: Map<string, Handler> } {
   const handlers = new Map<string, Handler>();
   return {
      handlers,
      on(name: string, handler: Handler) {
         handlers.set(name, handler);
      },
   };
}

await test("recovers thinking for DeepSeek providers", async () => {
   const pi = createPi();
   recoverMimoThinking(pi as unknown as ExtensionAPI);

   const beforeProviderRequest = pi.handlers.get("before_provider_request");
   assert.ok(beforeProviderRequest);

   const payload = {
      messages: [
         {
            role: "assistant",
            content: [
               { type: "text", text: "<think>Need inspect first.</think>" },
               { type: "tool_use", id: "tool-1", name: "read", input: { path: "file.ts" } },
            ],
         },
      ],
   };

   const requestResult = beforeProviderRequest?.(
      { payload },
      { model: { provider: "openai-completions", id: "deepseek-v4-pro" } },
   );

   assert.deepEqual(requestResult, {
      ...payload,
      messages: [
         {
            role: "assistant",
            content: [
               { type: "thinking", thinking: "<think>Need inspect first.</think>" },
               { type: "tool_use", id: "tool-1", name: "read", input: { path: "file.ts" } },
            ],
            reasoning_content: "Need inspect first.",
         },
      ],
   });

   const reasoningOnlyRequest = beforeProviderRequest?.(
      {
         payload: {
            messages: [
               {
                  role: "assistant",
                  content: [{ type: "reasoning", reasoning: "<think>Need keep this.</think>" }],
               },
            ],
         },
      },
      { model: { provider: "openrouter", id: "deepseek/deepseek-v4-flash" } },
   );

   assert.deepEqual(reasoningOnlyRequest, {
      messages: [
         {
            role: "assistant",
            content: [{ type: "reasoning", reasoning: "<think>Need keep this.</think>" }],
            reasoning_content: "Need keep this.",
         },
      ],
   });

   const messageEnd = pi.handlers.get("message_end");
   assert.ok(messageEnd);

   const messageResult = await messageEnd?.({
      message: {
         role: "assistant",
         content: [{ type: "reasoning", reasoning: "<think>Need inspect first.</think>" }],
         reasoning_content: "<think>Need inspect first.</think>",
         provider: "openrouter",
         model: "deepseek/deepseek-v4-pro",
      },
   });

   assert.deepEqual(messageResult, {
      message: {
         role: "assistant",
         content: [
            { type: "reasoning", reasoning: "<think>Need inspect first.</think>" },
            { type: "text", text: "Need inspect first." },
         ],
         reasoning_content: "<think>Need inspect first.</think>",
         provider: "openrouter",
         model: "deepseek/deepseek-v4-pro",
      },
   });
});
