import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Build providers conditionally so broken OAuth buttons don't appear without env vars
const providers: NextAuthOptions["providers"] = [];

const googleId = process.env.GOOGLE_CLIENT_ID ?? "";
const googleSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
if (googleId && googleSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleId,
      clientSecret: googleSecret,
    })
  );
}

const githubId = process.env.GITHUB_CLIENT_ID ?? "";
const githubSecret = process.env.GITHUB_CLIENT_SECRET ?? "";
if (githubId && githubSecret) {
  providers.push(
    GitHubProvider({
      clientId: githubId,
      clientSecret: githubSecret,
    })
  );
}

providers.push(
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const email = credentials.email as string;
      const password = credentials.password as string;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.password) {
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
      } as any;
    },
  })
);

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? "dev-secret",
  adapter: PrismaAdapter(prisma),
  providers,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Optionally require pre-existing account for OAuth
      if (account && (account.provider === "github" || account.provider === "google")) {
        const allowAuto = (process.env.OAUTH_AUTO_SIGNUP ?? "true").toLowerCase() !== "false";
        const email = user?.email ?? null;
        if (!allowAuto) {
          if (!email) return "/login?error=EmailMissing";
          const exists = await prisma.user.findUnique({ where: { email } });
          if (!exists) {
            // Block auto-provision; ask user to sign up first
            return "/login?error=SignupRequired";
          }
        }
        // Optional: restrict Google sign-ins to a specific domain
        if (account.provider === "google") {
          const allowedDomain = (process.env.GOOGLE_ALLOWED_DOMAIN ?? "").toLowerCase();
          if (allowedDomain && email) {
            const domain = email.split("@")[1]?.toLowerCase();
            if (domain !== allowedDomain) {
              return "/login?error=DomainNotAllowed";
            }
          }
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token?.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
};
