import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { scanSummaryTemplate } from "@/lib/email/templates";
import { getOrgPlan } from "@/lib/billing/limits";
import { buildRecommendations } from "@/lib/recommendations";
import type { ScanMetrics } from "@/lib/scan/scoring";
import { parseJson } from "@/lib/utils";

/**
 * Nach Abschluss eines Scans: Wochen-Zusammenfassung (WEEKLY) bzw.
 * E-Mail-Alert bei deutlicher Veränderung (Plan mit E-Mail-Alerts).
 */
export async function afterScanCompleted(scanId: string) {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { project: { include: { org: { include: { memberships: { include: { user: true } } } } } }, auditResults: true },
  });
  if (!scan?.project || scan.status !== "COMPLETED" || scan.overallScore === null) return;
  if (scan.type === "DAILY" || scan.type === "QUICK") return;

  const plan = await getOrgPlan(scan.project.orgId);
  const previous = await prisma.scan.findFirst({
    where: { projectId: scan.projectId, status: "COMPLETED", id: { not: scan.id }, createdAt: { lt: scan.createdAt }, type: { not: "DAILY" } },
    orderBy: { createdAt: "desc" },
  });
  const diff = previous?.overallScore != null ? scan.overallScore - previous.overallScore : null;
  const threshold = Math.max(5, scan.visibilityMargin ?? 0);

  const isWeekly = scan.type === "WEEKLY";
  const isAlert = scan.type === "FULL" && plan.features.emailAlerts && diff !== null && Math.abs(diff) >= threshold;
  if (!isWeekly && !isAlert) return;

  const metrics = parseJson<ScanMetrics | null>(scan.metricsJson, null);
  const recos = buildRecommendations({
    audit: scan.auditResults,
    metrics,
    project: scan.project,
  });
  const tpl = scanSummaryTemplate({
    projectName: scan.project.name,
    score: scan.overallScore,
    previous: previous?.overallScore ?? null,
    margin: scan.visibilityMargin,
    link: `${env.appUrl}/dashboard/scans/${scan.id}`,
    topRecommendations: recos.slice(0, 3).map((r) => r.title),
  });

  for (const m of scan.project.org.memberships) {
    const wants = isWeekly ? m.user.notifyWeekly : m.user.notifyAlerts;
    if (!wants) continue;
    await sendEmail({ to: m.user.email, ...tpl });
  }
}
