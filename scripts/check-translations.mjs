#!/usr/bin/env node
/**
 * Guards the English-only invariant of src/content/**.
 *
 * Two severities:
 *   error   — CJK in frontmatter metadata, or CJK in body prose. Both are
 *             user-visible, and both mean the English pass missed the file.
 *   warning — CJK inside fenced code blocks. Usually a Chinese code comment;
 *             legitimate to keep, but worth listing so it can be reviewed
 *             deliberately rather than discovered later.
 *
 * Usage: node scripts/check-translations.mjs [--quiet]
 * Exit code 1 when any error is found.
 */

import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import {
	CJK,
	CONTENT_ROOT,
	collectMarkdownFiles,
	maskProtected,
	readMetadata,
	splitFrontmatter,
} from "./translate-content.mjs";

/** CJK that only appears inside code fences — reported, not failed. */
function codeBlockCjk(body) {
	const findings = [];
	for (const match of body.matchAll(/```[\s\S]*?```/g)) {
		if (!CJK.test(match[0])) continue;
		const offset = body.slice(0, match.index).split("\n").length;
		const lines = match[0].split("\n").filter((line) => CJK.test(line));
		findings.push({ line: offset, samples: lines.slice(0, 2).map((l) => l.trim()) });
	}
	return findings;
}

/** CJK in prose: fenced code, inline code, math, HTML and links are masked out first. */
function proseCjk(body) {
	const { text } = maskProtected(body.replace(/```[\s\S]*?```/g, "\n"));
	const hits = [];
	for (const line of text.split("\n")) {
		if (CJK.test(line)) hits.push(line.trim().slice(0, 90));
	}
	return hits;
}

const quiet = process.argv.includes("--quiet");

/**
 * Files where Chinese characters are load-bearing rather than untranslated.
 * Their CJK is reported as a warning instead of failing the check. Keep this
 * list tiny, and keep the justification with the entry.
 */
const CJK_IS_CONTENT = new Map([
	[
		"posts/frontend-i18n-practical-guide.md",
		"an article about i18n: its prose examples are the Chinese/Japanese locale data it discusses (¥ vs ￥, 万, 和, 昨天), and its code contains a regex that matches CJK",
	],
	[
		"posts/llm-app-guardrails.md",
		"its rule-based blacklist regexes match Chinese injection phrases and must keep matching them; translating a pattern changes what the code detects",
	],
	[
		"posts/prompt-engineering-advanced-chain-of-thought.md",
		"the answer-extraction regex keeps the Chinese form for backwards compatibility while also accepting the translated 'Answer:'",
	],
]);

const files = await collectMarkdownFiles(CONTENT_ROOT);
const errors = [];
const warnings = [];

for (const full of files) {
	const rel = relative(process.cwd(), full);
	const key = rel.replace(/\\/g, "/").replace(/^src\/content\//, "");
	const allowlisted = CJK_IS_CONTENT.get(key);
	const raw = await readFile(full, "utf8");
	const { frontmatter, body } = splitFrontmatter(raw);

	const fileErrors = [];
	const meta = readMetadata(frontmatter);
	if (meta) {
		for (const [k, value] of Object.entries(meta)) {
			const values = Array.isArray(value) ? value : value ? [value] : [];
			const bad = values.filter((v) => CJK.test(v));
			if (bad.length > 0) fileErrors.push(`frontmatter "${k}": ${bad.join(" / ")}`);
		}
	}

	const prose = proseCjk(body);
	if (prose.length > 0) {
		fileErrors.push(`body prose: ${prose.slice(0, 3).join(" | ")}`);
	}

	const inCode = codeBlockCjk(body);
	// Code-block CJK is an error too: translate-content.mjs protects fences by
	// design, so it is scripts/translate-code-blocks.mjs that clears it, and
	// whatever it leaves behind is either a miss or an allowlisted pattern.
	if (inCode.length > 0 && !allowlisted) {
		fileErrors.push(
			`code block (${inCode.reduce((n, b) => n + b.samples.length, 0)} line(s)): ${inCode[0].samples[0]}`,
		);
	}

	if (allowlisted && (fileErrors.length > 0 || inCode.length > 0)) {
		warnings.push({ rel, blocks: inCode.length, note: allowlisted });
	} else {
		for (const detail of fileErrors) errors.push({ rel, detail });
		if (inCode.length > 0) warnings.push({ rel, blocks: inCode.length });
	}
}

if (!quiet) {
	if (warnings.length > 0) {
		console.log(`CJK inside code blocks (${warnings.length} file(s)) — review, not fatal:`);
		for (const w of warnings) console.log(`  ${w.rel}  (${w.blocks} block(s))`);
		console.log("");
	}
}

console.log(`checked ${files.length} markdown file(s)`);
console.log(`errors  : ${errors.length}`);
console.log(`warnings: ${warnings.length}`);

if (errors.length > 0) {
	console.log("\nEnglish-only violations:");
	for (const e of errors) console.log(`  ${e.rel}\n    ${e.detail}`);
	process.exitCode = 1;
}
