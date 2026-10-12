import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/api";
import { effectivePlanKey, getPlan, type Plan } from "@/lib/billing/plans";
import { currentMonth } from "@/lib/utils";

/**
 * Serverseitige Durchsetzung der Plan-Limits. Wird bei JEDER relevanten
 * Aktion aufgerufen (nicht nur im UI).
 */
export async function getOrgPlan(orgId: string): Promise<Plan> {
  const sub = await prisma.subscription.findUnique({ where: { orgId } });
  return getPlan(effectivePlanKey(sub));
}

export async function getUsage(orgId: string, month = currentMonth()) {
  return prisma.usageCounter.upsert({
    where: { orgId_month: { orgId, month } },
    create: { orgId, month },
    update: {},
  });
}

export async function incrementUsage(orgId: string, delta: { scans?: number; promptRuns?: number; costCents?: number }) {
  const month = currentMonth();
  await prisma.usageCounter.upsert({
    where: { orgId_month: { orgId, month } },
    create: { orgId, month, scans: delta.scans ?? 0, promptRuns: delta.promptRuns ?? 0, costCents: Math.ceil(delta.costCents ?? 0) },
    update: {
      scans: { increment: delta.scans ?? 0 },
      promptRuns: { increment: delta.promptRuns ?? 0 },
      costCents: { increment: Math.ceil(delta.costCents ?? 0) },
    },
  });
}

export async function monthlyBudgetCents(orgId: string): Promise<number> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (org?.monthlyBudgetCents) return org.monthlyBudgetCents;
  const plan = await getOrgPlan(orgId);
  return plan.limits.monthlyBudgetCents || env.monthlyBudgetCentsDefault;
}

function limitError(message: string) {
  return new ApiError(402, `${message} Für mehr Kapazität wechsle in einen größeren Plan.`, "LIMIT");
}

export async function assertCanCreateProject(orgId: string) {
  const plan = await getOrgPlan(orgId);
  const count = await prisma.project.count({ where: { orgId } });
  if (count >= plan.limits.projects) {
    throw limitError(`Dein Plan „${plan.name}“ erlaubt ${plan.limits.projects} Projekt(e).`);
  }
  return plan;
}

export async function assertCompetitorLimit(orgId: string, competitorCount: number) {
  const plan = await getOrgPlan(orgId);
  if (competitorCount > plan.limits.competitors) {
    throw limitError(
      plan.limits.competitors === 0
        ? `Der Wettbewerbsvergleich ist im Plan „${plan.name}“ nicht enthalten.`
        : `Dein Plan erlaubt maximal ${plan.limits.competitors} Wettbewerber.`,
    );
  }
}

export async function assertPromptLimit(orgId: string, projectId: string, additionalActive: number) {
  const plan = await getOrgPlan(orgId);
  const active = await prisma.prompt.count({ where: { projectId, active: true } });
  if (active + additionalActive > plan.limits.promptsPerProject) {
    throw limitError(`Dein Plan erlaubt ${plan.limits.promptsPerProject} aktive Prompts pro Projekt.`);
  }
  return plan;
}

export async function assertTopPromptLimit(orgId: string, projectId: string) {
  const plan = await getOrgPlan(orgId);
  const top = await prisma.prompt.count({ where: { projectId, isTop: true } });
  if (!plan.limits.dailyTopPrompts || top >= plan.limits.maxTopPrompts) {
    throw limitError(
      plan.limits.dailyTopPrompts
        ? `Maximal ${plan.limits.maxTopPrompts} Top-Prompts.`
        : "Tägliche Scans für Top-Prompts sind im Agentur-Plan enthalten.",
    );
  }
}

export async function assertCanStartManualScan(orgId: string) {
  const plan = await getOrgPlan(orgId);
  const usage = await getUsage(orgId);
  if (usage.scans >= plan.limits.manualScansPerMonth) {
    throw limitError(`Du hast diesen Monat bereits ${usage.scans} von ${plan.limits.manualScansPerMonth} Scans genutzt.`);
  }
  const budget = await monthlyBudgetCents(orgId);
  if (usage.costCents >= budget) {
    throw new ApiError(402, "Das monatliche API-Budget deiner Organisation ist ausgeschöpft.", "BUDGET");
  }
  return plan;
}
