import Link from "next/link";
import { getDashboardContext } from "@/lib/dashboard/context";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/dashboard/page-header";
import { ProjectForm } from "@/components/dashboard/project-form";

export const metadata = { title: "Neues Projekt" };

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; brand?: string; industry?: string; city?: string }>;
}) {
  const sp = await searchParams;
  const { plan, projects } = await getDashboardContext();
  if (projects.length >= plan.limits.projects) {
    return (
      <>
        <PageHeader title="Neues Projekt" />
        <EmptyState
          title="Projekt-Limit erreicht"
          text={`Dein Plan „${plan.name}“ umfasst ${plan.limits.projects} Projekt(e).`}
          action={
            <Button asChild>
              <Link href="/dashboard/billing">Plan wechseln</Link>
            </Button>
          }
        />
      </>
    );
  }
  return (
    <>
      <PageHeader title="Neues Projekt" description="In vier kurzen Schritten zu deinem ersten Scan." />
      <div className="max-w-3xl">
        <ProjectForm
          mode="create"
          maxCompetitors={plan.limits.competitors}
          initial={{
            name: "",
            brandName: (sp.brand ?? "").slice(0, 100),
            brandAliases: [],
            domain: (sp.domain ?? "").slice(0, 200),
            industry: (sp.industry ?? "").slice(0, 100),
            city: (sp.city ?? "").slice(0, 100),
            region: "",
            language: "de",
            competitors: [],
          }}
        />
      </div>
    </>
  );
}
