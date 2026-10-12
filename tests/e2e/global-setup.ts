import { execSync } from "node:child_process";

/**
 * E2E-Datenbank (prisma/e2e.db): Migrationen anwenden (idempotent, nicht
 * destruktiv). Tests verwenden eindeutige E-Mails/Domains; nur die
 * Rate-Limit-Zähler werden zurückgesetzt, damit Wiederholungsläufe nicht
 * am Gratis-Check-Limit scheitern.
 */
export default async function globalSetup() {
  const env = { ...process.env, DATABASE_URL: "file:./e2e.db" };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  process.env.DATABASE_URL = "file:./e2e.db";
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasources: { db: { url: "file:./e2e.db" } } });
  await prisma.rateLimitBucket.deleteMany();
  await prisma.$disconnect();
}
