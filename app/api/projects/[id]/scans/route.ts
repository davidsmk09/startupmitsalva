import { prisma } from "@/lib/db";
import { ApiError, enforceRateLimit, handler, json } from "@/lib/api";
import { assertProjectAccess, requireUser } from "@/lib/auth/session";
import { assertCanStartManualScan } from "@/lib/billing/limits";
import { createProjectScan } from "@/lib/scan/service";
import { MINUTE } from "@/lib/security/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const project = await assertProjectAccess(user.id, user.role, (await params).id);
  const scans = await prisma.scan.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, status: true, type: true, overallScore: true, createdAt: true },
  });
  return json({ scans });
});

export const POST = handler<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  await enforceRateLimit(`scan:start:${user.id}`, 10, 10 * MINUTE);
  const project = await assertProjectAccess(user.id, user.role, (await params).id);
  const running = await prisma.scan.count({ where: { projectId: project.id, status: { in: ["QUEUED", "RUNNING"] } } });
  if (running > 0) throw new ApiError(409, "Für dieses Projekt läuft bereits ein Scan.", "RUNNING");
  await assertCanStartManualScan(project.orgId);
  const active = await prisma.prompt.count({ where: { projectId: project.id, active: true } });
  if (active === 0) throw new ApiError(422, "Bitte aktiviere mindestens einen Prompt.");
  const scan = await createProjectScan({ projectId: project.id, orgId: project.orgId, type: "FULL", countUsage: true });
  return json({ scan: { id: scan.id } }, 201);
});
