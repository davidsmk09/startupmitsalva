import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, json, parseBody } from "@/lib/api";
import { requireUserOrg } from "@/lib/auth/session";
import { getOrgPlan } from "@/lib/billing/limits";

const MAX_LOGO_BYTES = 300 * 1024;

const schema = z.object({
  name: z.string().trim().max(80).optional().default(""),
  logoDataUrl: z
    .string()
    .max(Math.ceil(MAX_LOGO_BYTES * 1.4))
    .regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/, "Nur PNG oder JPG.")
    .nullable()
    .optional(),
});

/** White-Label-PDF (Agentur-Plan): eigener Name und Logo (als Data-URL, kein Fremdabruf). */
export const PATCH = handler(async (req) => {
  const { org } = await requireUserOrg();
  const plan = await getOrgPlan(org.id);
  if (!plan.features.whiteLabelPdf) throw new ApiError(402, "White-Label ist im Agentur-Plan enthalten.", "LIMIT");
  const data = await parseBody(req, schema);
  await prisma.organization.update({
    where: { id: org.id },
    data: { whiteLabelName: data.name || null, ...(data.logoDataUrl !== undefined ? { whiteLabelLogoUrl: data.logoDataUrl } : {}) },
  });
  // Zwischengespeicherte Reports verwerfen, damit das neue Branding greift
  await prisma.report.deleteMany({ where: { scan: { project: { orgId: org.id } } } });
  return json({ ok: true });
});
