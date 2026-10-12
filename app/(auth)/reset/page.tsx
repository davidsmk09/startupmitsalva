import type { Metadata } from "next";
import { ResetForm } from "./reset-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.auth.resetTitle, robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetForm token={token ?? ""} />;
}
