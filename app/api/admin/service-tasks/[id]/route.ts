import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, json, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { SERVICE_TASK_CATEGORIES, SERVICE_TASK_STATUS } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  titel: z.string().trim().min(2).max(300).optional(),
  beschreibung: z.string().max(10_000).nullable().optional(),
  kategorie: z.enum(SERVICE_TASK_CATEGORIES).optional(),
  status: z.enum(SERVICE_TASK_STATUS).optional(),
  zugewiesenAn: z.string().trim().max(100).nullable().optional(),
  dueDate: z.string().date().nullable().optional().or(z.literal("")),
  sichtbarFuerKunde: z.boolean().optional(),
});

export const PATCH = handler<Ctx>(async (req, { params }) => {
  await requireAdmin();
  const id = (await params).id;
  const { dueDate, ...data } = await parseBody(req, schema);
  const task = await prisma.serviceTask.update({
    where: { id },
    data: { ...data, ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}) },
  });
  return json({ task });
});

export const DELETE = handler<Ctx>(async (_req, { params }) => {
  await requireAdmin();
  await prisma.serviceTask.delete({ where: { id: (await params).id } });
  return json({ ok: true });
});
