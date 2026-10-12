import { prisma } from "@/lib/db";
import { ApiError, handler, json } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { enqueueJob } from "@/lib/jobs/queue";
import { logActivity } from "@/lib/activity";

type Ctx = { params: Promise<{ id: string }> };

/** Admin: fehlgeschlagenen Scan erneut ausführen (gleicher Scan, neue Job-Ausführung). */
export const POST = handler<Ctx>(async (_req, { params }) => {
  const admin = await requireAdmin();
  const id = (await params).id;
  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan) throw new ApiError(404, "Scan nicht gefunden.");
  if (scan.status === "QUEUED" || scan.status === "RUNNING") throw new ApiError(409, "Scan läuft bereits.");
  await prisma.scan.update({
    where: { id },
    data: { status: "QUEUED", phase: "WARTESCHLANGE", error: null, finishedAt: null, doneRuns: 0, partial: false },
  });
  await prisma.report.deleteMany({ where: { scanId: id } });
  await enqueueJob("SCAN", { scanId: id });
  await logActivity({ action: "admin.scan_retry", actorId: admin.id, targetType: "Scan", targetId: id });
  return json({ ok: true });
});
