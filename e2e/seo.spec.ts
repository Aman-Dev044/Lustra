import { expect, test } from "@playwright/test";
import { trackErrors } from "./helpers";

const PAGES = [
  "/",
  "/features",
  "/features/live-job-board",
  "/features/quote-copilot",
  "/features/ai-insights",
  "/features/integrations-api",
  "/industries",
  "/industries/paint-protection-film",
  "/industries/marine-detailing",
  "/pricing",
  "/visualizer",
  "/why-lustra",
  "/about",
  "/contact",
  "/blog",
  "/legal/privacy",
  "/legal/terms",
];

for (const path of PAGES) {
  test(`SEO + render: ${path}`, async ({ page }) => {
    const errors = trackErrors(page);
    const res = await page.goto(path);
    expect(res?.status(), "HTTP status").toBe(200);

    const title = await page.title();
    expect(title.length, "title length").toBeGreaterThan(10);
    expect(title.length, "title length").toBeLessThan(75);

    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description?.length ?? 0, "meta description").toBeGreaterThan(50);

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /.+/);
    await expect(page.locator("h1"), "exactly one h1").toHaveCount(1);

    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.length, "has JSON-LD").toBeGreaterThan(0);
    for (const block of ld) expect(() => JSON.parse(block)).not.toThrow();

    // Every image needs alt text (decorative images use alt="").
    const missingAlt = await page.locator("img:not([alt])").count();
    expect(missingAlt, "images without alt").toBe(0);

    expect(errors, errors.join("\n")).toEqual([]);
  });
}

test("blog posts render with BlogPosting schema", async ({ page }) => {
  await page.goto("/blog");
  const first = page.locator('a[href^="/blog/"]').first();
  const href = await first.getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(" ");
  expect(ld).toContain("BlogPosting");
});

test("robots, sitemap and manifest are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const robotsText = await robots.text();
  expect(robotsText).toMatch(/Sitemap:/i);
  expect(robotsText).toMatch(/Disallow: \/app/);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("/pricing");
  expect(xml).toContain("/features/quote-copilot");
  expect(xml).toContain("/blog/");

  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);

  const og = await request.get("/opengraph-image");
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
});

test("pricing shows the exact plan prices", async ({ page }) => {
  await page.goto("/pricing");
  const body = await page.locator("main").innerText();
  for (const p of ["$70", "$110", "$183", "$150"]) expect(body).toContain(p);
});

test("unknown routes return a branded 404", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1")).toBeVisible();
});
