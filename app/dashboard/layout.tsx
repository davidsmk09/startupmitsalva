import type { Metadata } from "next";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ProjectSwitcher } from "@/components/dashboard/project-switcher";
import { LogoutButton } from "@/components/dashboard/user-menu";
import { VerifyBanner } from "@/components/dashboard/verify-banner";
import { DemoBanner } from "@/components/dashboard/demo-banner";
import { Badge } from "@/components/ui/badge";
import { getDashboardContext } from "@/lib/dashboard/context";
import { isDemoMode } from "@/lib/providers";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Dashboard" }, robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getDashboardContext();
  const hasService = (await prisma.serviceProject.count({ where: { orgId: ctx.org.id } })) > 0;
  return (
    <div className="flex min-h-screen">
      <Sidebar variant="desktop" isAdmin={ctx.user.role === "ADMIN"} hasService={hasService} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <Sidebar variant="mobile" isAdmin={ctx.user.role === "ADMIN"} hasService={hasService} />
            <ProjectSwitcher projects={ctx.projects.map((p) => ({ id: p.id, name: p.name }))} activeId={ctx.activeProject?.id ?? null} />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info" className="hidden sm:inline-flex">
              Plan: {ctx.plan.name}
            </Badge>
            <span className="hidden max-w-[180px] truncate text-sm text-muted-foreground md:inline">{ctx.user.email}</span>
            <LogoutButton />
          </div>
        </header>
        {!ctx.user.emailVerifiedAt && <VerifyBanner />}
        {isDemoMode() && <DemoBanner />}
        <main id="main" className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
