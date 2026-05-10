import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        identityStore: { label: "Identity Store", type: "text" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
        const res = await fetch(`${api}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            identityStore: credentials.identityStore || undefined,
          }),
        });

        const data = await res.json();

        if (res.ok && data?.access_token) {
          return {
            id: data.access_token,
            email: credentials.email as string,
            accessToken: data.access_token,
            storeSlug: data.storeSlug ?? null,
            role: data.role ?? null,
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      const isOnAuthPage = [
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
      ].includes(nextUrl.pathname);

      // /verify-email is always public (accessible logged-in or not)
      if (nextUrl.pathname === "/verify-email") return true;

      // Logged-in users on auth pages → send to admin hub
      if (isOnAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/admin", nextUrl));
        return true;
      }

      // Protected pages: /, /admin, and /[store]/[role] patterns
      const isProtected =
        nextUrl.pathname === "/" ||
        nextUrl.pathname === "/admin" ||
        /^\/[^/]+\/[^/]+/.test(nextUrl.pathname);

      if (isProtected) {
        if (isLoggedIn) return true;
        return Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.storeSlug = (user as any).storeSlug ?? null;
        token.role = (user as any).role ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      (session as any).accessToken = (token as any).accessToken;
      (session as any).storeSlug = (token as any).storeSlug ?? null;
      (session as any).role = (token as any).role ?? null;
      return session;
    },
  },
});
