import { test, expect } from "@playwright/test";

// These tests verify the app structure loads correctly.
// They run against the dev server WITHOUT auth (Supabase may not be configured).
// Focus: routing works, pages render, navigation structure exists.

test.describe("App structure (unauthenticated)", () => {
  test("login page has correct title", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Mission Control/);
  });

  test("auth callback route exists", async ({ page }) => {
    // The callback route should not 404
    const response = await page.goto("/auth/callback");
    // It will redirect or error (no code param), but should not 404
    expect(response?.status()).not.toBe(404);
  });
});

test.describe("Client pages (require auth)", () => {
  // These tests verify that the pages exist and redirect properly.
  // Full authenticated navigation tests need Supabase credentials.

  test("/clients redirects to login", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("/clients/new redirects to login", async ({ page }) => {
    await page.goto("/clients/new");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("/clients/newground/costs redirects to login", async ({ page }) => {
    await page.goto("/clients/newground/costs");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("/clients/newground/queue redirects to login", async ({ page }) => {
    await page.goto("/clients/newground/queue");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });
});
