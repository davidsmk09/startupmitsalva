import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, json, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { LEAD_STATUS } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ status: z.enum(LEAD_STATUS).optional(), notes: z.string().max(10_000).optional() });

export const PATCH = handler<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin();
  const id = (await params).id;
  const data = await parseBody(req, schema);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new ApiError(404, "Lead nicht gefunden.");
  const updated = await prisma.lead.update({ where: { id }, data });
  if (data.status && data.status !== lead.status) {
    await logActivity({ action: "admin.lead_status", actorId: admin.id, targetType: "Lead", targetId: id, meta: { from: lead.status, to: data.status } });
  }
  return json({ lead: updated });
});

export const DELETE = handler<Ctx>(async (_req, { params }) => {
  const admin = await requireAdmin();
  const id = (await params).id;
  await prisma.lead.delete({ where: { id } });
  await logActivity({ action: "admin.lead_deleted", actorId: admin.id, targetType: "Lead", targetId: id });
  return json({ ok: true });
});
