"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field } from "@/components/forms/field";
import { apiFetch } from "@/lib/client-api";
import { t } from "@/lib/i18n";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(token ? null : t.auth.resetFailed);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password.length < 10) return setError(t.auth.passwordTooShort);
    if (password !== String(fd.get("password2") ?? "")) return setError(t.auth.passwordsDontMatch);
    setLoading(true);
    const res = await apiFetch("/api/auth/reset", { body: { token, password } });
    setLoading(false);
    if (res.ok) router.push("/login?reset=1");
    else setError(res.error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-2xl">{t.auth.resetTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field id="password" label={t.auth.password} hint={t.auth.passwordHint} required>
            <Input name="password" type="password" autoComplete="new-password" required />
          </Field>
          <Field id="password2" label={t.auth.passwordRepeat} required>
            <Input name="password2" type="password" autoComplete="new-password" required />
          </Field>
          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? t.common.loading : t.auth.resetButton}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
