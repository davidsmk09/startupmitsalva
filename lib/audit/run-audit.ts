import { crawlSite } from "@/lib/crawl/crawler";
import { runAllChecks } from "@/lib/audit/checks";
import type { AuditCheckResult } from "@/lib/audit/types";

/** Technischer Website-Check: Crawl (SSRF-geschützt) + alle Checks. */
export async function runTechnicalAudit(domain: string, _ctx: { brandName?: string } = {}): Promise<AuditCheckResult[]> {
  const crawl = await crawlSite(domain, { maxPages: 15, respectRobots: false });
  return runAllChecks(crawl);
}
