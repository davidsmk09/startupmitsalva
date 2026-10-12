"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  ["/admin", "Kennzahlen"],
  ["/admin/users", "Nutzer"],
  ["/admin/scans", "Scans"],
  ["/admin/leads", "Leads"],
  ["/admin/service-projects", "Serviceprojekte"],
  ["/admin/plans", "Pläne"],
  ["/admin/audit-log", "Audit-Log"],
  ["/admin/outbox", "E-Mail-Outbox"],
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin-Navigation" className="flex gap-1 overflow-x-auto px-4 pb-2">
      {items.map(([href, label]) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
