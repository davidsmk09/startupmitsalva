import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/sync";
import { sendEmail } from "@/lib/email/send";
import { paymentFailedTemplate } from "@/lib/email/templates";
import { logActivity } from "@/lib/activity";
import { logger, errorMessage } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe-Webhooks mit Signaturprüfung und idempotenter Verarbeitung
 * (jede Event-ID wird nur einmal verarbeitet).
 */
export async function POST(req: Request) {
  if (!env.stripeEnabled || !env.stripeWebhookSecret) {
    return NextResponse.json({ error: "Stripe-Webhooks sind nicht konfiguriert." }, { status: 503 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signatur fehlt." }, { status: 400 });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, env.stripeWebhookSecret);
  } catch (err) {
    logger.warn("stripe.webhook_invalid_signature", { error: errorMessage(err) });
    return NextResponse.json({ error: "Ungültige Signatur." }, { status: 400 });
  }

  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw err;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const orgId = session.client_reference_id ?? session.metadata?.orgId;
          if (orgId && session.customer) {
            const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
            await prisma.organization.update({ where: { id: orgId }, data: { stripeCustomerId: customerId } }).catch(() => undefined);
          }
          await syncSubscription(subId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        const org = customerId
          ? await prisma.organization.findUnique({ where: { stripeCustomerId: customerId }, include: { memberships: { include: { user: true } } } })
          : null;
        if (org) {
          await prisma.subscription.updateMany({ where: { orgId: org.id }, data: { status: "past_due" } });
          await logActivity({ action: "billing.payment_failed", orgId: org.id, targetType: "Invoice", targetId: invoice.id });
          const tpl = paymentFailedTemplate(`${env.appUrl}/dashboard/billing`);
          for (const m of org.memberships.filter((x) => x.role === "OWNER")) await sendEmail({ to: m.user.email, ...tpl });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // Event freigeben, damit Stripe es erneut zustellen kann
    await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => undefined);
    logger.error("stripe.webhook_failed", { type: event.type, error: errorMessage(err) });
    return NextResponse.json({ error: "Verarbeitung fehlgeschlagen." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
