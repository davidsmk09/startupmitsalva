import { describe, expect, it } from "vitest";
import { pageFromHtml, type SiteCrawl } from "@/lib/crawl/crawler";
import { parseRobots } from "@/lib/crawl/robots";
import {
  checkAnswerable,
  checkHttps,
  checkInitialHtml,
  checkLlmsTxt,
  checkMetaBasics,
  checkNapConsistency,
  checkPerformance,
  checkRobotsAi,
  checkSitemap,
  checkStructuredData,
  checkTrustSignals,
  runAllChecks,
} from "@/lib/audit/checks";
import { buildRecommendations } from "@/lib/recommendations";
import { computeTechnicalScore } from "@/lib/scan/scoring";

const longText = "Wir sind Ihr Meisterbetrieb für Sanitär und Heizung in Köln. ".repeat(20);

const goodHtml = `<!doctype html><html lang="de"><head>
<title>Sanitär Köln – Muster Haustechnik</title>
<meta name="description" content="Muster Haustechnik: Sanitär- und Heizungsbetrieb in Köln mit 24h-Notdienst, Badsanierung und Wartung.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://muster.de/">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Plumber","name":"Muster","address":{"@type":"PostalAddress","addressLocality":"Köln"}},{"@type":"Service","name":"Badsanierung"},{"@type":"BreadcrumbList","itemListElement":[]},{"@type":"FAQPage","mainEntity":[]}]}</script>
</head><body><main>
<h1>Sanitär &amp; Heizung in Köln</h1>
<h2>Unsere Leistungen</h2><p>${longText}</p>
<ul><li>Badsanierung</li><li>Heizungswartung</li><li>Notdienst</li></ul>
<h2>Warum wir?</h2><p>${longText}</p>
<h2>Häufige Fragen</h2><p>${longText}</p>
<table><tr><td>Preis</td></tr></table>
<p>Team: Inhaber Max Muster. Kundenstimmen: 4,9 Sterne Bewertung. Seit 1998, über 1.200 Projekte.</p>
<p>Muster Haustechnik, Hauptstraße 1, 50667 Köln, Telefon 0221 1234567</p>
<a href="/impressum">Impressum</a> <a href="/kontakt">Kontakt</a> <a href="/ueber-uns">Über uns</a>
<a href="https://www.gelbeseiten.de/muster">Gelbe Seiten</a>
</main></body></html>`;

function crawl(over: Partial<SiteCrawl> = {}): SiteCrawl {
  return {
    domain: "muster.de",
    origin: "https://muster.de",
    home: pageFromHtml("https://muster.de/", goodHtml),
    homeFetch: null,
    homeError: null,
    httpRedirectsToHttps: true,
    pages: [pageFromHtml("https://muster.de/ueber-uns", goodHtml)],
    robots: { url: "https://muster.de/robots.txt", status: 200, body: "User-agent: *\nAllow: /\nSitemap: https://muster.de/sitemap.xml", ok: true },
    parsedRobots: parseRobots("User-agent: *\nAllow: /\nSitemap: https://muster.de/sitemap.xml"),
    sitemap: { url: "https://muster.de/sitemap.xml", status: 200, body: "", ok: true, urls: ["https://muster.de/a"], referencedInRobots: true },
    llms: { url: "https://muster.de/llms.txt", status: 200, body: "# Muster\n\n> Sanitär in Köln", ok: true },
    renderedMarkdownLength: null,
    ...over,
  };
}

describe("Audit-Checks – gute Website", () => {
  it("alle relevanten Checks bestehen", () => {
    const c = crawl();
    expect(checkRobotsAi(c).status).toBe("PASS");
    expect(checkSitemap(c).status).toBe("PASS");
    expect(checkLlmsTxt(c).status).toBe("PASS");
    expect(checkHttps(c).status).toBe("PASS");
    expect(checkInitialHtml(c).status).toBe("PASS");
    expect(checkStructuredData(c).status).toBe("PASS");
    expect(checkMetaBasics(c).status).toBe("PASS");
    expect(checkAnswerable(c).status).toBe("PASS");
    expect(checkTrustSignals(c).status).toBe("PASS");
    expect(checkNapConsistency(c).status).toBe("PASS");
    expect(checkPerformance(c).status).toBe("PASS");
    expect(computeTechnicalScore(runAllChecks(c))).toBe(100);
  });
});

describe("Audit-Checks – Problemfälle", () => {
  it("robots.txt blockiert GPTBot -> FAIL mit Liste", () => {
    const body = "User-agent: GPTBot\nDisallow: /\n\nUser-agent: CCBot\nDisallow: /";
    const r = checkRobotsAi(crawl({ robots: { url: "", status: 200, body, ok: true }, parsedRobots: parseRobots(body) }));
    expect(r.status).toBe("FAIL");
    expect((r.data as { blocked: string[] }).blocked).toEqual(["GPTBot", "CCBot"]);
  });
  it("nur Trainings-Crawler blockiert -> WARN", () => {
    const body = "User-agent: CCBot\nDisallow: /";
    expect(checkRobotsAi(crawl({ robots: { url: "", status: 200, body, ok: true }, parsedRobots: parseRobots(body) })).status).toBe("WARN");
  });
  it("fehlende Sitemap -> FAIL, nicht referenziert -> WARN", () => {
    expect(checkSitemap(crawl({ sitemap: null })).status).toBe("FAIL");
    const c = crawl();
    expect(checkSitemap({ ...c, sitemap: { ...c.sitemap!, referencedInRobots: false } }).status).toBe("WARN");
  });
  it("fehlende llms.txt ist nur INFO", () => {
    expect(checkLlmsTxt(crawl({ llms: null })).status).toBe("INFO");
  });
  it("kein HTTPS -> FAIL; Mixed Content -> WARN", () => {
    const http = crawl({ home: pageFromHtml("http://muster.de/", goodHtml) });
    expect(checkHttps(http).status).toBe("FAIL");
    const mixed = crawl({ home: pageFromHtml("https://muster.de/", goodHtml.replace("</main>", '<img src="http://cdn.muster.de/a.jpg"></main>')) });
    expect(checkHttps(mixed).status).toBe("WARN");
  });
  it("JS-only Seite -> FAIL", () => {
    const spa = crawl({ home: pageFromHtml("https://muster.de/", '<html><body><div id="root"></div><script src="/app.js"></script></body></html>'), pages: [] });
    expect(checkInitialHtml(spa).status).toBe("FAIL");
    expect(checkMetaBasics(spa).status).toBe("FAIL");
    expect(checkStructuredData(spa).status).toBe("FAIL");
  });
  it("ungültiges JSON-LD wird erkannt", () => {
    const html = goodHtml.replace("</head>", '<script type="application/ld+json">{kaputt</script></head>');
    const r = checkStructuredData(crawl({ home: pageFromHtml("https://muster.de/", html), pages: [] }));
    expect(r.status).toBe("WARN");
    expect((r.data as { invalid: number }).invalid).toBe(1);
  });
  it("unerreichbare Website -> ein FAIL-Check", () => {
    const r = runAllChecks(crawl({ home: null, homeError: "Timeout" }));
    expect(r).toHaveLength(1);
    expect(r[0].status).toBe("FAIL");
    expect(computeTechnicalScore(r)).toBe(0);
  });
});

describe("Empfehlungen", () => {
  it("leitet priorisierte Maßnahmen inkl. Snippets aus Befunden ab", () => {
    const body = "User-agent: GPTBot\nDisallow: /";
    const c = crawl({ robots: { url: "", status: 200, body, ok: true }, parsedRobots: parseRobots(body), llms: null });
    const audit = runAllChecks(c).map((r) => ({ ...r, dataJson: r.data ? JSON.stringify(r.data) : null }));
    const recos = buildRecommendations({
      audit,
      metrics: null,
      project: { brandName: "Muster", domain: "muster.de", industry: "Sanitär", city: "Köln" },
    });
    expect(recos[0].key).toBe("robots_ai");
    expect(recos[0].impact).toBe("HOCH");
    expect(recos[0].snippet?.code).toContain("User-agent: GPTBot");
    expect(recos.find((r) => r.key === "llms_txt")?.impact).toBe("NIEDRIG");
  });
});
