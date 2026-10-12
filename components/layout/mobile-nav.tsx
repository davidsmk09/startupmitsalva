"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export function MobileNav({ links, loggedIn }: { links: { href: string; label: string }[]; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X /> : <Menu />}
      </Button>
      {open && (
        <nav id="mobile-menu" aria-label="Mobile Navigation" className="absolute inset-x-0 top-16 border-b bg-background p-4 shadow-md">
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block rounded-md px-3 py-2 hover:bg-accent" onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 flex gap-2">
              {loggedIn ? (
                <Button asChild className="w-full">
                  <Link href="/dashboard">{t.nav.dashboard}</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/login">{t.nav.login}</Link>
                  </Button>
                  <Button asChild className="flex-1">
                    <Link href="/gratis-check">{t.nav.freeCheck}</Link>
                  </Button>
                </>
              )}
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
