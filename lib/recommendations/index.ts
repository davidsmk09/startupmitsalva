import type { ServiceTaskCategory } from "@/lib/constants";
import type { ScanMetrics } from "@/lib/scan/scoring";

/**
 * Regelbasierte Empfehlungs-Engine. Alle Fakten stammen aus den Messdaten
 * (Audit-Ergebnisse und ausgewertete KI-Antworten) – nichts wird erfunden.
 */
export type Impact = "HOCH" | "MITTEL" | "NIEDRIG";
export type Effort = "GERING" | "MITTEL" | "HOCH";

export type Recommendation = {
  key: string;
  title: string;
  why: string;
  how: string[];
  snippet?: { language: string; code: string };
  impact: Impact;
  effort: Effort;
  source: "TECHNIK" | "ANTWORTEN";
  category: ServiceTaskCategory;
};

export type RecoInput = {
  audit: { checkKey: string; status: string; details: string; dataJson?: string | null }[];
  metrics: ScanMetrics | null;
  project: { brandName: string; domain: string; industry: string; city: string };
};

const IMPACT_ORDER: Record<Impact, number> = { HOCH: 0, MITTEL: 1, NIEDRIG: 2 };
const EFFORT_ORDER: Record<Effort, number> = { GERING: 0, MITTEL: 1, HOCH: 2 };

function data<T>(row: { dataJson?: string | null }): T | null {
  try {
    return row.dataJson ? (JSON.parse(row.dataJson) as T) : null;
  } catch {
    return null;
  }
}

export function orgJsonLd(p: RecoInput["project"]): string {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: p.brandName,
      url: `https://${p.domain}/`,
      description: `${p.industry} in ${p.city}`,
      address: {
        "@type": "PostalAddress",
        streetAddress: "STRASSE UND HAUSNUMMER EINTRAGEN",
        postalCode: "PLZ EINTRAGEN",
        addressLocality: p.city,
        addressCountry: "DE",
      },
      telephone: "TELEFONNUMMER EINTRAGEN",
      areaServed: p.city,
    },
    null,
    2,
  );
}

export function faqJsonLd(p: RecoInput["project"]): string {
  const qs = [
    `Welche ${p.industry}-Leistungen bietet ${p.brandName} in ${p.city} an?`,
    `Was kostet ${p.industry} bei ${p.brandName}?`,
    `Wie schnell bekomme ich einen Termin?`,
    `In welchem Umkreis von ${p.city} seid ihr tätig?`,
    `Wie läuft eine Beauftragung ab?`,
    `Welche Qualifikationen und Zertifikate habt ihr?`,
    `Wie kann ich euch erreichen?`,
    `Gibt es Bewertungen oder Referenzen?`,
  ];
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: qs.map((q) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: "ANTWORT IN 2–4 SÄTZEN EINTRAGEN" },
      })),
    },
    null,
    2,
  );
}

export function llmsTxtExample(p: RecoInput["project"]): string {
  return `# ${p.brandName}

> ${p.industry} in ${p.city}. KURZBESCHREIBUNG IN 1–2 SÄTZEN EINTRAGEN.

## Wichtige Seiten
- [Leistungen](https://${p.domain}/leistungen): Überblick über unser Angebot
- [Über uns](https://${p.domain}/ueber-uns): Team und Geschichte
- [FAQ](https://${p.domain}/faq): Häufige Fragen
- [Kontakt](https://${p.domain}/kontakt): Adresse, Telefon, Öffnungszeiten
`;
}

export function buildRecommendations(input: RecoInput): Recommendation[] {
  const out: Recommendation[] = [];
  const p = input.project;
  const byKey = new Map(input.audit.map((a) => [a.checkKey, a]));
  const bad = (k: string) => {
    const r = byKey.get(k);
    return r && (r.status === "FAIL" || r.status === "WARN") ? r : null;
  };

  const reach = byKey.get("reachability");
  if (reach && reach.status === "FAIL") {
    out.push({
      key: "reachability",
      title: "Website erreichbar machen",
      why: reach.details,
      how: ["Domain und DNS-Einträge prüfen", "Server-/Hosting-Status prüfen", "Danach den Scan erneut starten"],
      impact: "HOCH",
      effort: "MITTEL",
      source: "TECHNIK",
      category: "WEBSITE",
    });
  }

  const robots = bad("robots_ai");
  if (robots) {
    const blocked = data<{ blocked: string[] }>(robots)?.blocked ?? [];
    out.push({
      key: "robots_ai",
      title: blocked.length ? `robots.txt blockiert ${blocked.join(", ")}` : "robots.txt anlegen",
      why: robots.details,
      how: blocked.length
        ? ["robots.txt im Hauptverzeichnis öffnen", `Disallow-Regeln für ${blocked.join(", ")} entfernen`, "Explizite Freigaben ergänzen (siehe Beispiel)", "Sitemap-Zeile ergänzen"]
        : ["Datei robots.txt im Hauptverzeichnis anlegen (siehe Beispiel)"],
      snippet: {
        language: "text",
        code: `${(blocked.length ? blocked : ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot"]).map((b) => `User-agent: ${b}\nAllow: /`).join("\n\n")}\n\nUser-agent: *\nAllow: /\n\nSitemap: https://${p.domain}/sitemap.xml`,
      },
      impact: robots.status === "FAIL" ? "HOCH" : "MITTEL",
      effort: "GERING",
      source: "TECHNIK",
      category: "WEBSITE",
    });
  }

  const ld = bad("structured_data");
  if (ld) {
    const missing = data<{ missing: string[] }>(ld)?.missing ?? [];
    if (missing.includes("Organization/LocalBusiness") || ld.status === "FAIL") {
      out.push({
        key: "structured_data_org",
        title: "Unternehmensdaten als LocalBusiness-Schema ergänzen",
        why: "KI-Systeme und Suchmaschinen lesen strukturierte Daten, um Name, Ort, Kontakt und Leistungen eindeutig zuzuordnen. " + ld.details,
        how: ["Beispiel-JSON-LD anpassen (Platzhalter ersetzen)", "Im <head> der Startseite in <script type=\"application/ld+json\"> einfügen", "Mit dem Schema-Validator prüfen"],
        snippet: { language: "json", code: orgJsonLd(p) },
        impact: "HOCH",
        effort: "GERING",
        source: "TECHNIK",
        category: "WEBSITE",
      });
    }
    if (missing.includes("FAQPage")) {
      out.push({
        key: "structured_data_faq",
        title: "FAQ mit 8 Fragen als FAQPage-Schema ergänzen",
        why: "Fragen-Antwort-Paare sind besonders gut für KI-Antworten geeignet. Auf deiner Website wurde kein FAQPage-Schema gefunden.",
        how: [
          "8 echte Kundenfragen sammeln (z. B. aus E-Mails/Telefonaten)",
          "Je Frage eine Antwort in 2–4 Sätzen schreiben, sichtbar auf der Seite",
          "Dieselben Fragen als FAQPage-JSON-LD einbinden (Beispiel unten)",
        ],
        snippet: { language: "json", code: faqJsonLd(p) },
        impact: "MITTEL",
        effort: "MITTEL",
        source: "TECHNIK",
        category: "WEBSITE",
      });
    }
  }

  const html = bad("initial_html");
  if (html) {
    out.push({
      key: "initial_html",
      title: "Inhalte ohne JavaScript ausliefern",
      why: html.details,
      how: ["Mit Entwickler/Agentur Server-Side-Rendering oder statisches Pre-Rendering aktivieren", "Kerninhalte (Leistungen, Ort, Kontakt) direkt im HTML ausgeben", "Test: Seite mit deaktiviertem JavaScript aufrufen"],
      impact: html.status === "FAIL" ? "HOCH" : "MITTEL",
      effort: "HOCH",
      source: "TECHNIK",
      category: "WEBSITE",
    });
  }

  const simple: { key: string; title: string; impact: Impact; effort: Effort; how: string[]; snippet?: Recommendation["snippet"] }[] = [
    { key: "https", title: "HTTPS und Weiterleitungen korrigieren", impact: "HOCH", effort: "GERING", how: ["TLS-Zertifikat beim Hoster aktivieren", "301-Weiterleitung http → https einrichten", "Ressourcen auf https umstellen"] },
    {
      key: "sitemap",
      title: "XML-Sitemap bereitstellen und verlinken",
      impact: "MITTEL",
      effort: "GERING",
      how: ["Sitemap per CMS-Plugin erzeugen", "In robots.txt verweisen", "In der Google Search Console einreichen"],
      snippet: { language: "text", code: `Sitemap: https://${p.domain}/sitemap.xml` },
    },
    { key: "meta_basics", title: "Titel, Beschreibung und Überschriften optimieren", impact: "MITTEL", effort: "GERING", how: ["Title-Schema: Leistung + Ort + Marke", "Meta-Description mit klarer Aussage (50–170 Zeichen)", "Genau eine H1 pro Seite", "Canonical und lang=\"de\" setzen"] },
    { key: "answerable_content", title: "Inhalte antwortfähig strukturieren", impact: "HOCH", effort: "MITTEL", how: ["Pro Leistung eine eigene Seite mit klarer H2-Struktur", "Unter jeder H2 ein eigenständiger Antwortabsatz", "Preise/Leistungen als Liste oder Tabelle", "FAQ-Bereich ergänzen"] },
    { key: "trust_signals", title: "Vertrauenssignale ergänzen", impact: "MITTEL", effort: "MITTEL", how: ["Impressum und Kontakt verlinken", "Über-uns-Seite mit Team und Qualifikationen", "Kundenstimmen/Referenzen mit Einwilligung zeigen"] },
    { key: "nap_consistency", title: "Kontaktdaten vereinheitlichen", impact: "MITTEL", effort: "GERING", how: ["Einheitliche Schreibweise für Name, Adresse, Telefon festlegen", "Im Footer aller Seiten verwenden", "In Verzeichnissen identisch eintragen"] },
    { key: "performance", title: "Ladezeit und Mobilfreundlichkeit verbessern", impact: "NIEDRIG", effort: "MITTEL", how: ["Caching/CDN aktivieren", "Bilder komprimieren", "Viewport-Meta-Tag setzen"] },
  ];
  for (const s of simple) {
    const r = bad(s.key);
    if (r) out.push({ key: s.key, title: s.title, why: r.details, how: s.how, snippet: s.snippet, impact: s.impact, effort: s.effort, source: "TECHNIK", category: "WEBSITE" });
  }

  const llms = byKey.get("llms_txt");
  if (llms && llms.status !== "PASS") {
    out.push({
      key: "llms_txt",
      title: "Optional: llms.txt anlegen",
      why: "Eine llms.txt ist ein freiwilliger, noch junger Vorschlag. Sie kostet wenig und fasst deine wichtigsten Seiten für KI-Systeme zusammen.",
      how: ["Datei /llms.txt im Hauptverzeichnis anlegen", "Beispiel anpassen"],
      snippet: { language: "markdown", code: llmsTxtExample(p) },
      impact: "NIEDRIG",
      effort: "GERING",
      source: "TECHNIK",
      category: "WEBSITE",
    });
  }

  // ---- Lücken in den KI-Antworten ----------------------------------------
  const m = input.metrics;
  if (m && m.overall.runs > 0) {
    const pct = (x: number) => `${Math.round(x * 100)} %`;
    if (m.overall.mentionRate < 0.3) {
      const directories = m.topDomains.filter((d) => !d.own).slice(0, 5).map((d) => d.domain);
      out.push({
        key: "answers_low_mentions",
        title: "In KI-Antworten selten genannt",
        why: `${p.brandName} wurde nur in ${pct(m.overall.mentionRate)} der Antworten erwähnt.${directories.length ? ` Häufig zitierte Quellen: ${directories.join(", ")}.` : ""}`,
        how: [
          directories.length ? `Prüfe, ob du in diesen Quellen gelistet bist: ${directories.join(", ")}` : "Einträge in relevanten Branchenverzeichnissen anlegen",
          "Google-Unternehmensprofil vollständig pflegen",
          "Aktiv um Bewertungen bitten (rechtssicher, ohne Gegenleistung)",
        ],
        impact: "HOCH",
        effort: "MITTEL",
        source: "ANTWORTEN",
        category: "VERZEICHNIS",
      });
    }
    if (m.overall.mentionRate >= 0.2 && m.overall.citationRate < 0.15) {
      out.push({
        key: "answers_not_cited",
        title: "Eigene Website wird kaum als Quelle genutzt",
        why: `Erwähnt in ${pct(m.overall.mentionRate)} der Antworten, als Quelle zitiert aber nur in ${pct(m.overall.citationRate)}.`,
        how: ["Leistungsseiten mit konkreten, überprüfbaren Fakten anreichern", "FAQ und Ratgeber-Inhalte zu typischen Fragen ergänzen", "Strukturierte Daten ergänzen"],
        impact: "MITTEL",
        effort: "MITTEL",
        source: "ANTWORTEN",
        category: "WEBSITE",
      });
    }
    const lokal = m.byCategory["LOKAL"];
    if (lokal && lokal.runs > 0 && lokal.mentionRate < m.overall.mentionRate * 0.7) {
      out.push({
        key: "answers_local",
        title: "Schwach bei lokalen Suchanfragen",
        why: `Bei lokalen Fragen (Umkreis/Stadtteil) liegt die Erwähnungsrate bei ${pct(lokal.mentionRate)} – unter deinem Durchschnitt von ${pct(m.overall.mentionRate)}.`,
        how: [`Ort ${p.city} und Einzugsgebiet klar auf der Website nennen`, "Standortseite mit Anfahrt, Öffnungszeiten, Karte", "Google-Unternehmensprofil mit Kategorien und Fotos pflegen"],
        impact: "MITTEL",
        effort: "GERING",
        source: "ANTWORTEN",
        category: "VERZEICHNIS",
      });
    }
    const marke = m.byCategory["MARKE"];
    if (marke && marke.runs > 0 && marke.mentionRate < 0.5) {
      out.push({
        key: "answers_brand_unknown",
        title: "KI-Systeme kennen deine Marke kaum",
        why: `Auf direkte Fragen zu ${p.brandName} gab es nur in ${pct(marke.mentionRate)} der Fälle eine konkrete Antwort.`,
        how: ["Aussagekräftige Über-uns-Seite (Gründung, Team, Schwerpunkte)", "Konsistente Profile in Verzeichnissen und sozialen Netzwerken", "Erwähnungen in lokalen Medien/Verbänden anstreben"],
        impact: "MITTEL",
        effort: "MITTEL",
        source: "ANTWORTEN",
        category: "SONSTIGES",
      });
    }
    const leader = m.shareOfVoice.find((e) => !e.isBrand && e.mentions > 0);
    const own = m.shareOfVoice.find((e) => e.isBrand);
    if (leader && own && leader.mentions > own.mentions) {
      out.push({
        key: "answers_competitor_lead",
        title: `${leader.name} wird häufiger genannt`,
        why: `Share of Voice: ${leader.name} ${pct(leader.share)} vs. ${p.brandName} ${pct(own.share)}.`,
        how: ["Analysiere, welche Quellen bei Antworten über den Wettbewerber zitiert werden", "Fehlende Verzeichniseinträge nachziehen", "Eigene Stärken als belegbare Fakten auf der Website darstellen", "Optional: Google-Ads-Kampagne für die wichtigsten Suchbegriffe"],
        impact: "MITTEL",
        effort: "MITTEL",
        source: "ANTWORTEN",
        category: "ADS",
      });
    }
  }

  return out.sort((a, b) => IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact] || EFFORT_ORDER[a.effort] - EFFORT_ORDER[b.effort]);
}

/** Kurzfassung (regelbasiert, aus Messdaten). */
export function executiveSummary(input: {
  brandName: string;
  overall: number | null;
  visibility: number | null;
  technical: number | null;
  margin: number | null;
  metrics: ScanMetrics | null;
  recommendations: Recommendation[];
}): string {
  const parts: string[] = [];
  if (input.overall !== null) parts.push(`${input.brandName} erreicht einen Gesamtscore von ${Math.round(input.overall)} von 100.`);
  if (input.metrics && input.metrics.overall.runs > 0) {
    parts.push(
      `In ${Math.round(input.metrics.overall.mentionRate * 100)} % von ${input.metrics.overall.runs} ausgewerteten KI-Antworten wurde die Marke erwähnt, in ${Math.round(input.metrics.overall.citationRate * 100)} % wurde die eigene Website als Quelle genannt.`,
    );
  }
  if (input.technical !== null) parts.push(`Der technische Check ergibt ${Math.round(input.technical)} von 100 Punkten.`);
  if (input.margin !== null) parts.push(`Die Schwankungsbreite zwischen wiederholten Abfragen liegt bei ± ${input.margin} Punkten.`);
  const top = input.recommendations.slice(0, 3).map((r) => r.title);
  if (top.length) parts.push(`Wichtigste nächste Schritte: ${top.join("; ")}.`);
  return parts.join(" ");
}
