import Stripe from "stripe";
import { env } from "@/lib/env";
import { logger, errorMessage } from "@/lib/logger";

let stripe: Stripe | null = null;

/**
 * Stripe-Client (nur Testmodus vorgesehen). Live-Keys werden abgewiesen,
 * solange STRIPE_ALLOW_LIVE nicht explizit gesetzt ist.
 */
export function getStripe(): Stripe {
  const key = env.stripeSecretKey;
  if (!key) throw new Error("STRIPE_SECRET_KEY ist nicht gesetzt.");
  if (key.startsWith("sk_live_") && process.env.STRIPE_ALLOW_LIVE !== "true") {
    throw new Error("Live-Stripe-Keys sind in dieser Installation deaktiviert. Bitte einen Testmodus-Key (sk_test_…) verwenden.");
  }
  if (!stripe) stripe = new Stripe(key, { appInfo: { name: env.appName } });
  return stripe;
}

export async function cancelStripeSubscriptionSafe(subscriptionId: string) {
  if (!env.stripeEnabled) return;
  try {
    await getStripe().subscriptions.cancel(subscriptionId);
  } catch (err) {
    logger.warn("stripe.cancel_failed", { subscriptionId, error: errorMessage(err) });
  }
}

export function lookupKey(planKey: string, interval: "month" | "year") {
  return `${planKey}_${interval}`;
}

const priceCache = new Map<string, { id: string; at: number }>();

/** Preis-ID per lookup_key (angelegt durch `npm run stripe:setup`). */
export async function getPriceId(planKey: string, interval: "month" | "year"): Promise<string> {
  const key = lookupKey(planKey, interval);
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.id;
  const prices = await getStripe().prices.list({ lookup_keys: [key], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) throw new Error(`Kein Stripe-Preis mit lookup_key "${key}" gefunden. Bitte "npm run stripe:setup" ausführen.`);
  priceCache.set(key, { id: price.id, at: Date.now() });
  return price.id;
}

/** Leitet Plan & Intervall aus einem Stripe-Preis ab (lookup_key oder Metadaten). */
export function planFromPrice(price: Stripe.Price | null | undefined): { planKey: string | null; interval: "month" | "year" } {
  const interval = price?.recurring?.interval === "year" ? "year" : "month";
  const lk = price?.lookup_key ?? "";
  const fromLookup = lk.match(/^(starter|business|agentur)_(month|year)$/)?.[1] ?? null;
  return { planKey: fromLookup ?? price?.metadata?.plan_key ?? null, interval };
}

/** Periodenende (neuere API-Versionen: am Subscription-Item). */
export function periodEnd(sub: Stripe.Subscription): Date | null {
  const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  const ts = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return ts ? new Date(ts * 1000) : null;
}
