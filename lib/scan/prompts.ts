import { z } from "zod";
import type { PromptCategory } from "@/lib/constants";
import { hasHelperLlm, llmJson } from "@/lib/providers/llm-json";
import { normalizeName } from "@/lib/scan/parser";

export type PromptInput = {
  industry: string;
  city: string;
  region?: string | null;
  brandName: string;
  brandAliases?: string[];
  competitors?: { name: string }[];
  language?: string;
};

export type GeneratedPrompt = { stableId: string; text: string; category: PromptCategory };

const PREFIX: Record<PromptCategory, string> = {
  KATEGORIE: "kat",
  EMPFEHLUNG: "emp",
  VERGLEICH: "ver",
  LOKAL: "lok",
  MARKE: "mar",
};

export function makeStableId(category: PromptCategory, index: number): string {
  return `${PREFIX[category]}-${String(index).padStart(2, "0")}`;
}

/** Regelbasierte Templates (markenneutral außer Kategorie MARKE). */
function templates(i: PromptInput): Record<PromptCategory, string[]> {
  const b = i.industry.trim();
  const c = i.city.trim();
  const r = i.region?.trim();
  if (i.language === "en") {
    return {
      KATEGORIE: [
        `Which ${b} providers are there in ${c}?`,
        `List well-known ${b} companies in ${c}.`,
        `Which ${b} businesses in ${c} have good reviews?`,
        `Who offers ${b} services in ${c}?`,
      ],
      EMPFEHLUNG: [
        `Which ${b} provider in ${c} do you recommend?`,
        `Who is the best ${b} in ${c}?`,
        `I need a reliable ${b} in ${c}. Who should I contact?`,
        `Which ${b} in ${c} is good value for money?`,
      ],
      VERGLEICH: [
        `What should I look for when choosing a ${b} in ${c}?`,
        `How do ${b} providers in ${c} differ in price and service?`,
        `Compare the leading ${b} providers in ${c}.`,
      ],
      LOKAL: [
        `${b} near ${c} – who is available on short notice?`,
        `Which ${b} is recommended within 20 km of ${c}?`,
        ...(r ? [`Which ${b} providers are there in ${r}?`] : [`Which ${b} in the ${c} area offers personal consultation?`]),
      ],
      MARKE: [`What do you know about ${i.brandName}?`, `Is ${i.brandName} a good choice for ${b} in ${c}?`],
    };
  }
  return {
    KATEGORIE: [
      `Welche ${b}-Anbieter gibt es in ${c}?`,
      `Nenne mir bekannte ${b}-Unternehmen in ${c}.`,
      `Welche ${b}-Betriebe in ${c} haben gute Bewertungen?`,
      `Wer bietet ${b}-Leistungen in ${c} an?`,
      `Gibt es in ${c} spezialisierte ${b}-Anbieter?`,
    ],
    EMPFEHLUNG: [
      `Welchen ${b}-Anbieter in ${c} empfiehlst du?`,
      `Wer ist der beste ${b}-Anbieter in ${c}?`,
      `Ich suche einen zuverlässigen ${b}-Anbieter in ${c}. An wen soll ich mich wenden?`,
      `Welcher ${b}-Anbieter in ${c} hat ein gutes Preis-Leistungs-Verhältnis?`,
      `Welchen ${b}-Anbieter in ${c} würdest du einem Freund empfehlen?`,
    ],
    VERGLEICH: [
      `Worauf sollte ich bei der Wahl eines ${b}-Anbieters in ${c} achten?`,
      `Wie unterscheiden sich ${b}-Anbieter in ${c} bei Preis und Service?`,
      `Vergleiche die wichtigsten ${b}-Anbieter in ${c}.`,
      `Welche Fragen sollte ich einem ${b}-Anbieter vor der Beauftragung stellen?`,
    ],
    LOKAL: [
      `${b} in der Nähe von ${c} – wer hat kurzfristig Zeit?`,
      `Welcher ${b}-Anbieter im Umkreis von 20 km um ${c} ist empfehlenswert?`,
      `Welcher ${b}-Anbieter in ${c} bietet eine persönliche Beratung vor Ort?`,
      ...(r ? [`Welche ${b}-Anbieter gibt es in der Region ${r}?`] : [`Welche ${b}-Anbieter gibt es im Großraum ${c}?`]),
    ],
    MARKE: [
      `Was weißt du über ${i.brandName}?`,
      `Ist ${i.brandName} eine gute Wahl für ${b} in ${c}?`,
      `Welche Erfahrungen gibt es mit ${i.brandName}?`,
    ],
  };
}

/** Prüft, dass ein markenneutraler Prompt die Marke (oder Aliase) nicht enthält. */
export function containsBrand(text: string, input: Pick<PromptInput, "brandName" | "brandAliases">): boolean {
  const norm = ` ${normalizeName(text)} `;
  return [input.brandName, ...(input.brandAliases ?? [])]
    .map((n) => normalizeName(n))
    .filter((n) => n.length >= 2)
    .some((n) => norm.includes(` ${n} `));
}

function finalize(byCat: Record<PromptCategory, string[]>, input: PromptInput, max: number): GeneratedPrompt[] {
  const order: PromptCategory[] = ["KATEGORIE", "EMPFEHLUNG", "VERGLEICH", "LOKAL", "MARKE"];
  const result: GeneratedPrompt[] = [];
  for (const cat of order) {
    const list = byCat[cat]
      .map((s) => s.trim())
      .filter((s) => s.length >= 5)
      .filter((s) => (cat === "MARKE" ? true : !containsBrand(s, input)))
      .slice(0, cat === "MARKE" ? 3 : 8);
    list.forEach((text, idx) => result.push({ stableId: makeStableId(cat, idx + 1), text, category: cat }));
  }
  // Auf max kürzen, aber Kategorien ausgewogen halten (Round-Robin)
  if (result.length <= max) return result;
  const buckets = order.map((c) => result.filter((p) => p.category === c));
  const out: GeneratedPrompt[] = [];
  while (out.length < max) {
    let added = false;
    for (const b of buckets) {
      const p = b.shift();
      if (p && out.length < max) {
        out.push(p);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}

/** Regelbasierte Prompt-Erzeugung (immer verfügbar, deterministisch). */
export function generateTemplatePrompts(input: PromptInput, max = 30): GeneratedPrompt[] {
  return finalize(templates(input), input, max);
}

const llmSchema = z.object({
  prompts: z.array(z.object({ text: z.string().min(5).max(300), category: z.enum(["KATEGORIE", "EMPFEHLUNG", "VERGLEICH", "LOKAL", "MARKE"]) })),
});

/**
 * Erzeugt 15–30 Prompts. Mit LLM-Key: per LLM (strikes JSON-Schema),
 * validiert und mit Templates aufgefüllt; sonst nur Templates.
 */
export async function generatePrompts(input: PromptInput, max = 30): Promise<GeneratedPrompt[]> {
  const base = templates(input);
  if (hasHelperLlm() && process.env.NODE_ENV !== "test") {
    const res = await llmJson({
      system:
        "Du erzeugst realistische Suchanfragen, wie Endkundinnen und -kunden sie an KI-Assistenten stellen. Antworte ausschließlich im geforderten JSON-Format.",
      user: `Branche: ${input.industry}\nOrt: ${input.city}${input.region ? `\nRegion: ${input.region}` : ""}\nSprache: ${input.language === "en" ? "Englisch" : "Deutsch"}\nMarke: ${input.brandName}\n\nErzeuge 22 Prompts in den Kategorien KATEGORIE (Anbieterübersicht), EMPFEHLUNG (Empfehlung/bester Anbieter), VERGLEICH (Auswahlkriterien/Vergleich), LOKAL (Stadtteil/Umkreis-Varianten) und MARKE (max. 3, Fragen direkt zur Marke). WICHTIG: Außer in MARKE darf der Markenname NICHT vorkommen.`,
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["prompts"],
        properties: {
          prompts: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["text", "category"],
              properties: {
                text: { type: "string" },
                category: { type: "string", enum: ["KATEGORIE", "EMPFEHLUNG", "VERGLEICH", "LOKAL", "MARKE"] },
              },
            },
          },
        },
      },
      validator: llmSchema,
    });
    if (res && res.prompts.length >= 10) {
      const merged: Record<PromptCategory, string[]> = { KATEGORIE: [], EMPFEHLUNG: [], VERGLEICH: [], LOKAL: [], MARKE: [] };
      for (const p of res.prompts) merged[p.category].push(p.text);
      for (const cat of Object.keys(merged) as PromptCategory[]) {
        if (merged[cat].length < 2) merged[cat].push(...base[cat]);
      }
      return finalize(merged, input, max);
    }
  }
  return finalize(base, input, max);
}

/**
 * "Prompts neu vorschlagen": bestehende Prompts (und ihre stabilen IDs)
 * bleiben unverändert; neue Vorschläge erhalten neue, fortlaufende IDs.
 */
export function mergeSuggestions(
  existing: { stableId: string; text: string; category: string }[],
  suggestions: GeneratedPrompt[],
  maxNew: number,
): GeneratedPrompt[] {
  const known = new Set(existing.map((p) => normalizeName(p.text)));
  const counters = new Map<string, number>();
  for (const p of existing) {
    const n = Number(p.stableId.split("-").pop());
    if (Number.isFinite(n)) counters.set(p.category, Math.max(counters.get(p.category) ?? 0, n));
  }
  const out: GeneratedPrompt[] = [];
  for (const s of suggestions) {
    if (out.length >= maxNew) break;
    const norm = normalizeName(s.text);
    if (known.has(norm)) continue;
    known.add(norm);
    const next = (counters.get(s.category) ?? 0) + 1;
    counters.set(s.category, next);
    out.push({ ...s, stableId: makeStableId(s.category, next) });
  }
  return out;
}
