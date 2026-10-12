import Link from "next/link";
import { prisma } from "@/lib/db";
import { LEAD_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { LeadStatusSelect } from "@/components/admin/lead-controls";

export const metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

const SOURCE: Record<string, string> = { GRATIS_CHECK: "Gratis-Check", ANGEBOT: "Angebot", KONTAKT: "Kontakt", SEED: "Seed" };

export default async function AdminLeads() {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  return (
    <>
      <PageHeader title="Lead-Pipeline" description={`${leads.length} Leads`} />
      <div className="grid gap-4 overflow-x-auto pb-4 md:grid-cols-5" role="list" aria-label="Pipeline-Spalten">
        {LEAD_STATUS.map((status) => {
          const col = leads.filter((l) => l.status === status);
          return (
            <section key={status} role="listitem" aria-labelledby={`col-${status}`} className="min-w-[220px] rounded-lg bg-muted/50 p-3">
              <h2 id={`col-${status}`} className="mb-3 flex items-center justify-between text-sm font-semibold">
                {t.lead.status[status]} <Badge variant="secondary">{col.length}</Badge>
              </h2>
              <ul className="space-y-2">
                {col.map((l) => (
                  <li key={l.id} className="rounded-md border bg-background p-3 text-sm shadow-sm">
                    <Link href={`/admin/leads/${l.id}`} className="font-medium hover:underline">
                      {l.firma || l.name || l.email}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{l.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="outline">{SOURCE[l.source] ?? l.source}</Badge>
                      {l.paketInteresse && <Badge variant="info">Paket {l.paketInteresse}</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(l.createdAt)}</p>
                    <div className="mt-2">
                      <LeadStatusSelect leadId={l.id} status={l.status} compact />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
