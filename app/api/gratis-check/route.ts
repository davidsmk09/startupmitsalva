
import { enforceRateLimit, handler, json, parseBody } from "@/lib/api";
import { quickCheckSchema } from "@/lib/validation";
import { createLead } from "@/lib/leads";
import { createQuickScan } from "@/lib/scan/service";
import { clientIp, DAY, HOUR } from "@/lib/security/rate-limit";

/**
 * Gratis-Check ohne Login: Lead speichern (mit Einwilligung) und Quick-Scan
 * starten. Strenges Rate-Limit pro IP und pro Domain.
 */
export const POST = handler(async (req) => {
  const ip = clientIp(req.headers);
  await enforceRateLimit(`quick:ip:${ip}`, 3, HOUR);
  const data = await parseBody(req, quickCheckSchema);
  if (data.homepage) return json({ token: null }, 200);
  await enforceRateLimit(`quick:domain:${data.domain}`, 2, DAY);
  await enforceRateLimit(`quick:ip-day:${ip}`, 10, DAY);
  const lead = await createLead({
    email: data.email,
    website: data.domain,
    firma: data.brandName,
    branche: data.industry,
    paketInteresse: "1",
    nachricht: `Gratis-Check: ${data.industry} in ${data.city}`,
    source: "GRATIS_CHECK",
    consent: data.consent,
    sendConfirmation: false,
  });
  const scan = await createQuickScan({ ...data, leadId: lead.id });
  return json({ token: scan.publicToken }, 201);
});

export const dynamic = "force-dynamic";
