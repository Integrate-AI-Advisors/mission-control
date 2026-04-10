import { describe, it, expect } from "vitest";

// Test the auth routing logic as pure functions
// (Testing the actual middleware requires Next.js runtime, so we test the logic)

interface AuthContext {
  pathname: string;
  userEmail: string | null;
}

function resolveAuthRoute(ctx: AuthContext): { action: string; redirectTo?: string } {
  const { pathname, userEmail } = ctx;
  const isLoginPage = pathname === "/login";
  const isAuthCallback = pathname === "/auth/callback";

  // 1. Auth callback always passes through
  if (isAuthCallback) return { action: "pass" };

  // 2. No user + not on login → redirect to login
  if (!userEmail && !isLoginPage) return { action: "redirect", redirectTo: "/login" };

  // 3. User with wrong domain → sign out
  if (userEmail && !userEmail.endsWith("@integrate-ai.uk")) {
    return { action: "redirect", redirectTo: "/login?error=unauthorized" };
  }

  // 4. User on login page → redirect to home
  if (userEmail && isLoginPage) return { action: "redirect", redirectTo: "/" };

  // 5. Authenticated user on normal page → pass
  return { action: "pass" };
}

describe("Auth middleware routing logic", () => {
  describe("auth callback", () => {
    it("always passes through regardless of auth state", () => {
      expect(resolveAuthRoute({ pathname: "/auth/callback", userEmail: null })).toEqual({ action: "pass" });
      expect(resolveAuthRoute({ pathname: "/auth/callback", userEmail: "chad@integrate-ai.uk" })).toEqual({ action: "pass" });
    });
  });

  describe("unauthenticated user", () => {
    it("redirects to login from any page", () => {
      expect(resolveAuthRoute({ pathname: "/clients", userEmail: null })).toEqual({ action: "redirect", redirectTo: "/login" });
      expect(resolveAuthRoute({ pathname: "/clients/newground", userEmail: null })).toEqual({ action: "redirect", redirectTo: "/login" });
      expect(resolveAuthRoute({ pathname: "/", userEmail: null })).toEqual({ action: "redirect", redirectTo: "/login" });
    });

    it("does not redirect from login page", () => {
      expect(resolveAuthRoute({ pathname: "/login", userEmail: null })).toEqual({ action: "pass" });
    });
  });

  describe("domain restriction", () => {
    it("allows @integrate-ai.uk emails", () => {
      expect(resolveAuthRoute({ pathname: "/clients", userEmail: "chad@integrate-ai.uk" })).toEqual({ action: "pass" });
    });

    it("blocks non-@integrate-ai.uk emails", () => {
      expect(resolveAuthRoute({ pathname: "/clients", userEmail: "hacker@gmail.com" })).toEqual({
        action: "redirect",
        redirectTo: "/login?error=unauthorized",
      });
    });

    it("blocks similar domain names", () => {
      expect(resolveAuthRoute({ pathname: "/clients", userEmail: "fake@not-integrate-ai.uk" })).toEqual({
        action: "redirect",
        redirectTo: "/login?error=unauthorized",
      });
    });

    it("blocks subdomains", () => {
      expect(resolveAuthRoute({ pathname: "/clients", userEmail: "fake@sub.integrate-ai.uk" })).toEqual({
        action: "redirect",
        redirectTo: "/login?error=unauthorized",
      });
    });
  });

  describe("authenticated user on login page", () => {
    it("redirects to home", () => {
      expect(resolveAuthRoute({ pathname: "/login", userEmail: "chad@integrate-ai.uk" })).toEqual({
        action: "redirect",
        redirectTo: "/",
      });
    });
  });

  describe("normal authenticated access", () => {
    it("passes through for all client pages", () => {
      const pages = ["/clients", "/clients/newground", "/clients/newground/sessions", "/clients/newground/costs", "/clients/newground/queue", "/clients/new"];
      for (const page of pages) {
        expect(resolveAuthRoute({ pathname: page, userEmail: "chad@integrate-ai.uk" })).toEqual({ action: "pass" });
      }
    });
  });
});
