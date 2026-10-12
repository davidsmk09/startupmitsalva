import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "./register-form";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Registrieren", robots: { index: false } };

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm googleEnabled={env.googleEnabled} />
    </Suspense>
  );
}
