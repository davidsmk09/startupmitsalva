import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserOrg, requireUserPage } from "@/lib/auth/session";
import { getOrgPlan } from "@/lib/billing/limits";

export const ACTIVE_PROJECT_COOKIE = "active_project";

/** Lädt User, Organisation, Plan und Projekte für Dashboard-Seiten. */
export async function getDashboardContext(requestedProjectId?: string | null) {
  const user = await requireUserPage();
  const org = await getUserOrg(user.id);
  if (!org) notFound();
  const [plan, projects] = await Promise.all([
    getOrgPlan(org.id),
    prisma.project.findMany({ where: { orgId: org.id }, orderBy: { createdAt: "asc" } }),
  ]);
  const cookieProject = (await cookies()).get(ACTIVE_PROJECT_COOKIE)?.value;
  const active =
    projects.find((p) => p.id === requestedProjectId) ?? projects.find((p) => p.id === cookieProject) ?? projects[0] ?? null;
  return { user, org, plan, projects, activeProject: active };
}

/** Seite für ein Projekt: Zugriff prüfen (sonst 404). */
export async function getAccessibleProject(projectId: string, userId: string, role: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();
  if (role !== "ADMIN") {
    const m = await prisma.membership.findUnique({ where: { userId_orgId: { userId, orgId: project.orgId } } });
    if (!m) notFound();
  }
  return project;
}
