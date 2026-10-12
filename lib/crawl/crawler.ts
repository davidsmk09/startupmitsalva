import * as cheerio from "cheerio";
import { firecrawlScrape, safeFetch, botUserAgent, type FetchResult } from "@/lib/crawl/fetcher";
import { isAllowed, parseRobots, type ParsedRobots } from "@/lib/crawl/robots";
import { logger, errorMessage } from "@/lib/logger";
import { Semaphore } from "@/lib/providers/util";

export type CrawledPage = {
  url: string;
  status: number;
  html: string;
  $: cheerio.CheerioAPI;
  text: string;
  bytes: number;
  timeMs: number;
  contentType: string;
  headers: Record<string, string>;
};

export type TextResource = { url: string; status: number; body: string; ok: boolean } | null;

export type SiteCrawl = {
  domain: string;
  origin: string | null;
  home: CrawledPage | null;
  homeFetch: FetchResult | null;
  homeError: string | null;
  httpRedirectsToHttps: boolean | null;
  pages: CrawledPage[];
  robots: TextResource;
  parsedRobots: ParsedRobots | null;
  sitemap: (TextResource & { urls: string[]; referencedInRobots: boolean }) | null;
  llms: TextResource;
  renderedMarkdownLength: number | null;
};

const PRIORITY_KEYWORDS = [
  "kontakt",
  "contact",
  "impressum",
  "imprint",
  "ueber-uns",
  "uber-uns",
  "about",
  "team",
  "leistungen",
  "services",
  "angebot",
  "faq",
  "fragen",
  "preise",
  "pricing",
  "referenzen",
  "bewertungen",
  "kunden",
  "standort",
  "datenschutz",
];

export function visibleText($: cheerio.CheerioAPI): string {
  const clone = cheerio.load($.html());
  clone("script, style, noscript, template, svg").remove();
  return clone("body").text().replace(/\s+/g, " ").trim();
}

function toPage(res: FetchResult): CrawledPage {
  const $ = cheerio.load(res.body);
  return {
    url: res.finalUrl,
    status: res.status,
    html: res.body,
    $,
    text: visibleText($),
    bytes: res.bytes,
    timeMs: res.timeMs,
    contentType: res.headers["content-type"] ?? "",
    headers: res.headers,
  };
}

async function fetchText(url: string): Promise<TextResource> {
  try {
    const r = await safeFetch(url, { maxBytes: 1024 * 1024, accept: "text/plain,application/xml,text/xml,*/*;q=0.5" });
    return { url: r.finalUrl, status: r.status, body: r.body, ok: r.status >= 200 && r.status < 300 };
  } catch (err) {
    return { url, status: 0, body: errorMessage(err), ok: false };
  }
}

function extractSitemapUrls(xml: string): { urls: string[]; nested: string[] } {
  const $ = cheerio.load(xml, { xml: true });
  const nested = $("sitemapindex > sitemap > loc")
    .map((_, el) => $(el).text().trim())
    .get();
  const urls = $("urlset > url > loc")
    .map((_, el) => $(el).text().trim())
    .get();
  return { urls, nested };
}

function sameSite(url: string, domain: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return h === domain || h.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

function scoreUrl(url: string): number {
  const path = url.toLowerCase();
  const idx = PRIORITY_KEYWORDS.findIndex((k) => path.includes(k));
  const depth = (new URL(url).pathname.match(/\//g) ?? []).length;
  return (idx >= 0 ? 100 - idx : 0) - depth;
}

/**
 * Crawlt Startseite + bis zu `maxPages` wichtige Unterseiten (aus Sitemap oder
 * Links). Für Fremdseiten (Wettbewerb) wird robots.txt respektiert
 * (respectRobots=true); beim Audit der eigenen Seite prüfen wir robots.txt
 * nur inhaltlich.
 */
export async function crawlSite(domain: string, opts: { maxPages?: number; respectRobots?: boolean } = {}): Promise<SiteCrawl> {
  const maxPages = opts.maxPages ?? 15;
  const result: SiteCrawl = {
    domain,
    origin: null,
    home: null,
    homeFetch: null,
    homeError: null,
    httpRedirectsToHttps: null,
    pages: [],
    robots: null,
    parsedRobots: null,
    sitemap: null,
    llms: null,
    renderedMarkdownLength: null,
  };

  // Startseite: https bevorzugt, sonst http
  for (const candidate of [`https://${domain}/`, `https://www.${domain}/`, `http://${domain}/`]) {
    try {
      const res = await safeFetch(candidate);
      result.homeFetch = res;
      result.home = toPage(res);
      result.origin = new URL(res.finalUrl).origin;
      break;
    } catch (err) {
      result.homeError = errorMessage(err);
    }
  }
  if (!result.home || !result.origin) return result;
  result.homeError = null;

  // http -> https Weiterleitung prüfen
  try {
    const plain = await safeFetch(`http://${new URL(result.origin).hostname}/`, { maxBytes: 200_000 });
    result.httpRedirectsToHttps = plain.finalUrl.startsWith("https://");
  } catch {
    result.httpRedirectsToHttps = null;
  }

  const [robots, llms] = await Promise.all([fetchText(`${result.origin}/robots.txt`), fetchText(`${result.origin}/llms.txt`)]);
  result.robots = robots;
  result.llms = llms && llms.ok && !/<html/i.test(llms.body.slice(0, 500)) ? llms : llms ? { ...llms, ok: false } : null;
  result.parsedRobots = robots?.ok ? parseRobots(robots.body) : null;

  // Sitemap
  const robotsSitemaps = result.parsedRobots?.sitemaps ?? [];
  const sitemapUrl = robotsSitemaps[0] ?? `${result.origin}/sitemap.xml`;
  const sm = await fetchText(sitemapUrl);
  if (sm) {
    let urls: string[] = [];
    if (sm.ok) {
      const parsed = extractSitemapUrls(sm.body);
      urls = parsed.urls;
      for (const nested of parsed.nested.slice(0, 3)) {
        const n = await fetchText(nested);
        if (n?.ok) urls.push(...extractSitemapUrls(n.body).urls);
      }
    }
    result.sitemap = { ...sm, urls: urls.slice(0, 5000), referencedInRobots: robotsSitemaps.length > 0 };
  }

  // Unterseiten auswählen
  const fromLinks = result.home
    .$("a[href]")
    .map((_, el) => result.home!.$(el).attr("href"))
    .get()
    .map((href) => {
      try {
        return new URL(href, result.origin!).toString().split("#")[0];
      } catch {
        return null;
      }
    })
    .filter((u): u is string => Boolean(u));
  const candidates = Array.from(new Set([...(result.sitemap?.urls ?? []), ...fromLinks]))
    .filter((u) => sameSite(u, domain) && /^https?:/.test(u))
    .filter((u) => !/\.(pdf|jpe?g|png|gif|svg|webp|zip|mp4|docx?|xlsx?)$/i.test(u))
    .filter((u) => u.replace(/\/$/, "") !== result.home!.url.replace(/\/$/, ""))
    .filter((u) => !opts.respectRobots || !result.parsedRobots || isAllowed(result.parsedRobots, botUserAgent(), new URL(u).pathname))
    .sort((a, b) => scoreUrl(b) - scoreUrl(a))
    .slice(0, maxPages);

  const sem = new Semaphore(3);
  const pages = await Promise.all(
    candidates.map((u) =>
      sem.run(async () => {
        try {
          const res = await safeFetch(u);
          if (res.status >= 400 || !(res.headers["content-type"] ?? "").includes("html")) return null;
          return toPage(res);
        } catch (err) {
          logger.debug("crawl.page_failed", { url: u, error: errorMessage(err) });
          return null;
        }
      }),
    ),
  );
  result.pages = pages.filter((p): p is CrawledPage => Boolean(p));

  // Optional: gerenderte Version zum Vergleich "Inhalt ohne JavaScript"
  const rendered = await firecrawlScrape(result.home.url);
  result.renderedMarkdownLength = rendered ? rendered.markdown.replace(/\s+/g, " ").length : null;
  return result;
}

/** Für Tests/Seed: Seite aus HTML erzeugen. */
export function pageFromHtml(url: string, html: string, extra: Partial<CrawledPage> = {}): CrawledPage {
  const $ = cheerio.load(html);
  return {
    url,
    status: 200,
    html,
    $,
    text: visibleText($),
    bytes: Buffer.byteLength(html),
    timeMs: 300,
    contentType: "text/html; charset=utf-8",
    headers: { "content-type": "text/html; charset=utf-8" },
    ...extra,
  };
}
