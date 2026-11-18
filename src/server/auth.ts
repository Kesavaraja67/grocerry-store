import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { checkRateLimit } from "./ratelimit";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "OWNER";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "OWNER";
    forcedPasswordChange?: boolean;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Owner Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        // Rate limit: 5 attempts per 15 minutes per email
        const rateLimitKey = `login:${email}`;
        const isAllowed = await checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
        if (!isAllowed) {
          throw new Error("Too many login attempts. Please wait 15 minutes before trying again.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: "OWNER",
          forcedPasswordChange: user.forcedPasswordChange,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 14 * 24 * 60 * 60, // 14 days
  },
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = "OWNER";
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = "OWNER";
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      const prodFallback =
        process.env.NEXT_PUBLIC_SITE_URL || "https://pandianstore.vercel.app";
      const safeBase =
        process.env.NODE_ENV === "production" && baseUrl.includes("localhost")
          ? prodFallback
          : baseUrl;

      if (url.startsWith("/")) {
        return `${safeBase}${url}`;
      }

      try {
        const target = new URL(url);
        if (
          process.env.NODE_ENV === "production" &&
          (target.hostname === "localhost" || target.hostname === "127.0.0.1")
        ) {
          return `${safeBase}${target.pathname}${target.search}${target.hash}`;
        }
        if (target.origin === new URL(safeBase).origin) {
          return url;
        }
      } catch {
        // Invalid URL; fall back to safeBase
      }

      return safeBase;
    },
  },
});

/**
 * Structural Security Boundary (Section 7 and 14).
 * Must be called at the top of every admin server action, route handler, and admin data function.
 * Throws an unauthorized error if no valid owner session exists.
 */
export async function requireOwner() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") {
    throw new Error("Unauthorized: Owner access required.");
  }
  return session.user;
}
