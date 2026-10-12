import bcrypt from "bcryptjs";
import { z } from "zod";

export const PASSWORD_MIN = 10;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Das Passwort muss mindestens ${PASSWORD_MIN} Zeichen lang sein.`)
  .max(200, "Das Passwort ist zu lang.");

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(pw, hash);
}
