import { NextResponse } from "next/server";
import { enforceRateLimit, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { exportUserData } from "@/lib/account";
import { HOUR } from "@/lib/security/rate-limit";

export const GET = handler(async () => {
  const user = await requireUser();
  await enforceRateLimit(`export:${user.id}`, 10, HOUR);
  const data = await exportUserData(user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="datenexport-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
