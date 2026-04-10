import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects unauthenticated users to /login", async ({ page }) => {
    const response = await page.goto("/clients");
    // Should redirect to login (middleware intercepts)
    expect(page.url()).toContain("/login");
  });

  test("redirects root to /login when not authenticated", async ({ page }) => {
    await page.goto("/");
    expect(page.url()).toContain("/login");
  });

  test("login page renders Google OAuth button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Google")).toBeVisible({ timeout: 10000 });
  });

  test("login page shows IntegrateAI branding", async ({ page }) => {
    await page.goto("/login");
    // Check for IntegrateAI text or logo
    const content = await page.textContent("body");
    expect(content).toContain("Integrate");
  });

  test("deep link to client page redirects to login", async ({ page }) => {
    await page.goto("/clients/newground");
    expect(page.url()).toContain("/login");
  });

  test("deep link to client sub-page redirects to login", async ({ page }) => {
    await page.goto("/clients/newground/sessions");
    expect(page.url()).toContain("/login");
  });
});
