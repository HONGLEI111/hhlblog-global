// Runtime verification of the optimization work.
// Usage: node scripts/verify-optimizations.mjs [baseUrl]
import { chromium } from "playwright";

const BASE = process.argv[2] || process.env.BASE_URL || "http://localhost:4322";
const results = [];
const failed = [];
function check(name, cond, detail) {
  results.push((cond ? "PASS  " : "FAIL  ") + name + (detail ? "  [" + String(detail).slice(0, 160) + "]" : ""));
  if (!cond) failed.push(name);
}

let browser;
try { browser = await chromium.launch({ channel: "msedge" }); }
catch { try { browser = await chromium.launch({ channel: "chrome" }); } catch { browser = await chromium.launch(); } }

// ---------- Test 1: homepage mobile — eager payload audit ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const urls = [];
  const errors = [];
  ctx.on("request", (r) => urls.push(r.url()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(4000);
  const has = (s) => urls.some((u) => u.includes(s));
  check("homepage: mermaid chunk NOT requested", !has("mermaid.core"));
  check("homepage: photoswipe lightbox NOT requested", !has("photoswipe-lightbox"));
  check("homepage: photoswipe core NOT requested", !has("photoswipe.esm"));
  check("homepage: pagefind NOT requested before interaction", !urls.some((u) => u.includes("/pagefind/pagefind.js")));
  const roboto = urls.filter((u) => u.includes("roboto-"));
  check("homepage: only latin Roboto subsets fetched", roboto.length > 0 && roboto.every((u) => u.includes("roboto-latin-")), roboto.join(","));
  check("homepage: no cyrillic/greek/vietnamese fonts fetched", !has("jetbrains-mono-cyrillic") && !has("jetbrains-mono-greek") && !has("jetbrains-mono-vietnamese") && !has("roboto-cyrillic") && !has("roboto-greek"));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("homepage @390px: no horizontal overflow", overflow <= 1, overflow + "px");
  const viewport = await page.getAttribute('meta[name="viewport"]', "content");
  check("viewport: initial-scale + viewport-fit=cover", !!viewport && viewport.includes("initial-scale=1") && viewport.includes("viewport-fit=cover"), viewport || "MISSING");
  await page.waitForTimeout(1000);
  const chatBtn = await page.locator('button[aria-label="AI 助手"]').count();
  check("homepage: AI chat button hydrated via client:idle", chatBtn > 0);
  check("homepage: no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

// ---------- Test 2: diagrams are inlined at build time, no client runtime ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const urls = [];
  ctx.on("request", (r) => urls.push(r.url()));
  await page.goto(BASE + "/technology/bfs/", { waitUntil: "load" });
  await page.waitForTimeout(3000);
  // Diagrams are rendered to SVG during `astro build`, so the mermaid runtime
  // must never be fetched — not eagerly, and not lazily either.
  const fetched = urls.filter((u) => u.includes("mermaid"));
  check("mermaid page: mermaid runtime NOT requested at all", fetched.length === 0, fetched.join(",").slice(0, 120));
  const svgs = await page.locator("figure.diagram svg").count();
  check("mermaid page: diagrams shipped as inline SVG", svgs > 0, svgs + " svg(s)");
  // The old pipeline rendered client-side and shipped the diagram source to the
  // browser; the build-time pipeline must not.
  const rawSource = await page.locator("pre.mermaid").count();
  check("mermaid page: no client-side render target left behind", rawSource === 0, rawSource + " pre.mermaid");
  const externalFont = urls.filter((u) => u.includes("fonts.googleapis") || u.includes("fonts.gstatic"));
  check("mermaid page: no Google Fonts request from diagrams", externalFont.length === 0, externalFont.join(",").slice(0, 120));
  const drawer = await page.locator("details summary:has-text('目录')").count();
  check("post page @1280px: drawer TOC available below 2xl", drawer > 0);
  await ctx.close();
}

// ---------- Test 3: search loads pagefind on demand and returns results ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const urls = [];
  ctx.on("request", (r) => urls.push(r.url()));
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  check("search: pagefind NOT loaded before interaction", !urls.some((u) => u.includes("/pagefind/pagefind.js")));
  const input = page.locator("#search-bar input");
  await input.click();
  await input.fill("astro");
  await page.waitForTimeout(5000);
  check("search: pagefind fetched after interaction", urls.some((u) => u.includes("/pagefind/pagefind.js")));
  const resultLinks = await page.locator("#search-panel a").count();
  check("search: results returned for 'astro'", resultLinks > 0, resultLinks + " result(s)");
  await ctx.close();
}

// ---------- Test 4: notification fits 320px screens ----------
{
  const ctx = await browser.newContext({ viewport: { width: 320, height: 700 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(1800);
  const box = await page.locator("#notification").boundingBox().catch(() => null);
  if (box) {
    check("notification @320px: fully inside viewport", box.x >= 0 && box.x + box.width <= 321, "x=" + Math.round(box.x) + " w=" + Math.round(box.width));
  } else {
    check("notification @320px: element absent (already dismissed)", true);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("home @320px: no horizontal overflow", overflow <= 1, overflow + "px");
  await ctx.close();
}

// ---------- Test 5: PWA + SEO meta on a post page ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/posts/ai-agent-architecture-patterns/", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const swResp = await ctx.request.get(BASE + "/sw.js");
  const manifestResp = await ctx.request.get(BASE + "/manifest.webmanifest");
  const icons = [192, 512];
  const iconOk = [];
  for (const s of icons) {
    const r = await ctx.request.get(BASE + "/favicon/icon-" + s + ".png");
    iconOk.push(r.ok());
  }
  check("sw.js served (HTTP 2xx)", swResp.ok(), "status=" + swResp.status());
  check("manifest.webmanifest served", manifestResp.ok(), "status=" + manifestResp.status());
  check("PWA icons 192/512 served", iconOk.every(Boolean));
  let registered = false;
  try {
    registered = await page.evaluate(async () => {
      for (let i = 0; i < 10; i++) {
        if (navigator.serviceWorker) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) return true;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      return false;
    });
  } catch (e) { registered = false; }
  check("service worker registered", registered);
  const ogImage = await page.getAttribute('meta[property="og:image"]', "content");
  check("og:image meta present", !!ogImage && ogImage.includes("/og-image.jpg"), ogImage || "MISSING");
  const themeColor = await page.locator('meta[name="theme-color"]').count();
  check("theme-color meta present (light+dark)", themeColor >= 2, themeColor + " tag(s)");
  const apple = await page.locator('link[rel="apple-touch-icon"]').count();
  check("apple-touch-icon link present", apple > 0);
  const coverOk = await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll("img"));
    const broken = [];
    for (const img of imgs) {
      if (img.complete && img.naturalWidth === 0 && img.src) broken.push(img.src);
    }
    return { count: imgs.length, broken };
  });
  check("post page: no broken images", coverOk.broken.length === 0, coverOk.count + " imgs, broken=" + coverOk.broken.join(","));
  await ctx.close();
}

// ---------- Test 6: homepage images are webp and intact ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const covers = await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll("img"));
    const data = [];
    for (const img of imgs) {
      if (img.src.includes("fallback-cover")) data.push({ src: img.src.split("/").pop(), ok: img.complete && img.naturalWidth > 0 });
    }
    return data;
  });
  check("homepage: fallback covers are .webp", covers.length > 0 && covers.every((c) => c.src.endsWith(".webp")), covers.map((c) => c.src).join(","));
  check("homepage: fallback cover images load", covers.every((c) => c.ok), JSON.stringify(covers));
  await ctx.close();
}

await browser.close();
console.log(results.join("\n"));
console.log("");
if (failed.length) {
  console.log("FAILED: " + failed.length + " / " + results.length);
  process.exit(1);
}
console.log("ALL " + results.length + " CHECKS PASSED");
