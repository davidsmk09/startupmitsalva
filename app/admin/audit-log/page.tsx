import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata = { title: "Audit-Log" };
export const dynamic = "force-dynamic";

export default async function AdminAuditLog() {
  const entries = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  const actorIds = Array.from(new Set(entries.map((e) => e.actorId).filter((x): x is string => Boolean(x))));
  const actors = new Map((await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, email: true } })).map((u) => [u.id, u.email]));
  return (
    <>
      <PageHeader title="Audit-Log" description="Wichtige Admin- und Billing-Ereignisse (letzte 300)" />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zeit</TableHead>
                <TableHead>Aktion</TableHead>
                <TableHead>Akteur</TableHead>
                <TableHead>Ziel</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(e.createdAt, true)}</TableCell>
                  <TableCell>
                    <code className="text-xs">{e.action}</code>
                  </TableCell>
                  <TableCell>{e.actorId ? (actors.get(e.actorId) ?? e.actorId) : "System"}</TableCell>
                  <TableCell className="text-xs">
                    {e.targetType} {e.targetId}
                  </TableCell>
                  <TableCell className="max-w-md truncate text-xs text-muted-foreground">{e.metaJson}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
