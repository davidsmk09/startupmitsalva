import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/options";

const nextAuthHandler = NextAuth(authOptions);
export { nextAuthHandler as GET, nextAuthHandler as POST };
