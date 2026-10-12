import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, json, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { SERVICE_PROJECT_STATUS } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  status: z.enum(SERVICE_PROJECT_STATUS).optional(),
  notizen: z.string().max(20_000).nullable().optional(),
  // Kunden-Organisation über die E-Mail eines Kundenkontos verknüpfen ("" = lösen)
  orgEmail: z.string().trim().toLowerCase().optional(),
});

export const PATCH = handler<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin();
  const id = (await params).id;
  const { orgEmail, ...data } = await parseBody(req, schema);
  let orgUpdate: { orgId: string | null } | object = {};
  if (orgEmail !== undefined) {
    if (orgEmail === "") orgUpdate = { orgId: null };
    else {
      const u = await prisma.user.findUnique({ where: { email: orgEmail }, include: { memberships: true } });
      if (!u?.memberships[0]) throw new ApiError(404, "Kein Kundenkonto mit dieser E-Mail gefunden.", "VALIDATION", { orgEmail: "Nicht gefunden." });
      orgUpdate = { orgId: u.memberships[0].orgId };
    }
  }
  const sp = await prisma.serviceProject.update({ where: { id }, data: { ...data, ...orgUpdate } });
  await logActivity({ action: "admin.service_project_updated", actorId: admin.id, targetType: "ServiceProject", targetId: id, meta: { ...data, orgEmail } });
  return json({ serviceProject: sp });
});

export const DELETE = handler<Ctx>(async (_req, { params }) => {
  const admin = await requireAdmin();
  const id = (await params).id;
  await prisma.serviceProject.delete({ where: { id } });
  await logActivity({ action: "admin.service_project_deleted", actorId: admin.id, targetType: "ServiceProject", targetId: id });
  return json({ ok: true });
});
