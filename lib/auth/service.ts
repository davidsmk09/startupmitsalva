import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { resetPasswordTemplate, verifyEmailTemplate } from "@/lib/email/templates";
import { generateToken, hashToken } from "@/lib/security/tokens";
import { hashPassword } from "@/lib/auth/password";

export const TOKEN_TYPES = { VERIFY: "VERIFY_EMAIL", RESET: "RESET_PASSWORD" } as const;

/** Legt User + eigene Organisation + OWNER-Mitgliedschaft an. */
export async function createUserWithOrg(input: {
  email: string;
  password?: string | null;
  name?: string | null;
  company?: string | null;
  role?: "USER" | "ADMIN";
  verified?: boolean;
}) {
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name ?? null,
        role: input.role ?? "USER",
        emailVerifiedAt: input.verified ? new Date() : null,
      },
    });
    const org = await tx.organization.create({
      data: { name: input.company?.trim() || input.name?.trim() || input.email.split("@")[0] },
    });
    await tx.membership.create({ data: { userId: user.id, orgId: org.id, role: "OWNER" } });
    return { user, org };
  });
}

async function createToken(userId: string, type: string, ttlMs: number): Promise<string> {
  const token = generateToken();
  // Alte, unbenutzte Tokens desselben Typs entwerten
  await prisma.userToken.deleteMany({ where: { userId, type, usedAt: null } });
  await prisma.userToken.create({
    data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

/** Prüft und verbraucht ein Token. Gibt die userId zurück oder null. */
export async function consumeToken(token: string, type: string): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const record = await prisma.userToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) return null;
  const res = await prisma.userToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return res.count === 1 ? record.userId : null;
}

export async function sendVerificationEmail(user: { id: string; email: string; name: string | null }) {
  const token = await createToken(user.id, TOKEN_TYPES.VERIFY, 48 * 3600_000);
  const link = `${env.appUrl}/verify?token=${token}`;
  await sendEmail({ to: user.email, ...verifyEmailTemplate(user.name, link) });
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  const userId = await consumeToken(token, TOKEN_TYPES.VERIFY);
  if (!userId) return false;
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return true;
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return; // keine Auskunft, ob ein Konto existiert
  const token = await createToken(user.id, TOKEN_TYPES.RESET, 3600_000);
  await sendEmail({ to: user.email, ...resetPasswordTemplate(`${env.appUrl}/reset?token=${token}`) });
}

export async function resetPasswordWithToken(token: string, password: string): Promise<boolean> {
  const userId = await consumeToken(token, TOKEN_TYPES.RESET);
  if (!userId) return false;
  await prisma.user.update({
    where: { id: userId },
    // Reset beweist Zugriff auf das Postfach -> E-Mail gilt als bestätigt
    data: { passwordHash: await hashPassword(password), emailVerifiedAt: new Date() },
  });
  return true;
}
