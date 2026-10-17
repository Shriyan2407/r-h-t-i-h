import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";
import { authorizeCredentials } from "./credentials";
import { jwtCallback, sessionCallback, signInCallback } from "./callbacks";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    // No automatic account linking: if a password account already exists for the same
    // email, the Google sign-in is refused (OAuthAccountNotLinked) instead of silently
    // merging into it, which would let a pre-registered password keep working.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [Google({
          clientId:     process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials, request) => authorizeCredentials(credentials, request),
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    signIn:  signInCallback,
    jwt:     jwtCallback,
    session: sessionCallback,
  },
  events: {
    async signIn({ user, account }) {
      await prisma.user.update({
        where: { id: user.id! },
        data:  { lastLogin: new Date() },
      }).catch(() => {});

      if (account?.provider !== "credentials") {
        // Create default preferences if missing
        await prisma.userPreferences.upsert({
          where:  { userId: user.id! },
          create: { userId: user.id!, theme: "dark" },
          update: {},
        }).catch(() => {});
      }
    },
  },
});
