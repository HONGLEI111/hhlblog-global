// AI chat widget smoke test.
//
// Guards the behaviour that is easy to break without noticing, and that the unit
// tests cannot see because it only exists in a built page:
//
//  1. Article grounding. The widget reads the SAME `[data-pagefind-body]` root
//     that pagefind indexes and sends it as `context`; the proxy (not the client)
//     turns that into a system prompt. A rename of that selector, a
//     `context` field the worker would reject, or a page that ships no article
//     all silently degrade to an ungrounded answer — invisible until someone
//     notices the replies are generic.
//  2. Retrieval. `grounding` snippets come from the pagefind index, which only
//     exists after `pagefind --site dist`. The query terms must survive
//     pagefind's AND semantics.
//  3. That the client never sends a `system` turn (the worker strips them, so a
//     regression here would look like "my instructions are ignored").
//  4. Markdown rendering, history persistence across a reload, the article label
//     following a Swup navigation (the widget lives outside the swapped
//     containers and never remounts), and clearing the conversation.
//
// The chat proxy is stubbed via request interception, so this makes no API calls
// and needs no key.
//
// Usage:
//   pnpm build && pnpm preview      (pagefind index required)
//   node scripts/chat-check.mjs [baseUrl]   (defaults to http://localhost:4321)
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] || process.env.BASE_URL || "http://localhost:4321";
const ARTICLE = "/posts/ai-agent-architecture-patterns/";

// The widget takes its endpoint from PUBLIC_CHAT_PROXY_URL at build time, so
// this check must be pointed at the same value the site was built with.
const proxyUrl = (process.env.PUBLIC_CHAT_PROXY_URL ?? "").trim();
if (!proxyUrl) {
	console.error(
		"chat-check: set PUBLIC_CHAT_PROXY_URL to the endpoint the site was built with",
	);
	process.exit(1);
}
const proxyPattern = `${proxyUrl.replace(/\/+$/, "")}/**`;

const results = [];
function check(name, ok, detail = "") {
	results.push({ name, ok, detail });
	console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

/** Same browser fallback chain the other browser checks in this repo use. */
async function launch() {
	try {
		return await chromium.launch({ channel: "msedge" });
	} catch {
		try {
			return await chromium.launch({ channel: "chrome" });
		} catch {
			return await chromium.launch();
		}
	}
}

const browser = await launch();
try {
	const page = await browser.newPage();

	let captured = null;
	let requestCount = 0;
	let replySeq = 0;
	/** Unique per reply, so a wait cannot be satisfied by a restored older turn. */
	let replyMarker = "";

	await page.route(proxyPattern, async (route) => {
		requestCount++;
		captured = JSON.parse(route.request().postData() || "{}");
		replySeq++;
		replyMarker = `reply-marker-${replySeq}`;
		const chunks = [
			{ choices: [{ delta: { content: "**Multi-agent** " } }] },
			{ choices: [{ delta: { content: `${replyMarker} architecture:\n\n` } }] },
			{ choices: [{ delta: { content: "- Point one\n- Point two\n\n```js\nconst a = 1;\n```" } }] },
		];
		const body = `${chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("")}data: [DONE]\n\n`;
		await route.fulfill({
			status: 200,
			headers: { "Content-Type": "text/event-stream" },
			body,
		});
	});

	const panel = page.locator("#ai-chat-panel");
	const openPanel = async () => {
		await page.locator('button[aria-label="AI assistant"]').click();
		await panel.waitFor({ state: "visible", timeout: 5000 });
	};
	const articleTitle = () =>
		page.evaluate(
			() =>
				document
					.querySelector('[data-pagefind-body][data-pagefind-meta="title"]')
					?.textContent?.trim() || "",
		);

	await page.goto(`${BASE}${ARTICLE}`, { waitUntil: "load" });

	// 1. The article page must carry the context root the widget reads.
	const hasRoot = await page.locator(".custom-md[data-pagefind-body]").count();
	check("article root present", hasRoot > 0, `count=${hasRoot}`);

	await openPanel();
	check("panel opens", true);
	const header = await panel.locator('span[title="Answers will reference this article"]').textContent();
	check("header names current article", !!header && header.length > 4, header || "(none)");
	check(
		"article-specific suggestion shown",
		(await panel.locator("button", { hasText: "Summarize this article" }).count()) > 0,
	);

	// 2. Send a question and inspect the outgoing request. Wait on the request
	//    itself: a restored conversation may already contain the reply text.
	await panel.locator("textarea").fill("What is the key takeaway of this article?");
	const firstRequest = page.waitForRequest((req) => req.url().startsWith(proxyUrl), {
		timeout: 15000,
	});
	await panel.locator('button[aria-label="Send"]').click();
	await firstRequest;
	await page.waitForFunction((m) => document.body.innerText.includes(m), replyMarker, {
		timeout: 15000,
	});

	check("request sent to proxy", requestCount === 1, `count=${requestCount}`);
	check(
		"context.url is the article",
		!!captured?.context?.url?.includes(ARTICLE),
		captured?.context?.url,
	);
	check("context.title present", !!captured?.context?.title, captured?.context?.title);
	check(
		"context.text carries article body",
		(captured?.context?.text || "").length > 500,
		`len=${(captured?.context?.text || "").length}`,
	);
	check(
		"context text excludes nav/UI chrome",
		!(captured?.context?.text || "").includes("Copy"),
	);
	check(
		"no client-supplied system role",
		!captured?.messages?.some((m) => m.role === "system"),
	);
	check(
		"message roles are user/assistant only",
		(captured?.messages || []).every((m) => m.role === "user" || m.role === "assistant"),
	);

	// 3. Markdown must be rendered, not printed as raw text.
	const strongCount = await panel.locator(".chat-markdown strong").count();
	const listCount = await panel.locator(".chat-markdown li").count();
	const preCount = await panel.locator(".chat-markdown pre").count();
	check("markdown: emphasis rendered", strongCount > 0, `strong=${strongCount}`);
	check("markdown: list rendered", listCount > 1, `li=${listCount}`);
	check("markdown: code block rendered", preCount > 0, `pre=${preCount}`);

	// 4. History survives a reload (sessionStorage).
	await page.reload({ waitUntil: "load" });
	await openPanel();
	check(
		"conversation restored after reload",
		(await panel.locator(".chat-markdown").count()) > 0,
	);

	// 5. A Swup navigation must refresh the article label, since the widget lives
	//    outside the swapped containers and never remounts.
	await panel.locator('button[aria-label="Close"]').click();
	const prevLink = page.locator('a[aria-label^="Previous post"]').first();
	check("article has a next-article link to navigate with", (await prevLink.count()) > 0);
	const titleBeforeClick = await articleTitle();
	await prevLink.click();
	// Wait for the swapped DOM, not merely the URL: the widget reads the title node.
	await page.waitForFunction(
		(previous) => {
			const title = document
				.querySelector('[data-pagefind-body][data-pagefind-meta="title"]')
				?.textContent?.trim();
			return !!title && title !== previous;
		},
		titleBeforeClick,
		{ timeout: 15000 },
	);
	await openPanel();
	const currentTitle = await articleTitle();
	const swupHeader = await panel
		.locator('span[title="Answers will reference this article"]')
		.filter({ hasText: currentTitle.slice(0, 10) })
		.first()
		.textContent({ timeout: 5000 });
	const headerTitle = (swupHeader || "").replace(/^Grounded in “/, "").replace(/”$/, "").trim();
	check(
		"header follows swup navigation",
		!!headerTitle && (await page.title()).startsWith(headerTitle),
		`header="${headerTitle}"`,
	);

	// 6. Retrieval: the pagefind index should supply grounding snippets. The
	//    question is deliberately worded the way a reader would type it, because
	//    pagefind ANDs its terms and a too-specific query returns nothing.
	captured = null;
	const requestsBeforeRetrieval = requestCount;
	await panel.locator("textarea").fill("How does a vector database do retrieval?");
	const secondRequest = page.waitForRequest((req) => req.url().startsWith(proxyUrl), {
		timeout: 15000,
	});
	await panel.locator('button[aria-label="Send"]').click();
	await secondRequest;
	await page.waitForTimeout(1200);
	check(
		"second request sent",
		requestCount === requestsBeforeRetrieval + 1,
		`before=${requestsBeforeRetrieval} after=${requestCount}`,
	);
	check(
		"grounding snippets attached after retrieval",
		Array.isArray(captured?.grounding) && captured.grounding.length > 0,
		`n=${captured?.grounding?.length ?? 0}`,
	);
	check(
		"grounding urls are site-relative article paths",
		(captured?.grounding ?? []).every((g) => g.url.startsWith("/")),
		JSON.stringify((captured?.grounding ?? []).map((g) => g.url)),
	);
	check(
		"grounding excerpts have no highlight markup",
		(captured?.grounding ?? []).every((g) => !g.excerpt.includes("<")),
	);

	// 7. Clearing the conversation empties it.
	await panel.locator('button[aria-label="Clear conversation"]').click();
	check(
		"clear conversation returns to empty state",
		(await panel.locator("text=Ask me anything about this article").count()) > 0,
	);

	// 8. A page without an article must not send context.
	captured = null;
	await page.goto(`${BASE}/`, { waitUntil: "load" });
	await openPanel();
	check(
		"home page falls back to generic prompts",
		(await panel.locator("button", { hasText: "What is this blog about" }).count()) > 0,
	);
	await panel.locator("textarea").fill("What is this blog about?");
	const homeRequest = page.waitForRequest((req) => req.url().startsWith(proxyUrl), {
		timeout: 15000,
	});
	await panel.locator('button[aria-label="Send"]').click();
	await homeRequest;
	await page.waitForTimeout(1200);
	check(
		"no context sent off-article pages",
		captured?.context === undefined,
		JSON.stringify(captured?.context),
	);
} finally {
	await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
