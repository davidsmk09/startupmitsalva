import { describe, expect, it } from "vitest";
import {
  buildMetrics,
  computeMargin,
  computeOverall,
  computeTechnicalScore,
  computeVisibility,
  positionScore,
  scoreLevel,
  shareOfVoiceTable,
  type RunForScoring,
} from "@/lib/scan/scoring";

function run(over: Partial<RunForScoring> = {}): RunForScoring {
  return {
    provider: "openai",
    promptStableId: "kat-01",
    promptCategory: "KATEGORIE",
    runIndex: 0,
    brandMentioned: false,
    brandCited: false,
    mentionPosition: null,
    competitorMentions: [],
    ...over,
  };
}

describe("positionScore", () => {
  it("bewertet Platz 1 mit 1.0 und fällt je Platz um 0.2", () => {
    expect(positionScore(1)).toBe(1);
    expect(positionScore(2)).toBeCloseTo(0.8);
    expect(positionScore(6)).toBe(0);
    expect(positionScore(10)).toBe(0);
    expect(positionScore(null)).toBe(0.5);
  });
});

describe("computeVisibility", () => {
  it("liefert 0 ohne gültige Läufe", () => {
    expect(computeVisibility([], true).score).toBe(0);
    expect(computeVisibility([run({ error: "x", brandMentioned: true })], false).runs).toBe(0);
  });

  it("100 Punkte bei voller Erwähnung, Zitation, Platz 1 und ohne Konkurrenz-Erwähnungen", () => {
    const runs = [run({ brandMentioned: true, brandCited: true, mentionPosition: 1, competitorMentions: [{ name: "A", mentioned: false }] })];
    expect(computeVisibility(runs, true).score).toBe(100);
  });

  it("gewichtet 50/25/10/15 mit Wettbewerbern", () => {
    // 2 Läufe: 1x erwähnt (Platz 2, nicht zitiert), 1x nicht erwähnt; Konkurrent 1x erwähnt
    const runs = [
      run({ brandMentioned: true, mentionPosition: 2, competitorMentions: [{ name: "A", mentioned: false }] }),
      run({ runIndex: 1, competitorMentions: [{ name: "A", mentioned: true }] }),
    ];
    const v = computeVisibility(runs, true);
    expect(v.mentionRate).toBe(0.5);
    expect(v.citationRate).toBe(0);
    expect(v.prominence).toBeCloseTo(0.8);
    expect(v.shareOfVoice).toBe(0.5);
    // 0.5*0.5 + 0.25*0 + 0.1*0.8 + 0.15*0.5 = 0.405
    expect(v.score).toBe(40.5);
  });

  it("verteilt das SoV-Gewicht ohne Wettbewerber auf die Erwähnungsrate", () => {
    const runs = [run({ brandMentioned: true, mentionPosition: null }), run({ runIndex: 1 })];
    const v = computeVisibility(runs, false);
    expect(v.shareOfVoice).toBeNull();
    // 0.65*0.5 + 0 + 0.1*0.5 = 0.375
    expect(v.score).toBe(37.5);
  });

  it("ignoriert fehlerhafte Läufe", () => {
    const runs = [run({ brandMentioned: true, mentionPosition: 1, brandCited: true }), run({ error: "Timeout" })];
    expect(computeVisibility(runs, false).runs).toBe(1);
    expect(computeVisibility(runs, false).score).toBe(100);
  });
});

describe("computeMargin", () => {
  it("ist null bei nur einem Lauf", () => {
    expect(computeMargin([run()], false)).toBeNull();
  });
  it("ist 0 bei identischen Läufen", () => {
    expect(computeMargin([run({ brandMentioned: true }), run({ runIndex: 1, brandMentioned: true })], false)).toBe(0);
  });
  it("misst Streuung zwischen Läufen", () => {
    const m = computeMargin([run({ brandMentioned: true, brandCited: true, mentionPosition: 1 }), run({ runIndex: 1 })], false);
    expect(m).toBeGreaterThan(50);
  });
});

describe("Technik- und Gesamtscore", () => {
  it("gewichtet PASS=1, WARN=0.5, FAIL=0 und ignoriert INFO", () => {
    expect(
      computeTechnicalScore([
        { status: "PASS", weight: 10 },
        { status: "WARN", weight: 10 },
        { status: "FAIL", weight: 20 },
        { status: "INFO", weight: 50 },
      ]),
    ).toBe(37.5);
    expect(computeTechnicalScore([{ status: "INFO", weight: 3 }])).toBeNull();
  });
  it("Gesamtscore = 60 % Visibility + 40 % Technik", () => {
    expect(computeOverall(50, 100)).toBe(70);
    expect(computeOverall(80, null)).toBe(80);
    expect(computeOverall(null, null)).toBeNull();
  });
  it("Schwellen niedrig/mittel/stark", () => {
    expect(scoreLevel(0)).toBe("low");
    expect(scoreLevel(39)).toBe("low");
    expect(scoreLevel(40)).toBe("medium");
    expect(scoreLevel(69.9)).toBe("high");
    expect(scoreLevel(69)).toBe("medium");
    expect(scoreLevel(70)).toBe("high");
  });
});

describe("Share of Voice & Metriken", () => {
  it("berechnet Anteile inkl. Marke", () => {
    const runs = [
      run({ brandMentioned: true, competitorMentions: [{ name: "A", mentioned: true }, { name: "B", mentioned: false }] }),
      run({ runIndex: 1, competitorMentions: [{ name: "A", mentioned: true }, { name: "B", mentioned: true }] }),
    ];
    const sov = shareOfVoiceTable(runs, "Marke");
    expect(sov[0]).toMatchObject({ name: "A", mentions: 2, share: 0.5 });
    expect(sov.find((e) => e.isBrand)).toMatchObject({ mentions: 1, share: 0.25 });
  });
  it("buildMetrics aggregiert je Provider und Domain", () => {
    const m = buildMetrics(
      [
        { ...run({ brandMentioned: true, brandCited: true }), citedDomains: ["beispiel.de", "gelbeseiten.de"] },
        { ...run({ provider: "gemini", error: "x" }), citedDomains: [] },
      ],
      { brandName: "B", domain: "beispiel.de", hasCompetitors: false },
    );
    expect(m.byProvider.openai.runs).toBe(1);
    expect(m.byProvider.gemini.errors).toBe(1);
    expect(m.ownDomainCited).toBe(true);
    expect(m.runsFailed).toBe(1);
  });
});
