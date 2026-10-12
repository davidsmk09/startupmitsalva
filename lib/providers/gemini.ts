import { env } from "@/lib/env";
import type { AnswerProvider, AskOptions, Citation, ProviderAnswer } from "@/lib/providers/types";
import { ProviderError } from "@/lib/providers/types";
import { dedupeCitations, fetchJson, systemPromptFor } from "@/lib/providers/util";

type GeminiResult = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
  }[];
  usageMetadata?: { totalTokenCount?: number };
};

/**
 * Google Gemini (AI Studio API) mit Google-Search-Grounding.
 * Quellen stammen aus groundingMetadata. Modell aus GEMINI_MODEL.
 */
export const geminiProvider: AnswerProvider = {
  key: "gemini",
  label: "Gemini (Google)",
  isConfigured: () => Boolean(env.str("GEMINI_API_KEY")),
  async ask(prompt: string, opts: AskOptions): Promise<ProviderAnswer> {
    const started = Date.now();
    const model = env.str("GEMINI_MODEL", "gemini-2.0-flash");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const call = (grounding: boolean) =>
      fetchJson<GeminiResult>(url, {
        method: "POST",
        headers: { "x-goog-api-key": env.str("GEMINI_API_KEY"), "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPromptFor(opts.language, opts.region) }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          ...(grounding ? { tools: [{ google_search: {} }] } : {}),
        }),
      });
    let data: GeminiResult;
    try {
      data = await call(true);
    } catch (err) {
      if (err instanceof ProviderError && err.status === 400) data = await call(false);
      else throw err;
    }
    const cand = data.candidates?.[0];
    const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    const citations: Citation[] = (cand?.groundingMetadata?.groundingChunks ?? [])
      .filter((c) => c.web?.uri)
      .map((c) => ({ url: c.web!.uri!, title: c.web!.title }));
    return {
      text,
      citations: dedupeCitations(citations),
      raw: data,
      tokens: data.usageMetadata?.totalTokenCount,
      latencyMs: Date.now() - started,
    };
  },
};
