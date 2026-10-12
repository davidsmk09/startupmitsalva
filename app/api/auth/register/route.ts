import { prisma } from "@/lib/db";
import { ApiError, enforceRateLimit, handler, json, parseBody } from "@/lib/api";
import { createUserWithOrg, sendVerificationEmail } from "@/lib/auth/service";
import { registerSchema } from "@/lib/validation";
import { clientIp, HOUR } from "@/lib/security/rate-limit";
import { t } from "@/lib/i18n";

export const POST = handler(async (req) => {
  await enforceRateLimit(`register:ip:${clientIp(req.headers)}`, 10, HOUR);
  const data = await parseBody(req, registerSchema);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ApiError(409, t.auth.emailTaken, "EMAIL_TAKEN", { email: t.auth.emailTaken });
  const { user } = await createUserWithOrg({
    email: data.email,
    password: data.password,
    name: data.name,
    company: data.company,
  });
  await sendVerificationEmail(user);
  return json({ ok: true }, 201);
});
