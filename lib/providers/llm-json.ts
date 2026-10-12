import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import { env } from "@/lib/env";
import { logger, errorMessage } from "@/lib/logger";
import { fetchJson, withRetry } from "@/lib/providers/util";

/** Ist irgendein LLM für Hilfsaufgaben (JSON-Auswertung) verfügbar? */
export function hasHelperLlm(): boolean {
  return Boolean(env.str("OPENAI_API_KEY") || env.str("ANTHROPIC_API_KEY") || env.str("GEMINI_API_KEY"));
}

/**
 * Hilfs-LLM-Aufruf mit striktem JSON-Schema (Prompt-Generierung, Sentiment,
 * Verifikation). Nutzt den ersten verfügbaren Anbieter. Das Ergebnis wird
 * zusätzlich mit zod validiert. Gibt null zurück, wenn nichts verfügbar ist
 * oder die Antwort ungültig ist (Aufrufer haben immer einen Fallback).
 */
export async function llmJson<T>(input: {
  system: string;
  user: string;
  jsonSchema: Record<string, unknown>;
  validator: ZodType<T>;
}): Promise<T | null> {
  try {
    const raw = await withRetry(() => callLlm(input), { attempts: 2 });
    if (raw === null) return null;
    const parsed = input.validator.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch (err) {
    logger.warn("llm_json.failed", { error: errorMessage(err) });
    return null;
  }
}

async function callLlm(input: { system: string; user: string; jsonSchema: Record<string, unknown> }): Promise<string | null> {
  if (env.str("OPENAI_API_KEY")) {
    const data = await fetchJson<{ choices?: { message?: { content?: string } }[] }>(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${env.str("OPENAI_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.str("OPENAI_MODEL", "gpt-4o-mini"),
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.user },
          ],
          response_format: { type: "json_schema", json_schema: { name: "result", strict: true, schema: input.jsonSchema } },
        }),
      },
    );
    return data.choices?.[0]?.message?.content ?? null;
  }
  if (env.str("ANTHROPIC_API_KEY")) {
    const client = new Anthropic({ apiKey: env.str("ANTHROPIC_API_KEY"), maxRetries: 0 });
    const msg = await client.messages.create({
      model: env.str("ANTHROPIC_MODEL", "claude-opus-5-5"),
      max_tokens: 4000,
      system: input.system,
      output_config: { format: { type: "json_schema", schema: input.jsonSchema } },
      messages: [{ role: "user", content: input.user }],
    });
    if (msg.stop_reason === "refusal") return null;
    const block = msg.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    return block?.text ?? null;
  }
  if (env.str("GEMINI_API_KEY")) {
    const model = env.str("GEMINI_MODEL", "gemini-2.0-flash");
    const data = await fetchJson<{ candidates?: { content?: { parts?: { text?: string }[] } }[] }>(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": env.str("GEMINI_API_KEY"), "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: [{ role: "user", parts: [{ text: input.user }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? null;
  }
  return null;
}
