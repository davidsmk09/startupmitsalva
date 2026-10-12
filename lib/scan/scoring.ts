/**
 * Scoring der Scan-Ergebnisse. Alle Gewichte als Konstanten, gut getestet.
 */
export const VISIBILITY_WEIGHTS = {
  mention: 0.5,
  citation: 0.25,
  prominence: 0.1,
  shareOfVoice: 0.15,
} as const;

export const OVERALL_WEIGHTS = { visibility: 0.6, technical: 0.4 } as const;

export const AUDIT_STATUS_FACTOR = { PASS: 1, WARN: 0.5, FAIL: 0 } as const;

export const SCORE_LEVELS = { lowMax: 39, mediumMax: 69 } as const;

export type ScoreLevel = "low" | "medium" | "high";

export function scoreLevel(score: number | null | undefined): ScoreLevel {
  const s = score ?? 0;
  if (s <= SCORE_LEVELS.lowMax) return "low";
  if (s <= SCORE_LEVELS.mediumMax) return "medium";
  return "high";
}

export type RunForScoring = {
  provider: string;
  promptStableId: string;
  promptCategory?: string;
  runIndex: number;
  brandMentioned: boolean;
  brandCited: boolean;
  mentionPosition: number | null;
  competitorMentions: { name: string; mentioned: boolean }[];
  error?: string | null;
};

/** Positionswert: Platz 1 = 1.0, je Platz −0.2, ohne erkennbare Liste = 0.5. */
export function positionScore(position: number | null): number {
  if (position === null) return 0.5;
  return Math.max(0, 1 - (position - 1) * 0.2);
}

export type VisibilityBreakdown = {
  runs: number;
  mentionRate: number;
  citationRate: number;
  prominence: number;
  shareOfVoice: number | null;
  score: number;
};

function round(n: number, d = 1) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/** Visibility-Score (0–100) für eine Menge von Läufen. Fehlerhafte Läufe zählen nicht. */
export function computeVisibility(runs: RunForScoring[], hasCompetitors: boolean): VisibilityBreakdown {
  const valid = runs.filter((r) => !r.error);
  const n = valid.length;
  if (n === 0) return { runs: 0, mentionRate: 0, citationRate: 0, prominence: 0, shareOfVoice: hasCompetitors ? 0 : null, score: 0 };

  const mentioned = valid.filter((r) => r.brandMentioned);
  const mentionRate = mentioned.length / n;
  const citationRate = valid.filter((r) => r.brandCited).length / n;
  const prominence = mentioned.length ? mentioned.reduce((s, r) => s + positionScore(r.mentionPosition), 0) / mentioned.length : 0;

  let shareOfVoice: number | null = null;
  let score: number;
  if (hasCompetitors) {
    const competitorHits = valid.reduce((s, r) => s + r.competitorMentions.filter((c) => c.mentioned).length, 0);
    const total = mentioned.length + competitorHits;
    shareOfVoice = total === 0 ? 0 : mentioned.length / total;
    score =
      VISIBILITY_WEIGHTS.mention * mentionRate +
      VISIBILITY_WEIGHTS.citation * citationRate +
      VISIBILITY_WEIGHTS.prominence * prominence +
      VISIBILITY_WEIGHTS.shareOfVoice * shareOfVoice;
  } else {
    // Ohne Wettbewerber: SoV-Gewicht geht auf die Erwähnungsrate
    score =
      (VISIBILITY_WEIGHTS.mention + VISIBILITY_WEIGHTS.shareOfVoice) * mentionRate +
      VISIBILITY_WEIGHTS.citation * citationRate +
      VISIBILITY_WEIGHTS.prominence * prominence;
  }
  return {
    runs: n,
    mentionRate: round(mentionRate, 4),
    citationRate: round(citationRate, 4),
    prominence: round(prominence, 4),
    shareOfVoice: shareOfVoice === null ? null : round(shareOfVoice, 4),
    score: round(score * 100),
  };
}

/**
 * Schwankungsbreite: Standardabweichung der Visibility-Scores über die
 * N Wiederholungsläufe (runIndex). Bei nur einem Lauf: null.
 */
export function computeMargin(runs: RunForScoring[], hasCompetitors: boolean): number | null {
  const indices = Array.from(new Set(runs.filter((r) => !r.error).map((r) => r.runIndex)));
  if (indices.length < 2) return null;
  const scores = indices.map((i) => computeVisibility(runs.filter((r) => r.runIndex === i), hasCompetitors).score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((s, x) => s + (x - mean) ** 2, 0) / (scores.length - 1);
  return round(Math.sqrt(variance));
}

export type AuditForScoring = { status: string; weight: number };

/** Technik-Score: gewichteter Anteil bestandener Checks (WARN = halb, INFO zählt nicht). */
export function computeTechnicalScore(results: AuditForScoring[]): number | null {
  let total = 0;
  let achieved = 0;
  for (const r of results) {
    if (!(r.status in AUDIT_STATUS_FACTOR)) continue;
    total += r.weight;
    achieved += r.weight * AUDIT_STATUS_FACTOR[r.status as keyof typeof AUDIT_STATUS_FACTOR];
  }
  if (total === 0) return null;
  return round((achieved / total) * 100);
}

export function computeOverall(visibility: number | null, technical: number | null): number | null {
  if (visibility === null && technical === null) return null;
  if (technical === null) return visibility;
  if (visibility === null) return technical;
  return round(OVERALL_WEIGHTS.visibility * visibility + OVERALL_WEIGHTS.technical * technical);
}

export type ShareOfVoiceEntry = { name: string; mentions: number; share: number; isBrand: boolean };

export function shareOfVoiceTable(runs: RunForScoring[], brandName: string): ShareOfVoiceEntry[] {
  const valid = runs.filter((r) => !r.error);
  const counts = new Map<string, number>();
  counts.set(brandName, valid.filter((r) => r.brandMentioned).length);
  for (const r of valid) for (const c of r.competitorMentions) if (c.mentioned) counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
  for (const r of valid) for (const c of r.competitorMentions) if (!counts.has(c.name)) counts.set(c.name, 0);
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  return Array.from(counts.entries())
    .map(([name, mentions]) => ({ name, mentions, share: total ? round(mentions / total, 4) : 0, isBrand: name === brandName }))
    .sort((a, b) => b.mentions - a.mentions);
}

export type ScanMetrics = {
  overall: VisibilityBreakdown;
  margin: number | null;
  byProvider: Record<string, VisibilityBreakdown & { errors: number }>;
  byCategory: Record<string, VisibilityBreakdown>;
  shareOfVoice: ShareOfVoiceEntry[];
  topDomains: { domain: string; count: number; own: boolean }[];
  ownDomainCited: boolean;
  runsTotal: number;
  runsFailed: number;
};

export function buildMetrics(
  runs: (RunForScoring & { citedDomains?: string[] })[],
  opts: { brandName: string; domain: string; hasCompetitors: boolean },
): ScanMetrics {
  const providers = Array.from(new Set(runs.map((r) => r.provider)));
  const categories = Array.from(new Set(runs.map((r) => r.promptCategory ?? "SONSTIGE")));
  const domainCounts = new Map<string, number>();
  for (const r of runs) for (const d of r.citedDomains ?? []) domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
  const own = opts.domain.toLowerCase();
  const topDomains = Array.from(domainCounts.entries())
    .map(([domain, count]) => ({ domain, count, own: domain === own || domain.endsWith(`.${own}`) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  return {
    overall: computeVisibility(runs, opts.hasCompetitors),
    margin: computeMargin(runs, opts.hasCompetitors),
    byProvider: Object.fromEntries(
      providers.map((p) => {
        const pr = runs.filter((r) => r.provider === p);
        return [p, { ...computeVisibility(pr, opts.hasCompetitors), errors: pr.filter((r) => r.error).length }];
      }),
    ),
    byCategory: Object.fromEntries(
      categories.map((c) => [c, computeVisibility(runs.filter((r) => (r.promptCategory ?? "SONSTIGE") === c), opts.hasCompetitors)]),
    ),
    shareOfVoice: opts.hasCompetitors ? shareOfVoiceTable(runs, opts.brandName) : [],
    topDomains,
    ownDomainCited: topDomains.some((d) => d.own),
    runsTotal: runs.length,
    runsFailed: runs.filter((r) => r.error).length,
  };
}
