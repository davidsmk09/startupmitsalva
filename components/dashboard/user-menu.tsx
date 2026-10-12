"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export function LogoutButton() {
  return (
    <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
      <LogOut aria-hidden="true" />
      <span className="hidden sm:inline">{t.nav.logout}</span>
    </Button>
  );
}
