import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logger, errorMessage } from "@/lib/logger";
import { getOrgPlan, getUsage, incrementUsage, monthlyBudgetCents } from "@/lib/billing/limits";
import { PLANS } from "@/lib/billing/plans";
import { costPer1kCents, resolveProviders, type ResolvedProvider } from "@/lib/providers";
import { Semaphore, withRetry } from "@/lib/providers/util";
import type { MockContext } from "@/lib/providers/types";
import { analyzeAnswer } from "@/lib/scan/parser";
import { generateTemplatePrompts } from "@/lib/scan/prompts";
import { buildMetrics, computeOverall, computeTechnicalScore, type RunForScoring } from "@/lib/scan/scoring";
import { classifySentiment, verifyMention } from "@/lib/scan/sentiment";
import { runTechnicalAudit } from "@/lib/audit/run-audit";
import type { AuditCheckResult } from "@/lib/audit/types";
import { afterScanCompleted } from "@/lib/scan/notify";
import { parseJson } from "@/lib/utils";

/** Geschätzte Tokens pro Abfrage für die Budget-Vorabprüfung. */
const EST_TOKENS_PER_CALL = 1500;

type ScanTarget = {
  orgId: string | null;
  brandName: string;
  aliases: string[];
  domain: string;
  industry: string;
  city: string;
  region: string | null;
  language: string;
  competitors: { name: string; domain?: string }[];
  prompts: { id: string | null; stableId: string; text: string; category: string }[];
  maxProviders: number;
  runsPerPrompt: number;
};

export type QuickInput = { domain: string; brandName: string; industry: string; city: string; email: string };

async function loadTarget(scan: { id: string; type: string; projectId: string | null; quickInputJson: string | null }): Promise<ScanTarget> {
  if (scan.type === "QUICK" || !scan.projectId) {
    const q = parseJson<QuickInput | null>(scan.quickInputJson, null);
    if (!q) throw new Error("Gratis-Check ohne Eingabedaten.");
    const prompts = generateTemplatePrompts({ industry: q.industry, city: q.city, brandName: q.brandName }, 30).filter(
      (p) => p.category !== "MARKE",
    );
    // 5 Prompts, ausgewogen über Kategorien
    const order = ["KATEGORIE", "EMPFEHLUNG", "VERGLEICH", "LOKAL", "EMPFEHLUNG"];
    const used = new Set<string>();
    const picked = order
      .map((cat) => prompts.find((p) => p.category === cat && !used.has(p.stableId) && used.add(p.stableId)))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    return {
      orgId: null,
      brandName: q.brandName,
      aliases: [],
      domain: q.domain,
      industry: q.industry,
      city: q.city,
      region: null,
      language: "de",
      competitors: [],
      prompts: picked.map((p) => ({ id: null, ...p })),
      maxProviders: 1,
      runsPerPrompt: Math.min(env.scanRunsPerPrompt, 2),
    };
  }

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: scan.projectId },
    include: { prompts: { where: { active: true }, orderBy: { stableId: "asc" } } },
  });
  const plan = await getOrgPlan(project.orgId);
  let prompts = project.prompts;
  if (scan.type === "DAILY") prompts = prompts.filter((p) => p.isTop);
  // Limit auch hier erzwingen (z. B. nach Downgrade)
  prompts = prompts.slice(0, plan.limits.promptsPerProject);
  return {
    orgId: project.orgId,
    brandName: project.brandName,
    aliases: parseJson<string[]>(project.brandAliases, []),
    domain: project.domain,
    industry: project.industry,
    city: project.city,
    region: project.region,
    language: project.language,
    competitors: plan.features.competitorComparison
      ? parseJson<{ name: string; domain?: string }[]>(project.competitors, []).slice(0, plan.limits.competitors)
      : [],
    prompts: prompts.map((p) => ({ id: p.id, stableId: p.stableId, text: p.text, category: p.category })),
    maxProviders: plan.limits.providers,
    runsPerPrompt: env.scanRunsPerPrompt,
  };
}

export type ExecuteScanOptions = {
  /** Nur Mock/Seed: verschiebt die simulierte Sichtbarkeit */
  mockBias?: number;
  /** Nur Seed/Tests: vorgegebene Audit-Ergebnisse statt echter Website-Abfrage */
  auditResults?: AuditCheckResult[];
  /** Benachrichtigungen (E-Mail) unterdrücken */
  silent?: boolean;
};

async function setPhase(scanId: string, phase: string, extra: Record<string, unknown> = {}) {
  await prisma.scan.update({ where: { id: scanId }, data: { phase, ...extra } });
}

/**
 * Führt einen Scan vollständig aus: Technik-Check → KI-Abfragen (N Läufe je
 * Prompt × Provider) → Auswertung → Scoring. Ein ausgefallener Provider lässt
 * den Scan nicht scheitern (Teilergebnis, klar markiert).
 */
export async function executeScan(scanId: string, opts: ExecuteScanOptions = {}): Promise<void> {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) throw new Error(`Scan ${scanId} nicht gefunden`);
  if (scan.status === "COMPLETED") return;

  // Wiederaufnahme nach Absturz: alte Teilergebnisse verwerfen
  await prisma.scanRun.deleteMany({ where: { scanId } });
  await prisma.auditResult.deleteMany({ where: { scanId } });

  const target = await loadTarget(scan);
  await setPhase(scanId, "TECHNIK", { status: "RUNNING", startedAt: new Date(), error: null });

  // ---- 1) Technik-Check -------------------------------------------------
  let auditResults: AuditCheckResult[] = [];
  try {
    auditResults = opts.auditResults ?? (await runTechnicalAudit(target.domain, { brandName: target.brandName }));
  } catch (err) {
    logger.warn("scan.audit_failed", { scanId, error: errorMessage(err) });
  }
  if (auditResults.length) {
    await prisma.auditResult.createMany({
      data: auditResults.map((r) => ({
        scanId,
        checkKey: r.checkKey,
        title: r.title,
        status: r.status,
        weight: r.weight,
        details: r.details,
        recommendation: r.recommendation,
        dataJson: r.data ? JSON.stringify(r.data) : null,
      })),
    });
  }

  // ---- 2) KI-Abfragen ---------------------------------------------------
  const providers: ResolvedProvider[] = resolveProviders(target.maxProviders);
  const isDemo = providers.some((p) => p.id.startsWith("mock"));
  const tasks: { provider: ResolvedProvider; prompt: ScanTarget["prompts"][number]; runIndex: number }[] = [];
  for (const prompt of target.prompts)
    for (const provider of providers)
      for (let runIndex = 0; runIndex < target.runsPerPrompt; runIndex++) tasks.push({ provider, prompt, runIndex });

  await setPhase(scanId, "KI_ABFRAGEN", {
    totalRuns: tasks.length,
    doneRuns: 0,
    isDemo,
    providersJson: JSON.stringify(providers.map((p) => p.id)),
  });

  // Budget-Deckel pro Org/Monat
  let budgetLeft = Number.POSITIVE_INFINITY;
  if (target.orgId) {
    const [usage, budget] = await Promise.all([getUsage(target.orgId), monthlyBudgetCents(target.orgId)]);
    budgetLeft = budget - usage.costCents;
    const estimate = tasks.reduce((s, tk) => s + (EST_TOKENS_PER_CALL / 1000) * costPer1kCents(tk.provider.id), 0);
    if (estimate > budgetLeft) {
      const msg = `Abgebrochen: Das monatliche API-Budget reicht für diesen Scan nicht aus (geschätzt ${Math.ceil(estimate)} Cent, verfügbar ${Math.max(0, Math.floor(budgetLeft))} Cent).`;
      await prisma.scan.update({ where: { id: scanId }, data: { status: "FAILED", error: msg, finishedAt: new Date(), phase: "FERTIG" } });
      return;
    }
  } else {
    budgetLeft = PLANS.free.limits.monthlyBudgetCents; // Gratis-Check: harter Deckel pro Scan
  }

  const mockContext: MockContext = {
    brandName: target.brandName,
    domain: target.domain,
    industry: target.industry,
    city: target.city,
    competitors: target.competitors,
    bias: opts.mockBias,
    salt: scanId,
  };
  const semaphores = new Map(providers.map((p) => [p.id, new Semaphore(p.id.startsWith("mock") ? 8 : 3)]));
  let costCents = 0;
  let budgetExceeded = false;
  const brand = { name: target.brandName, aliases: target.aliases, domain: target.domain };

  const results = await Promise.all(
    tasks.map(({ provider, prompt, runIndex }) =>
      semaphores.get(provider.id)!.run(async () => {
        const base = {
          scanId,
          promptId: prompt.id,
          promptStableId: prompt.stableId,
          promptText: prompt.text,
          promptCategory: prompt.category,
          provider: provider.id,
          runIndex,
        };
        if (costCents >= budgetLeft) {
          budgetExceeded = true;
          const run = await prisma.scanRun.create({ data: { ...base, error: "Budget-Deckel erreicht – Abfrage übersprungen." } });
          await prisma.scan.update({ where: { id: scanId }, data: { doneRuns: { increment: 1 } } });
          return { run, citedDomains: [] as string[] };
        }
        try {
          const answer = await withRetry(() =>
            provider.provider.ask(prompt.text, {
              language: target.language,
              region: target.region ?? target.city,
              mockContext: { ...mockContext, salt: `${scanId}:${runIndex}` },
            }),
          );
          const analysis = analyzeAnswer(answer, brand, target.competitors);
          let brandMentioned = analysis.brandMentioned;
          if (brandMentioned && !analysis.brandMentionExact) {
            const verified = await verifyMention(answer.text, target.brandName, target.aliases);
            if (verified !== null) brandMentioned = verified;
          }
          const runCost = ((answer.tokens ?? 0) / 1000) * costPer1kCents(provider.id);
          costCents += runCost;
          const run = await prisma.scanRun.create({
            data: {
              ...base,
              answerText: answer.text,
              citationsJson: JSON.stringify(answer.citations),
              brandMentioned,
              brandCited: analysis.brandCited,
              mentionPosition: brandMentioned ? analysis.mentionPosition : null,
              competitorMentionsJson: JSON.stringify(analysis.competitorMentions),
              rawJson: JSON.stringify(answer.raw).slice(0, 100_000),
              tokens: answer.tokens ?? null,
              costCents: runCost,
              latencyMs: answer.latencyMs,
            },
          });
          await prisma.scan.update({ where: { id: scanId }, data: { doneRuns: { increment: 1 } } });
          return { run, citedDomains: analysis.citedDomains };
        } catch (err) {
          const run = await prisma.scanRun.create({ data: { ...base, error: errorMessage(err).slice(0, 500) } });
          await prisma.scan.update({ where: { id: scanId }, data: { doneRuns: { increment: 1 } } });
          logger.warn("scan.run_failed", { scanId, provider: provider.id, error: errorMessage(err) });
          return { run, citedDomains: [] as string[] };
        }
      }),
    ),
  );

  // ---- 3) Auswertung ----------------------------------------------------
  await setPhase(scanId, "AUSWERTUNG");

  // Sentiment (experimentell, nur mit Key; fließt nicht in den Score ein)
  const sentimentSem = new Semaphore(3);
  await Promise.all(
    results
      .filter((r) => r.run.brandMentioned && !r.run.error)
      .map((r) =>
        sentimentSem.run(async () => {
          const s = await classifySentiment(r.run.answerText, target.brandName);
          if (s) await prisma.scanRun.update({ where: { id: r.run.id }, data: { sentiment: s } });
        }),
      ),
  );

  const scoringRuns: (RunForScoring & { citedDomains: string[] })[] = results.map(({ run, citedDomains }) => ({
    provider: run.provider,
    promptStableId: run.promptStableId,
    promptCategory: run.promptCategory,
    runIndex: run.runIndex,
    brandMentioned: run.brandMentioned,
    brandCited: run.brandCited,
    mentionPosition: run.mentionPosition,
    competitorMentions: parseJson(run.competitorMentionsJson, []),
    error: run.error,
    citedDomains,
  }));
  const metrics = buildMetrics(scoringRuns, {
    brandName: target.brandName,
    domain: target.domain,
    hasCompetitors: target.competitors.length > 0,
  });

  const failedProviders = Object.entries(metrics.byProvider).filter(([, m]) => m.runs === 0).map(([p]) => p);
  const allFailed = metrics.overall.runs === 0;
  const technicalScore = computeTechnicalScore(auditResults);
  const visibilityScore = allFailed ? null : metrics.overall.score;

  const notes: string[] = [];
  if (failedProviders.length) notes.push(`Nicht erreichbar: ${failedProviders.join(", ")}.`);
  if (budgetExceeded) notes.push("Budget-Deckel erreicht – einige Abfragen wurden übersprungen.");

  await prisma.scan.update({
    where: { id: scanId },
    data: {
      status: allFailed ? "FAILED" : "COMPLETED",
      phase: "FERTIG",
      finishedAt: new Date(),
      visibilityScore,
      visibilityMargin: metrics.margin,
      technicalScore,
      overallScore: allFailed ? null : computeOverall(visibilityScore, technicalScore),
      metricsJson: JSON.stringify(metrics),
      costEstimateCents: Math.ceil(costCents),
      partial: !allFailed && (metrics.runsFailed > 0 || budgetExceeded),
      error: allFailed ? `Alle KI-Abfragen sind fehlgeschlagen. ${notes.join(" ")}`.trim() : notes.join(" ") || null,
    },
  });

  if (target.orgId) {
    await incrementUsage(target.orgId, { promptRuns: tasks.length, costCents });
  }
  if (!allFailed && !opts.silent) {
    try {
      await afterScanCompleted(scanId);
    } catch (err) {
      logger.warn("scan.notify_failed", { scanId, error: errorMessage(err) });
    }
  }
}
