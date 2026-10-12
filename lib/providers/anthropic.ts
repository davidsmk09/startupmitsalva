import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import type { AnswerProvider, AskOptions, Citation, ProviderAnswer } from "@/lib/providers/types";
import { ProviderError } from "@/lib/providers/types";
import { dedupeCitations, PROVIDER_TIMEOUT_MS, systemPromptFor } from "@/lib/providers/util";

let client: Anthropic | null = null;
function getClient() {
  if (!client) {
    // Retries übernimmt unser eigenes withRetry (einheitlich für alle Provider)
    client = new Anthropic({ apiKey: env.str("ANTHROPIC_API_KEY"), timeout: PROVIDER_TIMEOUT_MS * 2, maxRetries: 0 });
  }
  return client;
}

/**
 * Anthropic Messages-API mit serverseitigem Websuche-Tool.
 * Modell aus ANTHROPIC_MODEL (Namen veralten – bei Bedarf anpassen).
 * Ältere Modelle unterstützen ggf. nur "web_search_20250305" – per
 * ANTHROPIC_WEB_SEARCH_TOOL überschreibbar.
 */
export const anthropicProvider: AnswerProvider = {
  key: "anthropic",
  label: "Claude (Anthropic)",
  isConfigured: () => Boolean(env.str("ANTHROPIC_API_KEY")),
  async ask(prompt: string, opts: AskOptions): Promise<ProviderAnswer> {
    const started = Date.now();
    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await getClient().beta.messages.create({
        model: env.str("ANTHROPIC_MODEL", "claude-opus-5-5"),
        max_tokens: 4000,
        system: systemPromptFor(opts.language, opts.region),
        // Bei einer Sicherheits-Ablehnung beantwortet automatisch ein Fallback-Modell
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        tools: [
          {
            type: env.str("ANTHROPIC_WEB_SEARCH_TOOL", "web_search_20260209"),
            name: "web_search",
            max_uses: 3,
          } as unknown as Anthropic.Beta.BetaToolUnion,
        ],
        messages: [{ role: "user", content: prompt }],
      });
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) throw new ProviderError(err.message, 429, true);
      if (err instanceof Anthropic.InternalServerError) throw new ProviderError(err.message, err.status, true);
      if (err instanceof Anthropic.APIConnectionError) throw new ProviderError(err.message, undefined, true);
      if (err instanceof Anthropic.APIError) throw new ProviderError(err.message, err.status, false);
      throw err;
    }

    if (message.stop_reason === "refusal") {
      throw new ProviderError("Anfrage wurde vom Modell abgelehnt (refusal).", 200, false);
    }

    let text = "";
    const citations: Citation[] = [];
    for (const block of message.content) {
      if (block.type === "text") {
        text += block.text;
        for (const c of block.citations ?? []) {
          if (c.type === "web_search_result_location") citations.push({ url: c.url, title: c.title ?? undefined });
        }
      } else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) {
          if (r.type === "web_search_result") citations.push({ url: r.url, title: r.title });
        }
      }
    }
    return {
      text,
      citations: dedupeCitations(citations),
      raw: message,
      tokens: (message.usage.input_tokens ?? 0) + (message.usage.output_tokens ?? 0),
      latencyMs: Date.now() - started,
    };
  },
};
