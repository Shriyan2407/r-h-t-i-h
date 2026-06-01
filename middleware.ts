import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Include API routes so we can return 401 for unauthenticated API calls.
  // Exclude only Next.js internals and static files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
