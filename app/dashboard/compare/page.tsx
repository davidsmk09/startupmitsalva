import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { prisma } from "@/lib/db";
import { getDashboardContext } from "@/lib/dashboard/context";
import type { ScanMetrics } from "@/lib/scan/scoring";
import { providerLabel } from "@/lib/providers";
import { formatDate, parseJson } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, EmptyState } from "@/components/dashboard/page-header";
import { AuditStatusBadge } from "@/components/dashboard/status-badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Vergleich" };

function Delta({ a, b, margin, unit = "" }: { a: number | null; b: number | null; margin?: number | null; unit?: string }) {
  if (a === null || b === null) return <span className="text-muted-foreground">–</span>;
  const d = Math.round((b - a) * 10) / 10;
  const noise = margin != null && Math.abs(d) <= margin;
  const Icon = d > 0 ? ArrowUpRight : d < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular-nums",
        noise || d === 0 ? "text-muted-foreground" : d > 0 ? "text-success" : "text-destructive",
      )}
      title={noise ? "Innerhalb der Schwankungsbreite – möglicherweise Zufall" : undefined}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {d > 0 ? "+" : ""}
      {d}
      {unit}
      {noise && <span className="text-xs font-normal">(im Rauschen)</span>}
    </span>
  );
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const sp = await searchParams;
  const { activeProject } = await getDashboardContext();
  if (!activeProject) return <EmptyState title="Noch kein Projekt" text="Lege zuerst ein Projekt an." />;
  const scans = await prisma.scan.findMany({
    where: { projectId: activeProject.id, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, createdAt: true, overallScore: true, type: true },
  });
  if (scans.length < 2) {
    return (
      <>
        <PageHeader title="Vergleich" />
        <EmptyState title="Mindestens zwei Scans nötig" text="Sobald zwei abgeschlossene Scans vorliegen, kannst du sie hier nebeneinander vergleichen." />
      </>
    );
  }
  const bId = scans.some((s) => s.id === sp.b) ? sp.b! : scans[0].id;
  const aId = scans.some((s) => s.id === sp.a) && sp.a !== bId ? sp.a! : (scans.find((s) => s.id !== bId)?.id ?? scans[1].id);
  const [a, b] = await Promise.all(
    [aId, bId].map((id) => prisma.scan.findUniqueOrThrow({ where: { id }, include: { auditResults: true, runs: { select: { promptStableId: true, promptText: true, brandMentioned: true, error: true } } } })),
  );
  const ma = parseJson<ScanMetrics | null>(a.metricsJson, null);
  const mb = parseJson<ScanMetrics | null>(b.metricsJson, null);
  const margin = Math.max(a.visibilityMargin ?? 0, b.visibilityMargin ?? 0) || null;

  const promptRate = (runs: typeof a.runs) => {
    const map = new Map<string, { text: string; hit: number; n: number }>();
    for (const r of runs) {
      if (r.error) continue;
      const e = map.get(r.promptStableId) ?? { text: r.promptText, hit: 0, n: 0 };
      e.n++;
      if (r.brandMentioned) e.hit++;
      map.set(r.promptStableId, e);
    }
    return map;
  };
  const pa = promptRate(a.runs);
  const pb = promptRate(b.runs);
  const promptIds = Array.from(new Set([...pa.keys(), ...pb.keys()])).sort();
  const checkKeys = Array.from(new Set([...a.auditResults.map((x) => x.checkKey), ...b.auditResults.map((x) => x.checkKey)]));
  const label = (s: { createdAt: Date; overallScore: number | null; type: string }) =>
    `${formatDate(s.createdAt, true)} · ${t.scan.type[s.type]} · ${s.overallScore === null ? "–" : Math.round(s.overallScore)}`;

  return (
    <>
      <PageHeader title="Vergleich" description="Zwei Scans nebeneinander. Veränderungen innerhalb der Schwankungsbreite sind grau markiert." />
      <form className="mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" method="get">
        <div>
          <label htmlFor="a" className="mb-1 block text-sm font-medium">
            Scan A (vorher)
          </label>
          <NativeSelect id="a" name="a" defaultValue={aId}>
            {scans.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <label htmlFor="b" className="mb-1 block text-sm font-medium">
            Scan B (nachher)
          </label>
          <NativeSelect id="b" name="b" defaultValue={bId}>
            {scans.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" className="self-end">
          Vergleichen
        </Button>
      </form>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle as="h2">Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kennzahl</TableHead>
                  <TableHead>A</TableHead>
                  <TableHead>B</TableHead>
                  <TableHead>Veränderung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ["Gesamt", a.overallScore, b.overallScore, margin],
                  ["KI-Sichtbarkeit", a.visibilityScore, b.visibilityScore, margin],
                  ["Technik", a.technicalScore, b.technicalScore, null],
                ].map(([k, x, y, mg]) => (
                  <TableRow key={k as string}>
                    <TableCell className="font-medium">{k as string}</TableCell>
                    <TableCell className="tabular-nums">{x === null ? "–" : Math.round(x as number)}</TableCell>
                    <TableCell className="tabular-nums">{y === null ? "–" : Math.round(y as number)}</TableCell>
                    <TableCell>
                      <Delta a={x as number | null} b={y as number | null} margin={mg as number | null} />
                    </TableCell>
                  </TableRow>
                ))}
                {ma && mb && (
                  <>
                    <TableRow>
                      <TableCell className="font-medium">{t.scan.mentionRate}</TableCell>
                      <TableCell className="tabular-nums">{Math.round(ma.overall.mentionRate * 100)} %</TableCell>
                      <TableCell className="tabular-nums">{Math.round(mb.overall.mentionRate * 100)} %</TableCell>
                      <TableCell>
                        <Delta a={ma.overall.mentionRate * 100} b={mb.overall.mentionRate * 100} unit=" %-Pkt." />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">{t.scan.citationRate}</TableCell>
                      <TableCell className="tabular-nums">{Math.round(ma.overall.citationRate * 100)} %</TableCell>
                      <TableCell className="tabular-nums">{Math.round(mb.overall.citationRate * 100)} %</TableCell>
                      <TableCell>
                        <Delta a={ma.overall.citationRate * 100} b={mb.overall.citationRate * 100} unit=" %-Pkt." />
                      </TableCell>
                    </TableRow>
                    {Array.from(new Set([...Object.keys(ma.byProvider), ...Object.keys(mb.byProvider)])).map((p) => (
                      <TableRow key={p}>
                        <TableCell>{providerLabel(p)}</TableCell>
                        <TableCell className="tabular-nums">{ma.byProvider[p] ? Math.round(ma.byProvider[p].score) : "–"}</TableCell>
                        <TableCell className="tabular-nums">{mb.byProvider[p] ? Math.round(mb.byProvider[p].score) : "–"}</TableCell>
                        <TableCell>
                          <Delta a={ma.byProvider[p]?.score ?? null} b={mb.byProvider[p]?.score ?? null} margin={margin} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Erwähnungen je Prompt</CardTitle>
            <CardDescription>Dank stabiler Prompt-IDs direkt vergleichbar</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prompt</TableHead>
                  <TableHead>A</TableHead>
                  <TableHead>B</TableHead>
                  <TableHead>Veränderung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promptIds.map((id) => {
                  const x = pa.get(id);
                  const y = pb.get(id);
                  const rx = x ? (x.hit / x.n) * 100 : null;
                  const ry = y ? (y.hit / y.n) * 100 : null;
                  return (
                    <TableRow key={id}>
                      <TableCell>
                        <code className="mr-2 text-xs text-muted-foreground">{id}</code>
                        {(y ?? x)!.text}
                      </TableCell>
                      <TableCell className="tabular-nums">{rx === null ? "–" : `${Math.round(rx)} %`}</TableCell>
                      <TableCell className="tabular-nums">{ry === null ? "–" : `${Math.round(ry)} %`}</TableCell>
                      <TableCell>
                        <Delta a={rx} b={ry} unit=" %-Pkt." />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Technik-Check</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check</TableHead>
                  <TableHead>A</TableHead>
                  <TableHead>B</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkKeys.map((k) => {
                  const x = a.auditResults.find((r) => r.checkKey === k);
                  const y = b.auditResults.find((r) => r.checkKey === k);
                  return (
                    <TableRow key={k} className={x?.status !== y?.status ? "bg-accent/50" : ""}>
                      <TableCell>{(y ?? x)!.title}</TableCell>
                      <TableCell>{x ? <AuditStatusBadge status={x.status} /> : "–"}</TableCell>
                      <TableCell>{y ? <AuditStatusBadge status={y.status} /> : "–"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/scans/${a.id}`}>Scan A öffnen</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/dashboard/scans/${b.id}`}>Scan B öffnen</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
