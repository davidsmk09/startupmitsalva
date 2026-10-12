import { enforceRateLimit, handler, json, parseBody } from "@/lib/api";
import { requestPasswordReset } from "@/lib/auth/service";
import { forgotSchema } from "@/lib/validation";
import { clientIp, HOUR } from "@/lib/security/rate-limit";

export const POST = handler(async (req) => {
  await enforceRateLimit(`forgot:ip:${clientIp(req.headers)}`, 10, HOUR);
  const { email } = await parseBody(req, forgotSchema);
  await enforceRateLimit(`forgot:email:${email}`, 3, HOUR);
  await requestPasswordReset(email);
  return json({ ok: true });
});
