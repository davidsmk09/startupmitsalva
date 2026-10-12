import type { Metadata } from "next";
import { Section } from "@/components/marketing/section";
import { botUserAgent } from "@/lib/crawl/fetcher";

export const metadata: Metadata = { title: "Unser Crawler", description: "Informationen zum Crawler, der Websites für den Technik-Check abruft." };

export default function BotPage() {
  return (
    <Section>
      <div className="prose prose-neutral mx-auto max-w-3xl dark:prose-invert">
        <h1>Informationen zu unserem Crawler</h1>
        <p>
          Für den technischen Website-Check rufen wir auf Wunsch unserer Kundinnen und Kunden deren Website ab (Startseite, robots.txt, Sitemap, llms.txt und
          bis zu 15 Unterseiten). Dabei verwenden wir folgenden User-Agent:
        </p>
        <pre>{botUserAgent()}</pre>
        <ul>
          <li>Wir rufen nur öffentlich erreichbare Seiten ab, ohne Umgehung von Bot-Schutz oder CAPTCHAs.</li>
          <li>Bei Websites Dritter (z. B. Wettbewerber) respektieren wir die robots.txt.</li>
          <li>Abrufe sind in Anzahl, Größe und Häufigkeit begrenzt.</li>
        </ul>
        <p>Fragen oder Beschwerden? Bitte nutze unser Kontaktformular.</p>
      </div>
    </Section>
  );
}
