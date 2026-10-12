"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field } from "@/components/forms/field";
import { apiFetch } from "@/lib/client-api";
import { t } from "@/lib/i18n";

export function QuickCheckForm() {
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (!consent) return setErrors({ consent: t.lead.consentRequired });
        setBusy(true);
        setError(null);
        const res = await apiFetch<{ token: string | null }>("/api/gratis-check", {
          body: {
            domain: String(fd.get("domain") ?? ""),
            brandName: String(fd.get("brandName") ?? ""),
            industry: String(fd.get("industry") ?? ""),
            city: String(fd.get("city") ?? ""),
            email: String(fd.get("email") ?? ""),
            homepage: String(fd.get("homepage") ?? ""),
            consent,
          },
        });
        if (!res.ok) {
          setBusy(false);
          setError(res.error);
          setErrors(res.fields ?? {});
          return;
        }
        if (res.data.token) router.push(`/gratis-check/ergebnis/${res.data.token}`);
        else setBusy(false);
      }}
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="domain" label="Domain" hint="z. B. beispiel.de" required error={errors.domain}>
          <Input name="domain" placeholder="beispiel.de" autoComplete="url" />
        </Field>
        <Field id="brandName" label="Markenname" required error={errors.brandName}>
          <Input name="brandName" autoComplete="organization" />
        </Field>
        <Field id="industry" label="Branche" hint="z. B. Zahnarzt, Dachdecker" required error={errors.industry}>
          <Input name="industry" />
        </Field>
        <Field id="city" label="Ort" required error={errors.city}>
          <Input name="city" autoComplete="address-level2" />
        </Field>
      </div>
      <Field id="email" label="E-Mail-Adresse" hint="Für den Link zu deinem Ergebnis und eine mögliche Rückmeldung" required error={errors.email}>
        <Input name="email" type="email" autoComplete="email" />
      </Field>
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
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? t.common.loading : "Gratis-Check starten"}
      </Button>
      <p className="text-xs text-muted-foreground">Kostenlos und unverbindlich. Begrenzt auf wenige Checks pro Tag und Domain.</p>
    </form>
  );
}
