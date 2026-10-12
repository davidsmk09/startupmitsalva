import type { Metadata } from "next";
import { PlaceholderNotice } from "@/components/legal/placeholder-notice";

export const metadata: Metadata = { title: "AGB" };

export default function TermsPage() {
  return (
    <article className="container prose prose-neutral max-w-3xl py-16 dark:prose-invert">
      <h1>Allgemeine Geschäftsbedingungen</h1>
      <PlaceholderNotice />
      <h2>§ 1 Geltungsbereich</h2>
      <p>[GELTUNGSBEREICH, VERTRAGSPARTNER – Angebot richtet sich an Unternehmer i. S. d. § 14 BGB; ggf. Regelungen für Verbraucher]</p>
      <h2>§ 2 Leistungen</h2>
      <p>
        [LEISTUNGSBESCHREIBUNG PAKET 1–3]. Der Anbieter misst und analysiert die Sichtbarkeit in KI-Antworten und gibt Empfehlungen. Ein bestimmter Erfolg,
        insbesondere Erwähnungen oder Platzierungen in Antworten von KI-Systemen Dritter, wird nicht geschuldet, da diese Systeme außerhalb des Einflusses
        des Anbieters liegen und ihre Antworten schwanken.
      </p>
      <h2>§ 3 Vertragsschluss</h2>
      <p>[VERTRAGSSCHLUSS ÜBER DEN BUTTON „ZAHLUNGSPFLICHTIG BESTELLEN“, BESTÄTIGUNG PER E-MAIL]</p>
      <h2>§ 4 Preise und Zahlung</h2>
      <p>[PREISE ZZGL. MWST., ZAHLUNG ÜBER STRIPE, ABRECHNUNGSZEITRAUM]</p>
      <h2>§ 5 Laufzeit und Kündigung</h2>
      <p>[MONATSABO: KÜNDIGUNG ZUM ENDE DES ABRECHNUNGSZEITRAUMS; JAHRESABO: ZUM ENDE DER LAUFZEIT; KÜNDIGUNGSBUTTON]</p>
      <h2 id="widerruf">§ 6 Widerrufsbelehrung (nur für Verbraucher)</h2>
      <p>[WIDERRUFSBELEHRUNG UND MUSTER-WIDERRUFSFORMULAR – RECHTLICH PRÜFEN; Hinweise zum vorzeitigen Erlöschen bei digitalen Leistungen]</p>
      <h2>§ 7 Haftung</h2>
      <p>[HAFTUNGSREGELUNGEN]</p>
      <h2>§ 8 Datenschutz und Auftragsverarbeitung</h2>
      <p>[VERWEIS AUF DATENSCHUTZERKLÄRUNG, AVV FÜR GESCHÄFTSKUNDEN]</p>
      <h2>§ 9 Schlussbestimmungen</h2>
      <p>[ANWENDBARES RECHT, GERICHTSSTAND]</p>
    </article>
  );
}
