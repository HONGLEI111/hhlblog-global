#!/usr/bin/env node
/**
 * One-off English translation pass for src/content/**.
 *
 * This repository ships English only: the translated text is written back into
 * the same markdown file, so English becomes the single source of truth. There
 * is no side-car `translated/` tree and this script is NOT wired into the build.
 *
 * Usage:
 *   DEEPSEEK_API_KEY=sk-xxx node scripts/translate-content.mjs [options]
 *
 * Options:
 *   --collection <posts|technology|read|spec>  only this collection (repeatable)
 *   --file <slug-or-path>                      only files whose path contains this
 *   --limit <n>                                stop after n files
 *   --concurrency <n>                          files in flight (default 3)
 *   --force                                    re-translate even if already done
 *   --dry-run                                  list what would be translated, call nothing
 *
 * Safety model:
 *   - A file is considered done when it contains no CJK text; translated files
 *     are therefore skipped on re-run, which makes the pass idempotent.
 *   - Each file is written atomically, only after every chunk succeeded, so an
 *     interrupted run never leaves a half-translated article behind.
 *   - Code fences, inline code, KaTeX, HTML tags and bare URLs are masked
 *     behind private-use placeholders; the masked blocks must come back
 *     unchanged and complete, or the file is retried and then failed loudly.
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, relative, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_FILE = resolve(ROOT, ".translate-content-cache.json");

const COLLECTIONS = {
	posts: resolve(ROOT, "src", "content", "posts"),
	technology: resolve(ROOT, "src", "content", "technology"),
	read: resolve(ROOT, "src", "content", "read"),
	spec: resolve(ROOT, "src", "content", "spec"),
};

const API_KEY = process.env.DEEPSEEK_API_KEY;
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const ENDPOINT = "https://api.deepseek.com/chat/completions";

/** Chinese/CJK ideographs plus CJK punctuation — used for the "is this done?" test. */
export const CJK =
	/[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/;

const MAX_CHUNK_CHARS = 5000;
const MAX_ATTEMPTS = 3;

// ── CLI ─────────────────────────────────────────────────────────────
function parseArgs(argv) {
	const opts = {
		collections: [],
		file: null,
		limit: Number.POSITIVE_INFINITY,
		concurrency: 3,
		maxChunk: MAX_CHUNK_CHARS,
		force: false,
		dryRun: false,
		normalizeOnly: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--collection") opts.collections.push(argv[++i]);
		else if (arg === "--file") opts.file = argv[++i];
		else if (arg === "--limit") opts.limit = Number(argv[++i]);
		else if (arg === "--concurrency") opts.concurrency = Number(argv[++i]);
		else if (arg === "--max-chunk") opts.maxChunk = Number(argv[++i]);
		else if (arg === "--normalize-only") opts.normalizeOnly = true;
		else if (arg === "--force") opts.force = true;
		else if (arg === "--dry-run") opts.dryRun = true;
		else throw new Error(`Unknown option: ${arg}`);
	}
	return opts;
}

// ── Frontmatter ─────────────────────────────────────────────────────
/**
 * Splits the leading `---` block from the body. Returns the raw frontmatter
 * lines (without the fences) so untouched fields can be written back verbatim.
 */
export function splitFrontmatter(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!match) return { frontmatter: null, body: raw, fenceLength: 0 };
	return {
		frontmatter: match[1],
		body: raw.slice(match[0].length),
		fenceLength: match[0].length,
	};
}

function unquote(value) {
	const trimmed = value.trim();
	if (trimmed.length >= 2) {
		const first = trimmed[0];
		const last = trimmed[trimmed.length - 1];
		if (first === "'" && last === "'") return trimmed.slice(1, -1).replace(/''/g, "'");
		if (first === '"' && last === '"') return trimmed.slice(1, -1).replace(/\\"/g, '"');
	}
	return trimmed;
}

function needsQuoting(value) {
	if (value === "") return true;
	if (/^[\s]|[\s]$/.test(value)) return true;
	// A colon followed by a space, or a comment marker, would change the parse.
	if (/:\s/.test(value) || value.includes(" #")) return true;
	if (/^[-?[\]{}&*!|>'"%@`]/.test(value)) return true;
	return false;
}

function quote(value) {
	if (!needsQuoting(value)) return value;
	return `'${value.replace(/'/g, "''")}'`;
}

function parseInlineArray(value) {
	const inner = value.trim().replace(/^\[/, "").replace(/\]$/, "").trim();
	if (inner === "") return [];
	return inner
		.split(",")
		.map((part) => unquote(part))
		.filter((part) => part !== "");
}

function serializeInlineArray(items) {
	return `[${items.map((item) => quote(item)).join(", ")}]`;
}

// Fields that reach the rendered page. `read` additionally shows author /
// bookTitle, so those are translated too even though they are not i18n keys.
const METADATA_KEYS = new Set([
	"title",
	"description",
	"tags",
	"category",
	"author",
	"bookTitle",
]);

/** Where src/content lives, exported so check-translations.mjs walks the same set. */
export const CONTENT_ROOT = resolve(ROOT, "src", "content");

/**
 * Reads the translatable frontmatter fields. Returns null when there is no
 * frontmatter block at all (e.g. src/content/spec/about.md).
 */
export function readMetadata(frontmatter) {
	if (frontmatter === null) return null;
	const meta = { title: null, description: null, tags: null, category: null, author: null, bookTitle: null };
	for (const line of frontmatter.split(/\r?\n/)) {
		const m = line.match(/^(\w+):\s*(.*)$/);
		if (!m) continue;
		const key = m[1];
		if (!METADATA_KEYS.has(key)) continue;
		if (key === "tags") meta.tags = parseInlineArray(m[2]);
		else meta[key] = unquote(m[2]);
	}
	return meta;
}

/** Rewrites only the translated keys, leaving every other line byte-identical. */
function writeMetadata(frontmatter, translated) {
	return frontmatter
		.split(/\r?\n/)
		.filter((line) => !/^lang:\s*/.test(line))
		.map((line) => {
			const m = line.match(/^(\w+):\s*(.*)$/);
			if (!m) return line;
			const key = m[1];
			if (!(key in translated) || translated[key] === null) return line;
			if (key === "tags") return `tags: ${serializeInlineArray(translated.tags)}`;
			if (key === "image" || key === "published") return line;
			return `${key}: ${quote(translated[key])}`;
		})
		.join("\n");
}

// ── Protected block masking ─────────────────────────────────────────
/**
 * Placeholder token for a masked block.
 *
 * These MUST NOT be NUL/control characters: a control byte has to be JSON
 * escaped as \u0000 on the way to the API and models routinely drop the
 * resulting token, which silently loses the masked code. Two private-use
 * characters around the index survive JSON, tokenisation and re-emission, and
 * are visible enough in the prompt for the model to copy them deliberately.
 */
const MARK_OPEN = "\uE000";
const MARK_CLOSE = "\uE001";
const MARK_RE = /\uE000(\d+)\uE001/g;
const mark = (index) => `${MARK_OPEN}${index}${MARK_CLOSE}`;
/** Human-readable form used in the prompt, so the model sees the real glyphs. */
const MARK_SHAPE = `${MARK_OPEN}0${MARK_CLOSE}`;

/**
 * Masks only what must survive byte-for-byte. Prose is deliberately left
 * exposed — including link text, image alt text and admonition bodies, which
 * are user-visible and therefore must be translated.
 *
 * Two severities:
 *   hard — code fences, math, HTML tags, bare URLs, footnote markers. Losing
 *          one means broken code, broken math or a dead link, so the file fails.
 *   soft — inline code spans. Losing the backticks is a cosmetic deviation,
 *          not data loss, and masking every `identifier` in a code-dense
 *          article produces dozens of fragile markers per chunk. Soft blocks
 *          are still protected from translation, but a dropped one is reported
 *          and tolerated instead of failing the whole article.
 */
export function maskProtected(text) {
	const blocks = [];
	const soft = new Set();
	const stash = (match, isSoft = false) => {
		blocks.push(match);
		if (isSoft) soft.add(blocks.length - 1);
		return mark(blocks.length - 1);
	};

	let out = text;
	out = out.replace(/```[\s\S]*?```/g, (m) => stash(m)); // fenced code
	// Inline code must be masked BEFORE the HTML / math rules: code spans are
	// full of `<`, `>` and `$` (e.g. `nums[i] <= right`), and running the HTML
	// rule first would swallow a whole paragraph up to the next `>`.
	out = out.replace(/`[^`\n]+`/g, (m) => stash(m, true)); // inline code (soft)
	out = out.replace(/\$\$[\s\S]*?\$\$/g, (m) => stash(m)); // display math
	out = out.replace(/\$[^$\n]+?\$/g, (m) => stash(m)); // inline math
	out = out.replace(/!\[\[[^\]]+\]\]/g, (m) => stash(m)); // obsidian embed
	out = out.replace(/<[^>\n]+>/g, (m) => stash(m)); // html tag
	// URLs only: the surrounding [text](…) and ![alt](…) stay translatable.
	out = out.replace(/\]\(\s*<?([^)\s>]+)>?[^)]*\)/g, (m, url) => `](${stash(url)})`);
	out = out.replace(/^\[\^([^\]]+)\]:/gm, (m) => stash(m)); // footnote marker
	return { text: out, blocks, soft };
}

export function unmask(text, blocks) {
	return text.replace(MARK_RE, (whole, index) => {
		const block = blocks[Number(index)];
		return block === undefined ? whole : block;
	});
}

export function markerIndices(text) {
	const found = new Set();
	for (const m of text.matchAll(MARK_RE)) found.add(Number(m[1]));
	return found;
}

// ── Chunking ────────────────────────────────────────────────────────
/**
 * Splits markdown at top-level headings while tracking fenced code, so a `##`
 * inside a code block never starts a new chunk.
 */
function splitIntoSegments(body) {
	const lines = body.split("\n");
	const segments = [];
	let current = [];
	let inFence = false;
	let fenceMarker = "";

	for (const line of lines) {
		const fence = line.match(/^\s*(`{3,}|~{3,})/);
		if (fence) {
			if (!inFence) {
				inFence = true;
				fenceMarker = fence[1][0];
			} else if (fence[1][0] === fenceMarker) {
				inFence = false;
			}
		} else if (!inFence && /^#{1,2} /.test(line) && current.length > 0) {
			segments.push(current.join("\n"));
			current = [];
		}
		current.push(line);
	}
	if (current.length > 0) segments.push(current.join("\n"));
	return segments.filter((s) => s.trim() !== "");
}

function packChunks(segments, maxChars = MAX_CHUNK_CHARS) {
	const chunks = [];
	let current = "";
	for (const segment of segments) {
		if (current !== "" && current.length + segment.length > maxChars) {
			chunks.push(current);
			current = "";
		}
		current = current === "" ? segment : `${current}\n${segment}`;
	}
	if (current !== "") chunks.push(current);
	return chunks;
}

// ── API ─────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callApi(prompt, maxTokens) {
	const response = await fetch(ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${API_KEY}`,
		},
		body: JSON.stringify({
			model: MODEL,
			max_tokens: maxTokens,
			temperature: 0.2,
			messages: [{ role: "user", content: prompt }],
		}),
	});
	if (!response.ok) {
		throw new Error(`DeepSeek HTTP ${response.status}: ${await response.text()}`);
	}
	const data = await response.json();
	const choice = data.choices?.[0];
	if (choice?.finish_reason === "length") {
		throw new Error("Response truncated by max_tokens (finish_reason=length)");
	}
	return choice?.message?.content ?? "";
}

async function withRetry(label, fn) {
	let lastError;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (attempt < MAX_ATTEMPTS) {
				const backoff = 2000 * 4 ** (attempt - 1);
				console.warn(`  ! ${label} attempt ${attempt} failed: ${error.message} — retrying in ${backoff}ms`);
				await sleep(backoff);
			}
		}
	}
	throw new Error(`${label} failed after ${MAX_ATTEMPTS} attempts: ${lastError.message}`);
}

const TRANSLATION_RULES = `Rules:
- Translate ONLY natural language prose into fluent, idiomatic English for a technical blog audience.
- Do NOT translate code, identifiers, product names or technical acronyms (React, Astro, CSS, API, ...). Leave anything in backticks untouched, including its backticks.
- Headings that start with a Chinese numeral enumeration marker must use an Arabic numeral: "## 一、概述" becomes "## 1. Overview", "## 二、…" becomes "## 2. …", and so on.
- Preserve every Markdown construct exactly: heading levels and text order, list markers, tables, blockquotes, emphasis, blank lines.
- Text containing ${MARK_SHAPE} is a masked placeholder (a private-use character, a number, another private-use character). Copy each one verbatim, exactly once, in its original position. Never translate, renumber, merge, drop or add one.
- Do not add translator notes, preambles, or explanations.
- Return ONLY the translated Markdown.`;

/**
 * Deterministic follow-up for the numeral rule above: models reliably translate
 * the heading text but often keep "一、". Applied outside fenced code only.
 */
const NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

function normalizeHeadingNumerals(body) {
	let inFence = false;
	return body
		.split("\n")
		.map((line) => {
			if (/^\s*(`{3,}|~{3,})/.test(line)) {
				inFence = !inFence;
				return line;
			}
			if (inFence) return line;
			return line.replace(
				/^(#{1,6}\s*)([一二三四五六七八九十]+)[、.．]\s*/,
				(whole, hashes, numeral) => {
					const digits = numeral
						.split("")
						.reduce((acc, ch) => acc * 10 + (NUMERALS.indexOf(ch) + 1), 0);
					return `${hashes}${digits === 0 ? numeral : digits}. `;
				},
			);
		})
		.join("\n");
}

async function translateMetadata(meta) {
	// Only fields that actually carry Chinese are sent, so an already-English
	// title is never paraphrased and mixed tag lists keep their exact order.
	const payload = {};
	if (meta.title && CJK.test(meta.title)) payload.title = meta.title;
	if (meta.description && CJK.test(meta.description)) payload.description = meta.description;
	if (meta.category && CJK.test(meta.category)) payload.category = meta.category;
	if (meta.author && CJK.test(meta.author)) payload.author = meta.author;
	if (meta.bookTitle && CJK.test(meta.bookTitle)) payload.bookTitle = meta.bookTitle;
	if (meta.tags?.some((tag) => CJK.test(tag))) payload.tags = meta.tags;

	if (Object.keys(payload).length === 0) return null;

	const prompt = `Translate the following blog post metadata from Simplified Chinese to English.

${JSON.stringify(payload, null, 2)}

Rules:
- "title": natural, concise English title. Keep code/product names as-is. Do not end with a period unless the source does.
- "description": 1-2 sentence summary, engaging but not promotional.
- "tags": translate each tag to the term an English-speaking developer would search for; keep acronyms and product names unchanged.
- "category": a short English category name, not a sentence.
- "author": a person's name. Use the commonly used romanisation (e.g. 川端康成 -> Yasunari Kawabata).
- "bookTitle": the work's established English title (e.g. 雪国 -> Snow Country).

Return ONLY valid JSON with exactly these keys: ${Object.keys(payload).join(", ")}.`;

	const raw = await withRetry("metadata", () => callApi(prompt, 1024));
	const match = raw.match(/\{[\s\S]*\}/);
	if (!match) throw new Error(`metadata: no JSON in response: ${raw.slice(0, 200)}`);
	const parsed = JSON.parse(match[0]);

	const result = {};
	if ("title" in payload) result.title = String(parsed.title ?? payload.title);
	if ("description" in payload) result.description = String(parsed.description ?? payload.description);
	if ("category" in payload) result.category = String(parsed.category ?? payload.category);
	if ("author" in payload) result.author = String(parsed.author ?? payload.author);
	if ("bookTitle" in payload) result.bookTitle = String(parsed.bookTitle ?? payload.bookTitle);
	if ("tags" in payload) {
		const tags = Array.isArray(parsed.tags) ? parsed.tags.map(String) : [];
		if (tags.length !== payload.tags.length) {
			throw new Error(`metadata: expected ${payload.tags.length} tags, got ${tags.length}`);
		}
		result.tags = tags;
	}
	return result;
}

async function translateChunk(chunk) {
	const { text, blocks, soft } = maskProtected(chunk);
	if (blocks.length === 0 && !CJK.test(text)) return { text: chunk, softLost: 0 };

	const prompt = `Translate the following Markdown from Simplified Chinese to English.

${TRANSLATION_RULES}

--- BEGIN CONTENT ---
${text}
--- END CONTENT ---`;

	const raw = await withRetry("chunk", () => callApi(prompt, 8192));

	const expected = [...blocks.keys()];
	const seen = markerIndices(raw);
	const missingHard = expected.filter((i) => !seen.has(i) && !soft.has(i));
	if (missingHard.length > 0) {
		const detail = missingHard
			.slice(0, 3)
			.map((i) => `#${i}=${JSON.stringify(blocks[i]?.slice(0, 60))}`)
			.join(" ");
		throw new Error(
			`chunk: ${missingHard.length} protected block(s) lost (${missingHard.slice(0, 8).join(",")}) ${detail}`,
		);
	}
	const missingSoft = expected.filter((i) => !seen.has(i) && soft.has(i));
	const restored = unmask(raw, blocks);
	if (restored.includes(MARK_OPEN)) {
		throw new Error("chunk: unreplaced placeholder left in output");
	}
	return { text: restored, softLost: missingSoft.length };
}

// ── File processing ─────────────────────────────────────────────────
function sha256(text) {
	return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/** Path filter that works whether the caller typed / or \ separators. */
function matchesFileFilter(full, filter) {
	const rel = relative(ROOT, full).replace(/\\/g, "/");
	return rel.includes(filter.replace(/\\/g, "/"));
}

async function collectFiles(opts) {
	const names = opts.collections.length > 0 ? opts.collections : Object.keys(COLLECTIONS);
	const files = [];
	for (const name of names) {
		const dir = COLLECTIONS[name];
		if (!dir || !existsSync(dir)) throw new Error(`Unknown or missing collection: ${name}`);
		await collectMarkdownFiles(dir, files);
	}
	return files
		.filter((f) => (opts.file ? matchesFileFilter(f, opts.file) : true))
		.sort();
}

export async function collectMarkdownFiles(dir, out = []) {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) await collectMarkdownFiles(full, out);
		else if (entry.name.endsWith(".md")) out.push(full);
	}
	return out;
}

/**
 * True when the file still holds CJK in a position we translate: frontmatter
 * metadata, or body prose. Uses the same masking as check-translations.mjs so
 * "needs work" and "has violations" cannot disagree — CJK inside code, math or
 * a URL does not count.
 */
function needsWork(raw) {
	const { frontmatter, body } = splitFrontmatter(raw);
	const meta = readMetadata(frontmatter);
	if (meta) {
		for (const value of Object.values(meta)) {
			const values = Array.isArray(value) ? value : value ? [value] : [];
			if (values.some((v) => CJK.test(v))) return true;
		}
	}
	return CJK.test(maskProtected(body).text);
}

async function processFile(full, cache, opts) {
	const rel = relative(ROOT, full);
	const raw = await readFile(full, "utf8");
	const currentHash = sha256(raw);

	if (!needsWork(raw) && !opts.force) return { rel, status: "skip-done" };
	if (cache[rel] === currentHash && !opts.force) return { rel, status: "skip-cached" };

	const { frontmatter, body } = splitFrontmatter(raw);
	const meta = readMetadata(frontmatter);

	const translatedMeta = meta && (meta.title || meta.description || meta.category || meta.tags?.length)
		? await translateMetadata(meta)
		: null;

	const sourceProse = body.replace(/```[\s\S]*?```/g, "");
	let englishBody = body;
	let softLost = 0;
	if (CJK.test(sourceProse)) {
		const chunks = packChunks(splitIntoSegments(body), opts.maxChunk);
		const out = [];
		for (let i = 0; i < chunks.length; i++) {
			process.stdout.write(`  ${rel} chunk ${i + 1}/${chunks.length}\r`);
			const translated = await translateChunk(chunks[i]);
			softLost += translated.softLost;
			out.push(translated.text);
		}
		englishBody = out.join("\n");
	}
	englishBody = normalizeHeadingNumerals(englishBody);

	// Guard: every HARD protected block (code, math, HTML, URL) must survive.
	const hardOnly = (text) => {
		const { blocks, soft } = maskProtected(text);
		return blocks.filter((_, i) => !soft.has(i)).sort();
	};
	const before = hardOnly(body);
	const after = hardOnly(englishBody);
	if (before.length !== after.length || before.some((b, i) => b !== after[i])) {
		throw new Error(`protected blocks changed (${before.length} -> ${after.length})`);
	}

	let result;
	if (frontmatter !== null) {
		const rebuilt = writeMetadata(frontmatter, translatedMeta ?? {});
		result = `---\n${rebuilt}\n---\n${englishBody.replace(/^\n+/, "\n")}`;
	} else {
		result = englishBody;
	}

	await writeFile(full, result, "utf8");
	cache[rel] = sha256(result);
	if (softLost > 0) return { rel, status: "translated-soft-loss", softLost };
	// A safety net: if CJK survived anywhere user-facing, say so instead of
	// pretending the file is done.
	if (needsWork(result)) return { rel, status: "translated-with-leftovers" };
	return { rel, status: "translated" };
}

/**
 * Rewrites heading numerals in already-translated files without calling the API.
 * Idempotent, so it is safe to run over the whole content tree.
 */
async function normalizeOnly(opts) {
	const files = (await collectFiles(opts)).slice(0, opts.limit);
	let changed = 0;
	for (const full of files) {
		const raw = await readFile(full, "utf8");
		const { frontmatter, body } = splitFrontmatter(raw);
		const nextBody = normalizeHeadingNumerals(body);
		if (nextBody === body) continue;
		const result =
			frontmatter !== null ? `---\n${frontmatter}\n---\n${nextBody}` : nextBody;
		await writeFile(full, result, "utf8");
		changed++;
		console.log(`normalized ${relative(ROOT, full)}`);
	}
	console.log(`\n${changed} file(s) normalized`);
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
	const opts = parseArgs(process.argv.slice(2));

	if (existsSync(resolve(ROOT, ".env"))) {
		try {
			process.loadEnvFile(resolve(ROOT, ".env"));
		} catch {
			/* optional */
		}
	}
	if (!opts.dryRun && !opts.normalizeOnly && !process.env.DEEPSEEK_API_KEY) {
		throw new Error("DEEPSEEK_API_KEY is not set (or use --dry-run)");
	}

	// Deterministic, offline fix-up: no API calls.
	if (opts.normalizeOnly) {
		await normalizeOnly(opts);
		return;
	}

	const files = (await collectFiles(opts)).slice(0, opts.limit);
	const cache = existsSync(CACHE_FILE)
		? JSON.parse(await readFile(CACHE_FILE, "utf8"))
		: {};

	console.log(`${files.length} markdown file(s) selected${opts.dryRun ? " (dry run)" : ""}`);

	if (opts.dryRun) {
		let pending = 0;
		for (const full of files) {
			const raw = await readFile(full, "utf8");
			const todo = needsWork(raw) && (opts.force || cache[relative(ROOT, full)] !== sha256(raw));
			if (todo) pending++;
			console.log(`${todo ? "TODO " : "done "} ${relative(ROOT, full)}`);
		}
		console.log(`\n${pending} file(s) would be translated`);
		return;
	}

	const queue = [...files];
	const results = { translated: 0, skipped: 0, failed: 0 };
	const failures = [];
	const leftovers = [];
	const softLosses = [];

	async function worker(id) {
		while (queue.length > 0) {
			const full = queue.shift();
			if (!full) break;
			const rel = relative(ROOT, full);
			try {
				const res = await processFile(full, cache, opts);
				if (res.status === "translated") {
					results.translated++;
					console.log(`[${id}] ok   ${rel}`);
				} else if (res.status === "translated-soft-loss") {
					results.translated++;
					softLosses.push(`${rel} (${res.softLost} inline-code span(s))`);
					console.log(`[${id}] ok   ${rel}  (${res.softLost} inline-code backtick(s) dropped)`);
				} else if (res.status === "translated-with-leftovers") {
					results.translated++;
					leftovers.push(rel);
					console.warn(`[${id}] WARN ${rel}: CJK text still present after translation`);
				} else {
					results.skipped++;
				}
			} catch (error) {
				results.failed++;
				failures.push({ rel, error: error.message });
				console.error(`[${id}] FAIL ${rel}: ${error.message}`);
			}
			await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
		}
	}

	await Promise.all(
		Array.from({ length: Math.max(1, opts.concurrency) }, (_, i) => worker(i + 1)),
	);

	console.log(`\ntranslated: ${results.translated}`);
	console.log(`skipped   : ${results.skipped}`);
	console.log(`failed    : ${results.failed}`);
	if (softLosses.length > 0) {
		console.log(`\ninline-code backticks dropped in ${softLosses.length} file(s) — cosmetic, verify formatting:`);
		for (const s of softLosses) console.log(`  ${s}`);
	}
	if (leftovers.length > 0) {
		console.log(`\nCJK left behind in ${leftovers.length} file(s) — review these:`);
		for (const rel of leftovers) console.log(`  ${rel}`);
	}
	if (failures.length > 0) {
		console.log("\nfailures:");
		for (const f of failures) console.log(`  ${f.rel}: ${f.error}`);
		process.exitCode = 1;
	}
}

// Run only when invoked directly; check-translations.mjs imports the helpers above.
const invokedDirectly =
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
	main().catch((error) => {
		console.error(`fatal: ${error.message}`);
		process.exitCode = 1;
	});
}
