import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/section";
import { FaqList, faqJsonLd } from "@/components/marketing/faq-list";
import { JsonLd } from "@/components/marketing/json-ld";
import { marketing as m } from "@/lib/i18n/marketing-de";

export const metadata: Metadata = {
  title: "Häufige Fragen (FAQ)",
  description: "Antworten zu Messung, Technik-Check, Datenschutz und Preisen der KI-Sichtbarkeitsanalyse.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const all = [...m.faq, ...m.pricingFaq];
  return (
    <Section>
      <JsonLd data={faqJsonLd(all)} />
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight">Häufige Fragen</h1>
        <p className="mt-3 text-lg text-muted-foreground">Alles Wichtige zur Messung der KI-Sichtbarkeit – ehrlich beantwortet.</p>
        <div className="mt-10">
          <FaqList items={all} />
        </div>
        <div className="mt-10 rounded-lg border bg-muted/40 p-6 text-center">
          <p className="font-medium">Deine Frage ist nicht dabei?</p>
          <Button asChild className="mt-3">
            <Link href="/kontakt">Kontakt aufnehmen</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}
