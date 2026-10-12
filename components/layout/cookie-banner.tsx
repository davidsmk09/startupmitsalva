"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

const COOKIE = "cookie_consent";

export type Consent = "necessary" | "analytics";

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )cookie_consent=([^;]+)/);
  return m ? (decodeURIComponent(m[1]) as Consent) : null;
}

function writeConsent(value: Consent) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`;
}

/**
 * DSGVO-Cookie-Banner. Standard: nur technisch notwendige Cookies.
 * Analytics ist standardmäßig AUS und wird erst nach Einwilligung geladen
 * (aktuell ist kein Analytics-Tool eingebunden – Hook für später).
 */
export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(readConsent() === null);
    const handler = () => setOpen(true);
    window.addEventListener("open-cookie-settings", handler);
    return () => window.removeEventListener("open-cookie-settings", handler);
  }, []);

  if (!open) return null;

  const choose = (c: Consent) => {
    writeConsent(c);
    setOpen(false);
    window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: c }));
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 p-4 shadow-lg backdrop-blur sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-md sm:rounded-lg sm:border"
    >
      <h2 id="cookie-title" className="font-semibold">
        {t.cookie.title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t.cookie.text}{" "}
        <Link href="/datenschutz" className="underline">
          {t.cookie.more}
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => choose("necessary")} data-testid="cookie-necessary">
          {t.cookie.acceptNecessary}
        </Button>
        <Button size="sm" variant="outline" onClick={() => choose("analytics")}>
          {t.cookie.acceptAll}
        </Button>
      </div>
    </div>
  );
}

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event("open-cookie-settings"))}
    >
      {t.footer.cookieSettings}
    </button>
  );
}
