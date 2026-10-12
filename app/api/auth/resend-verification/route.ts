import { enforceRateLimit, handler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/auth/service";
import { HOUR } from "@/lib/security/rate-limit";

export const POST = handler(async () => {
  const user = await requireUser();
  await enforceRateLimit(`resend-verify:${user.id}`, 3, HOUR);
  if (!user.emailVerifiedAt) await sendVerificationEmail(user);
  return json({ ok: true });
});
