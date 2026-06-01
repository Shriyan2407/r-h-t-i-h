import type { NextAuthConfig } from "next-auth";

// These are the ONLY pages accessible without authentication
const PUBLIC_PAGES = ["/", "/auth/login", "/auth/signup", "/auth/forgot-password", "/auth/reset-password", "/auth/error"];

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/auth/login",
    error:  "/auth/error",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname   = nextUrl.pathname;

      // Always allow NextAuth's own API routes
      if (pathname.startsWith("/api/auth")) return true;

      // Block all other API routes for unauthenticated users — return 401 JSON
      if (pathname.startsWith("/api/")) {
        if (!isLoggedIn) {
          return new Response(
            JSON.stringify({ error: "Authentication required", code: "UNAUTHENTICATED" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }
        return true;
      }

      const isPublicPage = PUBLIC_PAGES.some(p => pathname === p || pathname.startsWith(p + "/"));

      // Logged-in users visiting auth pages → send to dashboard
      if (isLoggedIn && pathname.startsWith("/auth/")) {
        return Response.redirect(new URL("/dashboard", nextUrl.origin));
      }

      // Public pages are always accessible
      if (isPublicPage) return true;

      // Everything else requires authentication
      if (!isLoggedIn) {
        const loginUrl = new URL("/auth/login", nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return Response.redirect(loginUrl);
      }

      return true;
    },
  },
  providers: [],
};
