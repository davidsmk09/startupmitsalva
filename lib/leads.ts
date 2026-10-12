import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { leadAdminNotifyTemplate, leadConfirmationTemplate } from "@/lib/email/templates";
import { logger, errorMessage } from "@/lib/logger";

export async function createLead(input: {
  name?: string | null;
  email: string;
  firma?: string | null;
  website?: string | null;
  branche?: string | null;
  paketInteresse?: string | null;
  nachricht?: string | null;
  source: "GRATIS_CHECK" | "ANGEBOT" | "KONTAKT";
  consent: boolean;
  sendConfirmation?: boolean;
}) {
  const lead = await prisma.lead.create({
    data: {
      name: input.name || null,
      email: input.email,
      firma: input.firma || null,
      website: input.website || null,
      branche: input.branche || null,
      paketInteresse: input.paketInteresse || null,
      nachricht: input.nachricht || null,
      source: input.source,
      consent: input.consent,
      consentAt: input.consent ? new Date() : null,
    },
  });
  try {
    if (input.sendConfirmation !== false) {
      await sendEmail({ to: lead.email, ...leadConfirmationTemplate(lead.name, lead.paketInteresse) });
    }
    if (env.adminNotifyEmail) await sendEmail({ to: env.adminNotifyEmail, ...leadAdminNotifyTemplate(lead) });
  } catch (err) {
    logger.error("lead.notify_failed", { leadId: lead.id, error: errorMessage(err) });
  }
  return lead;
}
