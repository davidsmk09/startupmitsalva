import { describe, expect, it } from "vitest";
import {
  analyzeAnswer,
  citationDomain,
  domainMatches,
  extractListItems,
  matchNames,
  normalizeName,
  textMentionsDomain,
} from "@/lib/scan/parser";

describe("normalizeName", () => {
  it("ignoriert Groß/Klein, Umlaute und Rechtsformen", () => {
    expect(normalizeName("Müller Bau GmbH")).toBe("mueller bau");
    expect(normalizeName("MÜLLER-BAU UG (haftungsbeschränkt)")).toBe("mueller bau");
    expect(normalizeName("Schmidt & Söhne GmbH & Co. KG")).toBe("schmidt soehne");
  });
});

describe("matchNames", () => {
  it("findet exakte und normalisierte Treffer", () => {
    expect(matchNames("Empfehlenswert ist die Müller Bau GmbH aus Köln.", ["Müller Bau"]).exact).toBe(true);
    expect(matchNames("Empfehlenswert ist MUELLER BAU.", ["Müller Bau GmbH"]).matched).toBe(true);
    expect(matchNames("Empfehlenswert ist MüllerBau.", ["Müller Bau"]).matched).toBe(true);
  });
  it("toleriert einen Tippfehler bei längeren Namen (fuzzy)", () => {
    const r = matchNames("Ich empfehle Zahnarztpraxis Sonnenshein.", ["Zahnarztpraxis Sonnenschein"]);
    expect(r.matched).toBe(true);
    expect(r.exact).toBe(false);
  });
  it("keine Treffer bei Teilwörtern", () => {
    expect(matchNames("Die Bauernhof GmbH", ["Bauer"]).matched).toBe(false);
  });
});

describe("Domains", () => {
  it("erkennt Subdomains", () => {
    expect(domainMatches("shop.beispiel.de", "beispiel.de")).toBe(true);
    expect(domainMatches("beispiel.de", "www.beispiel.de")).toBe(true);
    expect(domainMatches("nichtbeispiel.de", "beispiel.de")).toBe(false);
  });
  it("liest Domains aus Google-Grounding-Redirects aus dem Titel", () => {
    expect(citationDomain({ url: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc", title: "beispiel.de" })).toBe("beispiel.de");
    expect(citationDomain({ url: "https://www.gelbeseiten.de/x" })).toBe("gelbeseiten.de");
  });
  it("findet Domain-Erwähnungen im Text", () => {
    expect(textMentionsDomain("Mehr auf www.beispiel.de/kontakt.", "beispiel.de")).toBe(true);
    expect(textMentionsDomain("Mehr auf meinbeispiel.de", "beispiel.de")).toBe(false);
  });
});

describe("Listen & Position", () => {
  const text = "Hier eine Auswahl:\n\n1. **Alpha Bau** – gut\n2. **Müller Bau** – sehr gut\n3. Gamma GmbH\n\nFazit.";
  it("extrahiert Listeneinträge", () => {
    expect(extractListItems(text)).toHaveLength(3);
    expect(extractListItems("Nur ein Satz.")).toHaveLength(0);
  });
  it("analysiert Antwort vollständig", () => {
    const a = analyzeAnswer(
      { text, citations: [{ url: "https://www.mueller-bau.de/" }, { url: "https://www.gelbeseiten.de/" }] },
      { name: "Müller Bau GmbH", domain: "mueller-bau.de" },
      [{ name: "Alpha Bau", domain: "alpha-bau.de" }, { name: "Delta" }],
    );
    expect(a.brandMentioned).toBe(true);
    expect(a.brandCited).toBe(true);
    expect(a.mentionPosition).toBe(2);
    expect(a.competitorMentions[0]).toMatchObject({ name: "Alpha Bau", mentioned: true, position: 1, cited: false });
    expect(a.competitorMentions[1].mentioned).toBe(false);
    expect(a.citedDomains).toContain("gelbeseiten.de");
  });
  it("Domain-Erwähnung zählt als Markenerwähnung", () => {
    const a = analyzeAnswer({ text: "Siehe beispiel.de für Details.", citations: [] }, { name: "XYZ Unbekannt", domain: "beispiel.de" }, []);
    expect(a.brandMentioned).toBe(true);
    expect(a.mentionPosition).toBeNull();
  });
});
