// Captures screenshots of key pages for visual review: node scripts/screenshots.mjs <outDir> [desktop|mobile]
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2] ?? "screenshots";
const mode = process.argv[3] ?? "desktop";
const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const only = process.env.ONLY?.split(",");
mkdirSync(out, { recursive: true });

const publicPages = ["/", "/features", "/features/quote-copilot", "/industries/paint-protection-film", "/pricing", "/visualizer", "/why-lustra", "/about", "/contact", "/blog", "/login", "/signup", "/book/apex-auto-spa"];
const appPages = ["/app", "/app/insights", "/app/board", "/app/calendar", "/app/routes", "/app/jobs", "/app/customers", "/app/quotes/new", "/app/invoices", "/app/inspections", "/app/messages", "/app/automations", "/app/analytics", "/app/settings", "/app/promotions", "/app/campaigns", "/app/reviews", "/app/integrations", "/app/marketplace", "/app/forms", "/app/visualizer"];

const browser = await chromium.launch();
const ctx = await browser.newContext(mode === "mobile" ? { ...devices["Pixel 7"] } : { viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const name = (p) => (p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "_"));
const full = process.env.FULL === "1";

for (const p of publicPages.filter((p) => !only || only.includes(p))) {
  await page.goto(base + p, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(out, `${mode}-${name(p)}.png`), fullPage: full });
  console.log("shot", p);
}

if (!only || only.some((p) => p.startsWith("/app"))) {
  await page.goto(base + "/login", { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).first().fill("demo@lustra.app");
  await page.getByLabel(/password/i).first().fill("demo1234");
  await page.getByRole("button", { name: /^(log in|sign in)/i }).first().click();
  await page.waitForURL(/\/app/, { timeout: 30000 });
  for (const p of appPages.filter((p) => !only || only.includes(p))) {
    await page.goto(base + p, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(out, `${mode}-${name(p)}.png`), fullPage: full });
    console.log("shot", p);
  }
}
await browser.close();
