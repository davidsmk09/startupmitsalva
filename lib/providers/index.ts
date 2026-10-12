import type { ProviderKey } from "@/lib/constants";
import { env } from "@/lib/env";
import { anthropicProvider } from "@/lib/providers/anthropic";
import { geminiProvider } from "@/lib/providers/gemini";
import { createMockProvider, mockProvider } from "@/lib/providers/mock";
import { openaiProvider } from "@/lib/providers/openai";
import { perplexityProvider } from "@/lib/providers/perplexity";
import type { AnswerProvider } from "@/lib/providers/types";

export const REAL_PROVIDERS: AnswerProvider[] = [openaiProvider, perplexityProvider, geminiProvider, anthropicProvider];

export const PROVIDER_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  perplexity: "Perplexity",
  gemini: "Gemini",
  anthropic: "Claude",
  mock: "Demo-KI",
  "mock:chatgpt": "ChatGPT (Demo)",
  "mock:perplexity": "Perplexity (Demo)",
  "mock:gemini": "Gemini (Demo)",
  "mock:claude": "Claude (Demo)",
};

export function providerLabel(key: string) {
  return PROVIDER_LABELS[key] ?? key;
}

/** Gibt es mindestens einen echten KI-Key? Sonst: Demo-Modus. */
export function isDemoMode(): boolean {
  return !REAL_PROVIDERS.some((p) => p.isConfigured());
}

export type ResolvedProvider = { id: string; provider: AnswerProvider };

/**
 * Wählt Provider für einen Scan: alle konfigurierten echten Provider
 * (begrenzt auf maxProviders des Plans). Ohne Keys werden Mock-Varianten
 * genutzt, die die vier Anbieter simulieren (klar als Demo gekennzeichnet).
 */
export function resolveProviders(maxProviders: number): ResolvedProvider[] {
  const real = REAL_PROVIDERS.filter((p) => p.isConfigured()).slice(0, Math.max(1, maxProviders));
  if (real.length > 0) return real.map((p) => ({ id: p.key, provider: p }));
  const variants = ["chatgpt", "perplexity", "gemini", "claude"].slice(0, Math.max(1, maxProviders));
  return variants.map((v) => ({ id: `mock:${v}`, provider: createMockProvider(v) }));
}

export function costPer1kCents(providerId: string): number {
  const key = providerId.split(":")[0] as ProviderKey;
  if (key === "mock") return 0;
  return env.num(`${key.toUpperCase()}_COST_PER_1K_CENTS`, 0.2);
}

export { mockProvider };
