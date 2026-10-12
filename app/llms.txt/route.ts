import { site } from "@/lib/site";
import { marketing as m } from "@/lib/i18n/marketing-de";
import { PURCHASABLE_PLANS } from "@/lib/billing/plans";
import { formatEuro } from "@/lib/utils";

export const dynamic = "force-static";
export const revalidate = 3600;

/** llms.txt: kompakte Übersicht für KI-Systeme (Vorschlag llmstxt.org). */
export function GET() {
  const body = `# ${site.name}

> ${site.description}

${site.name} misst, wie häufig KI-Assistenten (ChatGPT, Perplexity, Gemini, Claude) ein Unternehmen in Antworten nennen und als Quelle zitieren, prüft die Website technisch und leitet priorisierte Maßnahmen ab. Zielgruppe: kleine und mittlere Unternehmen im DACH-Raum. Es werden keine Platzierungen garantiert; KI-Antworten schwanken.

## Leistungen
${m.packages.items.map((p) => `- ${p.name}: ${p.text}`).join("\n")}

## Preise (Paket 1, zzgl. MwSt.)
${PURCHASABLE_PLANS.map((p) => `- ${p.name}: ${formatEuro(p.priceMonthlyCents)} pro Monat oder ${formatEuro(p.priceYearlyCents)} pro Jahr`).join("\n")}

## Wichtige Seiten
- [Gratis-Check](${site.url}/gratis-check): Kostenloser Kurz-Check ohne Registrierung
- [So funktioniert's](${site.url}/so-funktionierts): Methodik und Grenzen
- [Preise](${site.url}/preise): Pakete und Leistungsvergleich
- [FAQ](${site.url}/faq): Häufige Fragen
- [Kontakt](${site.url}/kontakt)

## FAQ
${m.faq.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
