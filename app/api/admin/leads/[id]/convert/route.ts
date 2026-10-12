import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, json, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { defaultServiceTasks } from "@/lib/service-templates";
import { logActivity } from "@/lib/activity";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ paket: z.union([z.literal(2), z.literal(3)]), withTemplate: z.boolean().default(true) });

/**
 * Lead in Serviceprojekt umwandeln. Existiert ein Kundenkonto mit der
 * Lead-E-Mail, wird dessen Organisation verknüpft (Kundenansicht).
 */
export const POST = handler<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin();
  const id = (await params).id;
  const { paket, withTemplate } = await parseBody(req, schema);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new ApiError(404, "Lead nicht gefunden.");
  const user = await prisma.user.findUnique({ where: { email: lead.email }, include: { memberships: true } });
  const orgId = user?.memberships[0]?.orgId ?? null;
  const sp = await prisma.serviceProject.create({
    data: {
      leadId: lead.id,
      orgId,
      paket,
      title: `${lead.firma || lead.name || lead.email} – Paket ${paket}`,
      notizen: lead.nachricht,
      tasks: withTemplate
        ? { create: defaultServiceTasks(paket).map((tk) => ({ titel: tk.titel, kategorie: tk.kategorie, sichtbarFuerKunde: true })) }
        : undefined,
    },
  });
  if (lead.status === "NEU" || lead.status === "KONTAKTIERT" || lead.status === "ANGEBOT") {
    await prisma.lead.update({ where: { id }, data: { status: "GEWONNEN" } });
  }
  await logActivity({ action: "admin.lead_converted", actorId: admin.id, targetType: "ServiceProject", targetId: sp.id, meta: { leadId: id, paket } });
  return json({ serviceProject: sp }, 201);
});
