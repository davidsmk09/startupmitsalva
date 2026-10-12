import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "@/components/marketing/section";
import { LeadForm } from "@/components/marketing/lead-form";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Fragen zur KI-Sichtbarkeitsanalyse? Schreib uns.",
  alternates: { canonical: "/kontakt" },
};

export default function ContactPage() {
  return (
    <Section>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight">Kontakt</h1>
        <p className="mt-3 text-lg text-muted-foreground">Du hast eine Frage oder möchtest uns kennenlernen? Wir antworten in der Regel innerhalb von zwei Werktagen.</p>
        <Card className="mt-8">
          <CardContent className="pt-6">
            <LeadForm source="KONTAKT" />
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
