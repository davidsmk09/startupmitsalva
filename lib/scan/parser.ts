/**
 * Auswertung einzelner KI-Antworten: Markenerwähnung (fuzzy), Zitate der
 * eigenen Domain, Position in Aufzählungen, Wettbewerber-Erwähnungen.
 */

const LEGAL_FORMS = [
  "gmbh & co kg",
  "gmbh & co. kg",
  "gmbh",
  "mbh",
  "ug haftungsbeschraenkt",
  "haftungsbeschraenkt",
  "ug",
  "ag",
  "kg",
  "ohg",
  "gbr",
  "e k",
  "ek",
  "e kfr",
  "e v",
  "ev",
  "ltd",
  "inc",
  "llc",
  "se",
  "co",
];

/** Normalisiert Namen/Text: Kleinbuchstaben, Umlaute, Rechtsformen und Satzzeichen entfernen. */
export function normalizeName(input: string): string {
  let s = input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
  s = s.replace(/[^a-z0-9&]+/g, " ").replace(/\s+/g, " ").trim();
  // Rechtsformen am Wortrand entfernen
  for (const lf of LEGAL_FORMS) {
    const norm = lf.replace(/[^a-z0-9&]+/g, " ").trim();
    s = ` ${s} `.replace(new RegExp(` ${norm.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&")} `, "g"), " ").trim();
  }
  return s.replace(/&/g, " ").replace(/\s+/g, " ").trim();
}

/** Levenshtein-Distanz (für kleine Strings). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export type MatchResult = { matched: boolean; exact: boolean };

/**
 * Prüft, ob einer der Namen im Text vorkommt (Wortgrenzen, normalisiert).
 * Fuzzy: Bei Namen ab 6 Zeichen wird ein Tippfehler (Distanz ≤ 1 je 8 Zeichen) toleriert.
 */
export function matchNames(text: string, names: string[]): MatchResult {
  const normText = normalizeName(text);
  const padded = ` ${normText} `;
  const tokens = normText.split(" ");
  let fuzzy = false;
  for (const raw of names) {
    const n = normalizeName(raw);
    if (n.length < 2) continue;
    if (padded.includes(` ${n} `)) return { matched: true, exact: true };
    // Zusammengeschriebene Variante ("Müller Bau" vs. "MüllerBau")
    const compact = n.replace(/ /g, "");
    if (compact.length >= 5 && padded.includes(` ${compact} `)) return { matched: true, exact: true };
    if (n.length >= 6) {
      const width = n.split(" ").length;
      const maxDist = Math.max(1, Math.floor(n.length / 8));
      for (let i = 0; i + width <= tokens.length; i++) {
        const window = tokens.slice(i, i + width).join(" ");
        if (Math.abs(window.length - n.length) <= maxDist && levenshtein(window, n) <= maxDist) fuzzy = true;
      }
    }
  }
  return { matched: fuzzy, exact: false };
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

const REDIRECT_HOSTS = ["vertexaisearch.cloud.google.com"];

/** Domain einer Quelle. Bei Google-Grounding-Redirects steht die Domain im Titel. */
export function citationDomain(c: { url: string; title?: string }): string | null {
  const host = hostOf(c.url);
  if (host && REDIRECT_HOSTS.includes(host) && c.title && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(c.title.trim())) {
    return c.title.trim().toLowerCase().replace(/^www\./, "");
  }
  return host;
}

/** Gehört der Host zur Domain (inkl. Subdomains)? */
export function domainMatches(host: string | null, domain: string): boolean {
  if (!host || !domain) return false;
  const d = domain.toLowerCase().replace(/^www\./, "");
  return host === d || host.endsWith(`.${d}`);
}

/** Erwähnt der Text die Domain (z. B. "mueller-bau.de")? */
export function textMentionsDomain(text: string, domain: string): boolean {
  if (!domain) return false;
  const d = domain.toLowerCase().replace(/^www\./, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9-])(www\\.)?${d}([^a-z0-9-]|$)`, "i").test(text);
}

/** Erkennt Aufzählungen (nummeriert oder Spiegelstriche) und gibt die Einträge in Reihenfolge zurück. */
export function extractListItems(text: string): string[] {
  const items: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:\d{1,2}[.)]|[-*•–])\s+(.+)$/);
    if (m) items.push(m[1].trim());
  }
  return items.length >= 2 ? items : [];
}

/** 1-basierte Position des ersten Listeneintrags, der eines der Namen enthält. */
export function findPosition(items: string[], names: string[], domain?: string): number | null {
  for (let i = 0; i < items.length; i++) {
    if (matchNames(items[i], names).matched || (domain && textMentionsDomain(items[i], domain))) return i + 1;
  }
  return null;
}

export type Entity = { name: string; aliases?: string[]; domain?: string | null };

export type CompetitorMention = { name: string; mentioned: boolean; cited: boolean; position: number | null };

export type AnswerAnalysis = {
  brandMentioned: boolean;
  brandMentionExact: boolean;
  brandCited: boolean;
  mentionPosition: number | null;
  competitorMentions: CompetitorMention[];
  citedDomains: string[];
};

export function analyzeAnswer(
  answer: { text: string; citations: { url: string; title?: string }[] },
  brand: Entity,
  competitors: Entity[],
): AnswerAnalysis {
  const names = [brand.name, ...(brand.aliases ?? [])];
  const m = matchNames(answer.text, names);
  const domainInText = brand.domain ? textMentionsDomain(answer.text, brand.domain) : false;
  const citedDomains = Array.from(new Set(answer.citations.map(citationDomain).filter((d): d is string => Boolean(d))));
  const brandCited = brand.domain ? citedDomains.some((h) => domainMatches(h, brand.domain!)) : false;
  const items = extractListItems(answer.text);
  const brandMentioned = m.matched || domainInText;

  return {
    brandMentioned,
    brandMentionExact: m.exact || domainInText,
    brandCited,
    mentionPosition: brandMentioned ? findPosition(items, names, brand.domain ?? undefined) : null,
    competitorMentions: competitors.map((c) => {
      const cn = [c.name, ...(c.aliases ?? [])];
      const mentioned = matchNames(answer.text, cn).matched || (c.domain ? textMentionsDomain(answer.text, c.domain) : false);
      return {
        name: c.name,
        mentioned,
        cited: c.domain ? citedDomains.some((h) => domainMatches(h, c.domain!)) : false,
        position: mentioned ? findPosition(items, cn, c.domain ?? undefined) : null,
      };
    }),
    citedDomains,
  };
}
