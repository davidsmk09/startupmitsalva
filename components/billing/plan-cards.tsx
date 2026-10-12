"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Plan } from "@/lib/billing/plans";
import { formatEuro } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type PriceCfg = { mode: "net" | "gross"; vat: number };

function price(cents: number, cfg: PriceCfg) {
  return formatEuro(cfg.mode === "gross" ? Math.round(cents * (1 + cfg.vat / 100)) : cents);
}

/**
 * Preiskarten für Paket 1 mit Monatlich/Jährlich-Umschalter.
 * renderAction erlaubt unterschiedliche CTAs (Marketing vs. Dashboard).
 */
export function PlanCards({
  plans,
  priceCfg,
  currentPlanKey,
  renderAction,
  defaultInterval = "month",
}: {
  plans: Plan[];
  priceCfg: PriceCfg;
  currentPlanKey?: string;
  defaultInterval?: "month" | "year";
  renderAction?: (plan: Plan, interval: "month" | "year") => React.ReactNode;
}) {
  const [interval, setInterval] = useState<"month" | "year">(defaultInterval);
  return (
    <div>
      <div className="mb-8 flex justify-center">
        <div role="radiogroup" aria-label="Abrechnungszeitraum" className="inline-flex rounded-full border bg-muted p-1">
          {(["month", "year"] as const).map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={interval === i}
              onClick={() => setInterval(i)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                interval === i ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {i === "month" ? t.billing.monthly : t.billing.yearly}
              {i === "year" && <span className="ml-1 text-xs text-success">({t.billing.yearlyHint})</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const featured = plan.key === "business";
          const current = currentPlanKey === plan.key;
          const cents = interval === "month" ? plan.priceMonthlyCents : plan.priceYearlyCents;
          return (
            <Card key={plan.key} className={cn("flex flex-col", featured && "border-primary shadow-md")}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle as="h3" className="text-xl">
                    {plan.name}
                  </CardTitle>
                  {featured && <Badge>Beliebt</Badge>}
                  {current && <Badge variant="success">{t.billing.currentPlan}</Badge>}
                </div>
                <CardDescription>{plan.tagline}</CardDescription>
                <p className="pt-3">
                  <span className="text-4xl font-bold tabular-nums">{price(cents, priceCfg)}</span>{" "}
                  <span className="text-muted-foreground">{interval === "month" ? t.billing.perMonth : t.billing.perYear}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {priceCfg.mode === "net" ? t.billing.net : t.billing.gross}
                  {interval === "year" && ` · entspricht ${price(Math.round(plan.priceYearlyCents / 12), priceCfg)} ${t.billing.perMonth}`}
                </p>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2 text-sm">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                      {h}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {renderAction ? (
                  renderAction(plan, interval)
                ) : (
                  <Button asChild className="w-full" variant={featured ? "default" : "outline"}>
                    <Link href={`/register?plan=${plan.key}&interval=${interval}`}>{t.billing.choosePlan}</Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
