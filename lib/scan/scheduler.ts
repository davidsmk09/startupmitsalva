import { prisma } from "@/lib/db";
import { getOrgPlan, getUsage, monthlyBudgetCents } from "@/lib/billing/limits";
import { createProjectScan } from "@/lib/scan/service";
import { logger, errorMessage } from "@/lib/logger";

const DAY = 24 * 3600_000;

/**
 * Plant automatische Scans für alle berechtigten Projekte.
 * WEEKLY: Pläne mit weeklyScans, max. 1 je Projekt in 6,5 Tagen.
 * DAILY: Pläne mit dailyTopPrompts, nur Projekte mit Top-Prompts, max. 1 je 20 h.
 */
export async function scheduleAutomaticScans(type: "WEEKLY" | "DAILY") {
  const minGap = type === "WEEKLY" ? 6.5 * DAY : 20 * 3600_000;
  const projects = await prisma.project.findMany({ select: { id: true, orgId: true, name: true } });
  const result = { queued: 0, skipped: 0, errors: 0 };
  const planCache = new Map<string, Awaited<ReturnType<typeof getOrgPlan>>>();

  for (const p of projects) {
    try {
      const plan = planCache.get(p.orgId) ?? (await getOrgPlan(p.orgId));
      planCache.set(p.orgId, plan);
      const allowed = type === "WEEKLY" ? plan.limits.weeklyScans : plan.limits.dailyTopPrompts;
      if (!allowed) {
        result.skipped++;
        continue;
      }
      const recent = await prisma.scan.findFirst({
        where: { projectId: p.id, type, createdAt: { gt: new Date(Date.now() - minGap) } },
      });
      const running = await prisma.scan.count({ where: { projectId: p.id, status: { in: ["QUEUED", "RUNNING"] } } });
      if (recent || running) {
        result.skipped++;
        continue;
      }
      const [usage, budget] = await Promise.all([getUsage(p.orgId), monthlyBudgetCents(p.orgId)]);
      if (usage.costCents >= budget) {
        result.skipped++;
        continue;
      }
      const hasPrompts = await prisma.prompt.count({ where: { projectId: p.id, active: true, ...(type === "DAILY" ? { isTop: true } : {}) } });
      if (!hasPrompts) {
        result.skipped++;
        continue;
      }
      await createProjectScan({ projectId: p.id, orgId: p.orgId, type, countUsage: false });
      result.queued++;
    } catch (err) {
      result.errors++;
      logger.error("scheduler.failed", { projectId: p.id, error: errorMessage(err) });
    }
  }
  logger.info("scheduler.done", { type, ...result });
  return result;
}
