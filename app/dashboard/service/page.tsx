import { CheckCircle2, Circle, Loader } from "lucide-react";
import { prisma } from "@/lib/db";
import { getDashboardContext } from "@/lib/dashboard/context";
import { formatDate } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader, EmptyState } from "@/components/dashboard/page-header";

export const metadata = { title: "Projektstatus" };

const ICON = { OFFEN: Circle, IN_ARBEIT: Loader, ERLEDIGT: CheckCircle2 } as const;

/** Kundenansicht für Paket 2/3: sichtbare Service-Tasks mit Fortschritt. */
export default async function ServiceStatusPage() {
  const { org } = await getDashboardContext();
  const projects = await prisma.serviceProject.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    include: { tasks: { where: { sichtbarFuerKunde: true }, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] } },
  });
  if (projects.length === 0) {
    return (
      <>
        <PageHeader title="Projektstatus" />
        <EmptyState title="Kein Serviceprojekt" text="Hier siehst du den Fortschritt, sobald wir für dich an Paket 2 oder 3 arbeiten." />
      </>
    );
  }
  return (
    <>
      <PageHeader title="Projektstatus" description="Was wir gerade für dich umsetzen." />
      <div className="space-y-6">
        {projects.map((p) => {
          const done = p.tasks.filter((x) => x.status === "ERLEDIGT").length;
          const pct = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
          return (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle as="h2">{p.title}</CardTitle>
                  <Badge variant="outline">Paket {p.paket}</Badge>
                  <Badge variant="info">{t.service.projectStatus[p.status] ?? p.status}</Badge>
                </div>
                <CardDescription>
                  {done} von {p.tasks.length} Aufgaben erledigt
                </CardDescription>
                <Progress value={pct} label={`Fortschritt ${p.title}`} className="mt-2" />
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {p.tasks.map((task) => {
                    const Icon = ICON[task.status as keyof typeof ICON] ?? Circle;
                    return (
                      <li key={task.id} className="flex items-start gap-3 py-3">
                        <Icon
                          className={`mt-0.5 h-5 w-5 shrink-0 ${task.status === "ERLEDIGT" ? "text-success" : task.status === "IN_ARBEIT" ? "text-primary" : "text-muted-foreground"}`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={task.status === "ERLEDIGT" ? "text-muted-foreground line-through" : "font-medium"}>{task.titel}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.service.category[task.kategorie] ?? task.kategorie}
                            {task.dueDate && ` · fällig ${formatDate(task.dueDate)}`}
                          </p>
                        </div>
                        <Badge variant={task.status === "ERLEDIGT" ? "success" : task.status === "IN_ARBEIT" ? "info" : "secondary"}>
                          {t.service.taskStatus[task.status] ?? task.status}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
