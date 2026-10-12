import { describe, expect, it } from "vitest";
import { hasExplicitGroup, isAllowed, parseRobots } from "@/lib/crawl/robots";

const txt = `
# Beispiel
User-agent: GPTBot
Disallow: /

User-agent: CCBot
User-agent: Google-Extended
Disallow: /intern/
Allow: /intern/oeffentlich

User-agent: *
Disallow: /admin
Disallow:

Sitemap: https://example.com/sitemap.xml
`;

describe("robots.txt-Parser", () => {
  const r = parseRobots(txt);
  it("liest Sitemaps", () => {
    expect(r.sitemaps).toEqual(["https://example.com/sitemap.xml"]);
  });
  it("blockiert GPTBot vollständig", () => {
    expect(isAllowed(r, "GPTBot", "/")).toBe(false);
    expect(hasExplicitGroup(r, "GPTBot")).toBe(true);
  });
  it("gruppiert mehrere User-Agents und wertet längste Regel", () => {
    expect(isAllowed(r, "CCBot", "/")).toBe(true);
    expect(isAllowed(r, "CCBot", "/intern/x")).toBe(false);
    expect(isAllowed(r, "Google-Extended", "/intern/oeffentlich/seite")).toBe(true);
  });
  it("fällt auf * zurück", () => {
    expect(isAllowed(r, "ClaudeBot", "/")).toBe(true);
    expect(isAllowed(r, "ClaudeBot", "/admin/login")).toBe(false);
  });
  it("Wildcards und $", () => {
    const w = parseRobots("User-agent: *\nDisallow: /*.pdf$\nDisallow: /tmp*");
    expect(isAllowed(w, "X", "/datei.pdf")).toBe(false);
    expect(isAllowed(w, "X", "/datei.pdf?x")).toBe(true);
    expect(isAllowed(w, "X", "/tmpfiles")).toBe(false);
  });
  it("leere Datei erlaubt alles", () => {
    expect(isAllowed(parseRobots(""), "GPTBot", "/")).toBe(true);
  });
});
