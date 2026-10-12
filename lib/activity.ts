import { prisma } from "@/lib/db";
import { logger, errorMessage } from "@/lib/logger";

/** Schreibt einen Eintrag ins AuditLog (wichtige Admin-/Billing-Ereignisse). */
export async function logActivity(input: {
  action: string;
  actorId?: string | null;
  orgId?: string | null;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId ?? null,
        orgId: input.orgId ?? null,
        targetType: input.targetType,
        targetId: input.targetId,
        metaJson: input.meta ? JSON.stringify(logger.redact(input.meta)) : null,
      },
    });
  } catch (err) {
    logger.error("activity.write_failed", { error: errorMessage(err) });
  }
}
