import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "@/components/marketing/section";
import { LeadForm } from "@/components/marketing/lead-form";
import { SERVICE_PACKAGES } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Angebot anfragen",
  description: "Unverbindliches Angebot für die Überarbeitung deiner Website (Paket 2) oder die Komplettbetreuung (Paket 3).",
  alternates: { canonical: "/angebot" },
};

export default async function OfferPage({ searchParams }: { searchParams: Promise<{ paket?: string }> }) {
  const { paket } = await searchParams;
  const selected = paket === "3" ? "3" : "2";
  return (
    <Section>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Angebot anfragen</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Erzähl uns kurz von deinem Unternehmen. Wir melden uns mit einer ersten Einschätzung und einem unverbindlichen Angebot.
          </p>
          <div className="mt-8 space-y-4">
            {SERVICE_PACKAGES.map((sp) => (
              <Card key={sp.paket} className={String(sp.paket) === selected ? "border-primary" : ""}>
                <CardContent className="pt-6">
                  <h2 className="font-semibold">
                    Paket {sp.paket} – {sp.name}
                  </h2>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {sp.highlights.slice(0, 4).map((h) => (
                      <li key={h} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <LeadForm source="ANGEBOT" defaultPaket={selected} />
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
