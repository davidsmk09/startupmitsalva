import type { Metadata } from "next";
import { Toaster } from "sonner";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/session";
import { Logo } from "@/components/layout/logo";
import { LogoutButton } from "@/components/dashboard/user-menu";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Logo href="/admin" />
            <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">ADMIN</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              Zum Kundenbereich
            </Link>
            <span className="hidden text-muted-foreground md:inline">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
        <AdminNav />
      </header>
      <Toaster richColors position="top-right" closeButton />
        <main id="main" className="p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
