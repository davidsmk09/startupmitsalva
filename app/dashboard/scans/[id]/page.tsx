import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, GitCompareArrows, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { getDashboardContext, getAccessibleProject } from "@/lib/dashboard/context";
import { loadScanView } from "@/lib/dashboard/scan-view";
import { toResultData } from "@/lib/dashboard/to-result-data";
import { formatDate } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/dashboard/page-header";
import { ScanStatusBadge } from "@/components/dashboard/status-badge";
import { StartScanButton } from "@/components/dashboard/start-scan-button";
import { ScanProgress } from "@/components/scan/scan-progress";
import { ScanResultTabs } from "@/components/scan/scan-result-tabs";

export const metadata = { title: "Scan-Ergebnis" };

export default async function ScanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const { user, plan } = await getDashboardContext();
  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan?.projectId) notFound();
  const project = await getAccessibleProject(scan.projectId, user.id, user.role);

  const header = (
    <PageHeader
      title={`Scan vom ${formatDate(scan.createdAt, true)}`}
      description={`${project.name} · ${t.scan.type[scan.type] ?? scan.type}`}
      actions={
        <>
          <ScanStatusBadge status={scan.status} />
          {scan.isDemo && <Badge variant="info">{t.common.demoBadge}</Badge>}
          {scan.status === "COMPLETED" && (
            <>
              <Button asChild variant="outline">
                <Link href={`/dashboard/compare?b=${scan.id}`}>
                  <GitCompareArrows /> Vergleichen
                </Link>
              </Button>
              {plan.features.pdfReport && (
                <Button asChild>
                  <a href={`/api/scans/${scan.id}/report`} data-testid="download-pdf">
                    <Download /> {t.scan.downloadPdf}
                  </a>
                </Button>
              )}
            </>
          )}
        </>
      }
    />
  );

  if (scan.status === "QUEUED" || scan.status === "RUNNING") {
    return (
      <>
        {header}
        <ScanProgress scanId={scan.id} />
      </>
    );
  }
  if (scan.status === "FAILED") {
    return (
      <>
        {header}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Der Scan konnte nicht abgeschlossen werden</AlertTitle>
          <AlertDescription>
            <p>{scan.error ?? t.common.genericError}</p>
            <div className="mt-3">
              <StartScanButton projectId={project.id} size="sm" />
            </div>
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const view = await loadScanView(scan.id);
  if (!view) notFound();
  let taskTargets: { id: string; title: string }[] | undefined;
  if (user.role === "ADMIN") {
    const sps = await prisma.serviceProject.findMany({ where: { orgId: project.orgId }, select: { id: true, title: true } });
    taskTargets = sps.length ? sps : undefined;
  }
  return (
    <>
      {header}
      <ScanResultTabs
        defaultTab={tab ?? "overview"}
        data={toResultData(view, { competitionEnabled: plan.features.competitorComparison, taskTargets })}
      />
    </>
  );
}
