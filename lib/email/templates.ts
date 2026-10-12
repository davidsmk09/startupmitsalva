import { env } from "@/lib/env";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f4f6fb;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:12px;padding:32px">
<tr><td style="font-size:18px;font-weight:700;color:#1d4ed8;padding-bottom:16px">${esc(env.appName)}</td></tr>
<tr><td style="font-size:15px;line-height:1.6">${bodyHtml}</td></tr>
<tr><td style="font-size:12px;color:#6b7280;padding-top:24px;border-top:1px solid #e5e7eb">
Diese E-Mail wurde automatisch von ${esc(env.appName)} versendet. KI-Antworten schwanken – wir zeigen Trends, keine Garantien.
</td></tr></table></td></tr></table></body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#1d4ed8;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${esc(label)}</a></p>`;
}

export function verifyEmailTemplate(name: string | null, link: string) {
  const subject = `Bitte bestätige deine E-Mail-Adresse – ${env.appName}`;
  const greeting = name ? `Hallo ${esc(name)},` : "Hallo,";
  return {
    subject,
    html: layout(subject, `<p>${greeting}</p><p>bitte bestätige deine E-Mail-Adresse, damit du alle Funktionen nutzen kannst.</p>${button(link, "E-Mail bestätigen")}<p style="font-size:13px;color:#6b7280">Der Link ist 48 Stunden gültig. Falls du dich nicht registriert hast, ignoriere diese E-Mail.</p>`),
    text: `${name ? `Hallo ${name},` : "Hallo,"}\n\nbitte bestätige deine E-Mail-Adresse:\n${link}\n\nDer Link ist 48 Stunden gültig.`,
  };
}

export function resetPasswordTemplate(link: string) {
  const subject = `Passwort zurücksetzen – ${env.appName}`;
  return {
    subject,
    html: layout(subject, `<p>Hallo,</p><p>du hast angefordert, dein Passwort zurückzusetzen.</p>${button(link, "Neues Passwort festlegen")}<p style="font-size:13px;color:#6b7280">Der Link ist 1 Stunde gültig. Wenn du das nicht warst, kannst du diese E-Mail ignorieren.</p>`),
    text: `Hallo,\n\nsetze dein Passwort hier zurück (1 Stunde gültig):\n${link}\n\nWenn du das nicht warst, ignoriere diese E-Mail.`,
  };
}

export function leadConfirmationTemplate(name: string | null, paket: string | null) {
  const subject = `Danke für deine Anfrage – ${env.appName}`;
  const p = paket ? ` zu Paket ${esc(paket)}` : "";
  return {
    subject,
    html: layout(subject, `<p>${name ? `Hallo ${esc(name)},` : "Hallo,"}</p><p>vielen Dank für deine Anfrage${p}. Wir melden uns in der Regel innerhalb von zwei Werktagen mit einer Einschätzung und einem unverbindlichen Angebot.</p><p>Bis dahin kannst du gern den <a href="${esc(env.appUrl)}/gratis-check">kostenlosen Gratis-Check</a> nutzen.</p>`),
    text: `${name ? `Hallo ${name},` : "Hallo,"}\n\nvielen Dank für deine Anfrage${paket ? ` zu Paket ${paket}` : ""}. Wir melden uns in der Regel innerhalb von zwei Werktagen.\n\n${env.appUrl}`,
  };
}

export function leadAdminNotifyTemplate(lead: {
  id: string;
  name?: string | null;
  email: string;
  firma?: string | null;
  website?: string | null;
  paketInteresse?: string | null;
  nachricht?: string | null;
  source: string;
}) {
  const subject = `Neuer Lead (${lead.source}): ${lead.firma || lead.email}`;
  const rows = [
    ["Quelle", lead.source],
    ["Name", lead.name ?? "–"],
    ["E-Mail", lead.email],
    ["Firma", lead.firma ?? "–"],
    ["Website", lead.website ?? "–"],
    ["Paket", lead.paketInteresse ?? "–"],
    ["Nachricht", lead.nachricht ?? "–"],
  ];
  return {
    subject,
    html: layout(
      subject,
      `<table cellpadding="4">${rows.map(([k, v]) => `<tr><td style="color:#6b7280">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>${button(`${env.appUrl}/admin/leads`, "Im Admin öffnen")}`,
    ),
    text: rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\n${env.appUrl}/admin/leads`,
  };
}

export function scanSummaryTemplate(input: {
  projectName: string;
  score: number;
  previous: number | null;
  margin: number | null;
  link: string;
  topRecommendations: string[];
}) {
  const diff = input.previous === null ? null : Math.round((input.score - input.previous) * 10) / 10;
  const trend =
    diff === null
      ? "Das ist dein erster automatischer Scan."
      : diff > 0
        ? `Dein Score ist um ${diff} Punkte gestiegen.`
        : diff < 0
          ? `Dein Score ist um ${Math.abs(diff)} Punkte gefallen.`
          : "Dein Score ist unverändert.";
  const noise =
    input.margin !== null && diff !== null && Math.abs(diff) <= input.margin
      ? ` Hinweis: Die Veränderung liegt innerhalb der Schwankungsbreite (± ${input.margin}) und kann Zufall sein.`
      : "";
  const subject = `Wochenbericht ${input.projectName}: Score ${Math.round(input.score)}`;
  const recos = input.topRecommendations.length
    ? `<p><strong>Top-Empfehlungen:</strong></p><ul>${input.topRecommendations.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`
    : "";
  return {
    subject,
    html: layout(subject, `<p>Hallo,</p><p>der wöchentliche Scan für <strong>${esc(input.projectName)}</strong> ist fertig.</p><p style="font-size:28px;font-weight:700;margin:8px 0">${Math.round(input.score)} / 100</p><p>${esc(trend + noise)}</p>${recos}${button(input.link, "Ergebnis ansehen")}`),
    text: `Der wöchentliche Scan für ${input.projectName} ist fertig.\nScore: ${Math.round(input.score)}/100\n${trend}${noise}\n\n${input.topRecommendations.map((r) => `- ${r}`).join("\n")}\n\n${input.link}`,
  };
}

export function paymentFailedTemplate(link: string) {
  const subject = `Zahlung fehlgeschlagen – ${env.appName}`;
  return {
    subject,
    html: layout(subject, `<p>Hallo,</p><p>leider konnte die letzte Zahlung für dein Abo nicht durchgeführt werden. Bitte aktualisiere deine Zahlungsdaten, damit deine Scans weiterlaufen.</p>${button(link, "Zahlungsdaten aktualisieren")}`),
    text: `Leider konnte die letzte Zahlung nicht durchgeführt werden. Bitte aktualisiere deine Zahlungsdaten: ${link}`,
  };
}
