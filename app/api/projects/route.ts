import { prisma } from "@/lib/db";
import { handler, json, parseBody } from "@/lib/api";
import { requireUserOrg } from "@/lib/auth/session";
import { assertCanCreateProject, assertCompetitorLimit } from "@/lib/billing/limits";
import { projectSchema } from "@/lib/validation";
import { generatePrompts } from "@/lib/scan/prompts";
import { logActivity } from "@/lib/activity";

export const GET = handler(async () => {
  const { org } = await requireUserOrg();
  const projects = await prisma.project.findMany({ where: { orgId: org.id }, orderBy: { createdAt: "asc" } });
  return json({ projects });
});

export const POST = handler(async (req) => {
  const { user, org } = await requireUserOrg();
  const data = await parseBody(req, projectSchema);
  const plan = await assertCanCreateProject(org.id);
  await assertCompetitorLimit(org.id, data.competitors.length);

  const prompts = await generatePrompts(
    {
      industry: data.industry,
      city: data.city,
      region: data.region,
      brandName: data.brandName,
      brandAliases: data.brandAliases,
      competitors: data.competitors,
      language: data.language,
    },
    30,
  );
  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        orgId: org.id,
        name: data.name,
        brandName: data.brandName,
        brandAliases: JSON.stringify(data.brandAliases),
        domain: data.domain,
        industry: data.industry,
        city: data.city,
        region: data.region || null,
        language: data.language,
        competitors: JSON.stringify(data.competitors.map((c) => ({ name: c.name, domain: c.domain || undefined }))),
      },
    });
    // Alle Vorschläge speichern, aber nur so viele aktiv wie der Plan erlaubt
    await tx.prompt.createMany({
      data: prompts.map((pr, idx) => ({
        projectId: p.id,
        stableId: pr.stableId,
        text: pr.text,
        category: pr.category,
        active: idx < plan.limits.promptsPerProject,
      })),
    });
    return p;
  });
  await logActivity({ action: "project.created", actorId: user.id, orgId: org.id, targetType: "Project", targetId: project.id });
  return json({ project }, 201);
});
