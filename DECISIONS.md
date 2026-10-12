# Entscheidungen (DECISIONS.md)

Hier sind alle Entscheidungen dokumentiert, die ohne Rückfrage getroffen wurden – jeweils mit Begründung. Alles ist bewusst so gebaut, dass es sich später leicht ändern lässt.

## Stack & Versionen

| Thema | Entscheidung | Begründung |
|---|---|---|
| Framework | **Next.js 16.4** (App Router, Turbopack), React 19, TypeScript strict | Aktuelle stabile Version. In Next 16 heißt die Middleware `proxy.ts` (statt `middleware.ts`); `next lint` entfällt, daher ESLint direkt (`eslint .`) mit `eslint-config-next`. |
| Auth | **NextAuth (Auth.js) v4.24** mit JWT-Sessions | v4 ist die aktuelle *stabile* Version (v5 ist weiterhin Beta). Credentials-Login + optional Google (nur aktiv, wenn beide ENV-Keys gesetzt sind). Kein DB-Adapter nötig. |
| Passwort-Hashing | **bcryptjs** (Kostenfaktor 12) | Reines JavaScript, keine nativen Builds → läuft überall (auch Serverless/Windows). |
| ORM | **Prisma 6.19** (`prisma-client-js`) | Prisma 7 erzwingt Driver-Adapter und `prisma.config.ts`; 6.x ist ausgereift und läuft unverändert auf SQLite und PostgreSQL. Die Deprecation-Warnung zu `package.json#prisma` ist bekannt und harmlos. |
| Enums/Listen im Schema | String-Felder statt Prisma-Enums, Listen als JSON-String | Exakt dasselbe Schema läuft auf SQLite und Postgres. Zulässige Werte stehen in `lib/constants.ts` und werden per zod validiert. |
| Postgres-Umstieg | `npm run db:use-postgres` | Prisma erlaubt keinen Provider per ENV. Das Skript stellt den Provider um und verschiebt die SQLite-Migrationen nach `prisma/migrations-sqlite`. |
| Styling | Tailwind CSS **3.4** + selbst geschriebene shadcn/ui-Komponenten (Radix) | Die Vorgabe „Akzentfarbe in `tailwind.config`“ passt direkt zu Tailwind 3. Die shadcn-CLI braucht Netzwerkzugriff zur Registry; die Komponenten wurden daher im shadcn-Stil direkt im Repo angelegt (`components/ui`). Die Akzentfarbe steht als CSS-Variable `--primary` in `app/globals.css` und ist über `tailwind.config.ts` angebunden. |
| Schrift | System-Schriftstapel | Kein Google-Fonts-Abruf beim Build (offline-fähig, DSGVO-freundlich, schnell). |
| Diagramme | Recharts 3 + eigenes SVG-Gauge | Gauge als reines SVG (kein JS nötig), Diagramme mit Tabellen-Alternative. Feste, farbfehlsichtigkeits-geprüfte Palette; die eigene Marke ist im Share-of-Voice-Chart hervorgehoben, Wettbewerber neutral. |
| PDF | **@react-pdf/renderer** | Läuft ohne Headless-Browser, auch auf Serverless. Standardschrift Helvetica (Umlaute ok); nicht darstellbare Zeichen werden ersetzt. |
| Validierung | zod 4 | In allen API-Routen und Formularen. |
| E-Mail | Resend per `fetch` (kein SDK) | Ohne `RESEND_API_KEY` landet jede Mail in der Konsole **und** in der Tabelle `OutboxEmail` (im Admin unter „E-Mail-Outbox“ einsehbar – praktisch für Verifizierungslinks im Demo-Betrieb). |
| Tests | Vitest 3, Playwright 1.56 | Playwright 1.56 passt zum vorinstallierten Chromium. E2E-Tests starten Web-App **und** echten Worker. |

## Produkt & Fachlogik

- **Testzugang („free“)**: Registrierte Nutzer ohne Abo erhalten einen kleinen, nicht verkäuflichen Plan (1 Projekt, 10 Prompts, 1 KI-Anbieter, 2 Scans/Monat, PDF). Sonst wäre „Registrierung → Projekt → Scan → PDF“ ohne Stripe nicht möglich (Definition of Done).
- **Starter ohne Wettbewerber**: „Wettbewerbsvergleich“ ist laut Tabelle ein Business-Extra. Im Starter-Plan können daher keine Wettbewerber angelegt werden; die Share-of-Voice-Gewichtung geht dann auf die Erwähnungsrate (wie spezifiziert).
- **Manuelle Scans** zählen gegen das Monatslimit des Plans; automatische (wöchentlich/täglich) nicht – sie sind durch das API-Budget gedeckelt.
- **API-Budget**: pro Plan (`monthlyBudgetCents`, Platzhalter) bzw. pro Organisation überschreibbar (`Organization.monthlyBudgetCents`). Vor dem Scan wird geschätzt (1.500 Tokens/Abfrage × Preis je 1k Tokens aus ENV); reicht das Budget nicht, bricht der Scan sauber mit Meldung ab. Wird das Budget während des Scans erreicht, werden restliche Abfragen übersprungen und der Scan als Teilergebnis markiert.
- **Gratis-Check**: 5 markenneutrale Prompts (Kategorie, Empfehlung, Vergleich, Lokal), 1 Anbieter, max. 2 Läufe je Prompt, harter Kosten-Deckel. Ergebnis über einen nicht erratbaren öffentlichen Token-Link (`noindex`). Rate-Limit: 3/Stunde und 10/Tag pro IP, 2/Tag pro Domain.
- **Mock-Provider**: Ohne Keys werden die vier Anbieter als „ChatGPT (Demo)“ usw. simuliert (deterministisch, Seed aus Prompt + Variante + Lauf), damit Diagramme realistisch aussehen. Überall als „Demo-Daten“ gekennzeichnet (Banner, Badge, PDF-Hinweis). Sobald mindestens ein echter Key gesetzt ist, werden **nur** echte Anbieter verwendet (keine Vermischung).
- **Prompt-IDs**: `kat-01`, `emp-03`, … bzw. `usr-01` für eigene Prompts. „Prompts neu vorschlagen“ ändert bestehende Prompts nie, sondern ergänzt neue (inaktiv) mit fortlaufenden IDs. Löschen = Deaktivieren, damit historische Läufe ihren Bezug behalten.
- **Schwankungsbreite**: Standardabweichung der Visibility-Scores über die N Wiederholungsläufe. Im Vergleich und in Wochenmails werden Änderungen innerhalb dieser Breite als „im Rauschen“ markiert.
- **Sentiment** wird nur mit Key berechnet, nur für Antworten mit Markenerwähnung, ist als experimentell markiert und fließt nicht in Scores ein. Der optionale Verifikations-Call (`SCAN_VERIFY_ENABLED`) prüft nur unscharfe (fuzzy) Treffer.
- **Empfehlungen** werden regelbasiert aus Audit-Ergebnissen und Messwerten erzeugt (keine erfundenen Fakten). Snippets (robots.txt, LocalBusiness/FAQPage-JSON-LD, llms.txt) enthalten klar markierte Platzhalter. Eine KI-formulierte Zusammenfassung wurde bewusst *nicht* eingebaut, um das Risiko erfundener Aussagen auszuschließen; die Executive Summary wird aus den Messdaten zusammengesetzt.
- **llms.txt-Check** ist nur INFO (kein Punktabzug), weil der Standard jung und freiwillig ist.
- **Admin-Empfehlung → Task**: Auf der Scan-Ergebnisseite sehen Admins im Tab „Empfehlungen“ einen Button „Als Service-Task anlegen“, sofern die Organisation ein Serviceprojekt hat.
- **Lead → Serviceprojekt**: Existiert ein Kundenkonto mit der Lead-E-Mail, wird dessen Organisation automatisch verknüpft (Kundenansicht „Projektstatus“). Sonst lässt sich die Verknüpfung später per E-Mail im Serviceprojekt setzen.
- **PromptSet**: Es gibt nur das Modell `Prompt` (am Projekt). Ein eigenes PromptSet-Modell brachte keinen Mehrwert, da jedes Projekt genau einen Prompt-Satz hat.

## Abrechnung

- Stripe nur Testmodus: Live-Keys (`sk_live_`) werden abgewiesen, außer `STRIPE_ALLOW_LIVE=true`. `npm run stripe:setup` akzeptiert ausschließlich `sk_test_`.
- Preise über **lookup_keys** (`business_month` usw.), dadurch keine Preis-IDs in ENV. Bei Preisänderung in `plans.ts` legt das Setup-Skript einen neuen Preis an und überträgt den lookup_key.
- Planwechsel mit aktivem Abo: direkte Aktualisierung des Abos mit anteiliger Verrechnung; Zahlungsdaten/Rechnungen/Kündigung im Stripe-Kundenportal.
- **Button-Lösung**: Pflicht-Checkbox (AGB + Widerrufshinweis) und Button „Zahlungspflichtig bestellen“ vor dem Checkout; serverseitig geprüft.
- **Demo-Abrechnung**: Ohne Stripe-Key können Pläne lokal aktiviert werden (nur außerhalb von Produktion bzw. mit `DEMO_BILLING=true`).
- Preisanzeige netto „zzgl. MwSt.“ (B2B), umschaltbar per `PRICE_DISPLAY=gross`.

## Infrastruktur & Sicherheit

- **Job-Queue** in der Datenbank (Tabelle `Job`), atomarer Claim per `updateMany`, Wiederaufnahme hängender Jobs nach 20 Minuten, Retry. `JOB_MODE=inline` verarbeitet Jobs ohne separaten Worker (Demo). Der Worker bietet optional einen Health-Port (`WORKER_HEALTH_PORT`).
- **Rate-Limiting** DB-gestützt (Tabelle `RateLimitBucket`), funktioniert damit auch über mehrere Instanzen/Serverless ohne Redis; In-Memory-Fallback bei DB-Fehlern. Die Client-IP stammt aus `X-Forwarded-For` – hinter einem vertrauenswürdigen Proxy betreiben.
- **CSRF**: Eigene API-Routen prüfen bei mutierenden Requests den `Origin`-Header (zusätzlich SameSite=Lax-Cookies). NextAuth hat einen eigenen CSRF-Schutz.
- **CSP**: `script-src 'self' 'unsafe-inline'` ist nötig für die von Next.js erzeugten Inline-Skripte, JSON-LD und das Theme-Init-Skript; Nonce-basierte CSP würde alle Seiten dynamisch machen. Kein `unsafe-eval` in Produktion. HSTS und `upgrade-insecure-requests` werden nur gesetzt, wenn `APP_URL` mit `https://` beginnt.
- **SSRF-Schutz**: Schema/Port/Host-Prüfung, DNS-Auflösung aller Adressen, Blockliste privater/Loopback/Link-Local/Metadaten-Bereiche (IPv4, IPv6, IPv4-mapped, NAT64), erneute Prüfung bei jeder Weiterleitung **und** beim Verbindungsaufbau (eigener DNS-Lookup im undici-Agent gegen DNS-Rebinding), max. 5 Redirects, max. 3 MB, Timeouts. Der Firecrawl-Weg prüft die Ziel-URL ebenfalls vorab.
- **robots.txt**: Für den Audit der *eigenen* Kundenwebsite wird robots.txt inhaltlich ausgewertet, aber nicht als Sperre behandelt (Kunde beauftragt die Prüfung). Für Fremdseiten steht `crawlSite(…, { respectRobots: true })` bereit.
- **White-Label-Logo** wird als Data-URL gespeichert (max. 300 KB, PNG/JPG), damit das PDF keine fremden URLs abruft.
- **PDF-Ablage** unter `storage/reports` (nicht im Repo). Auf Serverless flüchtig – Reports werden dann bei Bedarf neu erzeugt.
- **Konto löschen** löscht Organisationen, deren einziges Mitglied der Nutzer ist (inkl. Projekte/Scans), kündigt ein aktives Stripe-Abo und anonymisiert Leads mit derselben E-Mail.
- **E2E-Datenbank**: `prisma migrate reset` wird von Prisma aus KI-Agenten heraus blockiert. Das E2E-Setup verwendet daher das nicht-destruktive `migrate deploy` auf `prisma/e2e.db` und eindeutige Testdaten.
- **KI-Modelle**: Modellnamen nur per ENV (Defaults in `.env.example`, Kommentar „Namen veralten“). Anthropic-Default ist `claude-opus-5-5` mit serverseitigem Websuche-Tool und automatischem Refusal-Fallback; für geringere Kosten kann z. B. `claude-haiku-5-5` gesetzt werden (dann ggf. `ANTHROPIC_WEB_SEARCH_TOOL=web_search_20250305`).
- **UI-Sprache** zentral in `lib/i18n/de.ts` (App) und `lib/i18n/marketing-de.ts` (Marketingtexte).
