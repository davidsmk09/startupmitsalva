/**
 * Seed-Daten (idempotent): `npm run seed`
 * - Admin-Account aus SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
 * - Demo-Kunde (Plan Business) mit 2 Projekten und je 3 Scans (steigender Verlauf, Mock-Daten)
 * - 5 Leads in verschiedenen Status, 1 Serviceprojekt mit 8 Tasks
 * Alle Demo-Firmen und -Domains sind fiktiv (.example-Domains).
 */
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");
process.env.MOCK_LATENCY_MS = "0";
// Seed nutzt immer den Mock (keine echten API-Kosten), auch wenn Keys gesetzt sind
for (const k of ["OPENAI_API_KEY", "PERPLEXITY_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY"]) process.env[k] = "";

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "DemoPasswort123!";
const WEEK = 7 * 24 * 3600_000;

async function main() {
  const { prisma } = await import("@/lib/db");
  const { createUserWithOrg } = await import("@/lib/auth/service");
  const { hashPassword } = await import("@/lib/auth/password");
  const { generateTemplatePrompts } = await import("@/lib/scan/prompts");
  const { executeScan } = await import("@/lib/scan/run-scan");
  const { defaultServiceTasks } = await import("@/lib/service-templates");
  type Audit = import("@/lib/audit/types").AuditCheckResult;

  // ---- Admin ---------------------------------------------------------------
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "";
  if (adminPassword.length < 10) throw new Error("SEED_ADMIN_PASSWORD muss gesetzt sein (mind. 10 Zeichen).");
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    await prisma.user.update({ where: { id: existingAdmin.id }, data: { role: "ADMIN", passwordHash: await hashPassword(adminPassword), emailVerifiedAt: existingAdmin.emailVerifiedAt ?? new Date() } });
    console.log(`= Admin aktualisiert: ${adminEmail}`);
  } else {
    await createUserWithOrg({ email: adminEmail, password: adminPassword, name: "Admin", company: "Admin-Team", role: "ADMIN", verified: true });
    console.log(`+ Admin angelegt: ${adminEmail}`);
  }

  // ---- Demo-Kunde ----------------------------------------------------------
  if (await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })) {
    console.log("= Demo-Daten existieren bereits – übersprungen.");
    return;
  }
  const { user, org } = await createUserWithOrg({ email: DEMO_EMAIL, password: DEMO_PASSWORD, name: "Demo-Kundin", company: "Demo-Kunde (Beispieldaten)", verified: true });
  await prisma.subscription.create({
    data: { orgId: org.id, planKey: "business", interval: "month", status: "active", currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600_000) },
  });
  console.log(`+ Demo-Kunde: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (Plan Business)`);

  const projectDefs = [
    {
      name: "Praxis Lindenhof",
      brandName: "Praxis Lindenhof",
      domain: "praxis-lindenhof.example",
      industry: "Zahnarzt",
      city: "Köln",
      competitors: [
        { name: "Zahnzentrum Rheinblick", domain: "zahnzentrum-rheinblick.example" },
        { name: "Dentalpraxis Am Ring", domain: "dentalpraxis-am-ring.example" },
      ],
    },
    {
      name: "Holzbau Brandt",
      brandName: "Holzbau Brandt",
      domain: "holzbau-brandt.example",
      industry: "Zimmerei",
      city: "Freiburg",
      competitors: [{ name: "Zimmerei Schwarzwaldhaus", domain: "schwarzwaldhaus.example" }],
    },
  ];

  /** Synthetische Audit-Ergebnisse mit steigender Qualität (Stufe 0–2). */
  const audit = (level: number): Audit[] => {
    const s = (fail: number, warn: number) => (level < fail ? "FAIL" : level < warn ? "WARN" : "PASS");
    return [
      { checkKey: "robots_ai", title: "robots.txt erlaubt KI-Crawler", status: s(1, 1), weight: 15, details: level < 1 ? "Blockiert: GPTBot, ClaudeBot." : "Alle geprüften KI-Crawler dürfen die Startseite abrufen.", recommendation: "Disallow-Regeln für KI-Crawler entfernen.", data: { blocked: level < 1 ? ["GPTBot", "ClaudeBot"] : [] } },
      { checkKey: "sitemap", title: "sitemap.xml vorhanden und referenziert", status: s(0, 1), weight: 8, details: level < 1 ? "Sitemap gefunden (24 URLs), aber nicht in der robots.txt referenziert." : "Sitemap mit 24 URLs gefunden und referenziert.", recommendation: "Sitemap in robots.txt referenzieren." },
      { checkKey: "llms_txt", title: "llms.txt vorhanden", status: level < 2 ? "INFO" : "PASS", weight: 2, details: level < 2 ? "Keine llms.txt gefunden." : "Eine llms.txt ist vorhanden.", recommendation: "Optional: llms.txt anlegen." },
      { checkKey: "https", title: "HTTPS, Weiterleitungen, kein Mixed Content", status: "PASS", weight: 10, details: "HTTPS aktiv, Weiterleitung korrekt.", recommendation: "Nichts zu tun." },
      { checkKey: "initial_html", title: "Inhalte im initialen HTML (ohne JavaScript)", status: s(0, 1), weight: 12, details: "Die Startseite liefert ohne JavaScript ca. 1.450 Zeichen sichtbaren Text.", recommendation: "Kerninhalte serverseitig ausliefern." },
      { checkKey: "structured_data", title: "Strukturierte Daten (JSON-LD)", status: s(1, 2), weight: 12, details: level < 1 ? "Keine strukturierten Daten gefunden." : "Gefundene Typen: Dentist. Es fehlen: FAQPage, BreadcrumbList.", recommendation: "LocalBusiness- und FAQPage-Schema ergänzen.", data: { missing: level < 1 ? ["Organization/LocalBusiness", "Service/Product", "FAQPage", "BreadcrumbList"] : level < 2 ? ["FAQPage", "BreadcrumbList"] : [] } },
      { checkKey: "meta_basics", title: "Title, Description, H1, Canonical, Sprache", status: s(0, 2), weight: 10, details: level < 2 ? "Startseite: keine Meta-Description; kein Canonical-Tag." : "Startseite in Ordnung.", recommendation: "Meta-Description und Canonical ergänzen." },
      { checkKey: "answerable_content", title: "Antwortfähige Inhalte (FAQ, Abschnitte, Listen)", status: s(1, 2), weight: 8, details: level < 2 ? "FAQ-Bereich: nein · Abschnitte mit eigenständiger Antwort: 1." : "FAQ-Bereich: ja · Abschnitte mit eigenständiger Antwort: 6.", recommendation: "FAQ-Bereich und Antwortabsätze ergänzen." },
      { checkKey: "trust_signals", title: "Vertrauenssignale (Impressum, Kontakt, NAP, Team, Bewertungen)", status: s(0, 1), weight: 10, details: level < 1 ? "5 von 7 Vertrauenssignalen gefunden. Fehlt: Team-/Autorenangaben, Bewertungen/Referenzen." : "7 von 7 Vertrauenssignalen gefunden.", recommendation: "Team und Referenzen ergänzen." },
      { checkKey: "nap_consistency", title: "Konsistente Kontaktdaten (Name, Adresse, Telefon)", status: s(0, 1), weight: 5, details: level < 1 ? "Mehrere unterschiedliche Telefonnummern gefunden." : "Kontaktdaten einheitlich.", recommendation: "Kontaktdaten vereinheitlichen." },
      { checkKey: "performance", title: "Antwortzeit, Seitengröße, Viewport", status: "PASS", weight: 5, details: "Antwortzeit 420 ms, HTML 86 KB, Viewport gesetzt.", recommendation: "Nichts zu tun." },
      { checkKey: "evidence", title: "Belege (Zahlen, Quellen, Zitate)", status: "INFO", weight: 0, details: "Gefunden: 6 konkrete Zahlenangaben, 0 Quellenhinweise, 2 Zitate.", recommendation: "Belegbare Angaben ergänzen." },
      { checkKey: "external_presence", title: "Hinweise auf externe Präsenz", status: "INFO", weight: 0, details: "Verlinkt: Google-Unternehmensprofil, Instagram.", recommendation: "Verzeichnisse pflegen und verlinken." },
    ];
  };

  for (const def of projectDefs) {
    const project = await prisma.project.create({
      data: {
        orgId: org.id,
        name: def.name,
        brandName: def.brandName,
        domain: def.domain,
        industry: def.industry,
        city: def.city,
        competitors: JSON.stringify(def.competitors),
      },
    });
    const prompts = generateTemplatePrompts({ industry: def.industry, city: def.city, brandName: def.brandName }, 30);
    await prisma.prompt.createMany({ data: prompts.map((p) => ({ ...p, projectId: project.id })) });
    for (let i = 0; i < 3; i++) {
      const createdAt = new Date(Date.now() - (2 - i) * WEEK - 3600_000);
      const scan = await prisma.scan.create({ data: { projectId: project.id, type: i === 0 ? "FULL" : "WEEKLY", createdAt } });
      await executeScan(scan.id, { mockBias: -0.45 + i * 0.45, auditResults: audit(i), silent: true });
      await prisma.scan.update({ where: { id: scan.id }, data: { startedAt: createdAt, finishedAt: new Date(createdAt.getTime() + 90_000) } });
      const s = await prisma.scan.findUniqueOrThrow({ where: { id: scan.id } });
      console.log(`  + ${def.name}: Scan ${i + 1} – Gesamtscore ${s.overallScore}`);
    }
  }

  // ---- Leads ---------------------------------------------------------------
  const leads = [
    { name: "Erika Beispiel", email: "erika@beispiel-kanzlei.example", firma: "Kanzlei Beispiel (fiktiv)", website: "beispiel-kanzlei.example", paketInteresse: "2", status: "NEU", source: "ANGEBOT", nachricht: "Wir möchten bei KI-Assistenten besser gefunden werden." },
    { name: "Max Muster", email: "max@muster-dach.example", firma: "Muster Dach (fiktiv)", website: "muster-dach.example", paketInteresse: "1", status: "KONTAKTIERT", source: "GRATIS_CHECK", nachricht: "Gratis-Check: Dachdecker in Bonn" },
    { name: "Lena Probe", email: "lena@probe-physio.example", firma: "Physio Probe (fiktiv)", website: "probe-physio.example", paketInteresse: "3", status: "ANGEBOT", source: "ANGEBOT", nachricht: "Interesse an Komplettpaket inkl. Google Ads." },
    { name: "Demo-Kundin", email: DEMO_EMAIL, firma: "Demo-Kunde (Beispieldaten)", website: "praxis-lindenhof.example", paketInteresse: "2", status: "GEWONNEN", source: "ANGEBOT", nachricht: "Bitte Website-Überarbeitung für die Praxis." },
    { name: "Tom Test", email: "tom@test-cafe.example", firma: "Café Test (fiktiv)", website: "test-cafe.example", paketInteresse: "1", status: "VERLOREN", source: "KONTAKT", nachricht: "Nur eine allgemeine Frage." },
  ];
  let wonLeadId: string | null = null;
  for (const l of leads) {
    const lead = await prisma.lead.create({ data: { ...l, consent: true, consentAt: new Date() } });
    if (l.status === "GEWONNEN") wonLeadId = lead.id;
  }
  console.log(`+ ${leads.length} Leads`);

  // ---- Serviceprojekt mit 8 Tasks -------------------------------------------
  const tasks = defaultServiceTasks(2);
  const statuses = ["ERLEDIGT", "ERLEDIGT", "ERLEDIGT", "IN_ARBEIT", "IN_ARBEIT", "OFFEN", "OFFEN", "OFFEN"];
  await prisma.serviceProject.create({
    data: {
      leadId: wonLeadId,
      orgId: org.id,
      paket: 2,
      title: "Praxis Lindenhof – Paket 2",
      status: "IN_ARBEIT",
      notizen: "Demo-Serviceprojekt (Seed).",
      tasks: {
        create: tasks.map((tk, i) => ({
          titel: tk.titel,
          kategorie: tk.kategorie,
          status: statuses[i],
          zugewiesenAn: i % 2 ? "Team Content" : "Team Technik",
          dueDate: new Date(Date.now() + (i - 3) * WEEK),
          sichtbarFuerKunde: i !== 6,
        })),
      },
    },
  });
  console.log("+ 1 Serviceprojekt mit 8 Tasks");
  void user;
}

main()
  .then(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.$disconnect();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
