import { handler, json } from "@/lib/api";
import { assertCronAuth } from "@/lib/security/cron";
import { scheduleAutomaticScans } from "@/lib/scan/scheduler";

export const dynamic = "force-dynamic";

/** Wöchentliche Scans einplanen. Aufruf z. B. per Vercel Cron oder crontab (GET/POST mit Bearer CRON_SECRET). */
async function run(req: Request) {
  assertCronAuth(req);
  return json(await scheduleAutomaticScans("WEEKLY"));
}
export const GET = handler(run);
export const POST = handler(run);
