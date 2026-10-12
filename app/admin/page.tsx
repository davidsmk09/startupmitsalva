import Link from "next/link";
import { prisma } from "@/lib/db";
import { currentMonth, daysAgo, formatEuro } from "@/lib/utils";
import { isDemoMode } from "@/lib/providers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata = { title: "Kennzahlen" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const [users, activeSubs, scansMonth, failedScans, usage, openLeads, serviceProjects, jobsPending] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { status: { in: ["active", "trialing", "past_due"] } } }),
    prisma.scan.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.scan.count({ where: { status: "FAILED", createdAt: { gte: daysAgo(7) } } }),
    prisma.usageCounter.aggregate({ where: { month: currentMonth() }, _sum: { costCents: true, promptRuns: true } }),
    prisma.lead.count({ where: { status: { in: ["NEU", "KONTAKTIERT", "ANGEBOT"] } } }),
    prisma.serviceProject.count({ where: { status: { in: ["PLANUNG", "IN_ARBEIT"] } } }),
    prisma.job.count({ where: { status: { in: ["PENDING", "RUNNING"] } } }),
  ]);
  const quickCostCents = await prisma.scan.aggregate({ where: { type: "QUICK", createdAt: { gte: monthStart } }, _sum: { costEstimateCents: true } });
  const kpis = [
    { label: "Nutzer", value: users, href: "/admin/users" },
    { label: "Aktive Abos", value: activeSubs, href: "/admin/plans" },
    { label: "Scans diesen Monat", value: scansMonth, href: "/admin/scans" },
    { label: "Fehlgeschlagene Scans (7 Tage)", value: failedScans, href: "/admin/scans?status=FAILED" },
    {
      label: "Geschätzte API-Kosten (Monat)",
      value: formatEuro((usage._sum.costCents ?? 0) + (quickCostCents._sum.costEstimateCents ?? 0), { decimals: true }),
      hint: `${usage._sum.promptRuns ?? 0} KI-Abfragen (Kunden) + Gratis-Checks`,
    },
    { label: "Offene Leads", value: openLeads, href: "/admin/leads" },
    { label: "Laufende Serviceprojekte", value: serviceProjects, href: "/admin/service-projects" },
    { label: "Jobs in Warteschlange", value: jobsPending, hint: "Läuft der Worker?" },
  ];
  return (
    <>
      <PageHeader title="Kennzahlen" description={isDemoMode() ? "Demo-Modus aktiv: keine KI-API-Keys hinterlegt." : undefined} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardDescription>{k.label}</CardDescription>
              <CardTitle as="h2" className="text-3xl tabular-nums">
                {k.href ? (
                  <Link href={k.href} className="hover:underline">
                    {k.value}
                  </Link>
                ) : (
                  k.value
                )}
              </CardTitle>
            </CardHeader>
            {k.hint && <CardContent className="text-xs text-muted-foreground">{k.hint}</CardContent>}
          </Card>
        ))}
      </div>
    </>
  );
}
