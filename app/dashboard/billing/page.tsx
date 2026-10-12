import { CheckCircle2, Info } from "lucide-react";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getDashboardContext } from "@/lib/dashboard/context";
import { getUsage } from "@/lib/billing/limits";
import { PURCHASABLE_PLANS } from "@/lib/billing/plans";
import { priceDisplayConfig } from "@/lib/billing/format";
import { demoBillingAllowed } from "@/lib/billing/demo";
import { getStripe } from "@/lib/billing/stripe";
import { formatDate, formatEuro } from "@/lib/utils";
import { logger, errorMessage } from "@/lib/logger";
import { t } from "@/lib/i18n";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/page-header";
import { BillingPlanPicker, PortalButton, ResetDemoPlanButton } from "@/components/billing/billing-actions";
import { WhiteLabelForm } from "@/components/billing/white-label-form";

export const metadata = { title: "Abrechnung" };

const STATUS: Record<string, string> = {
  active: "aktiv",
  trialing: "Testphase",
  past_due: "Zahlung überfällig",
  canceled: "gekündigt",
  incomplete: "unvollständig",
  unpaid: "unbezahlt",
};

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ success?: string; canceled?: string; interval?: string }> }) {
  const sp = await searchParams;
  const { org, plan } = await getDashboardContext();
  const [sub, usage, fullOrg] = await Promise.all([
    prisma.subscription.findUnique({ where: { orgId: org.id } }),
    getUsage(org.id),
    prisma.organization.findUniqueOrThrow({ where: { id: org.id } }),
  ]);

  let invoices: { id: string; date: Date; amount: number; status: string; url: string | null }[] = [];
  if (env.stripeEnabled && org.stripeCustomerId) {
    try {
      const list = await getStripe().invoices.list({ customer: org.stripeCustomerId, limit: 12 });
      invoices = list.data.map((i) => ({
        id: i.number ?? i.id ?? "",
        date: new Date(i.created * 1000),
        amount: i.total,
        status: i.status ?? "",
        url: i.hosted_invoice_url ?? null,
      }));
    } catch (err) {
      logger.warn("billing.invoices_failed", { error: errorMessage(err) });
    }
  }

  return (
    <>
      <PageHeader title="Abrechnung" description="Plan, Nutzung, Zahlungsdaten und Rechnungen" />
      {sp.success && (
        <Alert variant="success" className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Vielen Dank!</AlertTitle>
          <AlertDescription>Dein Abo wird aktiviert, sobald die Zahlungsbestätigung von Stripe eingegangen ist (meist wenige Sekunden).</AlertDescription>
        </Alert>
      )}
      {!env.stripeEnabled && (
        <Alert variant="info" className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>{t.billing.stripeMissing}</AlertDescription>
        </Alert>
      )}

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle as="h2">{t.billing.currentPlan}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-2xl font-bold">{plan.name}</p>
            {sub ? (
              <>
                <p>
                  Status: <Badge variant={sub.status === "active" ? "success" : "warning"}>{STATUS[sub.status] ?? sub.status}</Badge>
                </p>
                <p>Abrechnung: {sub.interval === "year" ? "jährlich" : "monatlich"}</p>
                {sub.currentPeriodEnd && (
                  <p>
                    {sub.cancelAtPeriodEnd ? "Endet am" : "Verlängert sich am"} {formatDate(sub.currentPeriodEnd)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">{t.billing.noPlan} – du nutzt den kostenlosen Testzugang.</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {env.stripeEnabled && org.stripeCustomerId && <PortalButton />}
              {!env.stripeEnabled && sub && demoBillingAllowed() && <ResetDemoPlanButton />}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle as="h2">Nutzung diesen Monat</CardTitle>
            <CardDescription>Limits werden serverseitig bei jeder Aktion geprüft.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Manuelle Scans</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {usage.scans} / {plan.limits.manualScansPerMonth}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">KI-Abfragen</dt>
                <dd className="text-lg font-semibold tabular-nums">{usage.promptRuns}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">API-Kosten (geschätzt)</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {formatEuro(usage.costCents, { decimals: true })} / {formatEuro(fullOrg.monthlyBudgetCents ?? plan.limits.monthlyBudgetCents)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Projekte / Prompts</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {plan.limits.projects} / {plan.limits.promptsPerProject}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-4 text-xl font-semibold">Plan wählen oder wechseln</h2>
      <BillingPlanPicker
        plans={PURCHASABLE_PLANS}
        priceCfg={priceDisplayConfig()}
        currentPlanKey={plan.key}
        stripeEnabled={env.stripeEnabled}
        demoAllowed={demoBillingAllowed()}
        defaultInterval={sp.interval === "year" ? "year" : "month"}
      />

      {plan.features.whiteLabelPdf && (
        <Card className="mt-8 max-w-2xl">
          <CardHeader>
            <CardTitle as="h2">White-Label-PDF</CardTitle>
            <CardDescription>Eigener Name und eigenes Logo im PDF-Report.</CardDescription>
          </CardHeader>
          <CardContent>
            <WhiteLabelForm initialName={fullOrg.whiteLabelName ?? ""} hasLogo={Boolean(fullOrg.whiteLabelLogoUrl)} />
          </CardContent>
        </Card>
      )}

      {invoices.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle as="h2">Rechnungen</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Betrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Link</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.id}</TableCell>
                    <TableCell>{formatDate(i.date)}</TableCell>
                    <TableCell className="tabular-nums">{formatEuro(i.amount, { decimals: true })}</TableCell>
                    <TableCell>{i.status}</TableCell>
                    <TableCell>
                      {i.url && (
                        <a href={i.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                          Ansehen
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
