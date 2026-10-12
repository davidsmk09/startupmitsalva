import { ApiError, enforceRateLimit, handler, json, parseBody } from "@/lib/api";
import { resetPasswordWithToken } from "@/lib/auth/service";
import { resetSchema } from "@/lib/validation";
import { clientIp, HOUR } from "@/lib/security/rate-limit";
import { t } from "@/lib/i18n";

export const POST = handler(async (req) => {
  await enforceRateLimit(`reset:ip:${clientIp(req.headers)}`, 20, HOUR);
  const { token, password } = await parseBody(req, resetSchema);
  const ok = await resetPasswordWithToken(token, password);
  if (!ok) throw new ApiError(400, t.auth.resetFailed);
  return json({ ok: true });
});
