import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";
import { logger, errorMessage } from "@/lib/logger";
import { t } from "@/lib/i18n";
import { rateLimit } from "@/lib/security/rate-limit";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * CSRF-Schutz für eigene API-Routen: Mutierende Requests müssen vom
 * eigenen Origin kommen (zusätzlich zu SameSite=Lax-Cookies).
 */
export function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin) {
    // Nicht-Browser-Clients (z. B. curl) senden oft keinen Origin. Ohne Cookie-
    // Session ist das unkritisch; mit Session verlangen wir einen Origin.
    if (req.headers.get("cookie")?.includes("session-token")) {
      throw new ApiError(403, t.common.forbidden, "CSRF");
    }
    return;
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new ApiError(403, t.common.forbidden, "CSRF");
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(403, t.common.forbidden, "CSRF");
  }
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Ungültige Anfrage (kein JSON).");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      if (!fields[key]) fields[key] = issue.message;
    }
    throw new ApiError(422, "Bitte prüfe deine Eingaben.", "VALIDATION", fields);
  }
  return parsed.data;
}

export async function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const r = await rateLimit(key, limit, windowMs);
  if (!r.ok) throw new ApiError(429, t.common.rateLimited, "RATE_LIMIT");
}

/** Wrappt einen Route-Handler mit einheitlicher Fehlerbehandlung. */
export function handler<Ctx = unknown>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, code: err.code, fields: err.fields }, { status: err.status });
      }
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: "Bitte prüfe deine Eingaben." }, { status: 422 });
      }
      logger.error("api.unhandled", { path: new URL(req.url).pathname, error: errorMessage(err) });
      return NextResponse.json({ error: t.common.genericError }, { status: 500 });
    }
  };
}
