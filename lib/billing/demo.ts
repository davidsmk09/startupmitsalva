import { env } from "@/lib/env";

/** Demo-Abrechnung (Pläne lokal aktivieren) nur ohne Stripe und nicht in Produktion. */
export function demoBillingAllowed() {
  return !env.stripeEnabled && (process.env.NODE_ENV !== "production" || process.env.DEMO_BILLING === "true");
}
