import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, json, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";

const schema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  notifyWeekly: z.boolean().optional(),
  notifyAlerts: z.boolean().optional(),
});

export const PATCH = handler(async (req) => {
  const user = await requireUser();
  const data = await parseBody(req, schema);
  await prisma.user.update({ where: { id: user.id }, data });
  return json({ ok: true });
});
