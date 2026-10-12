import { env } from "@/lib/env";
import type { AnswerProvider, AskOptions, Citation, ProviderAnswer } from "@/lib/providers/types";
import { dedupeCitations, fetchJson, systemPromptFor } from "@/lib/providers/util";

type SonarResult = {
  choices?: { message?: { content?: string } }[];
  citations?: string[];
  search_results?: { title?: string; url: string }[];
  usage?: { total_tokens?: number };
};

/** Perplexity Sonar-API. Modell aus PERPLEXITY_MODEL. */
export const perplexityProvider: AnswerProvider = {
  key: "perplexity",
  label: "Perplexity",
  isConfigured: () => Boolean(env.str("PERPLEXITY_API_KEY")),
  async ask(prompt: string, opts: AskOptions): Promise<ProviderAnswer> {
    const started = Date.now();
    const data = await fetchJson<SonarResult>("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.str("PERPLEXITY_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.str("PERPLEXITY_MODEL", "sonar"),
        messages: [
          { role: "system", content: systemPromptFor(opts.language, opts.region) },
          { role: "user", content: prompt },
        ],
      }),
    });
    const citations: Citation[] = [
      ...(data.search_results ?? []).map((r) => ({ url: r.url, title: r.title })),
      ...(data.citations ?? []).map((url) => ({ url })),
    ];
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      citations: dedupeCitations(citations),
      raw: data,
      tokens: data.usage?.total_tokens,
      latencyMs: Date.now() - started,
    };
  },
};
