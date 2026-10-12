import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, json, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";

const schema = z.object({ title: z.string().trim().min(2).max(200), paket: z.union([z.literal(2), z.literal(3)]), orgEmail: z.string().trim().toLowerCase().optional() });

export const POST = handler(async (req) => {
  const admin = await requireAdmin();
  const data = await parseBody(req, schema);
  let orgId: string | null = null;
  if (data.orgEmail) {
    const u = await prisma.user.findUnique({ where: { email: data.orgEmail }, include: { memberships: true } });
    orgId = u?.memberships[0]?.orgId ?? null;
  }
  const sp = await prisma.serviceProject.create({ data: { title: data.title, paket: data.paket, orgId } });
  await logActivity({ action: "admin.service_project_created", actorId: admin.id, targetType: "ServiceProject", targetId: sp.id });
  return json({ serviceProject: sp }, 201);
});
