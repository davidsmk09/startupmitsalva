import type { ServiceTaskCategory } from "@/lib/constants";

/** Standard-Tasks für Serviceprojekte (Paket 2: Website; Paket 3: zusätzlich Verzeichnisse + Ads). */
export function defaultServiceTasks(paket: number): { titel: string; kategorie: ServiceTaskCategory; beschreibung?: string }[] {
  const website: { titel: string; kategorie: ServiceTaskCategory }[] = [
    { titel: "Kick-off & Ausgangsmessung (Scan)", kategorie: "SONSTIGES" },
    { titel: "robots.txt, Sitemap und llms.txt einrichten", kategorie: "WEBSITE" },
    { titel: "Strukturierte Daten (LocalBusiness, Service, FAQPage)", kategorie: "WEBSITE" },
    { titel: "Leistungsseiten antwortfähig strukturieren", kategorie: "WEBSITE" },
    { titel: "FAQ-Bereich mit echten Kundenfragen", kategorie: "WEBSITE" },
    { titel: "Vertrauenssignale: Über uns, Team, Referenzen", kategorie: "WEBSITE" },
    { titel: "Kontaktdaten (NAP) vereinheitlichen", kategorie: "WEBSITE" },
    { titel: "Abschlussmessung & Bericht", kategorie: "SONSTIGES" },
  ];
  if (paket !== 3) return website;
  return [
    ...website.slice(0, 7),
    { titel: "Google-Unternehmensprofil optimieren", kategorie: "VERZEICHNIS" },
    { titel: "Einträge in Branchenverzeichnissen anlegen/korrigieren", kategorie: "VERZEICHNIS" },
    { titel: "Google-Ads-Konto und Kampagnenstruktur aufsetzen", kategorie: "ADS" },
    { titel: "Anzeigen & Keywords für Kernleistungen", kategorie: "ADS" },
    website[7],
  ];
}
