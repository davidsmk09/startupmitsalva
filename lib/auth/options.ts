import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyPassword } from "@/lib/auth/password";
import { createUserWithOrg } from "@/lib/auth/service";
import { rateLimit, MINUTE } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "E-Mail & Passwort",
    credentials: { email: { label: "E-Mail", type: "email" }, password: { label: "Passwort", type: "password" } },
    async authorize(raw, req) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;
      const fwd = req?.headers?.["x-forwarded-for"];
      const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim() ?? "unknown";
      const [byIp, byEmail] = await Promise.all([
        rateLimit(`login:ip:${ip}`, 30, 15 * MINUTE),
        rateLimit(`login:email:${email}`, 10, 15 * MINUTE),
      ]);
      if (!byIp.ok || !byEmail.ok) {
        logger.warn("auth.login_rate_limited", { ip });
        throw new Error("RATE_LIMIT");
      }
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await verifyPassword(password, user.passwordHash))) return null;
      return { id: user.id, email: user.email, name: user.name, role: user.role };
    },
  }),
];

if (env.googleEnabled) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt", maxAge: 30 * 24 * 3600 },
  pages: { signIn: "/login", error: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        const verified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
        if (!email || verified === false) return false;
        const existing = await prisma.user.findUnique({ where: { email } });
        if (!existing) {
          await createUserWithOrg({ email, name: user.name, verified: true });
        } else if (!existing.emailVerifiedAt) {
          await prisma.user.update({ where: { id: existing.id }, data: { emailVerifiedAt: new Date() } });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google") {
          const dbUser = await prisma.user.findUnique({ where: { email: user.email!.toLowerCase() } });
          if (dbUser) {
            token.uid = dbUser.id;
            token.role = dbUser.role;
          }
        } else {
          token.uid = user.id;
          token.role = (user as { role?: string }).role ?? "USER";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = (token.role as string) ?? "USER";
      }
      return session;
    },
  },
  logger: {
    error(code, metadata) {
      logger.error("nextauth.error", { code, metadata: metadata instanceof Error ? metadata.message : undefined });
    },
    warn(code) {
      logger.warn("nextauth.warn", { code });
    },
    debug() {},
  },
};
