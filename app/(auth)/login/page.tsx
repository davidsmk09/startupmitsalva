import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Anmelden", robots: { index: false } };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm googleEnabled={env.googleEnabled} />
    </Suspense>
  );
}
