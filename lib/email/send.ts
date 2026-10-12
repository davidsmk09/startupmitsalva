import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logger, errorMessage } from "@/lib/logger";

export type EmailMessage = { to: string; subject: string; html: string; text: string };

/**
 * Versendet eine E-Mail über Resend (wenn RESEND_API_KEY gesetzt) und
 * protokolliert jede Nachricht in der Tabelle OutboxEmail.
 * Ohne Key: Ausgabe in der Konsole + Outbox (Status LOGGED).
 */
export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; status: string }> {
  const key = env.resendApiKey;
  let status: "SENT" | "LOGGED" | "FAILED" = "LOGGED";
  let error: string | undefined;

  if (key) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.emailFrom, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Resend HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      status = "SENT";
    } catch (err) {
      status = "FAILED";
      error = errorMessage(err);
      logger.error("email.failed", { to: msg.to, subject: msg.subject, error });
    }
  } else {
    logger.info("email.outbox", { to: msg.to, subject: msg.subject });
    if (process.env.NODE_ENV !== "test") {
      console.log(`\n──── E-Mail (Outbox) ────\nAn: ${msg.to}\nBetreff: ${msg.subject}\n\n${msg.text}\n─────────────────────────\n`);
    }
  }

  try {
    await prisma.outboxEmail.create({
      data: {
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        status,
        provider: key ? "resend" : "outbox",
        error,
      },
    });
  } catch (err) {
    logger.error("email.outbox_write_failed", { error: errorMessage(err) });
  }
  return { ok: status !== "FAILED", status };
}
