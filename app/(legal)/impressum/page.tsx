import type { Metadata } from "next";
import { PlaceholderNotice } from "@/components/legal/placeholder-notice";

export const metadata: Metadata = { title: "Impressum", robots: { index: true, follow: true } };

export default function ImprintPage() {
  return (
    <article className="container prose prose-neutral max-w-3xl py-16 dark:prose-invert">
      <h1>Impressum</h1>
      <PlaceholderNotice />
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        [FIRMENNAME EINTRAGEN]
        <br />
        [STRASSE UND HAUSNUMMER]
        <br />
        [PLZ ORT]
        <br />
        [LAND]
      </p>
      <h2>Vertreten durch</h2>
      <p>[NAME DER/DES VERTRETUNGSBERECHTIGTEN]</p>
      <h2>Kontakt</h2>
      <p>
        Telefon: [TELEFON]
        <br />
        E-Mail: [E-MAIL]
      </p>
      <h2>Registereintrag</h2>
      <p>
        Registergericht: [AMTSGERICHT]
        <br />
        Registernummer: [HRB …]
      </p>
      <h2>Umsatzsteuer-ID</h2>
      <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG: [USt-IdNr.]</p>
      <h2>Verantwortlich für den Inhalt</h2>
      <p>[NAME, ANSCHRIFT]</p>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>[HINWEIS ZUR TEILNAHME AN STREITBEILEGUNGSVERFAHREN – RECHTLICH PRÜFEN]</p>
    </article>
  );
}
