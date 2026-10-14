// Responsive smoke test: assert no horizontal overflow at common breakpoints.
// Usage: node scripts/responsive-check.mjs [baseUrl]
import { chromium } from "playwright";

const BASE = process.argv[2] || process.env.BASE_URL || "http://localhost:4321";
const ROUTES = [
  "/",
  "/posts/",
  "/technology/",
  "/posts/ai-agent-architecture-patterns/",
  "/tools/",
];
const WIDTHS = [320, 360, 390, 768, 1024, 1280, 1440, 1536, 1920];

const failures = [];

// Prefer a system browser when available (avoids a big download);
// fall back to the Playwright-bundled Chromium (used in CI).
let browser;
try {
  browser = await chromium.launch({ channel: "msedge" });
} catch {
  try {
    browser = await chromium.launch({ channel: "chrome" });
  } catch {
    browser = await chromium.launch();
  }
}

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 800 } });
  for (const route of ROUTES) {
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    try {
      await page.goto(BASE + route, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(800);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      if (overflow > 1) {
        failures.push(route + " @" + width + "px: horizontal overflow " + overflow + "px");
      } else {
        console.log("ok " + route + " @" + width + "px");
      }
      if (pageErrors.length) {
        failures.push(route + " @" + width + "px: page errors: " + pageErrors.join(" | ").slice(0, 200));
      }
    } catch (err) {
      failures.push(route + " @" + width + "px: " + String(err).slice(0, 160));
    } finally {
      await page.close();
    }
  }
  await context.close();
}

await browser.close();

if (failures.length) {
  console.error("\nFAILURES:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("\nAll responsive checks passed.");
