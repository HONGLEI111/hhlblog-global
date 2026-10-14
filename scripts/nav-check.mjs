// Navigation / transition smoke test.
//
// Guards the two defects that made every page change look like a reload:
//
//  1. Swup fallback to a full page load. `containers` in astro.config.mjs must exist on
//     every page Swup can navigate to/from, otherwise Swup aborts with
//     "[swup] Container mismatch, aborting" and hands the navigation to the browser —
//     the document is loaded again and every entrance animation replays.
//  2. The banner entrance animation. `#banner` is positioned with Tailwind's
//     `translate-y-[var(--bannerOffset)]`; an animation on `transform` replaces that
//     translate, so the banner sits too high for the animation's duration and snaps down
//     when it ends.
//
// Usage: node scripts/nav-check.mjs [baseUrl]   (defaults to http://localhost:4321)
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] || process.env.BASE_URL || "http://localhost:4321";

// Read the Swup container list from the config instead of hard-coding it here.
const configSource = readFileSync(path.resolve("astro.config.mjs"), "utf8");
const containersMatch = configSource.match(/containers:\s*\[([^\]]*)\]/);
if (!containersMatch) {
	console.error("nav-check: could not find `containers` in astro.config.mjs");
	process.exit(1);
}
const CONTAINERS = containersMatch[1]
	.split(",")
	.map((s) => s.trim().replace(/^["']|["']$/g, ""))
	.filter(Boolean);

// Keep in sync with src/pages/. `/blog/archive/` used to live here but the page
// was deleted (it duplicated /archive/); leaving the route listed made this
// check fail against a 404 that has no Swup containers.
const ROUTES = [
	"/",
	"/posts/",
	"/posts/2/",
	"/technology/",
	"/read/",
	"/about/",
	"/tools/",
	"/archive/",
	"/posts/ai-agent-architecture-patterns/",
];

const failures = [];
const fail = (message) => failures.push(message);

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

// ── 1. every route exposes every Swup container ──────────────────────────────
{
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	for (const route of ROUTES) {
		const page = await context.newPage();
		await page.goto(BASE + route, { waitUntil: "load", timeout: 60000 });
		const present = await page.evaluate(
			(selectors) => selectors.map((s) => !!document.querySelector(s)),
			CONTAINERS,
		);
		CONTAINERS.forEach((selector, i) => {
			if (!present[i]) {
				fail(
					`${route} is missing the Swup container \`${selector}\` (a visit would abort with a container mismatch)`,
				);
			}
		});
		await page.close();
	}
	await context.close();
}

// ── 2. crossing layouts must stay a client-side transition ───────────────────
{
	const crossLayouts = [
		["/", "/posts/"],
		["/posts/", "/"],
	];
	for (const [from, to] of crossLayouts) {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
		});
		const page = await context.newPage();
		let documentLoads = 0;
		let containerMismatch = false;
		page.on("load", () => documentLoads++);
		page.on("console", (m) => {
			if (/Container mismatch/i.test(m.text())) containerMismatch = true;
		});

		await page.goto(BASE + from, { waitUntil: "load", timeout: 60000 });
		await page
			.waitForFunction(() => !!window.swup, null, { timeout: 15000 })
			.catch(() => {});
		const loadsBefore = documentLoads;
		await page.evaluate((href) => {
			const link = document.querySelector(`a[href="${href}"]`);
			if (link) link.click();
		}, to);
		await page.waitForTimeout(1500);

		if (documentLoads > loadsBefore) {
			fail(
				`${from} -> ${to} triggered a full document load instead of a Swup transition`,
			);
		}
		if (containerMismatch) {
			fail(`${from} -> ${to} reported "[swup] Container mismatch, aborting"`);
		}
		if (new URL(page.url()).pathname !== to) {
			fail(`${from} -> ${to} ended on ${new URL(page.url()).pathname}`);
		}
		await context.close();
	}
}

// ── 3. swapped-in content must not replay the entrance animation ─────────────
{
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await context.newPage();
	await page.goto(`${BASE}/posts/`, { waitUntil: "load", timeout: 60000 });
	await page
		.waitForFunction(() => !!window.swup, null, { timeout: 15000 })
		.catch(() => {});
	await page.waitForTimeout(600);
	// Sample the swapped content's own opacity every frame across the transition: a replayed
	// entrance animation shows up as elements sitting near 0 while the container fades in.
	const sampled = await page.evaluate(async () => {
		const link = document.querySelector("main a[href*='/posts/']");
		if (!link) return { frames: 0, minOpacity: 1 };
		const start = performance.now();
		link.click();
		let minOpacity = 1;
		let frames = 0;
		while (performance.now() - start < 1000) {
			await new Promise((r) => requestAnimationFrame(r));
			const elements = document.querySelectorAll(
				"#swup-container .onload-animation",
			);
			if (elements.length === 0) continue;
			frames++;
			for (const el of elements) {
				minOpacity = Math.min(minOpacity, Number(getComputedStyle(el).opacity));
			}
		}
		return { frames, minOpacity };
	});
	if (sampled.frames === 0) {
		fail(
			"could not observe a Swup content swap on /posts/ (no #swup-container .onload-animation elements)",
		);
	} else if (sampled.minOpacity < 0.5) {
		fail(
			`swapped-in content replayed the entrance animation (min opacity ${sampled.minOpacity.toFixed(2)} over ${sampled.frames} frames)`,
		);
	}
	await context.close();
}

// ── 4. the banner keeps its offset through its entrance animation ────────────
{
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await context.newPage();
	await page.goto(`${BASE}/posts/ai-agent-architecture-patterns/`, {
		waitUntil: "commit",
		timeout: 60000,
	});
	const samples = await page.evaluate(async () => {
		const out = [];
		const t0 = performance.now();
		while (performance.now() - t0 < 1200) {
			await new Promise((r) => requestAnimationFrame(r));
			const banner = document.getElementById("banner");
			const wrapper = document.getElementById("banner-wrapper");
			if (!banner || !wrapper) continue;
			const b = banner.getBoundingClientRect();
			const w = wrapper.getBoundingClientRect();
			out.push({
				t: performance.now() - t0,
				top: b.top,
				bottom: b.bottom,
				wrapTop: w.top,
				wrapBottom: w.bottom,
			});
		}
		return out;
	});
	// The banner is translated down by BANNER_HEIGHT_EXTEND / 2 (15vh) inside its wrapper.
	const expectedOffset = (await page.evaluate(() => window.innerHeight)) * 0.15;
	let previous = null;
	for (const s of samples) {
		const offset = s.top - s.wrapTop;
		if (offset < expectedOffset * 0.8) {
			fail(
				`banner lost its translate offset during the entrance animation (offset ${Math.round(offset)}px, expected ~${Math.round(expectedOffset)}px)`,
			);
			break;
		}
		if (previous !== null && Math.abs(s.top - previous) > 8) {
			fail(
				`banner jumped ${Math.round(Math.abs(s.top - previous))}px in a single frame during the entrance animation`,
			);
			break;
		}
		previous = s.top;
	}
	await context.close();
}

await browser.close();

if (failures.length > 0) {
	console.error("nav-check FAILED:");
	for (const f of failures) console.error(`  - ${f}`);
	process.exit(1);
}
console.log(
	`nav-check passed: ${ROUTES.length} routes expose ${CONTAINERS.join(", ")}, layout transitions stay client-side, banner geometry is stable`,
);
