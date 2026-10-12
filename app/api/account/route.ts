import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, json, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { deleteUserAccount } from "@/lib/account";

const schema = z.object({ confirmEmail: z.string().trim().toLowerCase(), password: z.string().max(200).optional().default("") });

/** Konto inkl. Daten löschen (Bestätigung per E-Mail-Eingabe + Passwort). */
export const DELETE = handler(async (req) => {
  const user = await requireUser();
  const { confirmEmail, password } = await parseBody(req, schema);
  if (confirmEmail !== user.email) throw new ApiError(400, "Die eingegebene E-Mail-Adresse stimmt nicht überein.");
  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (record.passwordHash && !(await verifyPassword(password, record.passwordHash))) {
    throw new ApiError(400, "Das Passwort ist falsch.");
  }
  if (record.role === "ADMIN" && (await prisma.user.count({ where: { role: "ADMIN" } })) <= 1) {
    throw new ApiError(400, "Der letzte Admin-Account kann nicht gelöscht werden.");
  }
  await deleteUserAccount(user.id);
  return json({ ok: true });
});
