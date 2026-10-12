import { describe, expect, it } from "vitest";
import { containsBrand, generateTemplatePrompts, mergeSuggestions } from "@/lib/scan/prompts";
import { createMockProvider } from "@/lib/providers/mock";

const input = { industry: "Zahnarzt", city: "Köln", brandName: "Praxis Lächeln", brandAliases: ["Lächeln Köln"], competitors: [] };

describe("Prompt-Generator", () => {
  it("erzeugt 15–30 Prompts mit stabilen IDs", () => {
    const p = generateTemplatePrompts(input);
    expect(p.length).toBeGreaterThanOrEqual(15);
    expect(p.length).toBeLessThanOrEqual(30);
    expect(new Set(p.map((x) => x.stableId)).size).toBe(p.length);
    expect(p[0].stableId).toBe("kat-01");
    // deterministisch
    expect(generateTemplatePrompts(input)).toEqual(p);
  });
  it("Marke nur in Kategorie MARKE (max. 3)", () => {
    const p = generateTemplatePrompts(input);
    for (const x of p.filter((x) => x.category !== "MARKE")) expect(containsBrand(x.text, input)).toBe(false);
    const marke = p.filter((x) => x.category === "MARKE");
    expect(marke.length).toBeGreaterThan(0);
    expect(marke.length).toBeLessThanOrEqual(3);
    expect(marke.every((x) => containsBrand(x.text, input))).toBe(true);
  });
  it("respektiert max", () => {
    const p = generateTemplatePrompts(input, 10);
    expect(p).toHaveLength(10);
    expect(new Set(p.map((x) => x.category)).size).toBe(5);
  });
  it("neue Vorschläge behalten bestehende IDs und vergeben neue fortlaufend", () => {
    const existing = [{ stableId: "kat-01", text: "Welche Zahnarzt-Anbieter gibt es in Köln?", category: "KATEGORIE" }];
    const merged = mergeSuggestions(existing, generateTemplatePrompts(input), 3);
    expect(merged).toHaveLength(3);
    expect(merged.map((m) => m.stableId)).not.toContain("kat-01");
    expect(merged[0].stableId).toBe("kat-02");
    expect(merged.some((m) => m.text === existing[0].text)).toBe(false);
  });
});

describe("Mock-Provider", () => {
  it("ist deterministisch und liefert Text + Quellen", async () => {
    process.env.MOCK_LATENCY_MS = "0";
    const p = createMockProvider("chatgpt");
    const ctx = { brandName: "Praxis Lächeln", domain: "laecheln.de", industry: "Zahnarzt", city: "Köln", competitors: [] };
    const a = await p.ask("Welche Zahnarzt-Anbieter gibt es in Köln?", { language: "de", mockContext: ctx });
    const b = await p.ask("Welche Zahnarzt-Anbieter gibt es in Köln?", { language: "de", mockContext: ctx });
    expect(a.text).toBe(b.text);
    expect(a.text.length).toBeGreaterThan(50);
    expect(a.citations.length).toBeGreaterThan(0);
  });
});
