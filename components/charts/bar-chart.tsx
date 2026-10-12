"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TEXT, GRID, NEUTRAL, SERIES } from "@/components/charts/palette";
import { ChartDataTable } from "@/components/charts/data-table";

export type BarDatum = { label: string; value: number; highlight?: boolean };

/**
 * Horizontales Balkendiagramm (eine Reihe). Hervorgehobene Einträge (z. B.
 * eigene Marke) in der Akzentfarbe, übrige neutral.
 */
export function HorizontalBars({
  data,
  ariaLabel,
  valueSuffix = "",
  max = 100,
  valueHeader = "Wert",
}: {
  data: BarDatum[];
  ariaLabel: string;
  valueSuffix?: string;
  max?: number;
  valueHeader?: string;
}) {
  const anyHighlight = data.some((d) => d.highlight);
  return (
    <div>
      <div style={{ height: Math.max(120, data.length * 44) }} className="w-full" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }} barCategoryGap={10}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, max]} hide />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tick={{ fill: AXIS_TEXT, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))" }}
              formatter={(v) => [`${v}${valueSuffix}`, valueHeader]}
              contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
              {data.map((d, i) => (
                <Cell key={i} fill={!anyHighlight || d.highlight ? SERIES[0] : NEUTRAL} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: unknown) => `${v}${valueSuffix}`}
                style={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable caption={ariaLabel} headers={["Eintrag", valueHeader]} rows={data.map((d) => [d.label, `${d.value}${valueSuffix}`])} />
    </div>
  );
}
