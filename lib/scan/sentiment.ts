import { z } from "zod";
import { env } from "@/lib/env";
import { hasHelperLlm, llmJson } from "@/lib/providers/llm-json";

/**
 * Sentiment der Markenerwähnung per Zusatz-LLM-Call (nur mit Key).
 * EXPERIMENTELL/SCHWANKEND – fließt NICHT in den Score ein.
 */
export async function classifySentiment(answer: string, brandName: string): Promise<"positiv" | "neutral" | "negativ" | null> {
  if (!env.sentimentEnabled || !hasHelperLlm()) return null;
  const res = await llmJson({
    system: "Du bewertest, wie eine Marke in einem Text dargestellt wird. Antworte nur im JSON-Format.",
    user: `Marke: ${brandName}\n\nText:\n${answer.slice(0, 6000)}\n\nWie wird die Marke dargestellt? positiv, neutral oder negativ?`,
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      required: ["sentiment"],
      properties: { sentiment: { type: "string", enum: ["positiv", "neutral", "negativ"] } },
    },
    validator: z.object({ sentiment: z.enum(["positiv", "neutral", "negativ"]) }),
  });
  return res?.sentiment ?? null;
}

/**
 * Optionaler Verifikations-Call für unklare (nur fuzzy) Treffer.
 * Per SCAN_VERIFY_ENABLED abschaltbar. Gibt null zurück, wenn nicht verfügbar.
 */
export async function verifyMention(answer: string, brandName: string, aliases: string[]): Promise<boolean | null> {
  if (!env.verifyEnabled || !hasHelperLlm()) return null;
  const res = await llmJson({
    system: "Du prüfst, ob ein bestimmtes Unternehmen in einem Text namentlich genannt wird. Antworte nur im JSON-Format.",
    user: `Unternehmen: ${brandName}${aliases.length ? ` (auch: ${aliases.join(", ")})` : ""}\n\nText:\n${answer.slice(0, 6000)}`,
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      required: ["mentioned"],
      properties: { mentioned: { type: "boolean" } },
    },
    validator: z.object({ mentioned: z.boolean() }),
  });
  return res?.mentioned ?? null;
}
