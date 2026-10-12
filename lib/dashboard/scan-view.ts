import { prisma } from "@/lib/db";
import { buildRecommendations, executiveSummary } from "@/lib/recommendations";
import type { ScanMetrics } from "@/lib/scan/scoring";
import type { CompetitorMention } from "@/lib/scan/parser";
import { parseJson } from "@/lib/utils";

export type ScanRunView = {
  id: string;
  promptStableId: string;
  promptText: string;
  promptCategory: string;
  provider: string;
  runIndex: number;
  answerText: string;
  citations: { url: string; title?: string }[];
  brandMentioned: boolean;
  brandCited: boolean;
  mentionPosition: number | null;
  competitorMentions: CompetitorMention[];
  sentiment: string | null;
  error: string | null;
};

/** Bereitet einen abgeschlossenen Scan für UI/PDF auf. */
export async function loadScanView(scanId: string) {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { project: true, auditResults: true, runs: { orderBy: [{ promptStableId: "asc" }, { provider: "asc" }, { runIndex: "asc" }] } },
  });
  if (!scan) return null;
  const metrics = parseJson<ScanMetrics | null>(scan.metricsJson, null);
  const project = scan.project ?? {
    ...parseJson<{ brandName: string; domain: string; industry: string; city: string }>(scan.quickInputJson, {
      brandName: "",
      domain: "",
      industry: "",
      city: "",
    }),
    name: "Gratis-Check",
    competitors: "[]",
    brandAliases: "[]",
  };
  const audit = scan.auditResults.sort((a, b) => {
    const order: Record<string, number> = { FAIL: 0, WARN: 1, PASS: 2, INFO: 3 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9) || b.weight - a.weight;
  });
  const recommendations = buildRecommendations({ audit, metrics, project });
  const runs: ScanRunView[] = scan.runs.map((r) => ({
    id: r.id,
    promptStableId: r.promptStableId,
    promptText: r.promptText,
    promptCategory: r.promptCategory,
    provider: r.provider,
    runIndex: r.runIndex,
    answerText: r.answerText,
    citations: parseJson(r.citationsJson, []),
    brandMentioned: r.brandMentioned,
    brandCited: r.brandCited,
    mentionPosition: r.mentionPosition,
    competitorMentions: parseJson(r.competitorMentionsJson, []),
    sentiment: r.sentiment,
    error: r.error,
  }));
  const summary = executiveSummary({
    brandName: project.brandName,
    overall: scan.overallScore,
    visibility: scan.visibilityScore,
    technical: scan.technicalScore,
    margin: scan.visibilityMargin,
    metrics,
    recommendations,
  });
  return {
    scan,
    project,
    metrics,
    audit: audit.map((a) => ({ ...a, data: parseJson<Record<string, unknown> | null>(a.dataJson, null) })),
    recommendations,
    runs,
    summary,
    brandNames: [project.brandName, ...parseJson<string[]>(project.brandAliases, [])],
    competitorNames: parseJson<{ name: string }[]>(project.competitors, []).map((c) => c.name),
  };
}

export type ScanView = NonNullable<Awaited<ReturnType<typeof loadScanView>>>;
