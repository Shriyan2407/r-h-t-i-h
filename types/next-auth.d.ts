import "next-auth";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id:               string;
      subscriptionTier: string;
    } & DefaultSession["user"];
  }

  interface User {
    subscriptionTier?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:               string;
    subscriptionTier?: string;
  }
}
