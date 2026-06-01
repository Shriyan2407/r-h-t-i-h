import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [Google({
          clientId:     process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          allowDangerousEmailAccountLinking: true,
        })]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user?.hashedPassword) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.hashedPassword
        );
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data:  { lastLogin: new Date() },
        }).catch(() => {});

        return {
          id:               user.id,
          name:             user.name,
          email:            user.email,
          image:            user.image,
          subscriptionTier: user.subscriptionTier,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id               = user.id!;
        token.subscriptionTier = (user as { subscriptionTier?: string }).subscriptionTier ?? "free";
      }
      if (trigger === "update" && session?.user) {
        token.name  = session.user.name;
        token.image = session.user.image;
        token.subscriptionTier = session.user.subscriptionTier ?? token.subscriptionTier;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id               = token.id as string;
      session.user.subscriptionTier = (token.subscriptionTier as string) ?? "free";
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (account?.provider !== "credentials") {
        await prisma.user.update({
          where: { id: user.id! },
          data:  { lastLogin: new Date() },
        }).catch(() => {});
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
