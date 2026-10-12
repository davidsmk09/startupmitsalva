import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDashboardContext } from "@/lib/dashboard/context";
import { formatDate } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, EmptyState } from "@/components/dashboard/page-header";
import { ScanStatusBadge } from "@/components/dashboard/status-badge";
import { StartScanButton } from "@/components/dashboard/start-scan-button";

export const metadata = { title: "Scans" };

const fmt = (n: number | null) => (n === null ? "–" : Math.round(n));

export default async function ScansPage() {
  const { activeProject } = await getDashboardContext();
  if (!activeProject) {
    return (
      <EmptyState
        title="Noch kein Projekt"
        text="Lege zuerst ein Projekt an."
        action={
          <Button asChild>
            <Link href="/dashboard/projects/new">Neues Projekt</Link>
          </Button>
        }
      />
    );
  }
  const scans = await prisma.scan.findMany({ where: { projectId: activeProject.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <PageHeader title="Scans" description={`Alle Scans für ${activeProject.name}`} actions={<StartScanButton projectId={activeProject.id} />} />
      {scans.length === 0 ? (
        <EmptyState title="Noch keine Scans" text={t.dashboard.noScanYet} action={<StartScanButton projectId={activeProject.id} />} />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Art</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gesamt</TableHead>
                  <TableHead className="hidden sm:table-cell">KI-Sichtbarkeit</TableHead>
                  <TableHead className="hidden sm:table-cell">Technik</TableHead>
                  <TableHead>
                    <span className="sr-only">Aktionen</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scans.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDate(s.createdAt, true)}</TableCell>
                    <TableCell>{t.scan.type[s.type] ?? s.type}</TableCell>
                    <TableCell>
                      <ScanStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">{fmt(s.overallScore)}</TableCell>
                    <TableCell className="hidden tabular-nums sm:table-cell">
                      {fmt(s.visibilityScore)}
                      {s.visibilityMargin != null && <span className="text-xs text-muted-foreground"> ± {s.visibilityMargin}</span>}
                    </TableCell>
                    <TableCell className="hidden tabular-nums sm:table-cell">{fmt(s.technicalScore)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/scans/${s.id}`}>Öffnen</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
