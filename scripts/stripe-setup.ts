/**
 * Legt Stripe-Produkte und -Preise für die Pläne an (idempotent, Testmodus).
 * Aufruf: npm run stripe:setup
 *
 * - Produkte werden über metadata.plan_key wiedergefunden.
 * - Preise haben lookup_keys "<plan>_<month|year>". Ändert sich ein Betrag in
 *   lib/billing/plans.ts, wird ein neuer Preis angelegt und der lookup_key
 *   übertragen (alte Preise bleiben für Bestandsabos gültig).
 * - Legt eine Customer-Portal-Konfiguration an, falls keine existiert.
 */
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

async function main() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) throw new Error("STRIPE_SECRET_KEY fehlt in .env");
  if (!key.startsWith("sk_test_")) throw new Error("Dieses Skript läuft nur mit Testmodus-Keys (sk_test_…).");
  const { getStripe, lookupKey } = await import("@/lib/billing/stripe");
  const { PURCHASABLE_PLANS } = await import("@/lib/billing/plans");
  const stripe = getStripe();
  const appName = process.env.APP_NAME || "KI-Sichtbar";

  const portalProducts: { product: string; prices: string[] }[] = [];
  for (const plan of PURCHASABLE_PLANS) {
    const found = await stripe.products.search({ query: `metadata['plan_key']:'${plan.key}'` });
    let product = found.data[0];
    if (!product) {
      product = await stripe.products.create({
        name: `${appName} ${plan.name}`,
        description: plan.tagline,
        metadata: { plan_key: plan.key },
      });
      console.log(`+ Produkt angelegt: ${product.name}`);
    } else {
      console.log(`= Produkt vorhanden: ${product.name}`);
    }
    const priceIds: string[] = [];
    for (const interval of ["month", "year"] as const) {
      const amount = interval === "month" ? plan.priceMonthlyCents : plan.priceYearlyCents;
      const lk = lookupKey(plan.key, interval);
      const existing = (await stripe.prices.list({ lookup_keys: [lk], active: true, limit: 1 })).data[0];
      if (existing && existing.unit_amount === amount && existing.product === product.id) {
        console.log(`  = Preis ${lk}: ${amount / 100} €`);
        priceIds.push(existing.id);
        continue;
      }
      const price = await stripe.prices.create({
        product: product.id,
        currency: "eur",
        unit_amount: amount,
        recurring: { interval },
        lookup_key: lk,
        transfer_lookup_key: true,
        tax_behavior: "exclusive",
        metadata: { plan_key: plan.key },
      });
      console.log(`  + Preis ${lk}: ${amount / 100} € (${price.id})`);
      priceIds.push(price.id);
    }
    portalProducts.push({ product: product.id, prices: priceIds });
  }

  const configs = await stripe.billingPortal.configurations.list({ limit: 1, active: true });
  if (configs.data.length === 0) {
    await stripe.billingPortal.configurations.create({
      business_profile: { headline: `${appName} – Abo verwalten` },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id", "name"] },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price"],
          proration_behavior: "create_prorations",
          products: portalProducts,
        },
      },
    });
    console.log("+ Customer-Portal-Konfiguration angelegt");
  } else {
    console.log("= Customer-Portal-Konfiguration vorhanden");
  }
  console.log("\nFertig. Webhook lokal testen: stripe listen --forward-to localhost:3000/api/stripe/webhook");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
