import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { enqueueJob } from "@/lib/jobs/queue";
import { incrementUsage } from "@/lib/billing/limits";
import type { QuickInput } from "@/lib/scan/run-scan";

/** Legt einen Projekt-Scan an und reiht ihn in die Queue ein. */
export async function createProjectScan(input: { projectId: string; orgId: string; type: "FULL" | "WEEKLY" | "DAILY"; countUsage: boolean }) {
  const activePrompts = await prisma.prompt.count({
    where: { projectId: input.projectId, active: true, ...(input.type === "DAILY" ? { isTop: true } : {}) },
  });
  if (activePrompts === 0) {
    throw new Error("Keine aktiven Prompts vorhanden.");
  }
  const scan = await prisma.scan.create({ data: { projectId: input.projectId, type: input.type, status: "QUEUED" } });
  if (input.countUsage) await incrementUsage(input.orgId, { scans: 1 });
  await enqueueJob("SCAN", { scanId: scan.id });
  return scan;
}

/** Gratis-Check (ohne Login): Quick-Scan mit öffentlichem Token. */
export async function createQuickScan(input: QuickInput & { leadId: string }) {
  const publicToken = randomBytes(18).toString("base64url");
  const scan = await prisma.scan.create({
    data: {
      type: "QUICK",
      status: "QUEUED",
      leadId: input.leadId,
      publicToken,
      quickInputJson: JSON.stringify({
        domain: input.domain,
        brandName: input.brandName,
        industry: input.industry,
        city: input.city,
        email: input.email,
      }),
    },
  });
  await enqueueJob("SCAN", { scanId: scan.id }, { maxAttempts: 1 });
  return scan;
}
