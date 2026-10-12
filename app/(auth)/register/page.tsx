import type { Metadata } from "next";
import { RegisterForm } from "./register-form";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Registrieren", robots: { index: false } };

export default function RegisterPage() {
  return <RegisterForm googleEnabled={env.googleEnabled} />;
}
