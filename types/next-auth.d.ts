import "next-auth";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id:               string;
      role:             "USER" | "ADMIN";
      subscriptionTier: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:               string;
    /** users.sessionVersion at issue time; a mismatch means the session was revoked. */
    sv:               number;
    role?:            "USER" | "ADMIN";
    subscriptionTier?: string;
  }
}
