"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field } from "@/components/forms/field";
import { apiFetch } from "@/lib/client-api";
import { t } from "@/lib/i18n";

/** Angebots- bzw. Kontaktformular (Honeypot-Feld "homepage" für Spam-Schutz). */
export function LeadForm({ source, defaultPaket }: { source: "ANGEBOT" | "KONTAKT"; defaultPaket?: "2" | "3" }) {
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (done) {
    return (
      <Alert variant="success">
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          Vielen Dank! Deine Anfrage ist eingegangen. Wir haben dir eine Bestätigung per E-Mail geschickt und melden uns in der Regel innerhalb von zwei
          Werktagen.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const body = {
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          firma: String(fd.get("firma") ?? ""),
          website: String(fd.get("website") ?? ""),
          branche: String(fd.get("branche") ?? ""),
          paketInteresse: source === "ANGEBOT" ? String(fd.get("paket") ?? "2") : undefined,
          nachricht: String(fd.get("nachricht") ?? ""),
          homepage: String(fd.get("homepage") ?? ""),
          consent,
          source,
        };
        if (!consent) return setErrors({ consent: t.lead.consentRequired });
        setBusy(true);
        setError(null);
        const res = await apiFetch("/api/leads", { body });
        setBusy(false);
        if (!res.ok) {
          setError(res.error);
          setErrors(res.fields ?? {});
          return;
        }
        setDone(true);
      }}
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Name" required error={errors.name}>
          <Input name="name" autoComplete="name" />
        </Field>
        <Field id="email" label="E-Mail-Adresse" required error={errors.email}>
          <Input name="email" type="email" autoComplete="email" />
        </Field>
        <Field id="firma" label="Firma" error={errors.firma}>
          <Input name="firma" autoComplete="organization" />
        </Field>
        <Field id="website" label="Website" error={errors.website}>
          <Input name="website" placeholder="beispiel.de" autoComplete="url" />
        </Field>
        {source === "ANGEBOT" && (
          <>
            <Field id="paket" label="Gewünschtes Paket" required>
              <NativeSelect name="paket" defaultValue={defaultPaket ?? "2"}>
                <option value="2">Paket 2 – Screener + Überarbeitung</option>
                <option value="3">Paket 3 – Komplett</option>
              </NativeSelect>
            </Field>
            <Field id="branche" label="Branche" error={errors.branche}>
              <Input name="branche" />
            </Field>
          </>
        )}
      </div>
      <Field id="nachricht" label="Nachricht" error={errors.nachricht}>
        <Textarea name="nachricht" rows={5} placeholder={source === "ANGEBOT" ? "Was ist dein Ziel? Gibt es Besonderheiten?" : "Wie können wir helfen?"} />
      </Field>
      {/* Honeypot: für Menschen unsichtbar */}
      <div aria-hidden="true" className="absolute left-[-10000px] h-0 w-0 overflow-hidden">
        <label htmlFor="homepage">Bitte leer lassen</label>
        <input id="homepage" name="homepage" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="space-y-1">
        <div className="flex items-start gap-2">
          <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} aria-invalid={errors.consent ? true : undefined} />
          <Label htmlFor="consent" className="text-sm font-normal leading-snug">
            {t.lead.consent}{" "}
            <Link href="/datenschutz" className="underline" target="_blank">
              Datenschutzerklärung
            </Link>
          </Label>
        </div>
        {errors.consent && <p className="text-xs font-medium text-destructive">{errors.consent}</p>}
      </div>
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? t.common.loading : source === "ANGEBOT" ? "Unverbindlich anfragen" : "Nachricht senden"}
      </Button>
    </form>
  );
}
