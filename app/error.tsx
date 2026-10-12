"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <p className="mt-4 text-sm font-semibold text-destructive">Fehler 500</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Da ist etwas schiefgelaufen</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Bitte versuche es erneut. Wenn das Problem bestehen bleibt, kontaktiere uns gern{error.digest ? ` (Fehler-ID: ${error.digest})` : ""}.
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Erneut versuchen</Button>
        <Button asChild variant="outline">
          <Link href="/">Zur Startseite</Link>
        </Button>
      </div>
    </main>
  );
}
