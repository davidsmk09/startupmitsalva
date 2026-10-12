import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/page-header";
import { NewServiceProjectForm } from "@/components/admin/service-project-editor";

export const metadata = { title: "Serviceprojekte" };
export const dynamic = "force-dynamic";

export default async function AdminServiceProjects() {
  const projects = await prisma.serviceProject.findMany({ orderBy: { createdAt: "desc" }, include: { tasks: true, org: true, lead: true } });
  return (
    <>
      <PageHeader title="Serviceprojekte" description="Pakete 2 und 3 – Umsetzung durch das Team" />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle as="h2" className="text-base">
            Neues Serviceprojekt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NewServiceProjectForm />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projekt</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead>Fortschritt</TableHead>
                <TableHead>Angelegt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => {
                const done = p.tasks.filter((x) => x.status === "ERLEDIGT").length;
                const pct = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/admin/service-projects/${p.id}`} className="font-medium underline">
                        {p.title}
                      </Link>
                    </TableCell>
                    <TableCell>{p.paket}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.service.projectStatus[p.status] ?? p.status}</Badge>
                    </TableCell>
                    <TableCell>{p.org?.name ?? <span className="text-muted-foreground">nicht verknüpft</span>}</TableCell>
                    <TableCell className="min-w-[140px]">
                      <Progress value={pct} label={`Fortschritt ${p.title}`} />
                      <span className="text-xs text-muted-foreground">
                        {done}/{p.tasks.length} erledigt
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(p.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
