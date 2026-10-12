import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, enforceRateLimit, handler, json, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { hashPassword, passwordSchema, verifyPassword } from "@/lib/auth/password";
import { HOUR } from "@/lib/security/rate-limit";

const schema = z.object({ currentPassword: z.string().max(200).optional().default(""), newPassword: passwordSchema });

export const POST = handler(async (req) => {
  const user = await requireUser();
  await enforceRateLimit(`pw-change:${user.id}`, 10, HOUR);
  const { currentPassword, newPassword } = await parseBody(req, schema);
  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (record.passwordHash && !(await verifyPassword(currentPassword, record.passwordHash))) {
    throw new ApiError(400, "Das aktuelle Passwort ist falsch.", "VALIDATION", { currentPassword: "Falsches Passwort." });
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  return json({ ok: true });
});
