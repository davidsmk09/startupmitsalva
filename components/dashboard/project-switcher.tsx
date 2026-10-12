"use client";

import { usePathname, useRouter } from "next/navigation";
import { t } from "@/lib/i18n";

export function ProjectSwitcher({ projects, activeId }: { projects: { id: string; name: string }[]; activeId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  if (projects.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="project-switcher" className="sr-only">
        {t.dashboard.projectSwitcher}
      </label>
      <select
        id="project-switcher"
        className="h-9 max-w-[220px] rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={activeId ?? ""}
        onChange={(e) => {
          const secure = location.protocol === "https:" ? "; Secure" : "";
          document.cookie = `active_project=${e.target.value}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
          const base = pathname.startsWith("/dashboard/scans/") || pathname.startsWith("/dashboard/projects/") ? "/dashboard" : pathname;
          router.push(base);
          router.refresh();
        }}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
