import { ProviderError } from "@/lib/providers/types";
import { sleep } from "@/lib/utils";

export const PROVIDER_TIMEOUT_MS = 60_000;

/** fetch + JSON mit Timeout und sauberer Fehlerklassifikation. */
export async function fetchJson<T>(url: string, init: RequestInit, timeoutMs = PROVIDER_TIMEOUT_MS): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    throw new ProviderError(`Netzwerkfehler/Timeout: ${(err as Error).message}`, undefined, true);
  }
  const text = await res.text();
  if (!res.ok) {
    const retryable = res.status === 429 || res.status >= 500;
    throw new ProviderError(`HTTP ${res.status}: ${text.slice(0, 300)}`, res.status, retryable);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ProviderError("Antwort ist kein gültiges JSON", res.status, false);
  }
}

/** Retry mit exponentiellem Backoff (max. 3 Versuche insgesamt). */
export async function withRetry<T>(fn: () => Promise<T>, opts: { attempts?: number; baseMs?: number } = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const base = opts.baseMs ?? 800;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = !(err instanceof ProviderError) || err.retryable;
      if (!retryable || i === attempts - 1) break;
      await sleep(base * 2 ** i + Math.floor(Math.random() * 200));
    }
  }
  throw lastErr;
}

/** Einfaches Concurrency-Limit (Semaphore) je Provider. */
export class Semaphore {
  private queue: (() => void)[] = [];
  private active = 0;
  constructor(private readonly max: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) await new Promise<void>((r) => this.queue.push(r));
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }
}

export function systemPromptFor(language: string, region?: string): string {
  if (language === "en") {
    return `Answer the user's question helpfully and concretely, as you would for any user${region ? ` located in ${region}` : ""}. Name specific providers where appropriate.`;
  }
  return `Beantworte die Frage hilfreich und konkret auf Deutsch, so wie für jeden anderen Nutzer${region ? ` aus der Region ${region}` : ""}. Nenne, wo sinnvoll, konkrete Anbieter.`;
}

/** Entfernt doppelte URLs, behält Reihenfolge. */
export function dedupeCitations<T extends { url: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((c) => {
    if (!c.url || seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}
