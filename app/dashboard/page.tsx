import Link from "next/link";
import { FolderPlus, ArrowRight, Info } from "lucide-react";
import { prisma } from "@/lib/db";
import { getDashboardContext } from "@/lib/dashboard/context";
import { getUsage } from "@/lib/billing/limits";
import { buildRecommendations } from "@/lib/recommendations";
import type { ScanMetrics } from "@/lib/scan/scoring";
import { providerLabel } from "@/lib/providers";
import { formatDate, parseJson } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader, EmptyState } from "@/components/dashboard/page-header";
import { StartScanButton } from "@/components/dashboard/start-scan-button";
import { ScanStatusBadge, ImpactBadge, EffortBadge } from "@/components/dashboard/status-badge";
import { ScoreGauge } from "@/components/charts/score-gauge";
import { TrendChart } from "@/components/charts/trend-chart";
import { HorizontalBars } from "@/components/charts/bar-chart";

export const metadata = { title: "Übersicht" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ project?: string; welcome?: string }> }) {
  const sp = await searchParams;
  const { org, plan, activeProject } = await getDashboardContext(sp.project);

  if (!activeProject) {
    return (
      <>
        <PageHeader title={t.dashboard.nav.overview} />
        {sp.welcome && (
          <Alert variant="success" className="mb-6">
            <AlertDescription>Willkommen! Lege jetzt dein erstes Projekt an.</AlertDescription>
          </Alert>
        )}
        <EmptyState
          icon={<FolderPlus className="h-10 w-10" />}
          title={t.dashboard.noProjectTitle}
          text={t.dashboard.noProjectText}
          action={
            <Button asChild>
              <Link href="/dashboard/projects/new">{t.dashboard.newProject}</Link>
            </Button>
          }
        />
      </>
    );
  }

  const [scans, lastScan, usage] = await Promise.all([
    prisma.scan.findMany({
      where: { projectId: activeProject.id, status: "COMPLETED", type: { not: "DAILY" } },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { auditResults: true },
    }),
    prisma.scan.findFirst({ where: { projectId: activeProject.id }, orderBy: { createdAt: "desc" } }),
    getUsage(org.id),
  ]);
  const latest = scans[0] ?? null;
  const metrics = parseJson<ScanMetrics | null>(latest?.metricsJson, null);
  const recos = latest ? buildRecommendations({ audit: latest.auditResults, metrics, project: activeProject }).slice(0, 3) : [];
  const trend = [...scans].reverse().map((s) => ({
    date: formatDate(s.createdAt),
    overall: s.overallScore,
    visibility: s.visibilityScore,
    technical: s.technicalScore,
  }));
  const running = lastScan && (lastScan.status === "QUEUED" || lastScan.status === "RUNNING");

  return (
    <>
      <PageHeader
        title={activeProject.name}
        description={`${activeProject.brandName} · ${activeProject.domain} · ${activeProject.industry} in ${activeProject.city}`}
        actions={
          running ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/scans/${lastScan!.id}`}>{t.dashboard.scanRunning}</Link>
            </Button>
          ) : (
            <StartScanButton projectId={activeProject.id} />
          )
        }
      />

      {!latest ? (
        <EmptyState title={t.dashboard.lastScan} text={t.dashboard.noScanYet} action={!running && <StartScanButton projectId={activeProject.id} />} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle as="h2">{t.dashboard.overallScore}</CardTitle>
              <CardDescription>{formatDate(latest.createdAt, true)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScoreGauge score={latest.overallScore} margin={latest.visibilityMargin} label={t.dashboard.overallScore} />
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-muted p-3">
                  <div className="text-2xl font-bold tabular-nums">{latest.visibilityScore === null ? "–" : Math.round(latest.visibilityScore)}</div>
                  <div className="text-xs text-muted-foreground">{t.dashboard.visibilityScore}</div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-2xl font-bold tabular-nums">{latest.technicalScore === null ? "–" : Math.round(latest.technicalScore)}</div>
                  <div className="text-xs text-muted-foreground">{t.dashboard.technicalScore}</div>
                </div>
              </div>
              <p className="flex gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t.dashboard.scoreHelp}
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle as="h2">{t.dashboard.trend}</CardTitle>
              <CardDescription>Die letzten {trend.length} abgeschlossenen Scans</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart data={trend} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">{t.dashboard.byProvider}</CardTitle>
              <CardDescription>KI-Sichtbarkeit (0–100) im letzten Scan</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics ? (
                <HorizontalBars
                  ariaLabel="Balkendiagramm: Sichtbarkeit je KI-Anbieter"
                  valueHeader="Score"
                  data={Object.entries(metrics.byProvider).map(([p, m]) => ({ label: providerLabel(p), value: Math.round(m.score) }))}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Keine Daten.</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle as="h2">{t.dashboard.topRecommendations}</CardTitle>
                <CardDescription>Abgeleitet aus Technik-Check und KI-Antworten</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/dashboard/scans/${latest.id}?tab=recommendations`}>
                  Alle <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine offenen Empfehlungen – sehr gut!</p>
              ) : (
                <ol className="space-y-3">
                  {recos.map((r, i) => (
                    <li key={r.key} className="flex gap-3 rounded-md border p-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="font-medium">{r.title}</p>
                        <p className="line-clamp-2 text-sm text-muted-foreground">{r.why}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <ImpactBadge impact={r.impact} />
                          <EffortBadge effort={r.effort} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">{t.dashboard.lastScan}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {lastScan && (
                <div className="flex items-center justify-between">
                  <span>{formatDate(lastScan.createdAt, true)}</span>
                  <ScanStatusBadge status={lastScan.status} />
                </div>
              )}
              <Button asChild variant="outline" className="w-full">
                <Link href={`/dashboard/scans/${lastScan?.id ?? latest.id}`}>Ergebnis öffnen</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle as="h2">{t.dashboard.usage}</CardTitle>
              <CardDescription>Plan „{plan.name}“</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="mb-1 flex justify-between">
                  <span>Manuelle Scans</span>
                  <span className="tabular-nums">
                    {usage.scans} / {plan.limits.manualScansPerMonth}
                  </span>
                </div>
                <Progress value={Math.min(100, (usage.scans / Math.max(1, plan.limits.manualScansPerMonth)) * 100)} label="Nutzung Scans" />
              </div>
              <div className="flex justify-between">
                <span>KI-Abfragen diesen Monat</span>
                <span className="tabular-nums">{usage.promptRuns}</span>
              </div>
              <div className="flex justify-between">
                <span>Automatische Scans</span>
                <span>{plan.limits.weeklyScans ? "wöchentlich" : "nicht enthalten"}</span>
              </div>
              <Button asChild variant="link" className="h-auto p-0">
                <Link href="/dashboard/billing">Plan verwalten</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      <p className="mt-8 text-xs text-muted-foreground">{t.common.honestyNote}</p>
    </>
  );
}
