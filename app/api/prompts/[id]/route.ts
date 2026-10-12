import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, json, parseBody } from "@/lib/api";
import { assertProjectAccess, requireUser } from "@/lib/auth/session";
import { assertPromptLimit, assertTopPromptLimit } from "@/lib/billing/limits";
import { PROMPT_CATEGORIES } from "@/lib/constants";
import { containsBrand } from "@/lib/scan/prompts";
import { parseJson } from "@/lib/utils";
import { t } from "@/lib/i18n";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  text: z.string().trim().min(5).max(500).optional(),
  category: z.enum(PROMPT_CATEGORIES).optional(),
  active: z.boolean().optional(),
  isTop: z.boolean().optional(),
});

async function load(id: string) {
  const user = await requireUser();
  const prompt = await prisma.prompt.findUnique({ where: { id } });
  if (!prompt) throw new ApiError(404, t.common.notFound);
  const project = await assertProjectAccess(user.id, user.role, prompt.projectId);
  return { prompt, project };
}

export const PATCH = handler<Ctx>(async (req, { params }) => {
  const { prompt, project } = await load((await params).id);
  const data = await parseBody(req, patchSchema);
  const category = data.category ?? prompt.category;
  const text = data.text ?? prompt.text;
  if (category !== "MARKE" && containsBrand(text, { brandName: project.brandName, brandAliases: parseJson(project.brandAliases, []) })) {
    throw new ApiError(422, "Markenneutrale Prompts dürfen den Markennamen nicht enthalten.", "VALIDATION", { text: "Enthält den Markennamen." });
  }
  if (data.active === true && !prompt.active) await assertPromptLimit(project.orgId, project.id, 1);
  if (data.isTop === true && !prompt.isTop) await assertTopPromptLimit(project.orgId, project.id);
  // Text-Änderung behält die stabile ID (bewusst: Nutzer verantwortet Vergleichbarkeit)
  const updated = await prisma.prompt.update({ where: { id: prompt.id }, data: { ...data } });
  return json({ prompt: updated });
});

export const DELETE = handler<Ctx>(async (_req, { params }) => {
  const { prompt } = await load((await params).id);
  // Löschen = deaktivieren, damit historische Läufe ihren Bezug behalten
  await prisma.prompt.update({ where: { id: prompt.id }, data: { active: false, isTop: false } });
  return json({ ok: true });
});
