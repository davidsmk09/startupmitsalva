import { ApiError, handler, json } from "@/lib/api";
import { requireUserOrg } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/billing/stripe";

/** Stripe Customer Portal (Zahlungsdaten, Rechnungen, Kündigung). */
export const POST = handler(async () => {
  const { org } = await requireUserOrg();
  if (!env.stripeEnabled) throw new ApiError(400, "Stripe ist nicht konfiguriert.");
  if (!org.stripeCustomerId) throw new ApiError(400, "Es gibt noch kein Kundenkonto bei Stripe. Bitte zuerst einen Plan buchen.");
  const session = await getStripe().billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${env.appUrl}/dashboard/billing`,
    locale: "de",
  });
  return json({ url: session.url });
});
