"use client";

/** Letzte Fehlergrenze (ersetzt das Root-Layout). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="de">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 40, textAlign: "center" }}>
        <h1>Da ist etwas schiefgelaufen</h1>
        <p>Bitte lade die Seite neu oder versuche es später erneut.</p>
        <button type="button" onClick={reset} style={{ padding: "10px 20px", marginTop: 16 }}>
          Erneut versuchen
        </button>
      </body>
    </html>
  );
}
