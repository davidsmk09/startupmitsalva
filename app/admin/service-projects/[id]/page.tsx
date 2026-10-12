import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { ServiceProjectEditor } from "@/components/admin/service-project-editor";

export const metadata = { title: "Serviceprojekt" };
export const dynamic = "force-dynamic";

export default async function AdminServiceProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sp = await prisma.serviceProject.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: [{ createdAt: "asc" }] },
      lead: true,
      org: { include: { memberships: { include: { user: true }, orderBy: { createdAt: "asc" } }, projects: true } },
    },
  });
  if (!sp) notFound();
  const ownerEmail = sp.org?.memberships[0]?.user.email ?? "";
  const latestScan = sp.org
    ? await prisma.scan.findFirst({ where: { project: { orgId: sp.org.id }, status: "COMPLETED" }, orderBy: { createdAt: "desc" } })
    : null;
  return (
    <>
      <PageHeader
        title={sp.title}
        description={sp.lead ? `Aus Lead: ${sp.lead.email}` : undefined}
        actions={
          latestScan ? (
            <Link href={`/dashboard/scans/${latestScan.id}?tab=recommendations`} className="text-sm underline">
              Empfehlungen des letzten Kundenscans → Tasks übernehmen
            </Link>
          ) : undefined
        }
      />
      <ServiceProjectEditor
        project={{ id: sp.id, title: sp.title, status: sp.status, notizen: sp.notizen, paket: sp.paket, orgEmail: ownerEmail }}
        tasks={sp.tasks.map((x) => ({
          id: x.id,
          titel: x.titel,
          beschreibung: x.beschreibung,
          kategorie: x.kategorie,
          status: x.status,
          zugewiesenAn: x.zugewiesenAn,
          dueDate: x.dueDate ? x.dueDate.toISOString().slice(0, 10) : null,
          sichtbarFuerKunde: x.sichtbarFuerKunde,
        }))}
      />
    </>
  );
}
