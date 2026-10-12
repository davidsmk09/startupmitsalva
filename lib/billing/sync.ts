import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe, periodEnd, planFromPrice } from "@/lib/billing/stripe";
import { logActivity } from "@/lib/activity";
import { logger } from "@/lib/logger";

/** Findet die Organisation zu einer Subscription (Metadaten oder Customer-ID). */
async function orgIdFor(sub: Stripe.Subscription): Promise<string | null> {
  if (sub.metadata?.orgId) return sub.metadata.orgId;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const org = await prisma.organization.findUnique({ where: { stripeCustomerId: customerId } });
  return org?.id ?? null;
}

/** Überträgt den Stripe-Abostatus in die DB (idempotent). */
export async function syncSubscription(subOrId: Stripe.Subscription | string) {
  const sub =
    typeof subOrId === "string" ? await getStripe().subscriptions.retrieve(subOrId, { expand: ["items.data.price"] }) : subOrId;
  const orgId = await orgIdFor(sub);
  if (!orgId) {
    logger.warn("stripe.sync_no_org", { subscriptionId: sub.id });
    return;
  }
  const price = sub.items.data[0]?.price;
  const { planKey, interval } = planFromPrice(price);
  const data = {
    stripeSubscriptionId: sub.id,
    stripePriceId: price?.id ?? null,
    planKey: planKey ?? sub.metadata?.planKey ?? "starter",
    interval,
    status: sub.status,
    currentPeriodEnd: periodEnd(sub),
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
  };
  const before = await prisma.subscription.findUnique({ where: { orgId } });
  await prisma.subscription.upsert({ where: { orgId }, create: { orgId, ...data }, update: data });
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  await prisma.organization.update({ where: { id: orgId }, data: { stripeCustomerId: customerId } }).catch(() => undefined);
  if (!before || before.planKey !== data.planKey || before.status !== data.status) {
    await logActivity({
      action: "billing.subscription_changed",
      orgId,
      targetType: "Subscription",
      targetId: sub.id,
      meta: { from: before ? `${before.planKey}/${before.status}` : null, to: `${data.planKey}/${data.status}` },
    });
  }
}
