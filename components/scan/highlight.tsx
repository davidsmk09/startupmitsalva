import { Fragment } from "react";

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Hebt Marken- und Wettbewerbernamen im Antworttext hervor (Groß/Klein egal).
 * Markdown-Fettdruck (**…**) wird als <strong> dargestellt.
 */
export function HighlightedAnswer({ text, brand, competitors }: { text: string; brand: string[]; competitors: string[] }) {
  const all = [...brand.map((b) => ({ n: b, kind: "brand" })), ...competitors.map((c) => ({ n: c, kind: "comp" }))]
    .filter((x) => x.n.trim().length >= 2)
    .sort((a, b) => b.n.length - a.n.length);
  const re = all.length ? new RegExp(`(${all.map((a) => escapeRe(a.n)).join("|")})`, "gi") : null;
  const kindOf = (s: string) => all.find((a) => a.n.toLowerCase() === s.toLowerCase())?.kind;

  const renderInline = (line: string, key: string) => {
    const boldParts = line.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bp, i) => {
      const bold = bp.startsWith("**") && bp.endsWith("**");
      const content = bold ? bp.slice(2, -2) : bp;
      const pieces = re ? content.split(re) : [content];
      const nodes = pieces.map((p, j) => {
        const k = re ? kindOf(p) : undefined;
        if (k === "brand") return <mark key={j} className="brand-hit">{p}</mark>;
        if (k === "comp") return <mark key={j} className="competitor-hit">{p}</mark>;
        return <Fragment key={j}>{p}</Fragment>;
      });
      return bold ? <strong key={`${key}-${i}`}>{nodes}</strong> : <Fragment key={`${key}-${i}`}>{nodes}</Fragment>;
    });
  };

  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {text.split(/\r?\n/).map((line, i) =>
        line.trim() === "" ? <div key={i} className="h-2" /> : <p key={i}>{renderInline(line.replace(/^#+\s*/, ""), String(i))}</p>,
      )}
    </div>
  );
}
