import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";
import { env } from "@/lib/env";
import { assertSafeUrl, isPrivateIp, SsrfError } from "@/lib/crawl/ssrf";

export const MAX_RESPONSE_BYTES = 3 * 1024 * 1024;
export const MAX_REDIRECTS = 5;
export const FETCH_TIMEOUT_MS = 12_000;

export function botUserAgent(): string {
  const name = env.appName.replace(/[^A-Za-z0-9-]/g, "") || "KISichtbar";
  return `${name}Bot/1.0 (+${env.appUrl}/bot)`;
}

/**
 * Agent mit eigenem DNS-Lookup: prüft die IP beim tatsächlichen
 * Verbindungsaufbau (Schutz gegen DNS-Rebinding).
 */
const safeAgent = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
        if (err) return callback(err, "", 4);
        const list = (Array.isArray(addresses) ? addresses : [addresses]) as LookupAddress[];
        const bad = list.find((a) => isPrivateIp(a.address));
        if (bad || list.length === 0) return callback(new SsrfError("Blockierte Zieladresse"), "", 4);
        if ((options as { all?: boolean }).all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, list);
        callback(null, list[0].address, list[0].family);
      });
    },
  },
  headersTimeout: FETCH_TIMEOUT_MS,
  bodyTimeout: FETCH_TIMEOUT_MS,
});

export type FetchResult = {
  url: string;
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  bytes: number;
  truncated: boolean;
  timeMs: number;
  redirects: string[];
};

/**
 * Sicherer Abruf fremder URLs: SSRF-Prüfung (auch nach jedem Redirect),
 * max. 5 Redirects, max. 3 MB, Timeout, eindeutiger User-Agent.
 */
export async function safeFetch(
  rawUrl: string,
  opts: { maxBytes?: number; timeoutMs?: number; accept?: string } = {},
): Promise<FetchResult> {
  const maxBytes = opts.maxBytes ?? MAX_RESPONSE_BYTES;
  const started = Date.now();
  const redirects: string[] = [];
  let current = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertSafeUrl(current);
    const res = await undiciFetch(current, {
      dispatcher: safeAgent,
      redirect: "manual",
      headers: {
        "User-Agent": botUserAgent(),
        Accept: opts.accept ?? "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.6",
      },
      signal: AbortSignal.timeout(opts.timeoutMs ?? FETCH_TIMEOUT_MS),
    });

    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      const next = new URL(res.headers.get("location")!, current).toString();
      redirects.push(next);
      await res.body?.cancel();
      current = next;
      continue;
    }

    const chunks: Uint8Array[] = [];
    let bytes = 0;
    let truncated = false;
    if (res.body) {
      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) {
          truncated = true;
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => (headers[k] = v));
    return {
      url: rawUrl,
      finalUrl: current,
      status: res.status,
      headers,
      body: Buffer.concat(chunks).toString("utf8"),
      bytes,
      truncated,
      timeMs: Date.now() - started,
      redirects,
    };
  }
  throw new SsrfError("Zu viele Weiterleitungen");
}

/** Optional: gerenderte Seite über Firecrawl (nur wenn FIRECRAWL_API_KEY gesetzt). */
export async function firecrawlScrape(url: string): Promise<{ html: string; markdown: string } | null> {
  const key = env.firecrawlApiKey;
  if (!key) return null;
  await assertSafeUrl(url);
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["html", "markdown"] }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { html?: string; markdown?: string } };
    return { html: data.data?.html ?? "", markdown: data.data?.markdown ?? "" };
  } catch {
    return null;
  }
}
