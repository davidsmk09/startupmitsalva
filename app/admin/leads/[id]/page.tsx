import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConvertLeadButton, LeadNotes, LeadStatusSelect } from "@/components/admin/lead-controls";

export const metadata = { title: "Lead" };
export const dynamic = "force-dynamic";

export default async function AdminLeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id }, include: { serviceProjects: true } });
  if (!lead) notFound();
  const quickScans = await prisma.scan.findMany({ where: { leadId: lead.id }, orderBy: { createdAt: "desc" }, take: 5 });
  const rows: [string, string | null][] = [
    ["Name", lead.name],
    ["E-Mail", lead.email],
    ["Firma", lead.firma],
    ["Website", lead.website],
    ["Branche", lead.branche],
    ["Paket-Interesse", lead.paketInteresse],
    ["Quelle", lead.source],
    ["Einwilligung", lead.consent ? `ja (${formatDate(lead.consentAt, true)})` : "nein"],
    ["Eingegangen", formatDate(lead.createdAt, true)],
  ];
  return (
    <>
      <PageHeader title={lead.firma || lead.name || lead.email} description="Lead-Details" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2">Angaben</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-[140px_1fr] gap-2 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd>{v || "–"}</dd>
                </div>
              ))}
            </dl>
            {lead.nachricht && (
              <div>
                <p className="text-sm font-medium">Nachricht</p>
                <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{lead.nachricht}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs">
                <LeadStatusSelect leadId={lead.id} status={lead.status} />
              </div>
              <LeadNotes leadId={lead.id} notes={lead.notes ?? ""} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle as="h2">Serviceprojekt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {lead.serviceProjects.map((sp) => (
                <p key={sp.id}>
                  <Link href={`/admin/service-projects/${sp.id}`} className="underline">
                    {sp.title}
                  </Link>
                </p>
              ))}
              <ConvertLeadButton leadId={lead.id} defaultPaket={Number(lead.paketInteresse ?? 2)} />
            </CardContent>
          </Card>
          {quickScans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle as="h2">Gratis-Checks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {quickScans.map((s) => (
                  <p key={s.id}>
                    {formatDate(s.createdAt, true)} · {s.status} · Score {s.overallScore === null ? "–" : Math.round(s.overallScore)}{" "}
                    {s.publicToken && (
                      <Link className="underline" href={`/gratis-check/ergebnis/${s.publicToken}`}>
                        ansehen
                      </Link>
                    )}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
