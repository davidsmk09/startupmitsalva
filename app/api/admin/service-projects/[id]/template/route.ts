import { prisma } from "@/lib/db";
import { ApiError, handler, json } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { defaultServiceTasks } from "@/lib/service-templates";

type Ctx = { params: Promise<{ id: string }> };

/** Standard-Tasks des Pakets ergänzen (bestehende Titel werden übersprungen). */
export const POST = handler<Ctx>(async (_req, { params }) => {
  await requireAdmin();
  const id = (await params).id;
  const sp = await prisma.serviceProject.findUnique({ where: { id }, include: { tasks: true } });
  if (!sp) throw new ApiError(404, "Serviceprojekt nicht gefunden.");
  const existing = new Set(sp.tasks.map((t) => t.titel));
  const fresh = defaultServiceTasks(sp.paket).filter((t) => !existing.has(t.titel));
  if (fresh.length) {
    await prisma.serviceTask.createMany({ data: fresh.map((t) => ({ serviceProjectId: id, titel: t.titel, kategorie: t.kategorie })) });
  }
  return json({ added: fresh.length });
});
