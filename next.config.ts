import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
// HSTS und upgrade-insecure-requests nur, wenn die App per HTTPS ausgeliefert wird
const isHttps = (process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "").startsWith("https://");

/**
 * Content-Security-Policy: so streng wie mit Next.js praktikabel.
 * 'unsafe-inline' für Styles ist nötig (Recharts/Next inline styles);
 * Skripte: 'unsafe-inline' wird für die von Next erzeugten Inline-Bootstrap-
 * Skripte und JSON-LD benötigt. Stripe Checkout läuft per Redirect.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com https://accounts.google.com",
  "object-src 'none'",
  ...(isHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  ...(isHttps ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@react-pdf/renderer", "@prisma/client", "bcryptjs"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
