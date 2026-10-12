import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { CookieBanner } from "@/components/layout/cookie-banner";
import { site } from "@/lib/site";
import { t } from "@/lib/i18n";
import "./globals.css";

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(site.url),
    title: { default: `${site.name} – KI-Sichtbarkeit messen und verbessern`, template: `%s | ${site.name}` },
    description: site.description,
    applicationName: site.name,
    openGraph: {
      type: "website",
      locale: site.locale,
      siteName: site.name,
      title: `${site.name} – KI-Sichtbarkeit messen und verbessern`,
      description: site.description,
      url: site.url,
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          {t.nav.skipToContent}
        </a>
        {children}
        <CookieBanner />
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
