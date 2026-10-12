import { prisma } from "@/lib/db";
import { ApiError, handler, json } from "@/lib/api";
import { assertScanAccess, getCurrentUser } from "@/lib/auth/session";
import { t } from "@/lib/i18n";

type Ctx = { params: Promise<{ id: string }> };

/** Live-Status für Polling. Gratis-Checks per ?token=… (öffentlicher Token). */
export const GET = handler<Ctx>(async (req, { params }) => {
  const id = (await params).id;
  const token = new URL(req.url).searchParams.get("token");
  let scan;
  if (token) {
    scan = await prisma.scan.findUnique({ where: { id } });
    if (!scan || scan.publicToken !== token) throw new ApiError(404, t.common.notFound);
  } else {
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, t.common.unauthorized);
    scan = (await assertScanAccess(user.id, user.role, id)).scan;
  }
  return json({
    id: scan.id,
    status: scan.status,
    phase: scan.phase,
    doneRuns: scan.doneRuns,
    totalRuns: scan.totalRuns,
    overallScore: scan.overallScore,
    error: scan.status === "FAILED" ? scan.error : null,
  });
});
