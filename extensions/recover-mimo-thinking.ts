/**
 * Xiaomi Anthropic compatibility requires historical assistant reasoning to be
 * replayed as Anthropic `thinking` content blocks. Despite the error text saying
 * `reasoning_content`, the Anthropic endpoint rejects `messages[].reasoning_content`
 * and accepts `{ type: "thinking", thinking, signature: "" }`.
 *
 * pi-ai's Anthropic provider converts signature-less thinking blocks to text.
 * This fetch-level patch restores those leading text blocks to thinking blocks
 * immediately before the HTTP request is sent.
 */

let patched = false;

function stripThinkTags(text) {
   return text
      .replace(/^<think>\s*/i, "")
      .replace(/\s*<\/think>\s*/gi, "")
      .trim();
}

function isThinkingMarker(text) {
   return /<think>/i.test(text);
}

function restoreAssistantThinking(msg) {
   if (msg.role !== "assistant") return msg;
   const content = Array.isArray(msg.content) ? msg.content : [];
   if (content.some((block) => block.type === "thinking" || block.type === "redacted_thinking")) return msg;

   const firstTextIndex = content.findIndex(
      (block) => block.type === "text" && typeof block.text === "string" && block.text.trim(),
   );
   if (firstTextIndex < 0) return msg;

   const firstText = content[firstTextIndex].text;
   const hasToolUse = content.some((block) => block.type === "tool_use");
   const tagged = isThinkingMarker(firstText);

   // In pi history for Xiaomi thinking mode, provider converts the prior
   // `thinking` block into the first text block. Tool-call turns are the ones
   // Xiaomi rejects, and tagged turns come from our context marker.
   if (!hasToolUse && !tagged) return msg;

   const thinking = stripThinkTags(firstText);
   if (!thinking) return msg;

   const nextContent = [...content];
   nextContent[firstTextIndex] = {
      type: "thinking",
      thinking,
      signature: "",
   };

   return { ...msg, content: nextContent };
}

export default function (pi) {
   if (!patched) {
      patched = true;
      const origFetch = globalThis.fetch;

      globalThis.fetch = async function fetchWrapper(input, init) {
         let url;
         if (typeof input === "string") {
            url = input;
         } else if (input instanceof URL) {
            url = input.href;
         } else if (input && typeof input === "object" && "url" in input) {
            url = input.url;
         } else {
            return origFetch.call(this, input, init);
         }

         if (url.includes("xiaomimimo.com") && url.includes("/anthropic") && init && typeof init.body === "string") {
            try {
               const parsed = JSON.parse(init.body);
               if (Array.isArray(parsed.messages)) {
                  const nextMessages = parsed.messages.map(restoreAssistantThinking);
                  const changed = nextMessages.some((msg, index) => msg !== parsed.messages[index]);
                  if (changed) {
                     parsed.messages = nextMessages;
                     const newBody = JSON.stringify(parsed);
                     const newInit = { ...init, body: newBody };
                     if (newInit.headers) {
                        const headers = new Headers(newInit.headers);
                        if (headers.get("content-length")) {
                           headers.set("content-length", String(new TextEncoder().encode(newBody).length));
                        }
                        newInit.headers = headers;
                     }
                     return origFetch.call(this, input, newInit);
                  }
               }
            } catch {
               // Pass through unchanged if body is not JSON or shape differs.
            }
         }

         return origFetch.call(this, input, init);
      };
   }

   // Mark preserved thinking explicitly. pi-ai converts signature-less thinking
   // to text later; fetch wrapper turns this marker back into a thinking block.
   pi.on("context", (event, ctx) => {
      if (!ctx.model || typeof ctx.model.provider !== "string") return;
      if (!ctx.model.provider.startsWith("xiaomi")) return;

      let mutated = false;
      const messages = event.messages.map((msg) => {
         if (msg.role !== "assistant") return msg;
         const content = Array.isArray(msg.content) ? msg.content : [];
         const nextContent = content.map((block) => {
            if (block.type !== "thinking") return block;
            if (typeof block.thinking !== "string" || !block.thinking.trim()) return block;
            mutated = true;
            return { type: "text", text: `<think>\n${block.thinking}\n</think>` };
         });
         return mutated ? { ...msg, content: nextContent } : msg;
      });

      if (!mutated) return;
      return { messages };
   });
}
