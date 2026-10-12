import { scoreLevel } from "@/lib/scan/scoring";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LEVEL_COLOR = { low: "hsl(var(--destructive))", medium: "hsl(var(--warning))", high: "hsl(var(--success))" };

/** Halbkreis-Gauge mit Zahl, Stufe und optionaler Schwankungsbreite (barrierearm, reines SVG). */
export function ScoreGauge({
  score,
  margin,
  label,
  size = 200,
  className,
}: {
  score: number | null;
  margin?: number | null;
  label: string;
  size?: number;
  className?: string;
}) {
  const value = Math.max(0, Math.min(100, score ?? 0));
  const level = scoreLevel(score);
  const r = 80;
  const circumference = Math.PI * r;
  const offset = circumference * (1 - value / 100);
  return (
    <figure className={cn("flex flex-col items-center", className)} aria-label={`${label}: ${score === null ? "keine Daten" : Math.round(value)} von 100`}>
      <svg width={size} height={size * 0.62} viewBox="0 0 200 124" role="img" aria-hidden="true">
        <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="hsl(var(--muted))" strokeWidth="16" strokeLinecap="round" />
        {score !== null && (
          <path
            d="M 20 110 A 80 80 0 0 1 180 110"
            fill="none"
            stroke={LEVEL_COLOR[level]}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        )}
        <text x="100" y="98" textAnchor="middle" className="fill-foreground" style={{ fontSize: 40, fontWeight: 700 }}>
          {score === null ? "–" : Math.round(value)}
        </text>
        <text x="100" y="118" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>
          von 100
        </text>
      </svg>
      <figcaption className="mt-1 text-center">
        <span className="block text-sm font-medium">{label}</span>
        {score !== null && (
          <span className="text-xs text-muted-foreground">
            {t.dashboard.levels[level]}
            {margin != null && ` · ± ${margin}`}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
