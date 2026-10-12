import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { CookieSettingsButton } from "@/components/layout/cookie-banner";
import { t } from "@/lib/i18n";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div className="space-y-3 md:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">{t.footer.tagline}</p>
          <p className="max-w-sm text-xs text-muted-foreground">{t.common.honestyNote}</p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t.footer.product}</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/gratis-check">{t.nav.freeCheck}</Link></li>
            <li><Link className="hover:text-foreground" href="/so-funktionierts">{t.nav.howItWorks}</Link></li>
            <li><Link className="hover:text-foreground" href="/preise">{t.nav.pricing}</Link></li>
            <li><Link className="hover:text-foreground" href="/faq">{t.nav.faq}</Link></li>
            <li><Link className="hover:text-foreground" href="/kontakt">{t.nav.contact}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t.footer.legal}</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/impressum">{t.footer.imprint}</Link></li>
            <li><Link className="hover:text-foreground" href="/datenschutz">{t.footer.privacy}</Link></li>
            <li><Link className="hover:text-foreground" href="/agb">{t.footer.terms}</Link></li>
            <li><CookieSettingsButton className="hover:text-foreground" /></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {site.name}
      </div>
    </footer>
  );
}
