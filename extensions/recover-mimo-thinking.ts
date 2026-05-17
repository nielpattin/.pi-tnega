import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { AgentMessage } from "@earendil-works/pi-agent-core";

type ContentPart = { type?: unknown; text?: unknown; thinking?: unknown; reasoning?: unknown };
type ProviderMessage = Record<string, unknown> & {
   role?: unknown;
   content?: ContentPart[];
   reasoning_content?: unknown;
};
type AssistantWithMetadata = AgentMessage & {
   role: "assistant";
   content: ContentPart[];
   provider?: string;
   model?: string;
};
type ProviderPayload = {
   model?: string;
   messages?: ProviderMessage[];
};

function isAssistantWithContent(message: AgentMessage): message is AssistantWithMetadata {
   return message.role === "assistant" && Array.isArray(message.content);
}

function isTextPart(part: ContentPart): part is { type: "text"; text: string } {
   return part.type === "text" && typeof part.text === "string";
}

function isThinkingPart(
   part: ContentPart,
): part is { type: "thinking" | "reasoning"; thinking?: string; text?: string; reasoning?: string } {
   return (
      (part.type === "thinking" || part.type === "reasoning") &&
      (typeof part.thinking === "string" || typeof part.text === "string" || typeof part.reasoning === "string")
   );
}

function getThinkingText(part: ContentPart): string {
   if (typeof part.thinking === "string") return part.thinking;
   if (typeof part.text === "string") return part.text;
   if (typeof part.reasoning === "string") return part.reasoning;
   return "";
}

function stripThinkTag(text: string): string {
   return text
      .replace(/^<think>\s*/i, "")
      .replace(/\s*<\/think>\s*/gi, "\n\n")
      .trim();
}

function isRecoverThinkingProvider(provider?: string): boolean {
   return typeof provider === "string" && (provider.startsWith("xiaomi") || provider.startsWith("deepseek"));
}

function isRecoverThinkingModelId(id?: string): boolean {
   return typeof id === "string" && (id.startsWith("mimo") || id.includes("deepseek"));
}

function isRecoverThinkingModel(model?: { provider?: string; baseUrl?: string; id?: string }): boolean {
   return isRecoverThinkingProvider(model?.provider) || isRecoverThinkingModelId(model?.id);
}

function normalizeAssistantPayload(message: ProviderMessage): ProviderMessage {
   if (message.role !== "assistant") return message;

   const content = Array.isArray(message.content) ? message.content : [];
   const toolUseIndex = content.findIndex((part) => part.type === "tool_use");
   const leadingContent = toolUseIndex >= 0 ? content.slice(0, toolUseIndex) : content;
   const leadingText = leadingContent.filter(isTextPart);
   const thinkingParts = content.filter(isThinkingPart);

   const hasThinkingParts = thinkingParts.length > 0;
   const hasThinkTaggedText = leadingText.some((part) => /<think>/i.test(part.text));
   if (!hasThinkingParts && toolUseIndex < 0 && !hasThinkTaggedText) return message;

   const reasoningContent = (
      hasThinkingParts
         ? thinkingParts.map((part) => stripThinkTag(getThinkingText(part)))
         : leadingText.map((part) => stripThinkTag(part.text))
   )
      .filter(Boolean)
      .join("\n\n");

   if (!reasoningContent) return message;

   const contentChanged = toolUseIndex >= 0 && leadingText.length > 0;
   const nextContent = contentChanged
      ? content.map((part, index) => {
           if (index >= toolUseIndex) return part;
           if (isTextPart(part)) {
              return { type: "thinking", thinking: part.text };
           }
           return part;
        })
      : content;

   const currentReasoningContent =
      typeof message.reasoning_content === "string" ? message.reasoning_content.trim() : "";

   const nextReasoningContent = currentReasoningContent.length > 0 ? message.reasoning_content : reasoningContent;

   if (!contentChanged && nextReasoningContent === message.reasoning_content) {
      return message;
   }

   return {
      ...message,
      content: nextContent,
      reasoning_content: nextReasoningContent,
   };
}

export default function (pi: ExtensionAPI) {
   pi.on("before_provider_request", (event, ctx) => {
      if (!isRecoverThinkingModel(ctx.model)) return;

      const payload = event.payload as ProviderPayload | undefined;
      if (!payload || !Array.isArray(payload.messages)) return;

      let mutated = false;
      const messages = payload.messages.map((message) => {
         if (message.role !== "assistant") return message;

         const nextMessage = normalizeAssistantPayload(message);
         if (nextMessage !== message) mutated = true;
         return nextMessage;
      });

      if (!mutated) return;
      return { ...payload, messages };
   });

   pi.on("message_end", async (event) => {
      const message = event.message;

      if (!isAssistantWithContent(message)) return;

      const content = message.content;

      const hasVisibleText = content.some((part) => isTextPart(part) && part.text.trim());
      const hasToolCall = content.some((part) => part.type === "toolCall");

      const reasoningContent = typeof message.reasoning_content === "string" ? message.reasoning_content : "";
      const thinkingParts = content
         .filter(isThinkingPart)
         .map((part) => stripThinkTag(getThinkingText(part)))
         .filter(Boolean);
      const thinkingText = (thinkingParts.length > 0 ? thinkingParts : [stripThinkTag(reasoningContent)])
         .filter(Boolean)
         .join("\n\n");

      if (hasVisibleText || hasToolCall || !thinkingText) return;

      const shouldRecoverThinking =
         isRecoverThinkingProvider(message.provider) || isRecoverThinkingModelId(message.model);
      if (!shouldRecoverThinking) return;

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
