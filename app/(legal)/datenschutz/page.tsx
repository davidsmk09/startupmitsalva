import type { Metadata } from "next";
import { PlaceholderNotice } from "@/components/legal/placeholder-notice";

export const metadata: Metadata = { title: "Datenschutzerklärung" };

export default function PrivacyPage() {
  return (
    <article className="container prose prose-neutral max-w-3xl py-16 dark:prose-invert">
      <h1>Datenschutzerklärung</h1>
      <PlaceholderNotice />
      <h2>1. Verantwortlicher</h2>
      <p>[NAME/FIRMA, ANSCHRIFT, E-MAIL – siehe Impressum]</p>
      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li>Kontodaten: Name, E-Mail-Adresse, Passwort (nur als Hash gespeichert), Firmenname.</li>
        <li>Projektdaten: Domain, Markenname, Branche, Ort, Wettbewerber, Prompts, Scan-Ergebnisse.</li>
        <li>Anfragen (Gratis-Check, Angebot, Kontakt): Angaben aus dem Formular, Zeitpunkt der Einwilligung.</li>
        <li>Abrechnungsdaten: über Stripe (wir speichern keine vollständigen Zahlungsdaten).</li>
        <li>Technische Daten: IP-Adresse (kurzzeitig für Rate-Limiting/Missbrauchsschutz), Server-Logs.</li>
      </ul>
      <h2>3. Zwecke und Rechtsgrundlagen</h2>
      <p>[ZWECKE UND RECHTSGRUNDLAGEN NACH ART. 6 DSGVO ERGÄNZEN – z. B. Vertragserfüllung, Einwilligung, berechtigtes Interesse]</p>
      <h2>4. Auftragsverarbeiter und Empfänger</h2>
      <p>Für den Betrieb setzen wir folgende Dienstleister ein (Auftragsverarbeitungsverträge abschließen und hier konkret benennen):</p>
      <ul>
        <li>OpenAI (KI-Abfragen, ggf. Drittlandübermittlung USA)</li>
        <li>Anthropic (KI-Abfragen, ggf. Drittlandübermittlung USA)</li>
        <li>Google (Gemini, KI-Abfragen, ggf. Drittlandübermittlung USA)</li>
        <li>Perplexity (KI-Abfragen, ggf. Drittlandübermittlung USA)</li>
        <li>Stripe (Zahlungsabwicklung)</li>
        <li>[E-MAIL-DIENSTLEISTER, z. B. Resend]</li>
        <li>[HOSTING-ANBIETER, DATENBANK-ANBIETER]</li>
        <li>[OPTIONAL: Firecrawl (Website-Abruf)]</li>
      </ul>
      <p>
        An KI-Anbieter übermitteln wir ausschließlich die generierten Fragen (z. B. „Welcher Zahnarzt in Köln ist empfehlenswert?“) – keine personenbezogenen
        Kontodaten.
      </p>
      <h2>5. Cookies</h2>
      <p>
        Wir verwenden technisch notwendige Cookies (Anmeldung, Sicherheit, Cookie-Einstellung, ausgewähltes Projekt). Statistik-Cookies werden nur nach
        ausdrücklicher Einwilligung gesetzt und sind standardmäßig deaktiviert. Die Einstellung kannst du jederzeit über „Cookie-Einstellungen“ im Footer
        ändern.
      </p>
      <h2>6. Speicherdauer</h2>
      <p>[SPEICHERFRISTEN ERGÄNZEN]</p>
      <h2>7. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie auf Widerruf
        erteilter Einwilligungen. Im Kundenbereich kannst du deine Daten selbst exportieren und dein Konto vollständig löschen. Zudem besteht ein
        Beschwerderecht bei einer Aufsichtsbehörde.
      </p>
      <h2>8. Kontakt Datenschutz</h2>
      <p>[KONTAKT FÜR DATENSCHUTZANFRAGEN / GGF. DATENSCHUTZBEAUFTRAGTE]</p>
    </article>
  );
}
