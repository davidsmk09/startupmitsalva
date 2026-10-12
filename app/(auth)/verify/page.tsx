import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyEmailToken } from "@/lib/auth/service";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.auth.verifyTitle, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await verifyEmailToken(token) : false;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="flex items-center gap-2 text-2xl">
          {ok ? <CheckCircle2 className="text-success" aria-hidden /> : <XCircle className="text-destructive" aria-hidden />}
          {t.auth.verifyTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>{ok ? t.auth.verifySuccess : t.auth.verifyFailed}</p>
        <Button asChild>
          <Link href="/dashboard">{t.nav.dashboard}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
