"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TEXT, GRID, SERIES } from "@/components/charts/palette";
import { ChartDataTable } from "@/components/charts/data-table";

export type TrendPoint = { date: string; overall: number | null; visibility: number | null; technical: number | null };

const LINES = [
  { key: "overall", name: "Gesamt", color: SERIES[0] },
  { key: "visibility", name: "KI-Sichtbarkeit", color: SERIES[1] },
  { key: "technical", name: "Technik", color: SERIES[2] },
] as const;

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div>
      <div className="h-64 w-full" role="img" aria-label="Liniendiagramm: Score-Verlauf über die Scans">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {LINES.map((l) => (
              <Line
                key={l.key}
                type="monotone"
                dataKey={l.key}
                name={l.name}
                stroke={l.color}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--background))" }}
                activeDot={{ r: 6 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        caption="Score-Verlauf"
        headers={["Datum", "Gesamt", "KI-Sichtbarkeit", "Technik"]}
        rows={data.map((d) => [d.date, d.overall ?? "–", d.visibility ?? "–", d.technical ?? "–"])}
      />
    </div>
  );
}
