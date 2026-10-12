import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { prisma } from "@/lib/db";
import { getDashboardContext } from "@/lib/dashboard/context";
import { formatDate } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/dashboard/page-header";

export const metadata = { title: "Projekte" };

export default async function ProjectsPage() {
  const { org, plan, projects } = await getDashboardContext();
  const stats = await prisma.scan.groupBy({
    by: ["projectId"],
    where: { project: { orgId: org.id }, status: "COMPLETED" },
    _count: true,
    _max: { createdAt: true },
  });
  const canCreate = projects.length < plan.limits.projects;
  return (
    <>
      <PageHeader
        title={t.dashboard.nav.projects}
        description={`${projects.length} von ${plan.limits.projects} Projekt(en) im Plan „${plan.name}“.`}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/dashboard/projects/new">{t.dashboard.newProject}</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/dashboard/billing">Mehr Projekte? Plan wechseln</Link>
            </Button>
          )
        }
      />
      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderPlus className="h-10 w-10" />}
          title={t.dashboard.noProjectTitle}
          text={t.dashboard.noProjectText}
          action={
            <Button asChild>
              <Link href="/dashboard/projects/new">{t.dashboard.newProject}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const s = stats.find((x) => x.projectId === p.id);
            return (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle as="h2">{p.name}</CardTitle>
                  <CardDescription>
                    {p.domain} · {p.industry} in {p.city}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {s?._count ?? 0} Scans{s?._max.createdAt ? ` · zuletzt ${formatDate(s._max.createdAt)}` : ""}
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/projects/${p.id}`}>{t.common.edit}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
