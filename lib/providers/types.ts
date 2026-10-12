import type { ProviderKey } from "@/lib/constants";

export type Citation = { url: string; title?: string };

export type ProviderAnswer = {
  text: string;
  citations: Citation[];
  raw: unknown;
  tokens?: number;
  latencyMs: number;
};

/**
 * Zusatzkontext für Antworten. Echte Provider ignorieren ihn (die Marke darf
 * nicht in den Prompt "durchsickern"); nur der Mock nutzt ihn, um
 * glaubwürdige Demo-Antworten zu erzeugen.
 */
export type MockContext = {
  brandName: string;
  domain: string;
  industry: string;
  city: string;
  competitors: { name: string; domain?: string }[];
  /** Verschiebt die simulierte Sichtbarkeit (z. B. für Seed-Verläufe), -1 … +1 */
  bias?: number;
  /** Zusätzlicher Seed (z. B. Scan-ID), damit verschiedene Scans leicht variieren */
  salt?: string;
};

export type AskOptions = { language: string; region?: string; mockContext?: MockContext };

export interface AnswerProvider {
  key: ProviderKey;
  label: string;
  isConfigured(): boolean;
  ask(prompt: string, opts: AskOptions): Promise<ProviderAnswer>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public status?: number,
    public retryable = true,
  ) {
    super(message);
  }
}
