"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field } from "@/components/forms/field";
import { apiFetch } from "@/lib/client-api";
import { t } from "@/lib/i18n";

export default function ForgotPage() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await apiFetch("/api/auth/forgot", { body: { email: String(fd.get("email") ?? "") } });
    setLoading(false);
    if (res.ok) setDone(true);
    else setError(res.error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-2xl">{t.auth.forgotTitle}</CardTitle>
        <CardDescription>{t.auth.forgotSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {done ? (
          <Alert variant="success">
            <AlertDescription>{t.auth.forgotSent}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Field id="email" label={t.auth.email} required>
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.common.loading : t.auth.forgotButton}
            </Button>
          </form>
        )}
        <Link href="/login" className="block text-center text-sm text-primary underline-offset-4 hover:underline">
          {t.common.back} zum Login
        </Link>
      </CardContent>
    </Card>
  );
}
