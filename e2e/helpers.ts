import { expect, type Page } from "@playwright/test";

export const DEMO = { email: "demo@lustra.app", password: "demo1234", slug: "apex-auto-spa" };

/** Collects uncaught page errors and console errors so specs can assert a clean run. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    // Ignore noise that is not an app defect.
    if (/favicon|Download the React DevTools|WebSocket connection .* failed|ERR_ABORTED/i.test(text)) return;
    errors.push(`console: ${text}`);
  });
  return errors;
}

export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).first().fill(DEMO.email);
  await page.getByLabel(/password/i).first().fill(DEMO.password);
  await page.getByRole("button", { name: /^(log in|sign in)/i }).first().click();
  await page.waitForURL(/\/app(\/|$|\?)/, { timeout: 30_000 });
  await expect(page.getByText(/Opening your workspace/i)).toHaveCount(0, { timeout: 30_000 });
}
