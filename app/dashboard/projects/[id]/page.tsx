import { getDashboardContext, getAccessibleProject } from "@/lib/dashboard/context";
import { parseJson } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProjectForm } from "@/components/dashboard/project-form";
import { DeleteProjectButton } from "./delete-button";

export const metadata = { title: "Projekt bearbeiten" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, plan } = await getDashboardContext();
  const project = await getAccessibleProject(id, user.id, user.role);
  const competitors = parseJson<{ name: string; domain?: string }[]>(project.competitors, []).map((c) => ({ name: c.name, domain: c.domain ?? "" }));
  return (
    <>
      <PageHeader title={project.name} description="Projektdaten bearbeiten" actions={<DeleteProjectButton projectId={project.id} />} />
      <div className="max-w-3xl">
        <ProjectForm
          mode="edit"
          projectId={project.id}
          maxCompetitors={plan.limits.competitors}
          initial={{
            name: project.name,
            brandName: project.brandName,
            brandAliases: parseJson(project.brandAliases, []),
            domain: project.domain,
            industry: project.industry,
            city: project.city,
            region: project.region ?? "",
            language: project.language === "en" ? "en" : "de",
            competitors,
          }}
        />
      </div>
    </>
  );
}
