import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/api";

/** Prüft "Authorization: Bearer <CRON_SECRET>" (zeitkonstant). */
export function assertCronAuth(req: Request) {
  const secret = env.cronSecret;
  if (!secret || secret.length < 16) throw new ApiError(503, "CRON_SECRET ist nicht (ausreichend lang) konfiguriert.");
  const header = req.headers.get("authorization") ?? "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new ApiError(401, "Nicht autorisiert.");
}
