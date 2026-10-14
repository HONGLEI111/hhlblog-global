/// <reference types="mdast" />
import { h } from "hastscript";

/**
 * Language code to display name mapping.
 * Used when no title attribute is specified on the code block.
 */
const LANG_NAME_MAP = {
	c: "C",
	cpp: "C++",
	"c++": "C++",
	cc: "C++",
	cxx: "C++",
	h: "C",
	hpp: "C++",
	java: "Java",
	js: "JavaScript",
	javascript: "JavaScript",
	jsx: "JSX",
	ts: "TypeScript",
	typescript: "TypeScript",
	tsx: "TSX",
	py: "Python",
	python: "Python",
	rs: "Rust",
	rust: "Rust",
	go: "Go",
	golang: "Go",
	rb: "Ruby",
	ruby: "Ruby",
	sh: "Shell",
	bash: "Bash",
	zsh: "Zsh",
	shell: "Shell",
	ps1: "PowerShell",
	powershell: "PowerShell",
	html: "HTML",
	css: "CSS",
	scss: "SCSS",
	sass: "Sass",
	less: "Less",
	json: "JSON",
	yaml: "YAML",
	yml: "YAML",
	xml: "XML",
	toml: "TOML",
	md: "Markdown",
	markdown: "Markdown",
	sql: "SQL",
	kt: "Kotlin",
	kotlin: "Kotlin",
	swift: "Swift",
	dart: "Dart",
	lua: "Lua",
	r: "R",
	php: "PHP",
	scala: "Scala",
	perl: "Perl",
	haskell: "Haskell",
	hs: "Haskell",
	elm: "Elm",
	clj: "Clojure",
	clojure: "Clojure",
	erl: "Erlang",
	erlang: "Erlang",
	ex: "Elixir",
	exs: "Elixir",
	elixir: "Elixir",
	cs: "C#",
	csharp: "C#",
	fs: "F#",
	fsharp: "F#",
	vb: "Visual Basic",
	zig: "Zig",
	nim: "Nim",
	jl: "Julia",
	julia: "Julia",
	matlab: "MATLAB",
	dockerfile: "Docker",
	docker: "Docker",
	makefile: "Makefile",
	cmake: "CMake",
	nginx: "Nginx",
	graphql: "GraphQL",
	wasm: "WebAssembly",
	wat: "WAT",
	text: "Text",
	plaintext: "Text",
	txt: "Text",
	diff: "Diff",
	ansi: "ANSI",
};

/**
 * Extract the display name for a language tab.
 * Priority: 1) title attribute from code block, 2) language mapping, 3) raw lang code
 */
function getDisplayName(lang, headerEl) {
	// Try to get title from figcaption.header > span.title
	if (headerEl && headerEl.type === "element") {
		const titleSpan = (headerEl.children || []).find(
			(c) =>
				c.type === "element" &&
				c.tagName === "span" &&
				Array.isArray(c.properties?.className) &&
				c.properties.className.includes("title"),
		);
		if (titleSpan) {
			// Get text content from title span (may have nested elements for inline code, etc.)
			const text = extractTextContent(titleSpan).trim();
			if (text) return text;
		}
	}

	// Fall back to language mapping
	const langLower = (lang || "").toLowerCase();
	return LANG_NAME_MAP[langLower] || lang.toUpperCase();
}

/** Recursively extract text content from a HAST element */
function extractTextContent(node) {
	if (node.type === "text") return node.value;
	if (node.type === "element" && node.children) {
		return node.children.map(extractTextContent).join("");
	}
	return "";
}

/**
 * Recursively traverse a HAST tree to find all .expressive-code div elements.
 */
function findExpressiveCodeBlocks(nodes) {
	const results = [];
	if (!Array.isArray(nodes)) return results;

	for (const node of nodes) {
		if (!node || node.type !== "element") continue;

		if (
			node.tagName === "div" &&
			Array.isArray(node.properties?.className) &&
			node.properties.className.includes("expressive-code")
		) {
			results.push(node);
		} else if (node.children) {
			results.push(...findExpressiveCodeBlocks(node.children));
		}
	}
	return results;
}

/**
 * Recursively traverse a HAST tree to find all <pre> elements
 * that contain a <code> child (i.e., fenced code blocks not yet
 * transformed by rehype-expressive-code).
 */
function findPreCodeBlocks(nodes) {
	const results = [];
	if (!Array.isArray(nodes)) return results;

	for (const node of nodes) {
		if (!node || node.type !== "element") continue;

		if (node.tagName === "pre") {
			results.push(node);
		} else if (node.children) {
			results.push(...findPreCodeBlocks(node.children));
		}
	}
	return results;
}

/**
 * Find code blocks in children — first try .expressive-code divs
 * (already transformed by rehype-expressive-code), then fall back
 * to raw <pre> elements (not yet transformed, will be handled by
 * rehype-expressive-code in a later pass).
 */
function findCodeBlocks(children) {
	// Fast path: expressive-code already ran (ideal pipeline order)
	const ec = findExpressiveCodeBlocks(children);
	if (ec.length >= 2) return { type: "expressive-code", blocks: ec };

	// Fallback: rehypeExpressiveCode hasn't run yet (e.g. integration
	// plugin appended after user plugins by Astro's mergeConfig)
	const pre = findPreCodeBlocks(children);
	if (pre.length >= 2) return { type: "pre", blocks: pre };

	return { type: "none", blocks: [] };
}

/**
 * Creates a code tabs component.
 *
 * @param {Object} properties - The properties from the directive (e.g., {default: "cpp"}).
 * @param {import('mdast').RootContent[]} children - The children HAST elements.
 * @returns {import('mdast').Parent} The created code tabs component.
 */
export function CodeTabsComponent(properties, children) {
	if (!Array.isArray(children) || children.length === 0) {
		return h(
			"div",
			{ class: "hidden" },
			"Invalid code-tabs directive. (Use :::code-tabs with at least 2 fenced code blocks inside)",
		);
	}

	// Find all code blocks within the children
	const { type: blockType, blocks } = findCodeBlocks(children);

	if (blockType === "none" || blocks.length < 2) {
		return h(
			"div",
			{ class: "hidden" },
			"code-tabs directive requires at least 2 code blocks inside :::code-tabs.",
		);
	}

	// Extract language info from each block
	const tabs = [];
	for (const block of blocks) {
		let lang = "";
		let displayName = "";

		if (blockType === "expressive-code") {
			// Already-transformed .expressive-code div
			let headerEl = null;
			const figure = (block.children || []).find(
				(c) => c.type === "element" && c.tagName === "figure",
			);

			if (figure) {
				const figChildren = figure.children || [];
				headerEl = figChildren.find(
					(c) =>
						c.type === "element" &&
						c.tagName === "figcaption" &&
						Array.isArray(c.properties?.className) &&
						c.properties.className.includes("header"),
				);

				const pre = figChildren.find(
					(c) =>
						c.type === "element" &&
						c.tagName === "pre" &&
						c.properties?.dataLanguage,
				);

				if (pre) {
					lang = pre.properties.dataLanguage;
				}
			}

			displayName = getDisplayName(lang, headerEl);
		} else {
			// Raw <pre> block (not yet transformed by rehype-expressive-code)
			const code = (block.children || []).find(
				(c) => c.type === "element" && c.tagName === "code",
			);

			if (code) {
				// Extract language from className (e.g. "language-js" → "js")
				const langClass =
					(Array.isArray(code.properties?.className)
						? code.properties.className
						: []
					).find((c) => c.startsWith("language-")) || "";
				lang = langClass.replace("language-", "");

				// Extract title from meta string
				const meta = code.data?.meta ?? code.properties?.metastring ?? "";
				const titleMatch = meta.match(/(?:^|\s)title="([^"]*)"/);
				if (titleMatch) {
					displayName = titleMatch[1];
				}
			}

			if (!displayName) {
				displayName = getDisplayName(lang, null);
			}
		}

		tabs.push({ lang, displayName, block });
	}

	// Strip <figcaption class="header"> from expressive-code blocks inside tabs,
	// since the code-tabs header already provides language tab buttons.
	for (const tab of tabs) {
		const block = tab.block;
		if (
			block.tagName === "div" &&
			Array.isArray(block.properties?.className) &&
			block.properties.className.includes("expressive-code")
		) {
			// Find figure.frame
			const figure = (block.children || []).find(
				(c) => c.type === "element" && c.tagName === "figure",
			);
			if (figure) {
				// Remove 'has-title' from frame classes
				if (Array.isArray(figure.properties?.className)) {
					figure.properties.className = figure.properties.className.filter(
						(c) => c !== "has-title" && c !== "is-terminal",
					);
				}
				// Remove figcaption.header
				figure.children = (figure.children || []).filter(
					(c) =>
						!(
							c.type === "element" &&
							c.tagName === "figcaption" &&
							Array.isArray(c.properties?.className) &&
							c.properties.className.includes("header")
						),
				);
			}
		}
	}

	// Determine default active tab
	const defaultLang = (properties?.default || "").toLowerCase();
	let activeIndex = 0;
	if (defaultLang) {
		const foundIndex = tabs.findIndex(
			(t) => t.lang.toLowerCase() === defaultLang,
		);
		if (foundIndex >= 0) activeIndex = foundIndex;
	}

	// Build tab buttons
	const tabButtons = tabs.map((tab, i) =>
		h(
			"button",
			{
				class: `code-tab-btn${i === activeIndex ? " active" : ""}`,
				"data-lang": tab.lang,
				type: "button",
				"aria-label": `Show ${tab.displayName} code`,
			},
			tab.displayName,
		),
	);

	// Build tab panels
	const tabPanels = tabs.map((tab, i) =>
		h(
			"div",
			{
				class: `code-tab-panel${i === activeIndex ? " active" : ""}`,
				"data-lang": tab.lang,
			},
			// Wrap the expressive-code block; apply rounded-top-none to visually
			// connect with the tab header bar above.
			[tab.block],
		),
	);

	return h(
		"div",
		{ class: "code-tabs", "data-default": tabs[activeIndex]?.lang || "" },
		[
			h("div", { class: "code-tabs-header" }, tabButtons),
			h("div", { class: "code-tabs-content" }, tabPanels),
		],
	);
}
