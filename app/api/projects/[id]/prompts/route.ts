import { prisma } from "@/lib/db";
import { handler, json, parseBody } from "@/lib/api";
import { assertProjectAccess, requireUser } from "@/lib/auth/session";
import { assertPromptLimit } from "@/lib/billing/limits";
import { promptSchema } from "@/lib/validation";
import { containsBrand } from "@/lib/scan/prompts";
import { ApiError } from "@/lib/api";
import { parseJson } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const project = await assertProjectAccess(user.id, user.role, (await params).id);
  const prompts = await prisma.prompt.findMany({ where: { projectId: project.id }, orderBy: { stableId: "asc" } });
  return json({ prompts });
});

/** Eigenen Prompt ergänzen (stabile ID "usr-XX"). */
export const POST = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const project = await assertProjectAccess(user.id, user.role, (await params).id);
  const data = await parseBody(req, promptSchema);
  if (data.category !== "MARKE" && containsBrand(data.text, { brandName: project.brandName, brandAliases: parseJson(project.brandAliases, []) })) {
    throw new ApiError(422, "Markenneutrale Prompts dürfen den Markennamen nicht enthalten. Nutze dafür die Kategorie „Marke“.", "VALIDATION", {
      text: "Enthält den Markennamen.",
    });
  }
  await assertPromptLimit(project.orgId, project.id, 1);
  const count = await prisma.prompt.count({ where: { projectId: project.id, stableId: { startsWith: "usr-" } } });
  let n = count + 1;
  while (await prisma.prompt.findUnique({ where: { projectId_stableId: { projectId: project.id, stableId: `usr-${String(n).padStart(2, "0")}` } } })) n++;
  const prompt = await prisma.prompt.create({
    data: {
      projectId: project.id,
      stableId: `usr-${String(n).padStart(2, "0")}`,
      text: data.text,
      category: data.category,
      source: "USER",
      active: true,
    },
  });
  return json({ prompt }, 201);
});
