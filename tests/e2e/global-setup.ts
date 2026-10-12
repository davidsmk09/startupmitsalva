import { execSync } from "node:child_process";

export const E2E_ADMIN = { email: "e2e-admin@example.com", password: "e2e-admin-passwort-123" };

/**
 * E2E-Datenbank (prisma/e2e.db): Migrationen anwenden (idempotent, nicht
 * destruktiv). Tests verwenden eindeutige E-Mails/Domains; nur die
 * Rate-Limit-Zähler werden zurückgesetzt, damit Wiederholungsläufe nicht
 * am Gratis-Check-Limit scheitern. Legt einen Admin für die Tests an.
 */
export default async function globalSetup() {
  const env = { ...process.env, DATABASE_URL: "file:./e2e.db" };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  const { PrismaClient } = await import("@prisma/client");
  const bcrypt = (await import("bcryptjs")).default;
  const prisma = new PrismaClient({ datasources: { db: { url: "file:./e2e.db" } } });
  await prisma.rateLimitBucket.deleteMany();
  const existing = await prisma.user.findUnique({ where: { email: E2E_ADMIN.email } });
  if (!existing) {
    const user = await prisma.user.create({
      data: { email: E2E_ADMIN.email, passwordHash: await bcrypt.hash(E2E_ADMIN.password, 10), role: "ADMIN", name: "E2E Admin", emailVerifiedAt: new Date() },
    });
    const org = await prisma.organization.create({ data: { name: "E2E Admin-Team" } });
    await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role: "OWNER" } });
  }
  await prisma.$disconnect();
}
