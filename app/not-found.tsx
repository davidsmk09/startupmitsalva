import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex h-16 items-center">
        <Logo />
      </header>
      <main id="main" className="container flex flex-1 flex-col items-center justify-center py-16 text-center">
        <Compass className="h-12 w-12 text-primary" aria-hidden="true" />
        <p className="mt-4 text-sm font-semibold text-primary">Fehler 404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Seite nicht gefunden</h1>
        <p className="mt-3 max-w-md text-muted-foreground">Die angeforderte Seite existiert nicht oder wurde verschoben.</p>
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link href="/">Zur Startseite</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Zum Dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
