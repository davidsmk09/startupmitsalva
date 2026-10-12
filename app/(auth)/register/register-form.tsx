"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field } from "@/components/forms/field";
import { apiFetch } from "@/lib/client-api";
import { t } from "@/lib/i18n";

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accept, setAccept] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get("name") ?? ""),
      company: String(fd.get("company") ?? ""),
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      acceptTerms: accept,
    };
    const local: Record<string, string> = {};
    if (body.password.length < 10) local.password = t.auth.passwordTooShort;
    if (body.password !== String(fd.get("password2") ?? "")) local.password2 = t.auth.passwordsDontMatch;
    if (!accept) local.acceptTerms = "Bitte akzeptiere die AGB.";
    setErrors(local);
    if (Object.keys(local).length) return;

    setLoading(true);
    setError(null);
    const res = await apiFetch("/api/auth/register", { body });
    if (!res.ok) {
      setLoading(false);
      setError(res.error);
      setErrors(res.fields ?? {});
      return;
    }
    const login = await signIn("credentials", { email: body.email, password: body.password, redirect: false });
    setLoading(false);
    if (login?.ok) {
      router.push("/dashboard?welcome=1");
      router.refresh();
    } else {
      router.push("/login?registered=1");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-2xl">
          {t.auth.registerTitle}
        </CardTitle>
        <CardDescription>{t.auth.registerSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field id="name" label={t.auth.name} required error={errors.name}>
            <Input name="name" autoComplete="name" required />
          </Field>
          <Field id="company" label={`${t.auth.company} (${t.common.optional})`} error={errors.company}>
            <Input name="company" autoComplete="organization" />
          </Field>
          <Field id="email" label={t.auth.email} required error={errors.email}>
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field id="password" label={t.auth.password} hint={t.auth.passwordHint} required error={errors.password}>
            <Input name="password" type="password" autoComplete="new-password" minLength={10} required />
          </Field>
          <Field id="password2" label={t.auth.passwordRepeat} required error={errors.password2}>
            <Input name="password2" type="password" autoComplete="new-password" required />
          </Field>
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <Checkbox
                id="acceptTerms"
                checked={accept}
                onCheckedChange={(v) => setAccept(v === true)}
                aria-invalid={errors.acceptTerms ? true : undefined}
              />
              <Label htmlFor="acceptTerms" className="text-sm font-normal leading-snug">
                Ich akzeptiere die{" "}
                <Link href="/agb" className="underline" target="_blank">AGB</Link> und habe die{" "}
                <Link href="/datenschutz" className="underline" target="_blank">Datenschutzhinweise</Link> gelesen.
              </Label>
            </div>
            {errors.acceptTerms && <p className="text-xs font-medium text-destructive">{errors.acceptTerms}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.common.loading : t.auth.registerButton}
          </Button>
        </form>
        {googleEnabled && (
          <Button variant="outline" className="w-full" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
            {t.auth.googleButton}
          </Button>
        )}
        <p className="text-center text-sm text-muted-foreground">
          {t.auth.hasAccount}{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {t.nav.login}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
