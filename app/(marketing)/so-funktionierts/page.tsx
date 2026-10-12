import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/section";
import { marketing as m } from "@/lib/i18n/marketing-de";

export const metadata: Metadata = {
  title: "So funktioniert's",
  description: "Wie wir die Sichtbarkeit deines Unternehmens in ChatGPT, Perplexity, Gemini und Claude messen – transparent erklärt.",
  alternates: { canonical: "/so-funktionierts" },
};

export default function HowItWorksPage() {
  const h = m.howItWorks;
  return (
    <Section>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{h.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{h.intro}</p>
        <ol className="mt-12 space-y-10">
          {h.sections.map((s, i) => (
            <li key={s.title} className="flex gap-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h2 className="text-xl font-semibold">{s.title}</h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-12 rounded-lg border border-warning/40 bg-warning/10 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-warning-foreground" aria-hidden="true" />
            {h.limits.title}
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
            {h.limits.items.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/gratis-check">Gratis-Check starten</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/preise">Preise ansehen</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}
