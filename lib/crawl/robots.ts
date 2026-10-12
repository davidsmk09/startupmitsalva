/**
 * Minimaler robots.txt-Parser (Gruppen, Allow/Disallow, Wildcards *, $).
 */
export type RobotsGroup = { agents: string[]; rules: { allow: boolean; path: string }[] };
export type ParsedRobots = { groups: RobotsGroup[]; sitemaps: string[] };

export function parseRobots(text: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (field === "allow" || field === "disallow") {
      lastWasAgent = false;
      if (!current) continue;
      if (field === "disallow" && value === "") continue; // leeres Disallow = alles erlaubt
      current.rules.push({ allow: field === "allow", path: value });
    } else if (field === "sitemap") {
      sitemaps.push(value);
    } else {
      lastWasAgent = false;
    }
  }
  return { groups, sitemaps };
}

function patternToRegex(path: string): RegExp {
  const escaped = path.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped.endsWith("\\$") ? escaped.slice(0, -2) + "$" : escaped}`);
}

/** Findet die passende Gruppe (spezifischster User-Agent, sonst *). */
function groupFor(robots: ParsedRobots, userAgent: string): RobotsGroup | null {
  const ua = userAgent.toLowerCase();
  let best: RobotsGroup | null = null;
  let bestLen = -1;
  for (const g of robots.groups) {
    for (const a of g.agents) {
      if (a !== "*" && ua.includes(a) && a.length > bestLen) {
        best = g;
        bestLen = a.length;
      }
    }
  }
  if (best) return best;
  return robots.groups.find((g) => g.agents.includes("*")) ?? null;
}

/** Ist der Pfad für den User-Agent erlaubt? (längste passende Regel gewinnt, Allow bei Gleichstand) */
export function isAllowed(robots: ParsedRobots, userAgent: string, path = "/"): boolean {
  const group = groupFor(robots, userAgent);
  if (!group) return true;
  let match: { allow: boolean; len: number } | null = null;
  for (const r of group.rules) {
    if (patternToRegex(r.path).test(path)) {
      const len = r.path.length;
      if (!match || len > match.len || (len === match.len && r.allow)) match = { allow: r.allow, len };
    }
  }
  return match ? match.allow : true;
}

/** Wird der Bot explizit (eigene Gruppe) oder über * behandelt? */
export function hasExplicitGroup(robots: ParsedRobots, userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return robots.groups.some((g) => g.agents.some((a) => a !== "*" && ua.includes(a)));
}

export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
] as const;
