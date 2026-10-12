"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PlanCards, type PriceCfg } from "@/components/billing/plan-cards";
import type { Plan } from "@/lib/billing/plans";
import { apiFetch } from "@/lib/client-api";
import { t } from "@/lib/i18n";

/**
 * Plan-Auswahl im Dashboard inkl. "Button-Lösung": Bestätigung von AGB und
 * Widerrufshinweis, Button "Zahlungspflichtig bestellen".
 */
export function BillingPlanPicker({
  plans,
  priceCfg,
  currentPlanKey,
  stripeEnabled,
  demoAllowed,
  defaultInterval,
}: {
  plans: Plan[];
  priceCfg: PriceCfg;
  currentPlanKey: string;
  stripeEnabled: boolean;
  demoAllowed: boolean;
  defaultInterval: "month" | "year";
}) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function order(planKey: string, interval: "month" | "year") {
    if (stripeEnabled && !accepted) {
      toast.error("Bitte bestätige zuerst AGB und Widerrufshinweise.");
      return;
    }
    setBusy(planKey);
    if (stripeEnabled) {
      const res = await apiFetch<{ url?: string; updated?: boolean }>("/api/billing/checkout", { body: { planKey, interval, acceptTerms: true } });
      setBusy(null);
      if (!res.ok) return toast.error(res.error);
      if (res.data.url) window.location.assign(res.data.url);
      else {
        toast.success("Plan geändert.");
        router.refresh();
      }
    } else {
      const res = await apiFetch("/api/billing/simulate", { body: { planKey, interval } });
      setBusy(null);
      if (!res.ok) return toast.error(res.error);
      toast.success("Plan im Demo-Modus aktiviert.");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {stripeEnabled && (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          <div className="flex items-start gap-3">
            <Checkbox id="accept" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} />
            <Label htmlFor="accept" className="font-normal leading-snug">
              Ich habe die{" "}
              <Link href="/agb" className="underline" target="_blank">
                AGB
              </Link>{" "}
              und die{" "}
              <Link href="/agb#widerruf" className="underline" target="_blank">
                Widerrufshinweise
              </Link>{" "}
              gelesen und akzeptiere sie. {t.billing.autoRenew}
            </Label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t.billing.withdrawalNote}</p>
        </div>
      )}
      <PlanCards
        plans={plans}
        priceCfg={priceCfg}
        currentPlanKey={currentPlanKey}
        defaultInterval={defaultInterval}
        renderAction={(plan, interval) =>
          stripeEnabled || demoAllowed ? (
            <Button
              className="w-full"
              variant={plan.key === "business" ? "default" : "outline"}
              disabled={busy !== null || (plan.key === currentPlanKey && !stripeEnabled)}
              onClick={() => order(plan.key, interval)}
              data-testid={`order-${plan.key}`}
            >
              {busy === plan.key ? t.common.loading : stripeEnabled ? t.billing.orderButton : t.billing.simulate}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Abrechnung derzeit nicht verfügbar.</p>
          )
        }
      />
    </div>
  );
}

export function PortalButton() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await apiFetch<{ url: string }>("/api/billing/portal", { method: "POST", body: {} });
        setBusy(false);
        if (!res.ok) return toast.error(res.error);
        window.location.assign(res.data.url);
      }}
    >
      {t.billing.portal}
    </Button>
  );
}

export function ResetDemoPlanButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        const res = await apiFetch("/api/billing/simulate", { body: { planKey: "free" } });
        if (!res.ok) return toast.error(res.error);
        toast.success("Zurück auf Testzugang.");
        router.refresh();
      }}
    >
      Demo-Plan zurücksetzen
    </Button>
  );
}
