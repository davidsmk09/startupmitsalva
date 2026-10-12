"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  CreditCard,
  FolderKanban,
  GitCompareArrows,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageSquareText,
  Settings,
  Shield,
  X,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const items = [
  { href: "/dashboard", label: t.dashboard.nav.overview, icon: LayoutDashboard, exact: true },
  { href: "/dashboard/projects", label: t.dashboard.nav.projects, icon: FolderKanban },
  { href: "/dashboard/prompts", label: t.dashboard.nav.prompts, icon: MessageSquareText },
  { href: "/dashboard/scans", label: t.dashboard.nav.scans, icon: BarChart3 },
  { href: "/dashboard/compare", label: t.dashboard.nav.compare, icon: GitCompareArrows },
  { href: "/dashboard/service", label: t.dashboard.nav.service, icon: ListChecks, serviceOnly: true },
  { href: "/dashboard/billing", label: t.dashboard.nav.billing, icon: CreditCard },
  { href: "/dashboard/settings", label: t.dashboard.nav.settings, icon: Settings },
];

export function Sidebar({
  isAdmin,
  hasService,
  variant,
}: {
  isAdmin: boolean;
  hasService: boolean;
  variant: "desktop" | "mobile";
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = (
    <nav aria-label="Dashboard-Navigation" className="flex flex-col gap-1">
      {items
        .filter((i) => !i.serviceOnly || hasService)
        .map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      {isAdmin && (
        <Link
          href="/admin"
          className="mt-4 flex items-center gap-3 rounded-md border border-dashed px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Shield className="h-4 w-4" aria-hidden="true" />
          {t.dashboard.nav.admin}
        </Link>
      )}
    </nav>
  );
  if (variant === "desktop") {
    return (
      <aside className="hidden w-60 shrink-0 border-r bg-muted/30 p-4 lg:block">
        <div className="mb-6">
          <Logo href="/dashboard" />
        </div>
        {nav}
      </aside>
    );
  }
  return (
      <div className="lg:hidden">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
          aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        {open && (
          <div className="fixed inset-0 top-14 z-40 bg-background p-4">
            {nav}
          </div>
        )}
      </div>
  );
}
