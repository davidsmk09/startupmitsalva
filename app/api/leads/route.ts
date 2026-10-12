import { enforceRateLimit, handler, json, parseBody } from "@/lib/api";
import { leadSchema } from "@/lib/validation";
import { createLead } from "@/lib/leads";
import { clientIp, DAY, HOUR } from "@/lib/security/rate-limit";

/** Angebotsanfrage (Pakete 2/3) und Kontaktformular. Honeypot + Rate-Limit gegen Spam. */
export const POST = handler(async (req) => {
  const ip = clientIp(req.headers);
  await enforceRateLimit(`lead:ip:${ip}`, 5, HOUR);
  const data = await parseBody(req, leadSchema);
  if (data.homepage) return json({ ok: true }); // Honeypot gefüllt -> still verwerfen
  await enforceRateLimit(`lead:email:${data.email}`, 3, DAY);
  await createLead({
    name: data.name,
    email: data.email,
    firma: data.firma,
    website: data.website,
    branche: data.branche,
    paketInteresse: data.paketInteresse ?? null,
    nachricht: data.nachricht,
    source: data.source,
    consent: data.consent,
  });
  return json({ ok: true }, 201);
});
