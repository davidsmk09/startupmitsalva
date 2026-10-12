import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { t } from "@/lib/i18n";

/** Lädt den angemeldeten User frisch aus der DB (Rolle/Löschung wirken sofort). */
export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, emailVerifiedAt: true, notifyWeekly: true, notifyAlerts: true, createdAt: true },
  });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Für Server-Komponenten/Seiten: leitet ohne Session zum Login weiter. */
export async function requireUserPage(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await requireUserPage();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/** Für API-Routen: wirft 401/403. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, t.common.unauthorized);
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ApiError(403, t.common.forbidden);
  return user;
}

/** Primäre Organisation des Users (erste Mitgliedschaft). */
export const getUserOrg = cache(async (userId: string) => {
  const m = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { org: { include: { subscription: true } } },
  });
  return m ? { ...m.org, membershipRole: m.role } : null;
});

export async function requireUserOrg() {
  const user = await requireUser();
  const org = await getUserOrg(user.id);
  if (!org) throw new ApiError(403, t.common.forbidden);
  return { user, org };
}

/**
 * Zugriffskontrolle: Projekt muss zu einer Organisation des Users gehören
 * (Admins dürfen alles sehen).
 */
export async function assertProjectAccess(userId: string, role: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new ApiError(404, t.common.notFound);
  if (role === "ADMIN") return project;
  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId: project.orgId } },
  });
  if (!membership) throw new ApiError(404, t.common.notFound);
  return project;
}

export async function assertScanAccess(userId: string, role: string, scanId: string) {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan || !scan.projectId) throw new ApiError(404, t.common.notFound);
  const project = await assertProjectAccess(userId, role, scan.projectId);
  return { scan, project };
}
