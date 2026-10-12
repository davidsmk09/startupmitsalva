import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, enforceRateLimit, handler } from "@/lib/api";
import { assertScanAccess, requireUser } from "@/lib/auth/session";
import { getOrgPlan } from "@/lib/billing/limits";
import { loadScanView } from "@/lib/dashboard/scan-view";
import { renderReportPdf } from "@/lib/pdf/report";
import { readReport, saveReport } from "@/lib/pdf/storage";
import { env } from "@/lib/env";
import { MINUTE } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handler<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  await enforceRateLimit(`pdf:${user.id}`, 30, 10 * MINUTE);
  const { scan, project } = await assertScanAccess(user.id, user.role, (await params).id);
  if (scan.status !== "COMPLETED") throw new ApiError(409, "Der Scan ist noch nicht abgeschlossen.");
  const plan = await getOrgPlan(project.orgId);
  if (!plan.features.pdfReport) throw new ApiError(402, "PDF-Reports sind in deinem Plan nicht enthalten.", "LIMIT");

  const filename = `ki-sichtbarkeit-${project.domain.replace(/[^a-z0-9.-]/gi, "")}-${scan.createdAt.toISOString().slice(0, 10)}.pdf`;
  const existing = await prisma.report.findFirst({ where: { scanId: scan.id }, orderBy: { createdAt: "desc" } });
  let pdf = existing ? await readReport(existing.pdfPath) : null;
  if (!pdf) {
    const view = await loadScanView(scan.id);
    if (!view) throw new ApiError(404, "Nicht gefunden.");
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: project.orgId } });
    const whiteLabel = plan.features.whiteLabelPdf;
    pdf = await renderReportPdf(view, {
      name: whiteLabel && org.whiteLabelName ? org.whiteLabelName : env.appName,
      logoDataUrl: whiteLabel ? org.whiteLabelLogoUrl : null,
    });
    try {
      const pdfPath = await saveReport(scan.id, pdf);
      await prisma.report.create({ data: { scanId: scan.id, pdfPath } });
    } catch {
      // Dateisystem evtl. schreibgeschützt (Serverless) – Report trotzdem ausliefern
    }
  }
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
});
