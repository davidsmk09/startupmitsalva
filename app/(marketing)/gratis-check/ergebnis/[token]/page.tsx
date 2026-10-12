import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Lock, XCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { loadScanView } from "@/lib/dashboard/scan-view";
import { isDemoMode } from "@/lib/providers";
import { scoreLevel } from "@/lib/scan/scoring";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Section } from "@/components/marketing/section";
import { ScoreGauge } from "@/components/charts/score-gauge";
import { ScanProgress } from "@/components/scan/scan-progress";
import { DemoBanner } from "@/components/dashboard/demo-banner";

export const metadata: Metadata = { title: "Dein Gratis-Check", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LEVEL_TEXT = {
  low: "KI-Assistenten nennen dein Unternehmen bisher selten. Mit gezielten Maßnahmen lässt sich die Ausgangslage meist deutlich verbessern.",
  medium: "Eine solide Basis – aber es gibt klare Hebel, um häufiger genannt und als Quelle zitiert zu werden.",
  high: "Starke Ausgangslage. Jetzt geht es darum, die Position zu halten und Schwankungen zu beobachten.",
};

export default async function QuickResultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) notFound();
  const scan = await prisma.scan.findUnique({ where: { publicToken: token } });
  if (!scan || scan.type !== "QUICK") notFound();

  if (scan.status === "QUEUED" || scan.status === "RUNNING") {
    return (
      <Section>
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Dein Gratis-Check läuft</h1>
          <p className="text-muted-foreground">Das dauert meist nur ein bis zwei Minuten. Du kannst diese Seite geöffnet lassen.</p>
          <ScanProgress scanId={scan.id} token={token} />
        </div>
      </Section>
    );
  }
  if (scan.status === "FAILED") {
    return (
      <Section>
        <div className="mx-auto max-w-2xl">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Der Check konnte nicht abgeschlossen werden</AlertTitle>
            <AlertDescription>{scan.error ?? t.common.genericError}</AlertDescription>
          </Alert>
          <Button asChild className="mt-6">
            <Link href="/gratis-check">Erneut versuchen</Link>
          </Button>
        </div>
      </Section>
    );
  }

  const view = await loadScanView(scan.id);
  if (!view) notFound();
  const top = view.recommendations.slice(0, 3);
  const level = scoreLevel(scan.overallScore);
  return (
    <>
      {(scan.isDemo || isDemoMode()) && <DemoBanner />}
      <Section>
        <div className="mx-auto max-w-4xl space-y-8">
          <div>
            <p className="text-sm font-medium text-primary">Gratis-Check</p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {view.project.brandName} · {view.project.domain}
            </h1>
          </div>
          <Card data-testid="teaser-score">
            <CardContent className="grid gap-6 pt-6 md:grid-cols-[auto_1fr] md:items-center">
              <ScoreGauge score={scan.overallScore} margin={scan.visibilityMargin} label="Teaser-Score" />
              <div className="space-y-3">
                <p className="text-lg">{LEVEL_TEXT[level]}</p>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="outline">KI-Sichtbarkeit: {scan.visibilityScore === null ? "–" : Math.round(scan.visibilityScore)}</Badge>
                  <Badge variant="outline">Technik: {scan.technicalScore === null ? "–" : Math.round(scan.technicalScore)}</Badge>
                  {view.metrics && <Badge variant="outline">Erwähnt in {Math.round(view.metrics.overall.mentionRate * 100)} % der Antworten</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Basis: 5 Fragen an einen KI-Assistenten, je {Math.max(1, ...view.runs.map((r) => r.runIndex + 1))}× gestellt. Ein vollständiger Scan nutzt
                  15–30 Fragen und bis zu 4 Anbieter.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Die 3 wichtigsten Befunde</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {top.map((r, i) => (
                  <li key={r.key} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{i + 1}</span>
                    <div>
                      <p className="font-medium">{r.title}</p>
                      <p className="text-sm text-muted-foreground">{r.why}</p>
                    </div>
                  </li>
                ))}
                {top.length === 0 && <p className="text-sm text-muted-foreground">Keine kritischen Befunde – sehr gut!</p>}
              </ol>
            </CardContent>
          </Card>

          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Lock className="h-5 w-5" aria-hidden="true" /> Den vollständigen Report freischalten
              </CardTitle>
              <CardDescription className="text-base">
                Alle KI-Antworten im Wortlaut, zitierte Quellen, der komplette Technik-Check mit Anleitungen und alle Maßnahmen – kostenlos nach der
                Registrierung.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link
                  href={`/register?next=${encodeURIComponent(
                    `/dashboard/projects/new?domain=${view.project.domain}&brand=${view.project.brandName}&industry=${view.project.industry}&city=${view.project.city}`,
                  )}`}
                >
                  Kostenlos registrieren und vollständigen Report ansehen
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/angebot?paket=2">Umsetzung anfragen</Link>
              </Button>
            </CardContent>
          </Card>
          <p className="flex gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t.common.honestyNote}
          </p>
        </div>
      </Section>
    </>
  );
}
