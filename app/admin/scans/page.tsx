import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, formatEuro } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { NativeSelect } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/page-header";
import { ScanStatusBadge } from "@/components/dashboard/status-badge";
import { RetryScanButton } from "@/components/admin/retry-button";

export const metadata = { title: "Scans" };
export const dynamic = "force-dynamic";

export default async function AdminScans({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const scans = await prisma.scan.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { project: { include: { org: true } } },
  });
  return (
    <>
      <PageHeader title="Scans" description="Alle Scans inkl. Gratis-Checks" />
      <form className="mb-4 flex max-w-sm gap-2" method="get">
        <label htmlFor="status" className="sr-only">
          Status
        </label>
        <NativeSelect id="status" name="status" defaultValue={status ?? ""}>
          <option value="">Alle Status</option>
          {Object.entries(t.scan.status).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit">Filtern</Button>
      </form>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Projekt / Domain</TableHead>
                <TableHead>Art</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Kosten</TableHead>
                <TableHead>Fehler / Hinweis</TableHead>
                <TableHead>
                  <span className="sr-only">Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scans.map((s) => {
                const quick = s.quickInputJson ? (JSON.parse(s.quickInputJson) as { domain: string }) : null;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(s.createdAt, true)}</TableCell>
                    <TableCell>
                      {s.project ? (
                        <Link className="underline" href={`/dashboard/scans/${s.id}`}>
                          {s.project.name}
                        </Link>
                      ) : (
                        quick?.domain
                      )}
                      <div className="text-xs text-muted-foreground">{s.project?.org.name ?? "Gratis-Check"}</div>
                    </TableCell>
                    <TableCell>{t.scan.type[s.type]}</TableCell>
                    <TableCell>
                      <ScanStatusBadge status={s.status} />
                      {s.isDemo && <div className="text-xs text-muted-foreground">Demo</div>}
                    </TableCell>
                    <TableCell className="tabular-nums">{s.overallScore === null ? "–" : Math.round(s.overallScore)}</TableCell>
                    <TableCell className="tabular-nums">{formatEuro(s.costEstimateCents, { decimals: true })}</TableCell>
                    <TableCell className="max-w-xs">
                      {s.error && (
                        <details>
                          <summary className="cursor-pointer text-sm text-destructive">{s.error.slice(0, 60)}…</summary>
                          <p className="mt-1 whitespace-pre-wrap text-xs">{s.error}</p>
                        </details>
                      )}
                    </TableCell>
                    <TableCell>{(s.status === "FAILED" || s.partial) && <RetryScanButton scanId={s.id} />}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
