import { prisma } from "@/lib/db";
import { PLANS, SERVICE_PACKAGES } from "@/lib/billing/plans";
import { env } from "@/lib/env";
import { formatEuro } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata = { title: "Pläne" };
export const dynamic = "force-dynamic";

export default async function AdminPlans() {
  const subs = await prisma.subscription.groupBy({ by: ["planKey", "status"], _count: true });
  const plans = Object.values(PLANS);
  return (
    <>
      <PageHeader title="Plan-Konfiguration" description="Quelle: lib/billing/plans.ts (alle Preise sind Platzhalter, PREIS_PLATZHALTER)." />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle as="h2">Paket 1 – Stufen</CardTitle>
          <CardDescription>
            Stripe: {env.stripeEnabled ? "konfiguriert" : "nicht konfiguriert (Demo-Abrechnung)"} · Preisanzeige: {env.priceDisplay === "net" ? "netto" : "brutto"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Monat</TableHead>
                <TableHead>Jahr</TableHead>
                <TableHead>Projekte</TableHead>
                <TableHead>Prompts</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Scans/Monat</TableHead>
                <TableHead>Auto</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Abos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((p) => (
                <TableRow key={p.key}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{formatEuro(p.priceMonthlyCents)}</TableCell>
                  <TableCell>{formatEuro(p.priceYearlyCents)}</TableCell>
                  <TableCell>{p.limits.projects}</TableCell>
                  <TableCell>{p.limits.promptsPerProject}</TableCell>
                  <TableCell>{p.limits.providers}</TableCell>
                  <TableCell>{p.limits.manualScansPerMonth}</TableCell>
                  <TableCell>{[p.limits.weeklyScans && "wöchentlich", p.limits.dailyTopPrompts && "täglich"].filter(Boolean).join(" + ") || "–"}</TableCell>
                  <TableCell>{formatEuro(p.limits.monthlyBudgetCents)}</TableCell>
                  <TableCell>
                    {subs
                      .filter((s) => s.planKey === p.key)
                      .map((s) => `${s._count} ${s.status}`)
                      .join(", ") || "–"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle as="h2">Pakete 2 & 3</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {SERVICE_PACKAGES.map((s) => (
            <p key={s.paket}>
              Paket {s.paket} – {s.name}: ab {formatEuro(s.fromOneTimeCents)} einmalig, optional ab {formatEuro(s.optionalMonthlyCents)}/Monat
            </p>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
