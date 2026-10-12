import type { ScanView } from "@/lib/dashboard/scan-view";
import type { ScanResultData } from "@/components/scan/scan-result-tabs";
import { PROVIDER_LABELS } from "@/lib/providers";

/** Wandelt ScanView in serialisierbare Props für die Ergebnis-Tabs. */
export function toResultData(
  view: ScanView,
  opts: { competitionEnabled: boolean; taskTargets?: { id: string; title: string }[] },
): ScanResultData {
  return {
    scanId: view.scan.id,
    brandNames: view.brandNames,
    competitorNames: view.competitorNames,
    ownDomain: view.project.domain,
    summary: view.summary,
    overall: view.scan.overallScore,
    visibility: view.scan.visibilityScore,
    technical: view.scan.technicalScore,
    margin: view.scan.visibilityMargin,
    partial: view.scan.partial,
    note: view.scan.error,
    metrics: view.metrics,
    audit: view.audit.map((a) => ({
      id: a.id,
      checkKey: a.checkKey,
      title: a.title,
      status: a.status,
      weight: a.weight,
      details: a.details,
      recommendation: a.recommendation,
      data: a.data,
    })),
    recommendations: view.recommendations,
    runs: view.runs,
    providerLabels: PROVIDER_LABELS,
    competitionEnabled: opts.competitionEnabled,
    taskTargets: opts.taskTargets,
  };
}
