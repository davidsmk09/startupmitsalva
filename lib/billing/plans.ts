/**
 * Zentrale Plan-Konfiguration. ALLE Preise und Limits sind Platzhalter und
 * hier leicht änderbar (markiert mit PREIS_PLATZHALTER).
 * Beträge in Cent (netto, zzgl. MwSt. – Anzeige siehe PRICE_DISPLAY).
 */
export type PlanKey = "free" | "starter" | "business" | "agentur";
export type BillingInterval = "month" | "year";

export type Plan = {
  key: PlanKey;
  name: string;
  tagline: string;
  purchasable: boolean;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  limits: {
    projects: number;
    promptsPerProject: number;
    providers: number;
    /** Manuell startbare Scans pro Monat (über alle Projekte) */
    manualScansPerMonth: number;
    weeklyScans: boolean;
    dailyTopPrompts: boolean;
    maxTopPrompts: number;
    competitors: number;
    /** API-Budget-Deckel pro Organisation und Monat (Cent) */
    monthlyBudgetCents: number;
  };
  features: {
    pdfReport: boolean;
    competitorComparison: boolean;
    emailAlerts: boolean;
    whiteLabelPdf: boolean;
  };
  highlights: string[];
};

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    name: "Testzugang",
    tagline: "Zum Ausprobieren nach der Registrierung",
    purchasable: false,
    priceMonthlyCents: 0,
    priceYearlyCents: 0,
    limits: {
      projects: 1,
      promptsPerProject: 10,
      providers: 1,
      manualScansPerMonth: 2,
      weeklyScans: false,
      dailyTopPrompts: false,
      maxTopPrompts: 0,
      competitors: 0,
      monthlyBudgetCents: 200, // PREIS_PLATZHALTER
    },
    features: { pdfReport: true, competitorComparison: false, emailAlerts: false, whiteLabelPdf: false },
    highlights: ["1 Projekt", "10 Prompts", "1 KI-Anbieter", "2 Scans pro Monat"],
  },
  starter: {
    key: "starter",
    name: "Starter",
    tagline: "Für Selbstständige und kleine Betriebe",
    purchasable: true,
    priceMonthlyCents: 2900, // PREIS_PLATZHALTER
    priceYearlyCents: 29000, // PREIS_PLATZHALTER
    limits: {
      projects: 1,
      promptsPerProject: 15,
      providers: 2,
      manualScansPerMonth: 2,
      weeklyScans: false,
      dailyTopPrompts: false,
      maxTopPrompts: 0,
      competitors: 0,
      monthlyBudgetCents: 500, // PREIS_PLATZHALTER
    },
    features: { pdfReport: true, competitorComparison: false, emailAlerts: false, whiteLabelPdf: false },
    highlights: ["1 Projekt", "15 Prompts pro Projekt", "2 KI-Anbieter", "2 Scans pro Monat (manuell)", "PDF-Report"],
  },
  business: {
    key: "business",
    name: "Business",
    tagline: "Für KMU mit regelmäßigem Monitoring",
    purchasable: true,
    priceMonthlyCents: 7900, // PREIS_PLATZHALTER
    priceYearlyCents: 79000, // PREIS_PLATZHALTER
    limits: {
      projects: 3,
      promptsPerProject: 30,
      providers: 4,
      manualScansPerMonth: 10,
      weeklyScans: true,
      dailyTopPrompts: false,
      maxTopPrompts: 0,
      competitors: 5,
      monthlyBudgetCents: 2000, // PREIS_PLATZHALTER
    },
    features: { pdfReport: true, competitorComparison: true, emailAlerts: true, whiteLabelPdf: false },
    highlights: [
      "3 Projekte",
      "30 Prompts pro Projekt",
      "4 KI-Anbieter",
      "Wöchentliche automatische Scans",
      "Wettbewerbsvergleich (bis 5)",
      "E-Mail-Alerts",
    ],
  },
  agentur: {
    key: "agentur",
    name: "Agentur",
    tagline: "Für Agenturen und mehrere Standorte",
    purchasable: true,
    priceMonthlyCents: 19900, // PREIS_PLATZHALTER
    priceYearlyCents: 199000, // PREIS_PLATZHALTER
    limits: {
      projects: 15,
      promptsPerProject: 50,
      providers: 4,
      manualScansPerMonth: 40,
      weeklyScans: true,
      dailyTopPrompts: true,
      maxTopPrompts: 5,
      competitors: 5,
      monthlyBudgetCents: 8000, // PREIS_PLATZHALTER
    },
    features: { pdfReport: true, competitorComparison: true, emailAlerts: true, whiteLabelPdf: true },
    highlights: [
      "15 Projekte",
      "50 Prompts pro Projekt",
      "4 KI-Anbieter",
      "Wöchentliche Scans + täglich für Top-Prompts",
      "White-Label-PDF mit eigenem Logo",
    ],
  },
};

export const PURCHASABLE_PLANS: Plan[] = [PLANS.starter, PLANS.business, PLANS.agentur];

/** Pakete 2 und 3 – Dienstleistung, nur auf Anfrage. */
export const SERVICE_PACKAGES = [
  {
    paket: 2 as const,
    name: "Screener + Überarbeitung",
    fromOneTimeCents: 99000, // PREIS_PLATZHALTER
    optionalMonthlyCents: 14900, // PREIS_PLATZHALTER (optionale Betreuungspauschale)
    description: "Paket 1 plus: Wir überarbeiten deine Website gezielt für KI-Sichtbarkeit.",
    highlights: [
      "Alles aus dem Screener (Business-Umfang)",
      "Technische Optimierung (robots.txt, Sitemap, llms.txt, strukturierte Daten)",
      "Inhalte antwortfähig strukturieren (FAQ, Leistungsseiten)",
      "Vertrauenssignale stärken (Impressum, Team, Referenzen)",
      "Vorher-/Nachher-Messung",
    ],
  },
  {
    paket: 3 as const,
    name: "Komplett",
    fromOneTimeCents: 199000, // PREIS_PLATZHALTER
    optionalMonthlyCents: 29900, // PREIS_PLATZHALTER
    description: "Paket 2 plus Einträge in Branchenverzeichnisse und Google-Ads-Kampagnen.",
    highlights: [
      "Alles aus Paket 2",
      "Einträge in relevante Branchen- und Datenbank-Verzeichnisse",
      "Konsistente Unternehmensdaten (Name, Adresse, Telefon)",
      "Aufbau und Betreuung von Google-Ads-Kampagnen",
      "Monatliches Reporting",
    ],
  },
];

export function getPlan(key: string | null | undefined): Plan {
  return PLANS[(key as PlanKey) ?? "free"] ?? PLANS.free;
}

export function yearlySavingsMonths(plan: Plan): number {
  if (!plan.priceMonthlyCents) return 0;
  return Math.round((plan.priceMonthlyCents * 12 - plan.priceYearlyCents) / plan.priceMonthlyCents);
}

const ACTIVE = ["active", "trialing", "past_due"];

/** Ermittelt den wirksamen Plan einer Organisation aus ihrem Abo. */
export function effectivePlanKey(sub: { planKey: string; status: string } | null | undefined): PlanKey {
  if (!sub || !ACTIVE.includes(sub.status)) return "free";
  return (sub.planKey in PLANS ? sub.planKey : "free") as PlanKey;
}
