import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Section, SectionTitle } from "@/components/marketing/section";
import { FaqList, faqJsonLd } from "@/components/marketing/faq-list";
import { JsonLd } from "@/components/marketing/json-ld";
import { PlanCards } from "@/components/billing/plan-cards";
import { PURCHASABLE_PLANS, PLANS, SERVICE_PACKAGES } from "@/lib/billing/plans";
import { displayPrice, priceDisplayConfig } from "@/lib/billing/format";
import { marketing as m } from "@/lib/i18n/marketing-de";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Preise",
  description: "Screener-Abo ab 29 € im Monat oder Website-Überarbeitung und Komplettbetreuung auf Anfrage. Transparent, monatlich kündbar.",
  alternates: { canonical: "/preise" },
};

const yes = <Check className="mx-auto h-5 w-5 text-success" aria-label="enthalten" />;
const no = <Minus className="mx-auto h-5 w-5 text-muted-foreground" aria-label="nicht enthalten" />;

export default function PricingPage() {
  const cfg = priceDisplayConfig();
  const p = [PLANS.starter, PLANS.business, PLANS.agentur];
  const rows: [string, React.ReactNode[], React.ReactNode, React.ReactNode][] = [
    ["Projekte", p.map((x) => x.limits.projects), "inkl.", "inkl."],
    ["Prompts pro Projekt", p.map((x) => x.limits.promptsPerProject), "nach Bedarf", "nach Bedarf"],
    ["KI-Anbieter", p.map((x) => x.limits.providers), "4", "4"],
    ["Scans", ["2/Monat manuell", "wöchentlich automatisch", "wöchentlich + täglich (Top-Prompts)"], "wöchentlich", "wöchentlich"],
    ["Technik-Check & Empfehlungen", [yes, yes, yes], yes, yes],
    ["PDF-Report", [yes, yes, yes], yes, yes],
    ["Wettbewerbsvergleich", p.map((x) => (x.features.competitorComparison ? yes : no)), yes, yes],
    ["E-Mail-Alerts", p.map((x) => (x.features.emailAlerts ? yes : no)), yes, yes],
    ["White-Label-PDF", p.map((x) => (x.features.whiteLabelPdf ? yes : no)), no, no],
    ["Website-Überarbeitung durch uns", [no, no, no], yes, yes],
    ["Verzeichnis-Einträge", [no, no, no], no, yes],
    ["Google-Ads-Kampagnen", [no, no, no], no, yes],
  ];
  return (
    <>
      <JsonLd data={faqJsonLd(m.pricingFaq)} />
      <Section>
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Preise</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Paket 1 buchst du selbst als Abo. Für Paket 2 und 3 erstellen wir dir ein individuelles Angebot. Alle Preise{" "}
            {cfg.mode === "net" ? t.billing.net : t.billing.gross}.
          </p>
        </div>
        <h2 className="mb-6 text-center text-2xl font-semibold">Paket 1 – Screener</h2>
        <PlanCards plans={PURCHASABLE_PLANS} priceCfg={cfg} />
        <h2 className="mb-6 mt-16 text-center text-2xl font-semibold">Pakete mit Umsetzung durch uns</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {SERVICE_PACKAGES.map((sp) => (
            <Card key={sp.paket} className="flex flex-col">
              <CardHeader>
                <CardTitle as="h3" className="text-xl">
                  Paket {sp.paket} – {sp.name}
                </CardTitle>
                <CardDescription>{sp.description}</CardDescription>
                <p className="pt-3">
                  <span className="text-muted-foreground">{t.billing.from} </span>
                  <span className="text-3xl font-bold">{displayPrice(sp.fromOneTimeCents, cfg)}</span>
                  <span className="text-muted-foreground"> {t.billing.oneTime}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  optional Betreuung ab {displayPrice(sp.optionalMonthlyCents, cfg)} {t.billing.perMonth} · {cfg.mode === "net" ? t.billing.net : t.billing.gross}
                </p>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2 text-sm">
                  {sp.highlights.map((h) => (
                    <li key={h} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                      {h}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/angebot?paket=${sp.paket}`}>{t.billing.requestOffer}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="bg-muted/40">
        <SectionTitle title="Leistungen im Vergleich" />
        <Card>
          <CardContent className="pt-6">
            <Table>
              <caption className="sr-only">Vergleich der Leistungen aller Pakete</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Leistung</TableHead>
                  <TableHead className="text-center">Starter</TableHead>
                  <TableHead className="text-center">Business</TableHead>
                  <TableHead className="text-center">Agentur</TableHead>
                  <TableHead className="text-center">Paket 2</TableHead>
                  <TableHead className="text-center">Paket 3</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(([label, plans, p2, p3]) => (
                  <TableRow key={label}>
                    <TableCell className="font-medium">{label}</TableCell>
                    {plans.map((v, i) => (
                      <TableCell key={i} className="text-center">
                        {v}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">{p2}</TableCell>
                    <TableCell className="text-center">{p3}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Hinweis: Wir verbessern die Voraussetzungen und damit die Chance auf Erwähnungen in KI-Antworten. Bestimmte Platzierungen können wir nicht garantieren.
        </p>
      </Section>

      <Section>
        <SectionTitle title="Fragen zu Preisen" />
        <div className="mx-auto max-w-3xl">
          <FaqList items={m.pricingFaq} />
        </div>
      </Section>
    </>
  );
}
