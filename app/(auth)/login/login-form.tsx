"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field } from "@/components/forms/field";
import { t } from "@/lib/i18n";

function safeCallback(url: string | null): string {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return "/dashboard";
  return url;
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallback(params.get("callbackUrl"));
  const [error, setError] = useState<string | null>(params.get("error") ? t.auth.invalidCredentials : null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      redirect: false,
    });
    setLoading(false);
    if (!res || res.error) {
      setError(res?.error === "RATE_LIMIT" ? t.common.rateLimited : t.auth.invalidCredentials);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-2xl">
          {t.auth.loginTitle}
        </CardTitle>
        <CardDescription>{t.auth.loginSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {params.get("reset") === "1" && (
          <Alert variant="success">
            <AlertDescription>{t.auth.resetSuccess}</AlertDescription>
          </Alert>
        )}
        {params.get("registered") === "1" && (
          <Alert variant="success">
            <AlertDescription>{t.auth.registered}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field id="email" label={t.auth.email} required>
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field id="password" label={t.auth.password} required>
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          <div className="flex justify-end">
            <Link href="/forgot" className="text-sm text-primary underline-offset-4 hover:underline">
              {t.auth.forgot}
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.common.loading : t.auth.loginButton}
          </Button>
        </form>
        {googleEnabled && (
          <>
            <div className="relative text-center text-xs text-muted-foreground">
              <span className="bg-card px-2">{t.auth.or}</span>
            </div>
            <Button variant="outline" className="w-full" onClick={() => signIn("google", { callbackUrl })}>
              {t.auth.googleButton}
            </Button>
          </>
        )}
        <p className="text-center text-sm text-muted-foreground">
          {t.auth.noAccount}{" "}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            {t.nav.register}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
