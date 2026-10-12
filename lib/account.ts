import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { cancelStripeSubscriptionSafe } from "@/lib/billing/stripe";

/** DSGVO-Datenexport: alle personenbezogenen und Projektdaten des Users. */
export async function exportUserData(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, emailVerifiedAt: true, notifyWeekly: true, notifyAlerts: true, createdAt: true },
  });
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      org: {
        include: {
          subscription: true,
          usage: true,
          projects: {
            include: {
              prompts: true,
              scans: {
                include: {
                  auditResults: true,
                  runs: { select: { promptStableId: true, provider: true, runIndex: true, answerText: true, citationsJson: true, brandMentioned: true, brandCited: true, mentionPosition: true, sentiment: true, createdAt: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  const leads = await prisma.lead.findMany({ where: { email: user.email } });
  return { exportedAt: new Date().toISOString(), user, organizations: memberships.map((m) => ({ role: m.role, ...m.org })), leads };
}

/**
 * Konto löschen: Organisationen, deren einziges Mitglied der User ist, werden
 * samt Projekten/Scans gelöscht (Abo wird vorher gekündigt). Leads mit der
 * E-Mail-Adresse werden anonymisiert.
 */
export async function deleteUserAccount(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const memberships = await prisma.membership.findMany({ where: { userId }, include: { org: { include: { subscription: true, _count: { select: { memberships: true } } } } } });
  for (const m of memberships) {
    if (m.org._count.memberships <= 1) {
      if (m.org.subscription?.stripeSubscriptionId) await cancelStripeSubscriptionSafe(m.org.subscription.stripeSubscriptionId);
      await prisma.organization.delete({ where: { id: m.org.id } });
    }
  }
  await prisma.lead.updateMany({
    where: { email: user.email },
    data: { email: "geloescht@anonymisiert.invalid", name: null, firma: null, nachricht: null, website: null },
  });
  await prisma.user.delete({ where: { id: userId } });
  await logActivity({ action: "account.deleted", targetType: "User", targetId: userId });
}
