import { env } from "@/lib/env";
import type { AnswerProvider, AskOptions, Citation, ProviderAnswer } from "@/lib/providers/types";
import { ProviderError } from "@/lib/providers/types";
import { dedupeCitations, fetchJson, systemPromptFor } from "@/lib/providers/util";

type ResponsesApiResult = {
  output?: {
    type: string;
    content?: { type: string; text?: string; annotations?: { type: string; url?: string; title?: string }[] }[];
  }[];
  usage?: { total_tokens?: number };
};

/**
 * OpenAI Responses-API mit Websuche-Tool. Falls das Tool für das Modell
 * nicht verfügbar ist, wird ohne Tool erneut gefragt (normale Antwort).
 * Modellname aus OPENAI_MODEL (Namen veralten – bei Bedarf anpassen).
 */
export const openaiProvider: AnswerProvider = {
  key: "openai",
  label: "ChatGPT (OpenAI)",
  isConfigured: () => Boolean(env.str("OPENAI_API_KEY")),
  async ask(prompt: string, opts: AskOptions): Promise<ProviderAnswer> {
    const started = Date.now();
    const model = env.str("OPENAI_MODEL", "gpt-4o-mini");
    const call = (withTools: boolean) =>
      fetchJson<ResponsesApiResult>("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.str("OPENAI_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          instructions: systemPromptFor(opts.language, opts.region),
          input: prompt,
          ...(withTools ? { tools: [{ type: "web_search" }] } : {}),
        }),
      });

    let data: ResponsesApiResult;
    try {
      data = await call(true);
    } catch (err) {
      if (err instanceof ProviderError && err.status === 400) data = await call(false);
      else throw err;
    }

    let text = "";
    const citations: Citation[] = [];
    for (const item of data.output ?? []) {
      if (item.type !== "message") continue;
      for (const c of item.content ?? []) {
        if (c.type === "output_text" && c.text) {
          text += c.text;
          for (const a of c.annotations ?? []) {
            if (a.type === "url_citation" && a.url) citations.push({ url: a.url, title: a.title });
          }
        }
      }
    }
    return {
      text,
      citations: dedupeCitations(citations),
      raw: data,
      tokens: data.usage?.total_tokens,
      latencyMs: Date.now() - started,
    };
  },
};
