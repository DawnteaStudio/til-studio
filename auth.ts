import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import { authConfigurationReady, configuredAuthOrigin, isAllowedAdminId } from "@/lib/auth/config";

export function buildAuthConfig(): NextAuthConfig {
  return {
    providers: [GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: { params: { scope: "read:user" } },
    })],
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
    pages: { signIn: "/login", error: "/login" },
    debug: false,
    logger: {
      error() { console.error("Authentication failed."); },
      warn(code) { console.warn("Authentication warning:", code); },
    },
    callbacks: {
      signIn({ account, profile }) {
        return authConfigurationReady() && account?.provider === "github" && isAllowedAdminId(String(profile?.id ?? ""));
      },
      jwt({ token, account, profile }) {
        if (!authConfigurationReady()) return null;
        if (account) {
          const id = String(profile?.id ?? "");
          if (account.provider !== "github" || !isAllowedAdminId(id)) return null;
          return { sub: id, githubId: id, name: typeof profile?.name === "string" ? profile.name : "관리자" };
        }
        // Client session updates cannot change the OAuth identity or grant access.
        return isAllowedAdminId(token.githubId) ? token : null;
      },
      session({ session, token }) {
        return {
          expires: session.expires,
          user: authConfigurationReady() && isAllowedAdminId(token.githubId)
            ? { id: token.githubId, name: typeof token.name === "string" ? token.name : "관리자" } : undefined,
        };
      },
      authorized({ auth }) {
        return authConfigurationReady() && isAllowedAdminId(auth?.user?.id);
      },
      redirect({ url, baseUrl }) {
        const origin = configuredAuthOrigin() ?? baseUrl;
        try {
          const destination = new URL(url, origin);
          if (destination.origin === origin) return destination.href;
        } catch { /* An invalid return address falls back to the public home page. */ }
        return origin;
      },
    },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(buildAuthConfig);
