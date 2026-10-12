import { prisma } from "@/lib/db";
import { handler, json, parseBody } from "@/lib/api";
import { assertProjectAccess, requireUser } from "@/lib/auth/session";
import { assertCompetitorLimit } from "@/lib/billing/limits";
import { projectSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const project = await assertProjectAccess(user.id, user.role, (await params).id);
  return json({ project });
});

export const PATCH = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const project = await assertProjectAccess(user.id, user.role, (await params).id);
  const data = await parseBody(req, projectSchema);
  await assertCompetitorLimit(project.orgId, data.competitors.length);
  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      name: data.name,
      brandName: data.brandName,
      brandAliases: JSON.stringify(data.brandAliases),
      domain: data.domain,
      industry: data.industry,
      city: data.city,
      region: data.region || null,
      language: data.language,
      competitors: JSON.stringify(data.competitors.map((c) => ({ name: c.name, domain: c.domain || undefined }))),
    },
  });
  return json({ project: updated });
});

export const DELETE = handler<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const project = await assertProjectAccess(user.id, user.role, (await params).id);
  await prisma.project.delete({ where: { id: project.id } });
  await logActivity({ action: "project.deleted", actorId: user.id, orgId: project.orgId, targetType: "Project", targetId: project.id });
  return json({ ok: true });
});
