# KI-Sichtbar – KI-Sichtbarkeits-Plattform (GEO-Screener + Services)

Deutschsprachige Plattform für KMU im DACH-Raum: misst, wie sichtbar eine Marke in Antworten von **ChatGPT, Perplexity, Gemini und Claude** ist, prüft die Website technisch und leitet priorisierte Maßnahmen ab. Drei Pakete: Screener-Abo (Self-Service, Stripe), Screener + Überarbeitung und Komplettpaket (Angebot auf Anfrage).

> **Ehrlichkeit:** Die App verspricht keine Rankings oder Erwähnungen. KI-Antworten schwanken – wir messen mehrfach, zeigen Trends und Schwankungsbreiten.

Der Produktname ist ein Platzhalter (`APP_NAME`). Alle Preise sind Platzhalter (`lib/billing/plans.ts`, markiert mit `PREIS_PLATZHALTER`).

---

## Schnellstart (unter 10 Minuten, ohne externe Keys)

Voraussetzung: **Node.js ≥ 20.9** (getestet mit Node 22).

```bash
git clone <repo> && cd <repo>
cp .env.example .env          # Defaults funktionieren lokal sofort
npm install                   # erzeugt auch den Prisma-Client
npx prisma migrate dev        # legt prisma/dev.db (SQLite) an und führt den Seed aus
npm run seed                  # idempotent; nötig, falls die DB schon existierte
npm run dev                   # http://localhost:3000
npm run worker                # zweites Terminal: verarbeitet Scans
```

Für eine Produktion bitte `NEXTAUTH_SECRET` und `CRON_SECRET` durch zufällige Werte ersetzen (`openssl rand -base64 32`).

**Zugänge nach dem Seed**

| Rolle | E-Mail | Passwort |
|---|---|---|
| Admin | `SEED_ADMIN_EMAIL` (Default `admin@example.com`) | `SEED_ADMIN_PASSWORD` (Default `AdminPasswort123!`) |
| Demo-Kunde (Plan Business) | `demo@example.com` | `DemoPasswort123!` |

Ohne KI-Keys läuft alles im **Mock-Modus**: realistische, deterministische Demo-Antworten, im UI und PDF als „Demo-Daten“ gekennzeichnet. Ohne `RESEND_API_KEY` werden E-Mails (z. B. Verifizierungslinks) in der Konsole ausgegeben und im Admin unter **E-Mail-Outbox** angezeigt.

> Kein zweites Terminal gewünscht? `JOB_MODE="inline"` in `.env` setzen – dann laufen Scans direkt im Web-Prozess (nur für Demos).

Hinweis: Der Technik-Check ruft die eingegebene Website tatsächlich ab. Für fiktive Domains (wie in den Seed-Daten) meldet er „Website nicht erreichbar“ – das ist korrekt.

---

## Was ist drin?

- **Marketing**: Startseite, Preise (Monat/Jahr-Umschalter, Vergleichstabelle), So funktioniert's, FAQ (FAQPage-JSON-LD), Kontakt, Angebotsanfrage (Pakete 2/3), **Gratis-Check** ohne Login mit Teaser-Ergebnis, Rechtstext-Platzhalter, `sitemap.xml`, `robots.txt` (KI-Crawler erlaubt), `llms.txt`, OpenGraph-Bild, Cookie-Banner (nur notwendige Cookies standardmäßig).
- **Auth**: Registrierung (mit automatischer Organisation), Login, E-Mail-Verifizierung, Passwort vergessen/zurücksetzen, optional Google-Login, Rate-Limits, geschützte Routen (`proxy.ts`).
- **Dashboard**: Übersicht (Gauge, Verlauf, Scores je Anbieter, Top-Empfehlungen, Nutzung), Projekte (Wizard), Prompts (stabile IDs, bearbeiten, ergänzen, deaktivieren, neu vorschlagen, Top-Prompts), Scan mit Live-Status, Ergebnis-Tabs (Übersicht · KI-Antworten · Quellen & Zitate · Wettbewerb · Technik-Check · Empfehlungen), Vergleich zweier Scans, PDF-Report, Projektstatus (Pakete 2/3), Abrechnung, Einstellungen (Profil, Passwort, Benachrichtigungen, Datenexport, Konto löschen).
- **Admin** (`/admin`, nur Rolle ADMIN): Kennzahlen, Nutzer, Scans (Fehlerdetails, erneut ausführen), Lead-Pipeline (Kanban), Serviceprojekte mit Tasks, Plan-Konfiguration, Audit-Log, E-Mail-Outbox.
- **Scan-Engine**: Provider-Adapter (OpenAI Responses + Websuche, Perplexity Sonar, Gemini + Search-Grounding, Anthropic + Websuche, Mock), Timeout/Retry/Concurrency, Kosten- und Budget-Deckel, Prompt-Generator, Parser (Fuzzy-Markenerkennung), Scoring mit Schwankungsbreite, Sentiment (experimentell).
- **Technik-Check**: 13 Checks (robots.txt/KI-Crawler, Sitemap, llms.txt, HTTPS, Inhalt ohne JS, JSON-LD, Meta, antwortfähige Inhalte, Vertrauenssignale, NAP-Konsistenz, Performance-Indikatoren, Belege, externe Präsenz) mit SSRF-geschütztem Fetcher.

---

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run worker` | Job-Worker (Scans) |
| `npm run build` / `npm start` | Produktions-Build / -Server |
| `npm run lint` · `npm run typecheck` · `npm test` | ESLint · TypeScript · Vitest (Unit) |
| `npm run test:e2e` | Playwright-E2E gegen Dev-Server (Mock-Modus, eigene DB `prisma/e2e.db`) |
| `npm run test:e2e:build` | E2E gegen Produktions-Build (empfohlen, stabiler) |
| `npm run seed` | Seed-Daten (idempotent) |
| `npm run stripe:setup` | Stripe-Produkte/-Preise anlegen (nur Testmodus, idempotent) |
| `npm run db:use-postgres` | Prisma-Schema auf PostgreSQL umstellen |

---

## Umgebungsvariablen

Alle Variablen sind in [`.env.example`](.env.example) kommentiert. Die wichtigsten:

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `DATABASE_URL` | ja | SQLite (`file:./dev.db`) oder PostgreSQL |
| `NEXTAUTH_URL`, `APP_URL` | ja | Öffentliche URL der App |
| `NEXTAUTH_SECRET`, `CRON_SECRET` | ja | Zufällige Secrets (Cron-Secret mind. 16 Zeichen) |
| `APP_NAME` | ja | Produktname (UI, E-Mails, PDF, Crawler-User-Agent) |
| `ADMIN_NOTIFY_EMAIL` | empfohlen | Empfänger für Lead-Benachrichtigungen |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | für Seed | Admin-Zugang |
| `OPENAI_API_KEY` / `PERPLEXITY_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | optional | Echte KI-Abfragen; sonst Mock |
| `*_MODEL` | optional | Modellnamen (veralten – bei Bedarf anpassen) |
| `*_COST_PER_1K_CENTS` | optional | Preise für Kostenschätzung/Budget |
| `RESEND_API_KEY`, `EMAIL_FROM` | optional | E-Mail-Versand; sonst Outbox/Konsole |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | optional | Abrechnung (nur Testmodus) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional | Google-Login |
| `FIRECRAWL_API_KEY` | optional | Gerenderte Seitenversion für den JS-Vergleich |
| `SCAN_RUNS_PER_PROMPT` | optional | Wiederholungen je Prompt × Anbieter (Default 3) |
| `MONTHLY_BUDGET_CENTS_DEFAULT` | optional | Fallback-Budget je Organisation/Monat |
| `JOB_MODE` | optional | `worker` (Default) oder `inline` |
| `PRICE_DISPLAY`, `VAT_RATE_PERCENT` | optional | Netto- oder Bruttoanzeige |

---

## Stripe im Testmodus

1. Stripe-Konto anlegen, im **Testmodus** `sk_test_…` und `pk_test_…` in `.env` eintragen.
2. `npm run stripe:setup` – legt Produkte, Preise (lookup_keys `starter_month`, `business_year`, …) und eine Kundenportal-Konfiguration an.
3. Webhooks lokal weiterleiten (Stripe CLI):
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Den angezeigten `whsec_…` als `STRIPE_WEBHOOK_SECRET` eintragen.
4. Im Dashboard unter **Abrechnung** AGB/Widerruf bestätigen und „Zahlungspflichtig bestellen“ – Testkarte `4242 4242 4242 4242`.

Verarbeitete Events: `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.payment_failed` (Signaturprüfung, idempotent über Tabelle `StripeEvent`). Limits werden serverseitig bei jeder Aktion erzwungen. Live-Keys werden bewusst abgewiesen.

Ohne Stripe-Key gibt es eine **Demo-Abrechnung**: Pläne lassen sich lokal aktivieren (nicht in Produktion, außer `DEMO_BILLING=true`).

---

## Worker & Cron

- **Worker**: `npm run worker` pollt die Tabelle `Job` (Default alle 2 s, `WORKER_CONCURRENCY=2`). Optional Health-Check: `WORKER_HEALTH_PORT=3001`.
- **Wöchentliche Scans**: `GET|POST /api/cron/weekly-scans` mit Header `Authorization: Bearer <CRON_SECRET>` (Pläne Business/Agentur).
- **Tägliche Scans** für Top-Prompts (Agentur): `/api/cron/daily-scans`.

Beispiel crontab:
```
45 4 * * 1  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://deine-domain.de/api/cron/weekly-scans
29 4 * * *  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://deine-domain.de/api/cron/daily-scans
```
Auf Vercel sind beide Cronjobs in `vercel.json` hinterlegt (Vercel sendet `CRON_SECRET` automatisch als Bearer-Token).

---

## Deployment (Vorschlag)

- **Web-App** auf Vercel (oder jedem Node-Hosting): Build `npm run build`, Start `npm start`.
- **Datenbank** PostgreSQL (z. B. Neon, Supabase, RDS):
  ```bash
  npm run db:use-postgres         # einmalig, Änderung committen
  DATABASE_URL=postgresql://… npx prisma migrate dev --name init   # Postgres-Migrationen erzeugen
  # in Produktion:
  npx prisma migrate deploy
  ```
- **Worker** als separater, dauerhaft laufender Prozess (z. B. Railway, Fly.io, Render, Docker/VM): `npm ci && npx prisma generate && npm run worker` mit denselben ENV-Variablen.
- `APP_URL`/`NEXTAUTH_URL` auf die HTTPS-Domain setzen (aktiviert HSTS).
- PDF-Reports werden unter `storage/reports` zwischengespeichert; auf Serverless werden sie bei Bedarf neu erzeugt.
- Hinter einem Reverse-Proxy betreiben, der `X-Forwarded-For` korrekt setzt (Rate-Limits).

---

## Tests

- **Unit (Vitest)**: Scoring, Parser, Prompt-Generator, Mock-Provider, SSRF-Schutz, robots.txt-Parser, Audit-Checks, Empfehlungen, Validierung.
- **E2E (Playwright)**: Registrierung → Projekt → Scan (Mock) → Ergebnis + PDF; Gratis-Check → Teaser; Angebot → Lead → Serviceprojekt → Kundenansicht; axe-Barrierefreiheit (WCAG 2 AA) aller öffentlichen Seiten. Die Tests starten Web-App **und** Worker gegen `prisma/e2e.db`.

---

## Projektstruktur

```
app/(marketing)  Startseite, Preise, So funktioniert's, FAQ, Kontakt, Angebot, Gratis-Check
app/(legal)      Impressum, Datenschutz, AGB (Platzhalter)
app/(auth)       login, register, verify, forgot, reset
app/dashboard    Kundenbereich
app/admin        Admin-Bereich
app/api          Route Handler (auth, projects, prompts, scans, billing, stripe, leads, cron, admin, account)
lib/providers    KI-Adapter (openai, perplexity, gemini, anthropic, mock)
lib/scan         Orchestrierung, Prompt-Generator, Parser, Scoring, Scheduler
lib/audit        Technik-Checks
lib/crawl        SSRF-Schutz, Fetcher, Crawler, robots.txt
lib/billing      Pläne, Limits, Stripe
lib/email        Templates + Versand
lib/pdf          Report-Generator
lib/i18n         Zentrale Texte (de)
prisma           schema.prisma, Migrationen, seed.ts
worker           Worker-Prozess
tests            unit/ und e2e/
```

Weitere Hintergründe: [DECISIONS.md](DECISIONS.md).
