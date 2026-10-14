// Pure helpers behind the AI chat widget. Everything DOM-facing takes elements
// as arguments and never touches globals, so the logic stays unit-testable
// without a DOM environment (this repo runs Vitest without jsdom).

import type { SearchResult } from "@/global";

export interface ChatMessage {
	role: "user" | "assistant";
	content: string;
}

/** Article context sent to the proxy for the page the reader is on. */
export interface ArticleWorkspace {
	url: string;
	title: string;
	text: string;
	/** True when the article was cut down to fit the budget. */
	truncated: boolean;
}

/** A retrieval hit from the pagefind index, as the proxy expects it. */
export interface GroundingSnippet {
	title: string;
	url: string;
	excerpt: string;
}

// Keep in sync with workers/chat-proxy/src/request.ts (the proxy re-validates
// and clamps everything; these limits only avoid pointless uploads).
export const WORKSPACE_MAX_CHARS = 12_000;
export const WORKSPACE_MIN_CHARS = 200;
export const HISTORY_MAX_MESSAGES = 24;
export const HISTORY_MAX_CHARS = 24_000;

/** Elements whose text must never reach the model. */
const SKIP_SELECTOR = [
	"script",
	"style",
	"noscript",
	"svg",
	"button",
	".katex",
	".copy-btn",
	"[data-pagefind-ignore]",
].join(", ");

const HEADING_LINE = /^#{2,3} .+$/;

function isSkipped(el: Element): boolean {
	if (el.matches(SKIP_SELECTOR)) return true;
	// Code tabs render every panel; only the active one is visible, and
	// reading all of them would duplicate the same sample.
	if ((el as HTMLElement).hidden) return true;
	const style = (el as HTMLElement).style;
	return !!style && style.display === "none";
}

/** `<pre>` blocks can run to hundreds of lines; keep replies affordable. */
const MAX_CODE_CHARS = 2000;

function appendCodeBlock(pre: Element, out: string[]): void {
	const code = pre.querySelector("code") ?? pre;
	const text = (code.textContent ?? "")
		.replace(/\r\n/g, "\n")
		.replace(/[ \t]+$/gm, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim()
		.slice(0, MAX_CODE_CHARS);
	if (text.length > 0) out.push(`\n\`\`\`\n${text}\n\`\`\`\n`);
}

/** Depth-first, structure-aware walk that turns the article DOM into Markdown. */
function walk(node: Node, out: string[], depth: number): void {
	if (depth > 12) return;

	if (node.nodeType === 3) {
		// Collapse horizontal whitespace, but keep a single newline so hard line
		// breaks inside a paragraph survive into the prompt.
		const text = (node.nodeValue ?? "")
			.replace(/[ \t]+/g, " ")
			.replace(/\n+/g, "\n")
			.replace(/ *\n */g, "\n");
		if (text.trim().length > 0) out.push(text);
		return;
	}
	if (node.nodeType !== 1) return;

	const el = node as Element;
	if (isSkipped(el)) return;

	const tag = el.tagName.toLowerCase();
	if (tag === "pre") {
		appendCodeBlock(el, out);
		return;
	}

	const prefix =
		tag === "h2"
			? "\n## "
			: tag === "h3"
				? "\n### "
				: tag === "li"
					? "\n- "
					: "";
	if (prefix) out.push(prefix);

	for (const child of Array.from(el.childNodes)) {
		walk(child, out, depth + 1);
	}

	if (prefix) out.push("\n");
	else if (
		tag === "p" ||
		tag === "div" ||
		tag === "section" ||
		tag === "blockquote"
	)
		out.push("\n");
}

function normalize(text: string): string {
	return text
		.replace(/\r\n/g, "\n")
		.replace(/[ \t]+/g, " ")
		.replace(/ *\n */g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/**
 * Read the article the reader is on into Markdown-ish plain text.
 *
 * `root` is the `.custom-md[data-pagefind-body]` wrapper: pages without it
 * (home, archives, tag lists) have no article, so they get no context.
 */
export function extractArticleText(root: Element): string {
	const out: string[] = [];
	walk(root, out, 0);
	return normalize(out.join(""));
}

export interface Section {
	heading: string;
	body: string;
}

/** Split the extracted article at its `##` / `###` headings. */
export function splitSections(text: string): Section[] {
	const lines = text.split("\n");
	const sections: Section[] = [];
	let current: Section | null = null;

	for (const line of lines) {
		if (HEADING_LINE.test(line)) {
			current = { heading: line, body: "" };
			sections.push(current);
			continue;
		}
		if (!current) {
			current = { heading: "", body: "" };
			sections.push(current);
		}
		current.body = current.body ? `${current.body}\n${line}` : line;
	}

	return sections;
}

/** Score a section against the question so the most relevant text survives. */
function relevanceScore(section: Section, terms: string[]): number {
	if (terms.length === 0) return 0;
	const haystack = `${section.heading}\n${section.body}`.toLowerCase();
	let score = 0;
	for (const term of terms) {
		if (haystack.includes(term)) score += 1;
	}
	return score;
}

/**
 * Fit the article into `budget` characters, keeping the sections that matter:
 * those matching the question first, then the rest of the article in reading
 * order (the opening of an article is usually worth more than its tail).
 */
export function allocateWithinBudget(
	text: string,
	terms: string[],
	budget: number,
): string {
	if (text.length <= budget) return text;

	const sections = splitSections(text);
	const ranked = sections
		.map((section, index) => ({
			section,
			index,
			score: relevanceScore(section, terms),
		}))
		.sort((a, b) => b.score - a.score || a.index - b.index);

	const picked: typeof ranked = [];
	let used = 0;
	for (const entry of ranked) {
		const cost = entry.section.heading.length + entry.section.body.length + 2;
		if (used + cost > budget) continue;
		picked.push(entry);
		used += cost;
	}

	return picked
		.sort((a, b) => a.index - b.index)
		.map((entry) => `${entry.section.heading}\n${entry.section.body}`.trim())
		.join("\n\n");
}

/**
 * Build the context payload for the current page, or null when the reader is
 * not on an article (or the context would be too thin to be worth sending).
 *
 * `extract` is injectable so the budget/threshold rules can be tested without a
 * DOM; the widget passes the real reader.
 */
export function buildWorkspace(
	root: Element | null,
	title: string,
	url: string,
	terms: string[] = [],
	maxChars: number = WORKSPACE_MAX_CHARS,
	extract: (element: Element) => string = extractArticleText,
): ArticleWorkspace | null {
	if (!root) return null;

	const full = extract(root);
	if (full.length < WORKSPACE_MIN_CHARS) return null;

	const text = allocateWithinBudget(full, terms, maxChars);
	if (text.trim().length < WORKSPACE_MIN_CHARS) return null;

	return {
		url,
		title: title.trim().slice(0, 200),
		text: text.trim(),
		truncated: text.length < full.length,
	};
}

export interface TrimResult {
	messages: ChatMessage[];
	/** How many earlier turns were dropped to stay inside the limits. */
	dropped: number;
}

/**
 * Trim the conversation to the proxy's limits, always keeping the first turn
 * (it usually carries the article/question a follow-up refers back to) and the
 * most recent turns. Without this the proxy answers 400 mid-conversation and
 * the reader only sees a generic "request failed".
 */
export function trimHistory(
	messages: ChatMessage[],
	maxMessages: number = HISTORY_MAX_MESSAGES,
	maxChars: number = HISTORY_MAX_CHARS,
): TrimResult {
	const original = messages.length;
	if (original === 0) return { messages: [], dropped: 0 };

	// Walk backwards from the newest message, accumulating until a limit is hit.
	const kept: ChatMessage[] = [];
	let used = 0;
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i];
		const cost = message.content.length;
		if (used + cost > maxChars && kept.length > 0) break;
		kept.push(message);
		used += cost;
	}
	kept.reverse();

	let result = kept.slice(-maxMessages);

	// Re-attach the first turn when it fell out of the window; a follow-up like
	// "and what about that?" is meaningless without the question it refers to.
	const first = messages[0];
	const firstIncluded = result.some((m) => m === first);
	if (!firstIncluded && first.content.length + used <= maxChars) {
		result = [first, ...result.slice(1)];
	}

	return { messages: result, dropped: original - result.length };
}

/**
 * Words that carry no search signal, split by the way each script needs to be
 * matched. Chinese has no word delimiters, so a Chinese stopword has to be cut
 * out of the run itself ("为什么这个" arrives as a single token). Latin words do
 * have boundaries, so an English stopword must only match a whole token —
 * removing the substring "the" from "theory" would leave "ory" and turn a real
 * query into noise.
 */
const CJK_STOPWORDS = new Set([
	"什么",
	"为什么",
	"怎么",
	"怎样",
	"如何",
	"这个",
	"那个",
	"哪些",
	"可以",
	"是否",
	"以及",
	"但是",
	"因为",
	"所以",
	"然后",
	"一下",
	"介绍",
	"讲讲",
	"说说",
	"文章",
	"作者",
	"意思",
	// Single-character particles that survive inside a Chinese run.
	"是",
	"的",
	"了",
	"吗",
	"呢",
]);

const LATIN_STOPWORDS = new Set([
	"a",
	"an",
	"the",
	"and",
	"or",
	"but",
	"if",
	"then",
	"than",
	"so",
	"as",
	"of",
	"to",
	"in",
	"on",
	"at",
	"by",
	"for",
	"with",
	"about",
	"from",
	"into",
	"is",
	"are",
	"was",
	"were",
	"be",
	"been",
	"being",
	"do",
	"does",
	"did",
	"have",
	"has",
	"had",
	"can",
	"could",
	"should",
	"would",
	"will",
	"may",
	"might",
	"must",
	"i",
	"me",
	"my",
	"we",
	"us",
	"our",
	"you",
	"your",
	"it",
	"its",
	"this",
	"that",
	"these",
	"those",
	"there",
	"here",
	"what",
	"which",
	"who",
	"whom",
	"whose",
	"when",
	"where",
	"why",
	"how",
	"not",
	"no",
	"any",
	"all",
	"some",
	"few",
	"more",
	"most",
	"much",
	"many",
	"very",
	"just",
	"also",
	"again",
	"only",
	"please",
	"thanks",
	// Conversational verbs the reader types but an article rarely contains; kept
	// out so a question like "explain the caching strategy" searches for the
	// topic instead of for the word "explain".
	"tell",
	"say",
	"said",
	"give",
	"show",
	"find",
	"get",
	"got",
	"want",
	"need",
	"know",
	"let",
	"help",
	"explain",
	"summarize",
	"describe",
]);

/** A token made only of Han characters, i.e. one that has no word boundaries. */
const CJK_RUN = /^[\u4e00-\u9fa5]+$/;

/**
 * Reduce a natural-language question to search tokens. A raw question is a poor
 * BM25 query, so keep only the substantive tokens: Latin words, and Chinese runs
 * of two or more characters.
 */
export function queryTerms(question: string, maxTerms = 8): string[] {
	let normalized = question.toLowerCase();
	// Cut Chinese stopwords out of the run first: an interrogative prefix such as
	// "为什么这个" would otherwise stay glued to the topic and become search noise.
	for (const stopword of CJK_STOPWORDS) {
		normalized = normalized.split(stopword).join(" ");
	}

	const tokens =
		normalized.match(/[a-z0-9][a-z0-9+#._-]*|[\u4e00-\u9fa5]{2,}/g) ?? [];
	const seen = new Set<string>();
	const terms: string[] = [];

	for (const token of tokens) {
		let term = token.replace(/^[._-]+|[._-]+$/g, "");

		// Only a Chinese run gets its stopword fragments trimmed: it may still
		// carry a particle after the interrogative was cut ("是向量数据库"). A
		// Latin token has boundaries already, so trimming here corrupts words.
		if (CJK_RUN.test(term)) {
			let changed = true;
			while (changed && term.length >= 2) {
				changed = false;
				for (const stopword of CJK_STOPWORDS) {
					if (term.startsWith(stopword) && term.length > stopword.length) {
						term = term.slice(stopword.length);
						changed = true;
					}
					if (term.endsWith(stopword) && term.length > stopword.length) {
						term = term.slice(0, -stopword.length);
						changed = true;
					}
				}
			}
		}

		if (
			term.length < 2 ||
			CJK_STOPWORDS.has(term) ||
			LATIN_STOPWORDS.has(term) ||
			seen.has(term)
		)
			continue;
		seen.add(term);
		terms.push(term);
		if (terms.length >= maxTerms) break;
	}

	return terms;
}

/**
 * Convert pagefind hits into prompt-ready snippets. `excerpt` is HTML (it
 * contains `<mark>` highlights), so tags are stripped here; the UI renders its
 * own sanitized version of the original excerpt.
 */
export function toGroundingSnippets(
	results: Array<{ url: string; meta?: { title?: string }; excerpt?: string }>,
	max = 3,
): GroundingSnippet[] {
	return results
		.filter(
			(result) => typeof result?.url === "string" && result.url.length > 0,
		)
		.slice(0, max)
		.map((result) => ({
			title: (result.meta?.title ?? result.url).slice(0, 200),
			url: result.url,
			excerpt: (result.excerpt ?? "")
				.replace(/<[^>]*>/g, " ")
				.replace(/\s+/g, " ")
				.trim()
				.slice(0, 400),
		}));
}

/** How long retrieval waits for the lazily-loaded pagefind bundle. */
const READY_TIMEOUT_MS = 2500;

/**
 * Wait for the pagefind bundle (loaded on demand by the navbar) to become
 * usable. Resolves to false instead of throwing after `timeoutMs`, so a slow or
 * broken search never blocks the answer itself.
 *
 * The subscribe/cancel pair is injected rather than reaching for
 * `document`/`window` directly, which keeps this testable.
 */
export function waitForReady(
	isReady: () => boolean,
	subscribe: (onReady: () => void) => () => void,
	timeoutMs: number = READY_TIMEOUT_MS,
): Promise<boolean> {
	if (isReady()) return Promise.resolve(true);

	return new Promise<boolean>((resolve) => {
		let settled = false;
		let cancel: () => void = () => {};
		const finish = (ready: boolean) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			cancel();
			resolve(ready);
		};
		const timer = setTimeout(() => finish(false), timeoutMs);
		cancel = subscribe(() => finish(true));
	});
}

export interface QueryHits {
	/** Full pagefind results, for rendering links in the chat panel. */
	results: SearchResult[];
	/** Tags-stripped excerpts, for the prompt. */
	snippets: GroundingSnippet[];
}

/** No hits: used whenever search is disabled, still loading, or failing. */
export const EMPTY_HITS: QueryHits = { results: [], snippets: [] };

/**
 * Query strings to try, most specific first.
 *
 * Pagefind treats the terms as an AND: a conversational question such as
 * "how does the vector database do retrieval?" tokenizes to `vector database
 * retrieval`, and any single term that appears nowhere in the corpus makes the
 * whole search return zero hits. Dropping the trailing terms one at a time keeps
 * the question usable for retrieval while still preferring the most specific
 * query.
 */
export function queryTermsWithFallbacks(
	question: string,
	maxTerms = 4,
): string[] {
	const terms = queryTerms(question, maxTerms);
	const queries: string[] = [];
	for (let size = terms.length; size >= 1; size--) {
		queries.push(terms.slice(0, size).join(" "));
	}
	return queries;
}

/**
 * Run the retrieval step. A natural-language question becomes search terms,
 * those terms are run against pagefind, and the same hits serve both the
 * rendered "related articles" list and the model's grounding block.
 */
export async function queryHits(question: string): Promise<QueryHits> {
	// `import.meta.env.DEV` guards the same way the search panel does: the
	// pagefind index only exists after a production build.
	if (import.meta.env.DEV) return EMPTY_HITS;
	if (typeof window === "undefined" || !window.pagefind?.search)
		return EMPTY_HITS;

	for (const terms of queryTermsWithFallbacks(question)) {
		try {
			const response = await window.pagefind.search(terms);
			if (response.results.length === 0) continue;
			const results = await Promise.all(
				response.results.slice(0, 4).map((item) => item.data()),
			);
			return { results, snippets: toGroundingSnippets(results) };
		} catch {
			// Try the next, broader query.
		}
	}

	return EMPTY_HITS;
}
