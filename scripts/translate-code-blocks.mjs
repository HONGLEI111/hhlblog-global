#!/usr/bin/env node
/**
 * Translates the Chinese left inside fenced code blocks.
 *
 * Follow-up to translate-content.mjs, which deliberately protected code fences.
 * This works strictly inside fences and never lets the model see — or rewrite —
 * code structure: translatable fragments are extracted, sent as a JSON array,
 * and written back by index. A malformed response can therefore not be applied.
 *
 * Three operations, each independently runnable and verifiable:
 *
 *   mermaid  — diagram labels only (node text in []/{}/()/||, quoted strings,
 *              subgraph names). These render into the SVG, so readers see them.
 *   comments — whole-line and trailing comments in every other language. The
 *              marker is located quote-aware and everything before it is copied
 *              through byte-for-byte.
 *   prose    — the body of `text` / `markdown` / unlabelled fences, which hold
 *              pseudocode, SQL transcripts and ASCII diagrams, not code.
 *
 * Every fence is recomputed from the ORIGINAL file text and all splices are
 * applied at the end in descending line order, so line numbers cannot drift.
 * Fragments are batched per file and per op, which keeps the call count near one
 * per file instead of one per fence.
 *
 * Usage:
 *   DEEPSEEK_API_KEY=sk-... node scripts/translate-code-blocks.mjs [options]
 *
 * Options:
 *   --op <mermaid|comments|prose|all>   default: all
 *   --file <substring>                  only matching paths
 *   --limit <n>                         stop after n files
 *   --concurrency <n>                   files in flight (default 3)
 *   --report                            change nothing, call nothing; just count
 */

import { readFile, writeFile } from "node:fs/promises";
import { relative } from "node:path";
import {
	CJK,
	CONTENT_ROOT,
	callApi,
	collectMarkdownFiles,
	maskProtected,
	unmask,
	withRetry,
	MARK_SHAPE,
} from "./translate-content.mjs";

const PROSE_LANGS = new Set(["", "text", "txt", "markdown", "md"]);

// ── Fence parsing ───────────────────────────────────────────────────
/** Fenced blocks with their line ranges, so a block can be spliced back safely. */
function parseFences(text) {
	const lines = text.split("\n");
	const fences = [];
	let open = null;
	for (let i = 0; i < lines.length; i++) {
		const m = lines[i].match(/^\s*(`{3,})(.*)$/);
		if (!m) continue;
		if (open === null) {
			open = { fence: m[1], lang: m[2].trim().toLowerCase(), startLine: i + 1 };
		} else if (m[1].length >= open.fence.length) {
			fences.push({
				lang: open.lang,
				startLine: open.startLine,
				endLine: i - 1,
				content: lines.slice(open.startLine, i).join("\n"),
			});
			open = null;
		}
	}
	return fences;
}

function spliceLines(text, startLine, endLine, newContent) {
	const lines = text.split("\n");
	return [
		...lines.slice(0, startLine),
		...newContent.split("\n"),
		...lines.slice(endLine + 1),
	].join("\n");
}

/** Applies all replacements at once, bottom-up, so line numbers stay valid. */
function applyAllSplices(text, edits) {
	let out = text;
	for (const edit of [...edits].sort((a, b) => b.startLine - a.startLine)) {
		out = spliceLines(out, edit.startLine, edit.endLine, edit.content);
	}
	return out;
}

// ── Op: mermaid labels ──────────────────────────────────────────────
const LABEL_PATTERNS = [
	/\[([^[\]\n]*)\]/g,
	/\{([^{}\n]*)\}/g,
	/\(([^()\n]*)\)/g,
	/\|([^|\n]*)\|/g,
	/"([^"\n]*)"/g,
	/^(?:subgraph\s+)(\S[^\n]*)$/gm,
];

/** CJK-bearing label fragments with offsets, de-overlapped. */
function findMermaidLabels(content) {
	const found = [];
	const taken = [];
	for (const re of LABEL_PATTERNS) {
		for (const m of content.matchAll(re)) {
			const inner = m[1];
			if (!inner || !CJK.test(inner)) continue;
			const start = m.index + m[0].indexOf(inner);
			const end = start + inner.length;
			if (taken.some(([s, e]) => start < e && end > s)) continue;
			taken.push([start, end]);
			found.push({ start, end, text: inner });
		}
	}
	return found.sort((a, b) => a.start - b.start);
}

function applySpans(content, spans, translations) {
	let out = content;
	for (let i = spans.length - 1; i >= 0; i--) {
		out = out.slice(0, spans[i].start) + translations[i] + out.slice(spans[i].end);
	}
	return out;
}

// ── Op: comments ────────────────────────────────────────────────────
const MARKERS_BY_LANG = {
	js: ["//", "/*", "*"], jsx: ["//", "/*", "*"], mjs: ["//", "/*", "*"],
	ts: ["//", "/*", "*"], tsx: ["//", "/*", "*"], typescript: ["//", "/*", "*"],
	javascript: ["//", "/*", "*"], java: ["//", "/*", "*"], c: ["//", "/*", "*"],
	cpp: ["//", "/*", "*"], rust: ["//", "/*", "*"], css: ["/*", "*"],
	scss: ["//", "/*", "*"], astro: ["//", "/*", "*"], vue: ["//", "/*", "*"],
	python: ["#"], bash: ["#"], sh: ["#"], shell: ["#"], zsh: ["#"],
	yaml: ["#"], yml: ["#"], toml: ["#"], dockerfile: ["#"], makefile: ["#"],
	nginx: ["#"], ruby: ["#"], perl: ["#"], r: ["#"], ini: ["#"],
	jsonc: ["//", "/*", "*"], sql: ["--"], lua: ["--"], haskell: ["--"],
	// Astro/Vue files carry both JS comments and HTML comments.
	astro: ["//", "/*", "*", "<!--"], vue: ["//", "/*", "*", "<!--"],
	html: ["<!--"], xml: ["<!--"], markdown: ["<!--"], md: ["<!--"],
	cobol: ["*"], text: ["--", "#"],
};
const FALLBACK_MARKERS = ["//", "#", "--", ";", "%", "<!--", "*"];

/** Every marker any language uses, longest first — for whole-line detection. */
const ALL_MARKERS = [
	...new Set([...Object.values(MARKERS_BY_LANG).flat(), ...FALLBACK_MARKERS]),
].sort((a, b) => b.length - a.length);

const markersFor = (lang) => MARKERS_BY_LANG[lang] ?? FALLBACK_MARKERS;

/**
 * Splits a line into code / marker / comment when a marker starts outside any
 * string literal. Returns null when the line carries no comment.
 *
 * Whole-line comments accept any language's marker, because articles quote code
 * across languages on purpose (e.g. a `//` comment inside a Python sample —
 * which is exactly what the post about odd comments is showing). Trailing
 * comments stay language-specific, since a stray `#` in JavaScript is usually
 * part of the code.
 */
function splitComment(line, markers) {
	const indent = line.match(/^\s*/)[0].length;

	for (const mk of ALL_MARKERS) {
		if (line.slice(indent).startsWith(mk)) {
			return {
				code: line.slice(0, indent),
				marker: mk,
				comment: line.slice(indent + mk.length),
			};
		}
	}

	let inSingle = false;
	let inDouble = false;
	let inBacktick = false;
	for (let i = indent; i < line.length; i++) {
		const ch = line[i];
		if (ch === "\\") {
			i++;
			continue;
		}
		if (ch === "'" && !inDouble && !inBacktick) inSingle = !inSingle;
		else if (ch === '"' && !inSingle && !inBacktick) inDouble = !inDouble;
		else if (ch === "`" && !inSingle && !inDouble) inBacktick = !inBacktick;
		if (inSingle || inDouble || inBacktick) continue;
		for (const mk of markers) {
			if (i > indent && line.startsWith(mk, i)) {
				return { code: line.slice(0, i), marker: mk, comment: line.slice(i + mk.length) };
			}
		}
	}
	return null;
}

/** Comment fragments of a whole fence, with the line index they belong to. */
function findComments(content, lang) {
	const markers = markersFor(lang);
	const lines = content.split("\n");
	const targets = [];
	for (let i = 0; i < lines.length; i++) {
		const split = splitComment(lines[i], markers);
		if (!split || !CJK.test(split.comment)) continue;
		targets.push({ line: i, ...split });
	}
	return targets;
}

// ── Op: strings, placeholders and HTML text ────────────────────────
/**
 * Fragments the comment op cannot reach: string literals, `<placeholder>` names,
 * HTML comments and text nodes between tags. Each is transcribed by index, with
 * the delimiters left in place, so the surrounding code cannot change.
 *
 * The `<...>` rule only fires when the character right after `<` is CJK. That is
 * what separates a placeholder (`<你的用户名>`) from a real tag (`<meta …>`),
 * whose attribute values are handled by the string rule instead.
 */
const FRAGMENT_PATTERNS = [
	{ name: "html-comment", re: /<!--([\s\S]*?)-->/g },
	{ name: "triple", re: /("""|''')([\s\S]*?)\1/g, group: 2, delimGroup: 1 },
	{ name: "double", re: /"((?:[^"\\\n]|\\.)*)"/g, group: 1, delim: '"' },
	{ name: "single", re: /'((?:[^'\\\n]|\\.)*)'/g, group: 1, delim: "'" },
	// Backtick template literals, including ones that wrap across lines and ones
	// with ${…} interpolation: [^`] spans newlines, so both shapes match here.
	{ name: "backtick", re: /`([^`]*)`/g, group: 1 },
	{ name: "placeholder", re: /<([\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff][^<>\n]*)>/g, group: 1 },
	{ name: "text-node", re: />([^<>\n]*[\u4e00-\u9fff][^<>\n]*)</g, group: 1 },
	// A line whose first non-space character is CJK and which contains no ASCII
	// word: JSX/HTML text that sits on its own line, prompt lines in a shell
	// fence, and similar. Excludes code such as `const CJK = /[一-鿿]/`.
	{
		name: "bare-text",
		re: /^[\t ]*([\u4e00-\u9fff][\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\u2026\u2014\u2018\u2019\u201c\u201d\d\s]*?)[\t ]*$/gm,
		group: 1,
	},
];

/** De-overlapped fragment spans containing CJK. */
function findInlineFragments(content) {
	const found = [];
	const taken = [];
	for (const { re, group = 1, delim, delimGroup, name } of FRAGMENT_PATTERNS) {
		for (const m of content.matchAll(re)) {
			const inner = m[group];
			if (inner === undefined || !CJK.test(inner)) continue;
			const start = m.index + m[0].indexOf(inner);
			const end = start + inner.length;
			if (taken.some(([s, e]) => start < e && end > s)) continue;
			taken.push([start, end]);
			found.push({
				start,
				end,
				text: inner,
				// Delimiter that the translation must not contain.
				forbidden: delimGroup ? m[delimGroup] : delim ?? null,
				name,
			});
		}
	}
	return found.sort((a, b) => a.start - b.start);
}

/**
 * Writes translations back, refusing any that would break the literal:
 *   - a quote matching the delimiter would end the string early;
 *   - a backslash the original did not have would introduce a new escape
 *     (preserved escapes such as the \n in `f"…{temp}\n"` are fine);
 *   - a new line break would change the shape of the source (the model likes to
 *     turn \n into a real newline, which silently rewrites the sample).
 * A refused item keeps its original text, so the code stays valid either way.
 */
function applyInlineSpans(content, spans, translations) {
	let out = content;
	let rejected = 0;
	for (let i = spans.length - 1; i >= 0; i--) {
		const span = spans[i];
		let text = translations[i];
		const originalSlashes = (span.text.match(/\\/g) ?? []).length;
		const newSlashes = (text.match(/\\/g) ?? []).length;
		const originalBreaks = (span.text.match(/\n/g) ?? []).length;
		const newBreaks = (text.match(/\n/g) ?? []).length;
		const unsafe =
			(span.forbidden && text.includes(span.forbidden)) ||
			newSlashes > originalSlashes ||
			newBreaks > originalBreaks;
		if (unsafe) {
			rejected++;
			text = span.text;
		}
		out = out.slice(0, span.start) + text + out.slice(span.end);
	}
	return { content: out, rejected };
}

// ── Translation call ────────────────────────────────────────────────
const FRAGMENT_RULES = `The strings come from code samples in a technical blog post. Translate each one from Simplified Chinese into natural English.

Rules:
- Translate only the human-readable text. Keep identifiers, file paths, URLs, numbers, units, mermaid/HTML/SQL syntax and product names untouched.
- Do NOT translate or restructure surrounding code — you only ever receive the text fragments themselves.
- A backslash escape inside a string (\n, \t, \", \\u2026) is code, not text: keep it written as a backslash followed by that character. NEVER replace \n with a real line break, and never add a line break that was not in the input.
- Keep \${...} interpolation, {name} expressions and %s placeholders exactly as they are.
- If an item is already English, or is a bare symbol, return it unchanged.
- Keep each translation roughly as short as the original; these are labels and comments.
- Return ONLY a JSON array of strings, with exactly the same number of items, in the same order.
- No commentary, and no markdown fence around the JSON.`;

async function translateFragments(items) {
	if (items.length === 0) return [];
	const prompt = `${FRAGMENT_RULES}

Input (${items.length} items):
${JSON.stringify(items)}`;

	const raw = await withRetry("fragments", () => callApi(prompt, 8192));
	const match = raw.match(/\[[\s\S]*\]/);
	if (!match) throw new Error(`no JSON array in response: ${raw.slice(0, 200)}`);
	let parsed;
	try {
		parsed = JSON.parse(match[0]);
	} catch (e) {
		throw new Error(`JSON parse failed: ${e.message}`);
	}
	if (!Array.isArray(parsed)) throw new Error("response is not an array");
	if (parsed.length !== items.length) {
		throw new Error(`expected ${items.length} items, got ${parsed.length}`);
	}
	return parsed.map((v) => (typeof v === "string" ? v : String(v)));
}

const countCjk = (list) => list.filter((t) => CJK.test(t)).length;

async function translateProseBlock(content) {
	// maskHtmlTags:false — inside a pseudocode / template block, `<...>` is a
	// placeholder that must be translated, not markup that must be preserved.
	// Masking it made the model drop lines that consisted only of placeholders.
	const { text, blocks, soft } = maskProtected(content, { maskHtmlTags: false });
	const expected = [...blocks.keys()];
	const prompt = `Translate the following block from Simplified Chinese to English. It is a pseudocode / transcript / diagram block from a technical article, not executable code.

Rules:
- Translate the prose and the annotations; leave identifiers, numbers, URLs, SQL keywords, arrows and box-drawing characters as they are.
- Text containing ${MARK_SHAPE} is a masked placeholder (a private-use character, a number, another private-use character). Copy each one verbatim, exactly once, in its original position.
- Preserve line breaks and indentation as closely as you can.
- Return ONLY the translated block.

--- BEGIN CONTENT ---
${text}
--- END CONTENT ---`;

	const raw = await withRetry("prose", () => callApi(prompt, 8192));
	const seen = new Set([...raw.matchAll(/\uE000(\d+)\uE001/g)].map((m) => Number(m[1])));
	const missing = expected.filter((i) => !seen.has(i) && !soft.has(i));
	if (missing.length > 0) throw new Error(`prose: ${missing.length} protected block(s) lost`);
	return unmask(raw, blocks);
}

// ── Per-file driver ─────────────────────────────────────────────────
async function processFile(full, opts) {
	const raw = await readFile(full, "utf8");
	const dry = opts.report;
	const stats = { mermaid: 0, comments: 0, prose: 0, strings: 0, leftovers: 0, rejected: 0 };
	const fences = parseFences(raw);
	const edits = [];

	// ---- 1. mermaid labels: one batched call per file ----
	if (opts.ops.has("mermaid")) {
		const jobs = fences
			.filter((f) => f.lang === "mermaid")
			.map((f) => ({ fence: f, spans: findMermaidLabels(f.content) }))
			.filter((j) => j.spans.length > 0);
		const all = jobs.flatMap((j) => j.spans.map((s) => s.text));
		stats.mermaid = all.length;
		if (!dry && all.length > 0) {
			const tr = await translateFragments(all);
			stats.leftovers += countCjk(tr);
			let offset = 0;
			for (const job of jobs) {
				const slice = tr.slice(offset, offset + job.spans.length);
				offset += job.spans.length;
				edits.push({
					startLine: job.fence.startLine,
					endLine: job.fence.endLine,
					content: applySpans(job.fence.content, job.spans, slice),
				});
			}
		}
	}

	// ---- 2. gather comment + inline fragments per fence ----
	// Comments and strings can hit the same fence, so each fence accumulates its
	// changes and emits exactly one edit; two edits for one line range would
	// overwrite each other, since both are computed from the original text.
	const perFence = new Map();
	for (const fence of fences) {
		if (fence.lang === "mermaid") continue;
		const isProse = PROSE_LANGS.has(fence.lang);
		const comments = opts.ops.has("comments") ? findComments(fence.content, fence.lang) : [];
		const inlines =
			!isProse && opts.ops.has("strings") ? findInlineFragments(fence.content) : [];
		const wantsProse = isProse && opts.ops.has("prose") && CJK.test(fence.content);
		if (comments.length === 0 && inlines.length === 0 && !wantsProse) continue;
		perFence.set(fence, { comments, inlines, wantsProse });
		stats.comments += comments.length;
		stats.strings += inlines.length;
		if (wantsProse) stats.prose++;
	}

	if (!dry && perFence.size > 0) {
		const commentTexts = [];
		const inlineTexts = [];
		for (const job of perFence.values()) {
			commentTexts.push(...job.comments.map((t) => t.comment));
			inlineTexts.push(...job.inlines.map((s) => s.text));
		}
		const commentTr = await translateFragments(commentTexts);
		const inlineTr = await translateFragments(inlineTexts);
		stats.leftovers += countCjk(commentTr) + countCjk(inlineTr);

		let cOff = 0;
		let iOff = 0;
		for (const [fence, job] of perFence) {
			let content = fence.content;
			if (job.comments.length > 0) {
				const slice = commentTr.slice(cOff, cOff + job.comments.length);
				cOff += job.comments.length;
				const lines = content.split("\n");
				job.comments.forEach((t, i) => {
					lines[t.line] = `${t.code}${t.marker}${slice[i]}`;
				});
				content = lines.join("\n");
			}
			if (job.inlines.length > 0) {
				const slice = inlineTr.slice(iOff, iOff + job.inlines.length);
				iOff += job.inlines.length;
				const applied = applyInlineSpans(content, job.inlines, slice);
				content = applied.content;
				stats.rejected += applied.rejected;
			}
			if (job.wantsProse) content = await translateProseBlock(content);
			if (CJK.test(content)) stats.leftovers++;
			edits.push({ startLine: fence.startLine, endLine: fence.endLine, content });
		}
	} else if (dry) {
		for (const job of perFence.values()) {
			if (job.wantsProse) stats.prose = stats.prose;
		}
	}

	if (edits.length === 0) return { changed: false, stats };
	const text = applyAllSplices(raw, edits);
	if (!dry && text !== raw) await writeFile(full, text, "utf8");
	return { changed: text !== raw, stats };
}

// ── CLI ─────────────────────────────────────────────────────────────
function parseArgs(argv) {
	const opts = {
		op: "all",
		file: null,
		limit: Number.POSITIVE_INFINITY,
		concurrency: 3,
		report: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--op") opts.op = argv[++i];
		else if (arg === "--file") opts.file = argv[++i];
		else if (arg === "--limit") opts.limit = Number(argv[++i]);
		else if (arg === "--concurrency") opts.concurrency = Number(argv[++i]);
		else if (arg === "--report") opts.report = true;
		else throw new Error(`Unknown option: ${arg}`);
	}
	const OPS = ["mermaid", "comments", "prose", "strings"];
	opts.ops = opts.op === "all" ? new Set(OPS) : new Set([opts.op]);
	for (const op of opts.ops) {
		if (!OPS.includes(op)) throw new Error(`Unknown op: ${op}`);
	}
	return opts;
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));
	if (!opts.report && !process.env.DEEPSEEK_API_KEY) {
		throw new Error("DEEPSEEK_API_KEY is not set (or use --report)");
	}

	let files = await collectMarkdownFiles(CONTENT_ROOT);
	if (opts.file) {
		files = files.filter((f) =>
			relative(CONTENT_ROOT, f).replace(/\\/g, "/").includes(opts.file),
		);
	}
	files = files.slice(0, opts.limit);
	console.log(
		`${files.length} file(s), ops=${[...opts.ops].join("+")}${opts.report ? " (report only)" : ""}`,
	);

	const totals = { mermaid: 0, comments: 0, prose: 0, strings: 0, leftovers: 0, rejected: 0, changed: 0 };
	const failures = [];
	const queue = [...files];

	async function worker(id) {
		while (queue.length > 0) {
			const full = queue.shift();
			if (!full) break;
			const rel = relative(CONTENT_ROOT, full).replace(/\\/g, "/");
			try {
				const { changed, stats } = await processFile(full, opts);
				totals.mermaid += stats.mermaid;
				totals.comments += stats.comments;
				totals.prose += stats.prose;
				totals.strings += stats.strings;
				totals.leftovers += stats.leftovers;
				totals.rejected += stats.rejected;
				if (changed) {
					totals.changed++;
					console.log(
						`[${id}] ${opts.report ? "would change" : "ok  "} ${rel}  (m=${stats.mermaid} c=${stats.comments} p=${stats.prose} s=${stats.strings})`,
					);
				}
			} catch (error) {
				failures.push({ rel, error: error.message });
				console.error(`[${id}] FAIL ${rel}: ${error.message}`);
			}
		}
	}

	await Promise.all(
		Array.from({ length: Math.max(1, opts.concurrency) }, (_, i) => worker(i + 1)),
	);

	console.log(`\nfiles changed   : ${totals.changed}`);
	console.log(`mermaid labels  : ${totals.mermaid}`);
	console.log(`comments        : ${totals.comments}`);
	console.log(`prose blocks    : ${totals.prose}`);
	console.log(`inline fragments: ${totals.strings}`);
	console.log(`unsafe rejected : ${totals.rejected}`);
	console.log(`CJK leftovers   : ${totals.leftovers}`);
	if (failures.length > 0) {
		console.log(`\nfailures (${failures.length}):`);
		for (const f of failures) console.log(`  ${f.rel}: ${f.error}`);
		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error(`fatal: ${error.message}`);
	process.exitCode = 1;
});
