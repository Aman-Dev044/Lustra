import { expect, test } from "@playwright/test";
import { DEMO, login, trackErrors } from "./helpers";

const APP_PAGES = [
  "/app",
  "/app/board",
  "/app/calendar",
  "/app/jobs",
  "/app/customers",
  "/app/quotes",
  "/app/quotes/new",
  "/app/invoices",
  "/app/inspections",
  "/app/certificates",
  "/app/inventory",
  "/app/visualizer",
  "/app/messages",
  "/app/automations",
  "/app/memberships",
  "/app/team",
  "/app/time",
  "/app/analytics",
  "/app/settings",
  "/app/insights",
  "/app/routes",
  "/app/promotions",
  "/app/forms",
  "/app/documents",
  "/app/marketplace",
  "/app/campaigns",
  "/app/reviews",
  "/app/integrations",
  "/app/jobs?new=1",
];

test("signed-out visitors are redirected from /app to /login", async ({ page }) => {
  await page.goto("/app/jobs");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("rejects wrong password with a visible error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).first().fill(DEMO.email);
  await page.getByLabel(/password/i).first().fill("wrong-password");
  await page.getByRole("button", { name: /^(log in|sign in)/i }).first().click();
  await expect(page.getByText(/invalid|incorrect/i).first()).toBeVisible();
});

test.describe("authenticated app", () => {
  test.beforeEach(async ({ page }) => login(page));

  for (const path of APP_PAGES) {
    test(`renders ${path} without errors`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto(path);
      await expect(page.getByText(/Opening your workspace/i)).toHaveCount(0, { timeout: 30_000 });
      await expect(page.locator("h1").first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(/something went wrong|application error/i)).toHaveCount(0);
      expect(errors, errors.join("\n")).toEqual([]);
    });
  }

  test("command palette searches across records", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("button", { name: /search or jump/i })).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(page.getByPlaceholder(/search customers/i)).toBeVisible();
    await page.keyboard.type("Tesla");
    await expect(page.getByRole("option").first()).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("AI Quote Copilot drafts priced line items", async ({ page }) => {
    await page.goto("/app/quotes/new");
    await page.getByRole("textbox").first().fill("2022 Tesla Model Y, heavy swirls, wants 5 year ceramic coating and full front PPF");
    await page.getByRole("button", { name: /generate/i }).click();
    await expect(page.getByText(/ceramic/i).first()).toBeVisible();
    await expect(page.getByText(/ppf|paint protection/i).first()).toBeVisible();
  });
});

test("public booking page loads services for the demo shop", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(`/book/${DEMO.slug}`);
  await expect(page.getByText(/Apex Auto Spa/i).first()).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("certificate verification shows not-found state for bogus code", async ({ page }) => {
  await page.goto("/verify/LX-NOPE00");
  await expect(page.getByText(/couldn.t verify/i)).toBeVisible();
});
