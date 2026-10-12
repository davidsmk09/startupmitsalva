/**
 * Zentrale, typisierte ENV-Zugriffe. Keine Secrets loggen!
 */
function str(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}
function num(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && process.env[name] !== "" ? v : fallback;
}
function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1";
}

export const env = {
  get appName() {
    return str("APP_NAME", "KI-Sichtbar");
  },
  get appUrl() {
    return str("APP_URL", str("NEXTAUTH_URL", "http://localhost:3000")).replace(/\/$/, "");
  },
  get cronSecret() {
    return str("CRON_SECRET");
  },
  get adminNotifyEmail() {
    return str("ADMIN_NOTIFY_EMAIL");
  },
  get emailFrom() {
    return str("EMAIL_FROM", `${str("APP_NAME", "KI-Sichtbar")} <noreply@example.com>`);
  },
  get resendApiKey() {
    return str("RESEND_API_KEY");
  },
  get googleEnabled() {
    return Boolean(str("GOOGLE_CLIENT_ID") && str("GOOGLE_CLIENT_SECRET"));
  },
  get stripeSecretKey() {
    return str("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return str("STRIPE_WEBHOOK_SECRET");
  },
  get stripeEnabled() {
    return Boolean(str("STRIPE_SECRET_KEY"));
  },
  get firecrawlApiKey() {
    return str("FIRECRAWL_API_KEY");
  },
  get scanRunsPerPrompt() {
    return Math.max(1, Math.min(10, num("SCAN_RUNS_PER_PROMPT", 3)));
  },
  get monthlyBudgetCentsDefault() {
    return num("MONTHLY_BUDGET_CENTS_DEFAULT", 2000);
  },
  get sentimentEnabled() {
    return bool("SCAN_SENTIMENT_ENABLED", true);
  },
  get verifyEnabled() {
    return bool("SCAN_VERIFY_ENABLED", false);
  },
  get jobMode(): "worker" | "inline" {
    return str("JOB_MODE", "worker") === "inline" ? "inline" : "worker";
  },
  get priceDisplay(): "net" | "gross" {
    return str("PRICE_DISPLAY", "net") === "gross" ? "gross" : "net";
  },
  get vatRatePercent() {
    return num("VAT_RATE_PERCENT", 19);
  },
  str,
  num,
  bool,
};
