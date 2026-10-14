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
	html: ["<!--"], xml: ["<!--"], markdown: ["<!--"], md: ["<!--"],
	cobol: ["*"], text: ["--", "#"],
};
const FALLBACK_MARKERS = ["//", "#", "--", ";", "%", "<!--", "*"];

const markersFor = (lang) => MARKERS_BY_LANG[lang] ?? FALLBACK_MARKERS;

/**
 * Splits a line into code / marker / comment when a marker starts outside any
 * string literal. Returns null when the line carries no comment.
 */
function splitComment(line, markers) {
	const indent = line.match(/^\s*/)[0].length;

	for (const mk of markers) {
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

// ── Translation call ────────────────────────────────────────────────
const FRAGMENT_RULES = `The strings come from code samples in a technical blog post. Translate each one from Simplified Chinese into natural English.

Rules:
- Translate only the human-readable text. Keep identifiers, file paths, URLs, numbers, units, mermaid/HTML/SQL syntax and product names untouched.
- Do NOT translate or restructure surrounding code — you only ever receive the text fragments themselves.
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
	const stats = { mermaid: 0, comments: 0, prose: 0, leftovers: 0 };
	const fences = parseFences(raw);
	const edits = [];

	// ---- mermaid: one batched call for the whole file ----
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

	// ---- comments: one batched call across every code fence ----
	if (opts.ops.has("comments")) {
		const jobs = [];
		for (const fence of fences) {
			if (fence.lang === "mermaid") continue;
			const targets = findComments(fence.content, fence.lang);
			if (targets.length > 0) jobs.push({ fence, targets });
		}
		const all = jobs.flatMap((j) => j.targets.map((t) => t.comment));
		stats.comments = all.length;
		if (!dry && all.length > 0) {
			const tr = await translateFragments(all);
			stats.leftovers += countCjk(tr);
			let offset = 0;
			for (const job of jobs) {
				const slice = tr.slice(offset, offset + job.targets.length);
				offset += job.targets.length;
				const lines = job.fence.content.split("\n");
				job.targets.forEach((t, i) => {
					lines[t.line] = `${t.code}${t.marker}${slice[i]}`;
				});
				edits.push({
					startLine: job.fence.startLine,
					endLine: job.fence.endLine,
					content: lines.join("\n"),
				});
			}
		}
	}

	// ---- prose blocks: one call each (each needs its own masking) ----
	if (opts.ops.has("prose")) {
		for (const fence of fences) {
			if (!PROSE_LANGS.has(fence.lang) || !CJK.test(fence.content)) continue;
			stats.prose++;
			if (dry) continue;
			const translated = await translateProseBlock(fence.content);
			if (CJK.test(translated)) stats.leftovers++;
			edits.push({
				startLine: fence.startLine,
				endLine: fence.endLine,
				content: translated,
			});
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
	opts.ops = opts.op === "all" ? new Set(["mermaid", "comments", "prose"]) : new Set([opts.op]);
	for (const op of opts.ops) {
		if (!["mermaid", "comments", "prose"].includes(op)) throw new Error(`Unknown op: ${op}`);
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

	const totals = { mermaid: 0, comments: 0, prose: 0, leftovers: 0, changed: 0 };
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
				totals.leftovers += stats.leftovers;
				if (changed) {
					totals.changed++;
					console.log(
						`[${id}] ${opts.report ? "would change" : "ok  "} ${rel}  (m=${stats.mermaid} c=${stats.comments} p=${stats.prose})`,
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
