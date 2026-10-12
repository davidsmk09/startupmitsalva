import Link from "next/link";
import { ArrowRight, Bot, Search, ShieldCheck, Sparkles, LineChart, Wrench, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Section, SectionTitle } from "@/components/marketing/section";
import { FaqList, faqJsonLd } from "@/components/marketing/faq-list";
import { JsonLd } from "@/components/marketing/json-ld";
import { ReportPreview } from "@/components/marketing/report-preview";
import { marketing as m } from "@/lib/i18n/marketing-de";

const problemIcons = [Search, Bot, Wrench];
const stepIcons = [Sparkles, LineChart, Wrench];

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqJsonLd(m.faq.slice(0, 5))} />
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container grid gap-12 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">{m.hero.eyebrow}</p>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{m.hero.title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{m.hero.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/gratis-check">
                  {m.hero.ctaPrimary} <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/so-funktionierts">{m.hero.ctaSecondary}</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {m.hero.trust.map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <ReportPreview />
        </div>
      </section>

      <Section>
        <SectionTitle title={m.problem.title} />
        <div className="grid gap-6 md:grid-cols-3">
          {m.problem.points.map((p, i) => {
            const Icon = problemIcons[i];
            return (
              <Card key={p.title}>
                <CardHeader>
                  <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
                  <CardTitle as="h3" className="pt-2">
                    {p.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">{p.text}</CardContent>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section className="bg-muted/40">
        <SectionTitle title={m.steps.title} />
        <ol className="grid gap-6 md:grid-cols-3">
          {m.steps.items.map((s, i) => {
            const Icon = stepIcons[i];
            return (
              <li key={s.title} className="rounded-lg border bg-background p-6">
                <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.text}</p>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section>
        <SectionTitle title={m.packages.title} />
        <div className="grid gap-6 md:grid-cols-3">
          {m.packages.items.map((p, i) => (
            <Card key={p.name} className={i === 0 ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle as="h3">{p.name}</CardTitle>
                <CardDescription className="text-base">{p.text}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant={i === 0 ? "default" : "outline"} className="w-full">
                  <Link href={p.href}>{p.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="bg-muted/40">
        <SectionTitle title={m.preview.title} subtitle={m.preview.subtitle} />
        <div className="mx-auto max-w-4xl">
          <ReportPreview />
          <ul className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
            {[
              "Gesamtscore mit Schwankungsbreite",
              "Antworten aller KI-Anbieter im Wortlaut",
              "Zitierte Quellen & Share of Voice",
              "Technik-Check mit Anleitung",
              "Priorisierte Maßnahmen nach Impact × Aufwand",
              "PDF-Report zum Weitergeben",
            ].map((x) => (
              <li key={x} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" aria-hidden="true" />
                {x}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section>
        <SectionTitle title="Häufige Fragen" />
        <div className="mx-auto max-w-3xl">
          <FaqList items={m.faq.slice(0, 5)} />
          <p className="mt-6 text-center">
            <Link href="/faq" className="font-medium text-primary underline-offset-4 hover:underline">
              Alle Fragen ansehen
            </Link>
          </p>
        </div>
      </Section>

      <section className="bg-primary text-primary-foreground">
        <div className="container py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight">{m.ctaBand.title}</h2>
          <p className="mx-auto mt-3 max-w-2xl opacity-90">{m.ctaBand.text}</p>
          <Button asChild size="lg" variant="secondary" className="mt-8">
            <Link href="/gratis-check">{m.ctaBand.button}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
