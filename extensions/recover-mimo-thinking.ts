import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { AgentMessage } from "@earendil-works/pi-agent-core";

type ContentPart = { type?: unknown; text?: unknown; thinking?: unknown };
type AssistantWithMetadata = AgentMessage & {
   role: "assistant";
   content: ContentPart[];
   provider?: string;
   model?: string;
};

function isAssistantWithContent(message: AgentMessage): message is AssistantWithMetadata {
   return message.role === "assistant" && Array.isArray(message.content);
}

function isTextPart(part: ContentPart): part is { type: "text"; text: string } {
   return part.type === "text" && typeof part.text === "string";
}

function isThinkingPart(part: ContentPart): part is { type: "thinking"; thinking: string } {
   return part.type === "thinking" && typeof part.thinking === "string";
}

function stripThinkTag(text: string): string {
   return text
      .replace(/^<think>\s*/i, "")
      .replace(/\s*<\/think>\s*/gi, "\n\n")
      .trim();
}

export default function (pi: ExtensionAPI) {
   pi.on("message_end", async (event) => {
      const message = event.message;

      if (!isAssistantWithContent(message)) return;

      const content = message.content;

      const hasVisibleText = content.some((part) => isTextPart(part) && part.text.trim());

      const hasToolCall = content.some((part) => part.type === "toolCall");

      const thinkingText = content
         .filter(isThinkingPart)
         .map((part) => stripThinkTag(part.thinking))
         .filter(Boolean)
         .join("\n\n");

      if (hasVisibleText || hasToolCall || !thinkingText) return;

      const isMimo = message.provider === "xiaomi-token-plan-sgp" && message.model === "mimo-v2.5-pro";

      if (!isMimo) return;

      return {
         message: {
            ...message,
            content: [
               ...content,
               {
                  type: "text" as const,
                  text: thinkingText,
               },
            ],
         },
      };
   });
}
