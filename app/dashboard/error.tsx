"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Alert variant="destructive" className="max-w-2xl">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Diese Ansicht konnte nicht geladen werden</AlertTitle>
      <AlertDescription>
        <p>Bitte versuche es erneut.{error.digest ? ` Fehler-ID: ${error.digest}` : ""}</p>
        <Button size="sm" className="mt-3" onClick={reset}>
          Erneut versuchen
        </Button>
      </AlertDescription>
    </Alert>
  );
}
