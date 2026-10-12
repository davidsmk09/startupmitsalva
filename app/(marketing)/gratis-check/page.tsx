import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "@/components/marketing/section";
import { QuickCheckForm } from "./quick-check-form";

export const metadata: Metadata = {
  title: "Gratis-Check: Wie sichtbar bist du in KI-Antworten?",
  description: "Kostenloser Kurz-Check: technische Prüfung deiner Website und fünf typische Fragen an einen KI-Assistenten. Ergebnis in wenigen Minuten.",
  alternates: { canonical: "/gratis-check" },
};

export default function QuickCheckPage() {
  return (
    <Section>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Gratis-Check</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Finde heraus, wie gut KI-Assistenten dein Unternehmen kennen – kostenlos und ohne Registrierung.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "Technischer Check deiner Website (KI-Crawler, Sitemap, strukturierte Daten …)",
              "5 typische Kundenfragen an einen KI-Assistenten",
              "Teaser-Score und die 3 wichtigsten Befunde",
              "Vollständiger Report nach kostenloser Registrierung",
            ].map((x) => (
              <li key={x} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                {x}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted-foreground">
            Hinweis: Ein Kurz-Check ist eine Momentaufnahme mit wenigen Abfragen. Die Ergebnisse schwanken – für belastbare Trends empfehlen wir regelmäßige
            Scans.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <QuickCheckForm />
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
