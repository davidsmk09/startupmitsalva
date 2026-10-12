import { AlertTriangle } from "lucide-react";

export function PlaceholderNotice() {
  return (
    <div role="note" className="not-prose mb-8 flex gap-3 rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4">
      <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
      <div>
        <p className="font-semibold">PLATZHALTER – Muss rechtlich geprüft und ausgefüllt werden.</p>
        <p className="text-sm text-muted-foreground">
          Dieser Text ist eine unverbindliche Vorlage ohne echte Firmendaten. Vor dem Livegang bitte vollständig ausfüllen und von einer Rechtsanwältin bzw.
          einem Rechtsanwalt prüfen lassen.
        </p>
      </div>
    </div>
  );
}
