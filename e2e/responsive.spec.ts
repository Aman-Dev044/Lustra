import { expect, test } from "@playwright/test";

/* Mobile project only: no page may scroll horizontally at phone width. */
for (const path of ["/", "/pricing", "/features/quote-copilot", "/industries/window-tint", "/visualizer", "/blog", "/login", "/signup"]) {
  test(`no horizontal overflow on mobile: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
