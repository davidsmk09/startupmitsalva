import { hostname } from "node:os";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logger, errorMessage } from "@/lib/logger";

/**
 * Einfache, DB-gestützte Job-Queue (kein Redis nötig).
 * - Worker (`npm run worker`) pollt nach fälligen Jobs.
 * - Claim ist atomar (updateMany mit Status-Bedingung).
 * - JOB_MODE=inline verarbeitet Jobs direkt im Web-Prozess (Demo/ohne Worker).
 */
export type JobType = "SCAN";
export type ScanJobPayload = { scanId: string };

const STALE_LOCK_MS = 20 * 60_000;

export async function enqueueJob(type: JobType, payload: ScanJobPayload, opts: { runAt?: Date; maxAttempts?: number } = {}) {
  const job = await prisma.job.create({
    data: {
      type,
      payloadJson: JSON.stringify(payload),
      runAt: opts.runAt ?? new Date(),
      maxAttempts: opts.maxAttempts ?? 2,
    },
  });
  if (env.jobMode === "inline") {
    // Nicht awaiten: Request soll sofort antworten
    setTimeout(() => {
      void claimJob(job.id, `inline-${process.pid}`).then((claimed) => (claimed ? processJob(claimed) : undefined));
    }, 10);
  }
  return job;
}

async function claimJob(id: string, workerId: string) {
  const res = await prisma.job.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "RUNNING", lockedAt: new Date(), lockedBy: workerId, attempts: { increment: 1 } },
  });
  if (res.count !== 1) return null;
  return prisma.job.findUnique({ where: { id } });
}

/** Gibt Jobs frei, deren Worker abgestürzt ist (Lock zu alt). */
export async function releaseStaleJobs() {
  const res = await prisma.job.updateMany({
    where: { status: "RUNNING", lockedAt: { lt: new Date(Date.now() - STALE_LOCK_MS) } },
    data: { status: "PENDING", lockedAt: null, lockedBy: null },
  });
  if (res.count) logger.warn("jobs.released_stale", { count: res.count });
}

export async function claimNextJob(workerId = `${hostname()}-${process.pid}`) {
  const candidates = await prisma.job.findMany({
    where: { status: "PENDING", runAt: { lte: new Date() } },
    orderBy: [{ runAt: "asc" }, { createdAt: "asc" }],
    take: 5,
    select: { id: true },
  });
  for (const c of candidates) {
    const job = await claimJob(c.id, workerId);
    if (job) return job;
  }
  return null;
}

type JobRecord = NonNullable<Awaited<ReturnType<typeof claimJob>>>;

export async function processJob(job: JobRecord) {
  const started = Date.now();
  try {
    if (job.type === "SCAN") {
      const { scanId } = JSON.parse(job.payloadJson) as ScanJobPayload;
      const { executeScan } = await import("@/lib/scan/run-scan");
      await executeScan(scanId);
    } else {
      throw new Error(`Unbekannter Job-Typ: ${job.type}`);
    }
    await prisma.job.update({ where: { id: job.id }, data: { status: "DONE", lockedAt: null, lastError: null } });
    logger.info("jobs.done", { jobId: job.id, type: job.type, ms: Date.now() - started });
  } catch (err) {
    const message = errorMessage(err);
    const retry = job.attempts < job.maxAttempts;
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: retry ? "PENDING" : "FAILED",
        lastError: message.slice(0, 1000),
        lockedAt: null,
        runAt: new Date(Date.now() + 30_000 * job.attempts),
      },
    });
    logger.error("jobs.failed", { jobId: job.id, type: job.type, attempt: job.attempts, retry, error: message });
    if (!retry && job.type === "SCAN") {
      const { scanId } = JSON.parse(job.payloadJson) as ScanJobPayload;
      await prisma.scan.updateMany({
        where: { id: scanId, status: { in: ["QUEUED", "RUNNING"] } },
        data: { status: "FAILED", error: `Technischer Fehler: ${message.slice(0, 300)}`, finishedAt: new Date(), phase: "FERTIG" },
      });
    }
  }
}
