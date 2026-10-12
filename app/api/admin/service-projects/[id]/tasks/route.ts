import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, json, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { SERVICE_TASK_CATEGORIES, SERVICE_TASK_STATUS } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  titel: z.string().trim().min(2).max(300),
  beschreibung: z.string().max(10_000).optional(),
  kategorie: z.enum(SERVICE_TASK_CATEGORIES),
  status: z.enum(SERVICE_TASK_STATUS).default("OFFEN"),
  zugewiesenAn: z.string().trim().max(100).optional(),
  dueDate: z.string().date().optional().or(z.literal("")),
  sichtbarFuerKunde: z.boolean().default(true),
});

export const POST = handler<Ctx>(async (req, { params }) => {
  await requireAdmin();
  const id = (await params).id;
  const sp = await prisma.serviceProject.findUnique({ where: { id } });
  if (!sp) throw new ApiError(404, "Serviceprojekt nicht gefunden.");
  const data = await parseBody(req, schema);
  const task = await prisma.serviceTask.create({
    data: {
      serviceProjectId: id,
      titel: data.titel,
      beschreibung: data.beschreibung || null,
      kategorie: data.kategorie,
      status: data.status,
      zugewiesenAn: data.zugewiesenAn || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      sichtbarFuerKunde: data.sichtbarFuerKunde,
    },
  });
  return json({ task }, 201);
});
