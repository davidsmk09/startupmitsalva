import type { AnswerProvider, AskOptions, Citation, ProviderAnswer } from "@/lib/providers/types";
import { sleep } from "@/lib/utils";

/** FNV-1a 32-bit Hash – stabiler Seed aus Text. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministischer PRNG (mulberry32). */
export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIRECTORY_SOURCES = [
  { url: "https://www.gelbeseiten.de/", title: "Gelbe Seiten" },
  { url: "https://www.11880.com/", title: "11880.com" },
  { url: "https://www.golocal.de/", title: "golocal" },
  { url: "https://www.provenexpert.com/", title: "ProvenExpert" },
  { url: "https://de.trustpilot.com/", title: "Trustpilot" },
  { url: "https://de.wikipedia.org/", title: "Wikipedia" },
  { url: "https://www.yelp.de/", title: "Yelp" },
];

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function shuffle<T>(rand: () => number, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const REASONS = [
  "gute Bewertungen und schnelle Terminvergabe",
  "transparente Preise und ausführliche Beratung",
  "langjährige Erfahrung in der Region",
  "breites Leistungsangebot und zertifizierte Fachkräfte",
  "persönliche Betreuung und klare Kommunikation",
  "moderne Ausstattung und flexible Öffnungszeiten",
];

/**
 * Mock-Provider: erzeugt deterministische, realistisch wirkende Antworten
 * (Seed = Prompt + Provider-Variante + Lauf), damit Demo und Tests ohne
 * API-Keys funktionieren. Wird im UI als "Demo-Daten" gekennzeichnet.
 */
export function createMockProvider(variant = "mock"): AnswerProvider {
  return {
    key: "mock",
    label: variant === "mock" ? "Demo-KI" : `Demo-KI (${variant})`,
    isConfigured: () => true,
    async ask(prompt: string, opts: AskOptions): Promise<ProviderAnswer> {
      const started = Date.now();
      const latency = Number(process.env.MOCK_LATENCY_MS ?? 60);
      if (latency > 0) await sleep(latency);
      const ctx = opts.mockContext ?? {
        brandName: "Beispiel GmbH",
        domain: "beispiel.de",
        industry: "Dienstleister",
        city: "Musterstadt",
        competitors: [],
      };
      const rand = prng(hashString(`${variant}|${prompt}|${ctx.salt ?? ""}`));
      // Basis-Sichtbarkeit je Domain stabil, durch bias verschiebbar
      const base = 0.25 + (hashString(ctx.domain) % 30) / 100 + (ctx.bias ?? 0) * 0.35;
      const isBrandPrompt = prompt.toLowerCase().includes(ctx.brandName.toLowerCase());
      const fictional = [
        `${ctx.industry} ${ctx.city} Mitte`,
        `${ctx.city}er ${ctx.industry}-Service`,
        `${ctx.industry}-Partner ${ctx.city}`,
        `Meisterbetrieb Nord (${ctx.city})`,
      ];

      if (isBrandPrompt) {
        const knows = rand() < Math.min(0.95, base + 0.35);
        const text = knows
          ? `${ctx.brandName} ist ein Anbieter aus dem Bereich ${ctx.industry} mit Sitz in ${ctx.city}. Laut der Website ${ctx.domain} bietet das Unternehmen ${pick(rand, REASONS)}. Kundinnen und Kunden heben in Bewertungen vor allem ${pick(rand, REASONS)} hervor. Für aktuelle Preise und Verfügbarkeit empfiehlt sich ein Blick auf die offizielle Website.`
          : `Zu ${ctx.brandName} liegen mir nur wenige verlässliche Informationen vor. Es könnte sich um einen regionalen Anbieter im Bereich ${ctx.industry} handeln. Ich empfehle, die offizielle Website oder Branchenverzeichnisse zu prüfen.`;
        const citations: Citation[] = knows
          ? [{ url: `https://www.${ctx.domain}/`, title: ctx.brandName }, pick(rand, DIRECTORY_SOURCES)]
          : [pick(rand, DIRECTORY_SOURCES)];
        return { text, citations, raw: { mock: true, variant }, tokens: 0, latencyMs: Date.now() - started };
      }

      const entities: { name: string; domain?: string; isBrand?: boolean }[] = [];
      if (rand() < Math.max(0.05, Math.min(0.95, base))) entities.push({ name: ctx.brandName, domain: ctx.domain, isBrand: true });
      for (const c of ctx.competitors) if (rand() < 0.55) entities.push(c);
      for (const f of shuffle(rand, fictional).slice(0, 2 + Math.floor(rand() * 2))) entities.push({ name: f });
      const ordered = shuffle(rand, entities).slice(0, 5);
      // Marke tendenziell weiter vorn, wenn bias hoch
      if ((ctx.bias ?? 0) > 0.3) ordered.sort((a, b) => Number(Boolean(b.isBrand)) - Number(Boolean(a.isBrand)));

      const intro = pick(rand, [
        `Hier sind einige Anbieter im Bereich ${ctx.industry} in ${ctx.city}, die häufig empfohlen werden:`,
        `In ${ctx.city} gibt es mehrere gut bewertete Anbieter für ${ctx.industry}. Eine Auswahl:`,
        `Je nach Bedarf kommen in ${ctx.city} unter anderem diese Anbieter infrage:`,
      ]);
      const lines = ordered.map((e, i) => `${i + 1}. **${e.name}** – ${pick(rand, REASONS)}.`);
      const outro = pick(rand, [
        "Achte bei der Auswahl auf aktuelle Bewertungen, transparente Preise und eine klare Leistungsbeschreibung.",
        "Ich empfehle, mehrere Angebote einzuholen und Referenzen zu vergleichen.",
        "Prüfe außerdem, ob der Anbieter Erfahrung mit deinem konkreten Anliegen hat.",
      ]);
      const text = `${intro}\n\n${lines.join("\n")}\n\n${outro}`;

      const citations: Citation[] = shuffle(rand, DIRECTORY_SOURCES).slice(0, 2 + Math.floor(rand() * 2));
      for (const e of ordered) {
        if (e.domain && rand() < (e.isBrand ? 0.5 + (ctx.bias ?? 0) * 0.3 : 0.4)) {
          citations.push({ url: `https://www.${e.domain}/`, title: e.name });
        } else if (!e.domain && rand() < 0.15) {
          citations.push({ url: `https://www.${slug(e.name)}.de/`, title: e.name });
        }
      }
      return { text, citations, raw: { mock: true, variant }, tokens: 0, latencyMs: Date.now() - started };
    },
  };
}

export const mockProvider = createMockProvider();
