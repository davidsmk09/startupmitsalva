/** Zulässige Werte der String-"Enums" aus dem Prisma-Schema. */
export const ROLES = ["USER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const PROMPT_CATEGORIES = ["KATEGORIE", "EMPFEHLUNG", "VERGLEICH", "LOKAL", "MARKE"] as const;
export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

export const SCAN_STATUS = ["QUEUED", "RUNNING", "COMPLETED", "FAILED"] as const;
export type ScanStatus = (typeof SCAN_STATUS)[number];

export const SCAN_TYPES = ["FULL", "QUICK", "WEEKLY", "DAILY"] as const;
export type ScanType = (typeof SCAN_TYPES)[number];

export const AUDIT_STATUS = ["PASS", "WARN", "FAIL", "INFO"] as const;
export type AuditStatus = (typeof AUDIT_STATUS)[number];

export const LEAD_STATUS = ["NEU", "KONTAKTIERT", "ANGEBOT", "GEWONNEN", "VERLOREN"] as const;
export type LeadStatus = (typeof LEAD_STATUS)[number];

export const LEAD_SOURCES = ["GRATIS_CHECK", "ANGEBOT", "KONTAKT", "SEED"] as const;

export const SERVICE_PROJECT_STATUS = ["PLANUNG", "IN_ARBEIT", "ABGESCHLOSSEN", "PAUSIERT"] as const;
export const SERVICE_TASK_STATUS = ["OFFEN", "IN_ARBEIT", "ERLEDIGT"] as const;
export type ServiceTaskStatus = (typeof SERVICE_TASK_STATUS)[number];
export const SERVICE_TASK_CATEGORIES = ["WEBSITE", "VERZEICHNIS", "ADS", "SONSTIGES"] as const;
export type ServiceTaskCategory = (typeof SERVICE_TASK_CATEGORIES)[number];

export const PROVIDER_KEYS = ["openai", "perplexity", "gemini", "anthropic", "mock"] as const;
export type ProviderKey = (typeof PROVIDER_KEYS)[number];

export const MAX_COMPETITORS = 5;
export const MAX_ALIASES = 10;
