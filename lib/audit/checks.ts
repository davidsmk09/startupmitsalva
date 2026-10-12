import type { CrawledPage, SiteCrawl } from "@/lib/crawl/crawler";
import { AI_CRAWLERS, isAllowed } from "@/lib/crawl/robots";
import type { AuditCheckResult } from "@/lib/audit/types";

/**
 * Technische Checks für KI-Sichtbarkeit. Jeder Check liefert Status,
 * Gewicht und eine konkrete deutsche Handlungsanweisung.
 */

export const CHECK_WEIGHTS = {
  robots_ai: 15,
  sitemap: 8,
  llms_txt: 2,
  https: 10,
  initial_html: 12,
  structured_data: 12,
  meta_basics: 10,
  answerable_content: 8,
  trust_signals: 10,
  nap_consistency: 5,
  performance: 5,
  evidence: 0,
  external_presence: 0,
} as const;

const ANSWER_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot"];

function allPages(c: SiteCrawl): CrawledPage[] {
  return c.home ? [c.home, ...c.pages] : c.pages;
}

// ---------------------------------------------------------------- 1 robots
export function checkRobotsAi(c: SiteCrawl): AuditCheckResult {
  const base = { checkKey: "robots_ai", title: "robots.txt erlaubt KI-Crawler", weight: CHECK_WEIGHTS.robots_ai };
  if (!c.robots || !c.robots.ok || !c.parsedRobots) {
    return {
      ...base,
      status: "WARN",
      details: "Keine robots.txt gefunden. Ohne Datei dürfen zwar alle Crawler zugreifen, es fehlt aber z. B. der Verweis auf die Sitemap.",
      recommendation: "Lege eine robots.txt im Hauptverzeichnis an, die KI-Crawler erlaubt und auf deine Sitemap verweist.",
      data: { blocked: [], allowed: [...AI_CRAWLERS] },
    };
  }
  const blocked = AI_CRAWLERS.filter((bot) => !isAllowed(c.parsedRobots!, bot, "/"));
  const allowed = AI_CRAWLERS.filter((bot) => !blocked.includes(bot));
  if (blocked.length === 0) {
    return {
      ...base,
      status: "PASS",
      details: `Alle geprüften KI-Crawler (${AI_CRAWLERS.join(", ")}) dürfen die Startseite abrufen.`,
      recommendation: "Nichts zu tun. Prüfe die robots.txt nach jedem Relaunch erneut.",
      data: { blocked, allowed },
    };
  }
  const critical = blocked.filter((b) => ANSWER_BOTS.includes(b));
  return {
    ...base,
    status: critical.length ? "FAIL" : "WARN",
    details: `Blockiert: ${blocked.join(", ")}.${critical.length ? " Darunter Crawler, die direkt für KI-Antworten und Suche genutzt werden." : " Betroffen sind vor allem Trainings-Crawler – das kann eine bewusste Entscheidung sein."}`,
    recommendation: `Entferne die Disallow-Regeln für ${blocked.join(", ")} oder ergänze explizite Freigaben (z. B. "User-agent: ${blocked[0]}" + "Allow: /").`,
    data: { blocked, allowed },
  };
}

// ---------------------------------------------------------------- 2 sitemap
export function checkSitemap(c: SiteCrawl): AuditCheckResult {
  const base = { checkKey: "sitemap", title: "sitemap.xml vorhanden und referenziert", weight: CHECK_WEIGHTS.sitemap };
  const sm = c.sitemap;
  if (!sm || !sm.ok || sm.urls.length === 0) {
    return {
      ...base,
      status: "FAIL",
      details: "Es wurde keine erreichbare XML-Sitemap mit URLs gefunden.",
      recommendation: "Erzeuge eine sitemap.xml (die meisten CMS können das per Plugin) und verweise in der robots.txt darauf: \"Sitemap: https://deine-domain.de/sitemap.xml\".",
      data: { url: sm?.url ?? null, urls: 0 },
    };
  }
  if (!sm.referencedInRobots) {
    return {
      ...base,
      status: "WARN",
      details: `Sitemap gefunden (${sm.urls.length} URLs), aber nicht in der robots.txt referenziert.`,
      recommendation: `Ergänze in der robots.txt die Zeile "Sitemap: ${sm.url}".`,
      data: { url: sm.url, urls: sm.urls.length },
    };
  }
  return {
    ...base,
    status: "PASS",
    details: `Sitemap mit ${sm.urls.length} URLs gefunden und in der robots.txt referenziert.`,
    recommendation: "Halte die Sitemap aktuell (automatisch generieren lassen).",
    data: { url: sm.url, urls: sm.urls.length },
  };
}

// ---------------------------------------------------------------- 3 llms.txt
export function checkLlmsTxt(c: SiteCrawl): AuditCheckResult {
  const base = { checkKey: "llms_txt", title: "llms.txt vorhanden", weight: CHECK_WEIGHTS.llms_txt };
  if (c.llms?.ok && c.llms.body.trim().length > 20) {
    return {
      ...base,
      status: "PASS",
      details: "Eine llms.txt ist vorhanden.",
      recommendation: "Halte die llms.txt aktuell (wichtigste Seiten, Leistungen, Kontakt).",
    };
  }
  return {
    ...base,
    status: "INFO",
    details: "Keine llms.txt gefunden. Das ist ein noch junger, freiwilliger Vorschlag – kein Muss, aber eine einfache Ergänzung.",
    recommendation: "Optional: Lege unter /llms.txt eine kurze Markdown-Übersicht deines Unternehmens und deiner wichtigsten Seiten an.",
  };
}

// ---------------------------------------------------------------- 4 https
export function checkHttps(c: SiteCrawl): AuditCheckResult {
  const base = { checkKey: "https", title: "HTTPS, Weiterleitungen, kein Mixed Content", weight: CHECK_WEIGHTS.https };
  const home = c.home!;
  const isHttps = home.url.startsWith("https://");
  const mixed: string[] = [];
  if (isHttps) {
    home.$("img[src], script[src], link[href], iframe[src], source[src], video[src], audio[src]").each((_, el) => {
      const tag = el.tagName?.toLowerCase();
      const attr = home.$(el).attr(tag === "link" ? "href" : "src") ?? "";
      if (tag === "link" && !/stylesheet|icon|preload/i.test(home.$(el).attr("rel") ?? "")) return;
      if (attr.startsWith("http://")) mixed.push(attr);
    });
  }
  const redirectOk = c.httpRedirectsToHttps !== false;
  if (!isHttps) {
    return {
      ...base,
      status: "FAIL",
      details: "Die Website wird nicht über HTTPS ausgeliefert.",
      recommendation: "Aktiviere ein TLS-Zertifikat (z. B. kostenlos über Let's Encrypt beim Hoster) und leite alle http-Aufrufe per 301 auf https um.",
      data: { https: false },
    };
  }
  const issues: string[] = [];
  if (!redirectOk) issues.push("http:// wird nicht auf https:// weitergeleitet");
  if (mixed.length) issues.push(`${mixed.length} Ressource(n) werden unverschlüsselt (http://) geladen`);
  return {
    ...base,
    status: issues.length ? "WARN" : "PASS",
    details: issues.length ? issues.join("; ") + "." : "HTTPS aktiv, Weiterleitung von http korrekt, kein Mixed Content gefunden.",
    recommendation: issues.length
      ? "Richte eine 301-Weiterleitung von http auf https ein und ändere eingebundene Ressourcen auf https:// oder relative Pfade."
      : "Nichts zu tun.",
    data: { https: true, redirect: c.httpRedirectsToHttps, mixed: mixed.slice(0, 10) },
  };
}

// ---------------------------------------------------------------- 5 initial HTML
export function checkInitialHtml(c: SiteCrawl): AuditCheckResult {
  const base = { checkKey: "initial_html", title: "Inhalte im initialen HTML (ohne JavaScript)", weight: CHECK_WEIGHTS.initial_html };
  const len = c.home!.text.length;
  const spaRoot = c.home!.$("#root, #__next, #app, [data-reactroot]").length > 0;
  const ratio = c.renderedMarkdownLength ? len / Math.max(1, c.renderedMarkdownLength) : null;
  const status = len >= 800 && (ratio === null || ratio >= 0.4) ? "PASS" : len >= 250 ? "WARN" : "FAIL";
  return {
    ...base,
    status,
    details: `Die Startseite liefert ohne JavaScript ca. ${len.toLocaleString("de-DE")} Zeichen sichtbaren Text${ratio !== null ? ` (rund ${Math.round(ratio * 100)} % des gerenderten Inhalts)` : ""}.${status !== "PASS" && spaRoot ? " Die Seite scheint stark auf clientseitiges JavaScript zu setzen." : ""}`,
    recommendation:
      status === "PASS"
        ? "Nichts zu tun – KI-Crawler sehen deine Inhalte direkt."
        : "Viele KI-Crawler führen kein JavaScript aus. Liefere Kerninhalte (Leistungen, Ort, Kontakt, FAQ) serverseitig gerendert bzw. als statisches HTML aus (SSR/SSG oder Pre-Rendering).",
    data: { textLength: len, renderedLength: c.renderedMarkdownLength, spaRoot },
  };
}

// ---------------------------------------------------------------- 6 structured data
export type JsonLdSummary = { types: string[]; invalid: number; items: Record<string, unknown>[] };

export function extractJsonLd(pages: CrawledPage[]): JsonLdSummary {
  const types = new Set<string>();
  const items: Record<string, unknown>[] = [];
  let invalid = 0;
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    const obj = node as Record<string, unknown>;
    if (obj["@graph"]) visit(obj["@graph"]);
    const t = obj["@type"];
    if (t) {
      items.push(obj);
      (Array.isArray(t) ? t : [t]).forEach((x) => typeof x === "string" && types.add(x));
    }
    for (const v of Object.values(obj)) if (v && typeof v === "object") visit(v);
  };
  for (const p of pages) {
    p.$('script[type="application/ld+json"]').each((_, el) => {
      const raw = p.$(el).contents().text().trim();
      if (!raw) return;
      try {
        visit(JSON.parse(raw));
      } catch {
        invalid++;
      }
    });
  }
  return { types: Array.from(types), invalid, items };
}

const ORG_TYPES = /^(Organization|Corporation|LocalBusiness|ProfessionalService|.*Business|Store|Restaurant|Dentist|Physician|Attorney|LegalService|MedicalOrganization|.*Contractor|Plumber|Electrician|RoofingContractor|AutoRepair|HomeAndConstructionBusiness|FinancialService|InsuranceAgency|RealEstateAgent|AccountingService|NGO|EducationalOrganization)$/;

export function checkStructuredData(c: SiteCrawl): AuditCheckResult {
  const base = { checkKey: "structured_data", title: "Strukturierte Daten (JSON-LD)", weight: CHECK_WEIGHTS.structured_data };
  const ld = extractJsonLd(allPages(c));
  const hasOrg = ld.types.some((t) => ORG_TYPES.test(t));
  const hasService = ld.types.some((t) => /^(Service|Product|Offer|OfferCatalog)$/.test(t));
  const hasFaq = ld.types.includes("FAQPage");
  const hasBreadcrumb = ld.types.includes("BreadcrumbList");
  const missing = [
    !hasOrg && "Organization/LocalBusiness",
    !hasService && "Service/Product",
    !hasFaq && "FAQPage",
    !hasBreadcrumb && "BreadcrumbList",
  ].filter(Boolean) as string[];
  let status: AuditCheckResult["status"] = "PASS";
  if (!hasOrg) status = "FAIL";
  else if (ld.invalid > 0 || missing.length >= 2) status = "WARN";
  return {
    ...base,
    status,
    details: `${ld.types.length ? `Gefundene Typen: ${ld.types.slice(0, 12).join(", ")}.` : "Keine strukturierten Daten gefunden."}${ld.invalid ? ` ${ld.invalid} JSON-LD-Block/Blöcke sind syntaktisch ungültig.` : ""}${missing.length ? ` Es fehlen: ${missing.join(", ")}.` : ""}`,
    recommendation: missing.length || ld.invalid
      ? `Ergänze JSON-LD für ${missing.join(", ") || "die ungültigen Blöcke"} und prüfe die Syntax (z. B. mit dem Schema-Validator von schema.org).`
      : "Nichts zu tun – halte die Daten aktuell.",
    data: { types: ld.types, invalid: ld.invalid, missing },
  };
}

// ---------------------------------------------------------------- 7 meta basics
export function metaIssues(p: CrawledPage): string[] {
  const $ = p.$;
  const issues: string[] = [];
  const title = $("head > title").first().text().trim();
  if (!title) issues.push("kein <title>");
  else if (title.length < 10 || title.length > 70) issues.push(`Title-Länge ${title.length} Zeichen (empfohlen 10–70)`);
  const desc = $('meta[name="description"]').attr("content")?.trim() ?? "";
  if (!desc) issues.push("keine Meta-Description");
  else if (desc.length < 50 || desc.length > 170) issues.push(`Meta-Description ${desc.length} Zeichen (empfohlen 50–170)`);
  const h1 = $("h1").length;
  if (h1 !== 1) issues.push(h1 === 0 ? "keine H1" : `${h1} H1-Überschriften (genau eine empfohlen)`);
  const levels = $("h1, h2, h3, h4, h5, h6")
    .map((_, el) => Number(el.tagName.slice(1)))
    .get();
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      issues.push(`Überschriften-Sprung von H${levels[i - 1]} auf H${levels[i]}`);
      break;
    }
  }
  if (!$('link[rel="canonical"]').attr("href")) issues.push("kein Canonical-Tag");
  if (!$("html").attr("lang")) issues.push("kein lang-Attribut am <html>");
  return issues;
}

export function checkMetaBasics(c: SiteCrawl): AuditCheckResult {
  const base = { checkKey: "meta_basics", title: "Title, Description, H1, Canonical, Sprache", weight: CHECK_WEIGHTS.meta_basics };
  const homeIssues = metaIssues(c.home!);
  const subIssues = c.pages.map((p) => ({ url: p.url, issues: metaIssues(p) })).filter((x) => x.issues.length >= 2);
  const status = homeIssues.length === 0 && subIssues.length <= Math.ceil(c.pages.length / 3) ? "PASS" : homeIssues.length >= 3 ? "FAIL" : "WARN";
  return {
    ...base,
    status,
    details: homeIssues.length
      ? `Startseite: ${homeIssues.join("; ")}.${subIssues.length ? ` Außerdem ${subIssues.length} Unterseite(n) mit mehreren Mängeln.` : ""}`
      : `Startseite in Ordnung.${subIssues.length ? ` ${subIssues.length} Unterseite(n) mit mehreren Mängeln.` : ""}`,
    recommendation:
      status === "PASS"
        ? "Nichts zu tun."
        : "Gib jeder Seite einen eindeutigen Title (Leistung + Ort), eine aussagekräftige Meta-Description, genau eine H1, eine logische Überschriftenhierarchie, ein Canonical-Tag und <html lang=\"de\">.",
    data: { home: homeIssues, pages: subIssues.slice(0, 10) },
  };
}

// ---------------------------------------------------------------- 8 answerable content
export function analyzeAnswerable(pages: CrawledPage[]) {
  let faq = false;
  let answerSections = 0;
  let listsTables = 0;
  for (const p of pages) {
    const $ = p.$;
    if ($('script[type="application/ld+json"]').text().includes("FAQPage")) faq = true;
    $("h2, h3").each((_, el) => {
      const heading = $(el).text().trim();
      if (/faq|häufig(e)? (gestellte )?fragen/i.test(heading)) faq = true;
      if (heading.endsWith("?")) faq = true;
      if (el.tagName === "h2") {
        const next = $(el).nextAll("p").first().text().trim();
        if (next.length >= 120) answerSections++;
      }
    });
    if ($("details summary").length >= 3) faq = true;
    listsTables += $("main ul, main ol, article ul, article ol, table").length || $("ul li").length >= 3 ? 1 : 0;
  }
  return { faq, answerSections, listsTables };
}

export function checkAnswerable(c: SiteCrawl): AuditCheckResult {
  const base = { checkKey: "answerable_content", title: "Antwortfähige Inhalte (FAQ, Abschnitte, Listen)", weight: CHECK_WEIGHTS.answerable_content };
  const a = analyzeAnswerable(allPages(c));
  const points = Number(a.faq) + Number(a.answerSections >= 3) + Number(a.listsTables >= 2);
  return {
    ...base,
    status: points === 3 ? "PASS" : points === 0 ? "FAIL" : "WARN",
    details: `FAQ-Bereich: ${a.faq ? "ja" : "nein"} · Abschnitte mit eigenständiger Antwort unter H2: ${a.answerSections} · Seiten mit Listen/Tabellen: ${a.listsTables}.`,
    recommendation:
      points === 3
        ? "Nichts zu tun – erweitere die FAQ regelmäßig um echte Kundenfragen."
        : "Strukturiere Inhalte so, dass sie Fragen direkt beantworten: FAQ-Bereich mit echten Kundenfragen, pro H2 ein kurzer, eigenständiger Antwortabsatz (2–4 Sätze), Leistungen und Preise als Liste oder Tabelle.",
    data: a,
  };
}

// ---------------------------------------------------------------- 9 trust signals
const PHONE_RE = /(?:\+49|0049|\b0)[\s/().-]*\d{2,5}[\s/().-]*\d{2,}(?:[\s/-]?\d{1,})*/g;
const ZIP_CITY_RE = /\b(\d{5})\s+([A-ZÄÖÜ][a-zäöüß]+(?:[\s-][A-ZÄÖÜ][a-zäöüß]+)?)/g;

export function findTrustSignals(pages: CrawledPage[]) {
  const urls = pages.map((p) => p.url.toLowerCase()).join(" ");
  const links = pages
    .flatMap((p) =>
      p.$("a")
        .map((_, el) => `${p.$(el).text()} ${p.$(el).attr("href") ?? ""}`.toLowerCase())
        .get(),
    )
    .join(" ");
  const text = pages.map((p) => p.text).join(" ");
  const ld = extractJsonLd(pages);
  return {
    impressum: /impressum|imprint/.test(links + urls),
    kontakt: /kontakt|contact/.test(links + urls),
    adresse: new RegExp(ZIP_CITY_RE.source).test(text) || ld.items.some((i) => "address" in i),
    telefon: (text.match(PHONE_RE) ?? []).some((m) => m.replace(/\D/g, "").length >= 8) || /href="tel:/i.test(pages.map((p) => p.html).join(" ")),
    ueberUns: /über uns|ueber-uns|uber-uns|about|unternehmen|wir über uns/.test(links + urls),
    team: /\bteam\b|geschäftsführ|inhaber|gründer|autor|ansprechpartner/i.test(text),
    bewertungen: /bewertung|referenz|kundenstimme|testimonial|erfahrungen|sterne/i.test(text) || ld.types.includes("AggregateRating") || ld.types.includes("Review"),
  };
}

export function checkTrustSignals(c: SiteCrawl): AuditCheckResult {
  const base = { checkKey: "trust_signals", title: "Vertrauenssignale (Impressum, Kontakt, NAP, Team, Bewertungen)", weight: CHECK_WEIGHTS.trust_signals };
  const s = findTrustSignals(allPages(c));
  const labels: Record<keyof typeof s, string> = {
    impressum: "Impressum",
    kontakt: "Kontaktseite",
    adresse: "Adresse",
    telefon: "Telefonnummer",
    ueberUns: "Über-uns-Seite",
    team: "Team-/Autorenangaben",
    bewertungen: "Bewertungen/Referenzen",
  };
  const present = (Object.keys(s) as (keyof typeof s)[]).filter((k) => s[k]);
  const missing = (Object.keys(s) as (keyof typeof s)[]).filter((k) => !s[k]).map((k) => labels[k]);
  return {
    ...base,
    status: present.length >= 6 ? "PASS" : present.length >= 4 ? "WARN" : "FAIL",
    details: `${present.length} von 7 Vertrauenssignalen gefunden.${missing.length ? ` Fehlt: ${missing.join(", ")}.` : ""}`,
    recommendation: missing.length
      ? `Ergänze: ${missing.join(", ")}. KI-Systeme bevorzugen Quellen, deren Betreiber klar erkennbar ist.`
      : "Nichts zu tun.",
    data: { signals: s, missing },
  };
}

// ---------------------------------------------------------------- 10 NAP consistency
export function extractNap(pages: CrawledPage[]) {
  const phones = new Set<string>();
  const addresses = new Set<string>();
  for (const p of pages) {
    for (const m of p.text.match(PHONE_RE) ?? []) {
      let digits = m.replace(/\D/g, "");
      if (digits.startsWith("0049")) digits = "0" + digits.slice(4);
      else if (digits.startsWith("49") && m.trim().startsWith("+")) digits = "0" + digits.slice(2);
      if (digits.length >= 8 && digits.length <= 14) phones.add(digits);
    }
    p.$('a[href^="tel:"]').each((_, el) => {
      let digits = (p.$(el).attr("href") ?? "").replace(/\D/g, "");
      if (digits.startsWith("49")) digits = "0" + digits.slice(2);
      if (digits.length >= 8) phones.add(digits);
    });
    for (const m of p.text.matchAll(ZIP_CITY_RE)) addresses.add(`${m[1]} ${m[2]}`);
  }
  return { phones: Array.from(phones), addresses: Array.from(addresses) };
}

export function checkNapConsistency(c: SiteCrawl): AuditCheckResult {
  const base = { checkKey: "nap_consistency", title: "Konsistente Kontaktdaten (Name, Adresse, Telefon)", weight: CHECK_WEIGHTS.nap_consistency };
  const nap = extractNap(allPages(c));
  if (!nap.phones.length && !nap.addresses.length) {
    return {
      ...base,
      status: "WARN",
      details: "Auf den geprüften Seiten wurden weder Telefonnummer noch Postanschrift gefunden.",
      recommendation: "Nenne Name, Adresse und Telefonnummer einheitlich auf allen Seiten (z. B. im Footer) und identisch in Verzeichnissen.",
      data: nap,
    };
  }
  const inconsistent = nap.phones.length > 2 || nap.addresses.length > 2;
  return {
    ...base,
    status: inconsistent ? "WARN" : "PASS",
    details: `Telefonnummern: ${nap.phones.length || "keine"} · Anschriften (PLZ/Ort): ${nap.addresses.slice(0, 5).join(", ") || "keine"}.`,
    recommendation: inconsistent
      ? "Mehrere unterschiedliche Kontaktdaten gefunden. Vereinheitliche Schreibweise und Nummern – Abweichungen verunsichern KI-Systeme und Verzeichnisse."
      : "Nichts zu tun – achte auf identische Angaben in externen Verzeichnissen.",
    data: nap,
  };
}

// ---------------------------------------------------------------- 11 performance
export function checkPerformance(c: SiteCrawl): AuditCheckResult {
  const base = { checkKey: "performance", title: "Antwortzeit, Seitengröße, Viewport", weight: CHECK_WEIGHTS.performance };
  const home = c.home!;
  const issues: string[] = [];
  if (home.timeMs > 2500) issues.push(`langsame Serverantwort (${home.timeMs} ms)`);
  else if (home.timeMs > 1000) issues.push(`Serverantwort ${home.timeMs} ms (Ziel < 1.000 ms)`);
  if (home.bytes > 1.5 * 1024 * 1024) issues.push(`großes HTML-Dokument (${Math.round(home.bytes / 1024)} KB)`);
  if (!home.$('meta[name="viewport"]').attr("content")) issues.push("kein Viewport-Meta-Tag (mobil problematisch)");
  return {
    ...base,
    status: issues.length === 0 ? "PASS" : home.timeMs > 2500 || issues.length >= 2 ? "FAIL" : "WARN",
    details: issues.length ? issues.join("; ") + "." : `Antwortzeit ${home.timeMs} ms, HTML ${Math.round(home.bytes / 1024)} KB, Viewport gesetzt.`,
    recommendation: issues.length
      ? "Nutze Caching/CDN, komprimiere Bilder, reduziere eingebettete Skripte und setze <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">."
      : "Nichts zu tun. Für Details empfiehlt sich zusätzlich ein Lighthouse-Test.",
    data: { timeMs: home.timeMs, bytes: home.bytes },
  };
}

// ---------------------------------------------------------------- 12 evidence
export function checkEvidence(c: SiteCrawl): AuditCheckResult {
  const pages = allPages(c);
  const text = pages.map((p) => p.text).join(" ");
  const numbers = (text.match(/\b\d+(?:[.,]\d+)?\s?(%|prozent|jahre|kunden|projekte|mitarbeiter|€|euro)/gi) ?? []).length;
  const sources = (text.match(/\bquelle[n]?:|\bstudie\b|laut\s+[A-ZÄÖÜ]/gi) ?? []).length;
  const quotes = pages.reduce((s, p) => s + p.$("blockquote, q, cite").length, 0);
  return {
    checkKey: "evidence",
    title: "Belege (Zahlen, Quellen, Zitate)",
    status: "INFO",
    weight: CHECK_WEIGHTS.evidence,
    details: `Gefunden: ${numbers} konkrete Zahlenangaben, ${sources} Quellenhinweise, ${quotes} Zitate.`,
    recommendation:
      "Konkrete, belegbare Angaben (z. B. „seit 1998“, „über 1.200 Projekte“, Zertifikate, Kundenzitate) machen Inhalte für KI-Systeme zitierfähiger.",
    data: { numbers, sources, quotes },
  };
}

// ---------------------------------------------------------------- 13 external presence
const EXTERNAL = [
  { key: "google_business", label: "Google-Unternehmensprofil", re: /(maps\.google|google\.[a-z.]+\/maps|g\.page|goo\.gl\/maps|business\.google|maps\.app\.goo\.gl)/i },
  { key: "facebook", label: "Facebook", re: /facebook\.com/i },
  { key: "instagram", label: "Instagram", re: /instagram\.com/i },
  { key: "linkedin", label: "LinkedIn", re: /linkedin\.com/i },
  { key: "xing", label: "XING", re: /xing\.com/i },
  { key: "youtube", label: "YouTube", re: /youtube\.com|youtu\.be/i },
  {
    key: "directories",
    label: "Branchenverzeichnisse/Bewertungsportale",
    re: /(gelbeseiten|11880|yelp|provenexpert|trustpilot|golocal|kennstdueinen|jameda|das-oertliche|dasoertliche|wer-zu-wem|herold\.at|local\.ch|anwalt\.de|myhammer)/i,
  },
];

export function checkExternalPresence(c: SiteCrawl): AuditCheckResult {
  const hrefs = allPages(c).flatMap((p) =>
    p.$("a[href]")
      .map((_, el) => p.$(el).attr("href") ?? "")
      .get(),
  );
  const found = EXTERNAL.filter((e) => hrefs.some((h) => e.re.test(h))).map((e) => e.label);
  const missing = EXTERNAL.filter((e) => !found.includes(e.label)).map((e) => e.label);
  return {
    checkKey: "external_presence",
    title: "Hinweise auf externe Präsenz",
    status: "INFO",
    weight: CHECK_WEIGHTS.external_presence,
    details: found.length ? `Verlinkt: ${found.join(", ")}.` : "Keine Links zu externen Profilen oder Verzeichnissen gefunden.",
    recommendation:
      "KI-Antworten stützen sich häufig auf Verzeichnisse und Bewertungsportale. Pflege dein Google-Unternehmensprofil und relevante Branchenverzeichnisse mit identischen Kontaktdaten und verlinke sie auf deiner Website.",
    data: { found, missing },
  };
}

/** Alle Checks auf einen Crawl anwenden. */
export function runAllChecks(c: SiteCrawl): AuditCheckResult[] {
  if (!c.home) {
    return [
      {
        checkKey: "reachability",
        title: "Website erreichbar",
        status: "FAIL",
        weight: 30,
        details: `Die Website ${c.domain} konnte nicht abgerufen werden${c.homeError ? ` (${c.homeError})` : ""}.`,
        recommendation: "Prüfe Domain, DNS und Server. Ohne erreichbare Website können weder KI-Crawler noch wir deine Inhalte prüfen.",
      },
    ];
  }
  return [
    checkRobotsAi(c),
    checkSitemap(c),
    checkLlmsTxt(c),
    checkHttps(c),
    checkInitialHtml(c),
    checkStructuredData(c),
    checkMetaBasics(c),
    checkAnswerable(c),
    checkTrustSignals(c),
    checkNapConsistency(c),
    checkPerformance(c),
    checkEvidence(c),
    checkExternalPresence(c),
  ];
}
