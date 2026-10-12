import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDashboardContext } from "@/lib/dashboard/context";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/dashboard/page-header";
import { PromptManager } from "@/components/dashboard/prompt-manager";
import { StartScanButton } from "@/components/dashboard/start-scan-button";

export const metadata = { title: "Prompts" };

export default async function PromptsPage() {
  const { plan, activeProject } = await getDashboardContext();
  if (!activeProject) {
    return (
      <EmptyState
        title="Noch kein Projekt"
        text="Lege zuerst ein Projekt an – wir schlagen dir dann passende Prompts vor."
        action={
          <Button asChild>
            <Link href="/dashboard/projects/new">Neues Projekt</Link>
          </Button>
        }
      />
    );
  }
  const prompts = await prisma.prompt.findMany({ where: { projectId: activeProject.id }, orderBy: { stableId: "asc" } });
  return (
    <>
      <PageHeader
        title="Prompts"
        description="Diese Fragen stellen wir den KI-Assistenten. Die IDs bleiben dauerhaft stabil, damit Verläufe vergleichbar sind."
        actions={<StartScanButton projectId={activeProject.id} />}
      />
      <PromptManager
        projectId={activeProject.id}
        prompts={prompts}
        limit={plan.limits.promptsPerProject}
        topAllowed={plan.limits.dailyTopPrompts}
        maxTop={plan.limits.maxTopPrompts}
      />
    </>
  );
}
