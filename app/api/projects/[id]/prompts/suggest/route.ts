import { prisma } from "@/lib/db";
import { handler, json } from "@/lib/api";
import { assertProjectAccess, requireUser } from "@/lib/auth/session";
import { getOrgPlan } from "@/lib/billing/limits";
import { generatePrompts, mergeSuggestions } from "@/lib/scan/prompts";
import { parseJson } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

/**
 * "Prompts neu vorschlagen": bestehende Prompts und ihre stabilen IDs bleiben
 * unverändert. Neue Vorschläge werden inaktiv angelegt (Limit bleibt gewahrt),
 * der Nutzer aktiviert sie bei Bedarf.
 */
export const POST = handler<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const project = await assertProjectAccess(user.id, user.role, (await params).id);
  const plan = await getOrgPlan(project.orgId);
  const existing = await prisma.prompt.findMany({ where: { projectId: project.id } });
  const suggestions = await generatePrompts(
    {
      industry: project.industry,
      city: project.city,
      region: project.region,
      brandName: project.brandName,
      brandAliases: parseJson(project.brandAliases, []),
      language: project.language,
    },
    30,
  );
  const maxTotal = plan.limits.promptsPerProject * 2;
  const fresh = mergeSuggestions(existing, suggestions, Math.max(0, Math.min(10, maxTotal - existing.length)));
  if (fresh.length) {
    await prisma.prompt.createMany({
      data: fresh.map((p) => ({ projectId: project.id, stableId: p.stableId, text: p.text, category: p.category, active: false })),
    });
  }
  return json({ added: fresh.length });
});
