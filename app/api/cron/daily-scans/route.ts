import { handler, json } from "@/lib/api";
import { assertCronAuth } from "@/lib/security/cron";
import { scheduleAutomaticScans } from "@/lib/scan/scheduler";

export const dynamic = "force-dynamic";

/** Tägliche Scans für Top-Prompts (Agentur-Plan). */
async function run(req: Request) {
  assertCronAuth(req);
  return json(await scheduleAutomaticScans("DAILY"));
}
export const GET = handler(run);
export const POST = handler(run);
