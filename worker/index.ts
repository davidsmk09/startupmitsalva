/**
 * Worker-Prozess: verarbeitet Jobs aus der DB-Queue.
 * Start: `npm run worker`
 */
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 2000);
const CONCURRENCY = Math.max(1, Number(process.env.WORKER_CONCURRENCY ?? 2));

async function main() {
  const { claimNextJob, processJob, releaseStaleJobs } = await import("@/lib/jobs/queue");
  const { logger } = await import("@/lib/logger");
  const { prisma } = await import("@/lib/db");

  let stopping = false;
  let active = 0;
  const stop = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info("worker.stopping", { signal, active });
    const deadline = Date.now() + 30_000;
    while (active > 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 250));
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void stop("SIGINT"));
  process.on("SIGTERM", () => void stop("SIGTERM"));

  logger.info("worker.started", { pollMs: POLL_MS, concurrency: CONCURRENCY });
  let lastStaleCheck = 0;

  while (!stopping) {
    try {
      if (Date.now() - lastStaleCheck > 60_000) {
        await releaseStaleJobs();
        lastStaleCheck = Date.now();
      }
      let claimedAny = false;
      while (active < CONCURRENCY && !stopping) {
        const job = await claimNextJob();
        if (!job) break;
        claimedAny = true;
        active++;
        void processJob(job).finally(() => {
          active--;
        });
      }
      if (!claimedAny) await new Promise((r) => setTimeout(r, POLL_MS));
      else await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      logger.error("worker.loop_error", { error: err instanceof Error ? err.message : String(err) });
      await new Promise((r) => setTimeout(r, POLL_MS * 2));
    }
  }
}

void main();
