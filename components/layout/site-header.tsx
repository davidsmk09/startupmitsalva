import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { t } from "@/lib/i18n";

export const marketingLinks = [
  { href: "/so-funktionierts", label: t.nav.howItWorks },
  { href: "/preise", label: t.nav.pricing },
  { href: "/faq", label: t.nav.faq },
  { href: "/kontakt", label: t.nav.contact },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Hauptnavigation" className="hidden items-center gap-6 md:flex">
          {marketingLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button asChild>
              <Link href="/dashboard">{t.nav.dashboard}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">{t.nav.login}</Link>
              </Button>
              <Button asChild>
                <Link href="/gratis-check">{t.nav.freeCheck}</Link>
              </Button>
            </>
          )}
        </div>
        <MobileNav links={marketingLinks} loggedIn={Boolean(user)} />
      </div>
    </header>
  );
}
