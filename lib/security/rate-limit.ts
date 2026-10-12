import { prisma } from "@/lib/db";

/**
 * Fixed-Window-Rate-Limit, DB-gestützt (funktioniert auch über mehrere
 * Instanzen/Serverless hinweg, ohne Redis). Bei DB-Fehlern greift ein
 * In-Memory-Fallback. Ein Upstash-Adapter könnte dieselbe Signatur bedienen.
 */
export type RateLimitResult = { ok: boolean; remaining: number; resetAt: Date };

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: new Date(now + windowMs) };
  }
  entry.count += 1;
  return { ok: entry.count <= limit, remaining: Math.max(0, limit - entry.count), resetAt: new Date(entry.resetAt) };
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (process.env.RATE_LIMIT_DISABLED === "true") return { ok: true, remaining: limit, resetAt: new Date() };
  const now = new Date();
  try {
    return await prisma.$transaction(async (tx) => {
      const bucket = await tx.rateLimitBucket.findUnique({ where: { key } });
      if (!bucket || bucket.resetAt <= now) {
        const resetAt = new Date(now.getTime() + windowMs);
        await tx.rateLimitBucket.upsert({
          where: { key },
          create: { key, count: 1, resetAt },
          update: { count: 1, resetAt },
        });
        return { ok: true, remaining: limit - 1, resetAt };
      }
      const updated = await tx.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } });
      return { ok: updated.count <= limit, remaining: Math.max(0, limit - updated.count), resetAt: updated.resetAt };
    });
  } catch {
    return memoryLimit(key, limit, windowMs);
  }
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
