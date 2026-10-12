import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, enforceRateLimit, handler, json, parseBody } from "@/lib/api";
import { requireUserOrg } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { PLANS } from "@/lib/billing/plans";
import { getPriceId, getStripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/sync";
import { logActivity } from "@/lib/activity";
import { HOUR } from "@/lib/security/rate-limit";

const schema = z.object({
  planKey: z.enum(["starter", "business", "agentur"]),
  interval: z.enum(["month", "year"]),
  // Button-Lösung (§ 312j BGB): ausdrückliche Bestätigung vor der Bestellung
  acceptTerms: z.literal(true, { error: "Bitte bestätige AGB und Widerrufshinweise." }),
});

/**
 * Startet den Stripe-Checkout (neues Abo) oder ändert ein bestehendes Abo
 * (Up-/Downgrade mit anteiliger Verrechnung).
 */
export const POST = handler(async (req) => {
  const { user, org } = await requireUserOrg();
  await enforceRateLimit(`checkout:${org.id}`, 20, HOUR);
  const { planKey, interval } = await parseBody(req, schema);
  if (!env.stripeEnabled) throw new ApiError(400, "Stripe ist nicht konfiguriert. Nutze den Demo-Modus auf dieser Seite.");
  if (!PLANS[planKey].purchasable) throw new ApiError(400, "Dieser Plan ist nicht buchbar.");
  const stripe = getStripe();
  const price = await getPriceId(planKey, interval);
  const sub = await prisma.subscription.findUnique({ where: { orgId: org.id } });

  if (sub?.stripeSubscriptionId && ["active", "trialing", "past_due"].includes(sub.status)) {
    const current = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
    const itemId = current.items.data[0]?.id;
    if (!itemId) throw new ApiError(500, "Abo hat keine Position.");
    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      items: [{ id: itemId, price }],
      proration_behavior: "create_prorations",
      cancel_at_period_end: false,
      metadata: { orgId: org.id, planKey },
    });
    await syncSubscription(updated.id);
    await logActivity({ action: "billing.plan_changed", actorId: user.id, orgId: org.id, meta: { planKey, interval } });
    return json({ updated: true });
  }

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: org.name, metadata: { orgId: org.id } });
    customerId = customer.id;
    await prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: org.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { orgId: org.id, planKey } },
    metadata: { orgId: org.id, planKey },
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
    allow_promotion_codes: true,
    locale: "de",
    success_url: `${env.appUrl}/dashboard/billing?success=1`,
    cancel_url: `${env.appUrl}/dashboard/billing?canceled=1`,
  });
  await logActivity({ action: "billing.checkout_started", actorId: user.id, orgId: org.id, meta: { planKey, interval } });
  return json({ url: session.url });
});
