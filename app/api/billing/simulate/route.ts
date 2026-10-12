import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, json, parseBody } from "@/lib/api";
import { requireUserOrg } from "@/lib/auth/session";
import { demoBillingAllowed } from "@/lib/billing/demo";
import { logActivity } from "@/lib/activity";

const schema = z.object({ planKey: z.enum(["free", "starter", "business", "agentur"]), interval: z.enum(["month", "year"]).default("month") });

/** Demo-Modus ohne Stripe: Plan lokal aktivieren (nur Entwicklung/Demo). */
export const POST = handler(async (req) => {
  if (!demoBillingAllowed()) throw new ApiError(403, "Demo-Abrechnung ist deaktiviert.");
  const { user, org } = await requireUserOrg();
  const { planKey, interval } = await parseBody(req, schema);
  if (planKey === "free") {
    await prisma.subscription.deleteMany({ where: { orgId: org.id } });
  } else {
    const end = new Date(Date.now() + (interval === "year" ? 365 : 30) * 24 * 3600_000);
    await prisma.subscription.upsert({
      where: { orgId: org.id },
      create: { orgId: org.id, planKey, interval, status: "active", currentPeriodEnd: end },
      update: { planKey, interval, status: "active", currentPeriodEnd: end, stripeSubscriptionId: null, cancelAtPeriodEnd: false },
    });
  }
  await logActivity({ action: "billing.demo_plan_set", actorId: user.id, orgId: org.id, meta: { planKey, interval } });
  return json({ ok: true });
});
