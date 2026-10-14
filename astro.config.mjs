import fs from "node:fs";
import path from "node:path";
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import swup from "@swup/astro";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components"; /* Render the custom directive content */
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive"; /* Handle directives */
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";
import { expressiveCodeConfig } from "./src/config.ts";
import { pluginLanguageBadge } from "./src/plugins/expressive-code/language-badge.ts";
import { AdmonitionComponent } from "./src/plugins/rehype-component-admonition.mjs";
import { GithubCardComponent } from "./src/plugins/rehype-component-github-card.mjs";
import { parseDirectiveNode } from "./src/plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "./src/plugins/remark-excerpt.js";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";
import { pluginCustomCopyButton } from "./src/plugins/expressive-code/custom-copy-button.js";
import { CodeTabsComponent } from "./src/plugins/rehype-component-code-tabs.mjs";
import { rehypeMermaidSvg } from "./src/plugins/rehype-mermaid-svg.mjs";

/** Recursively list files under a directory. */
function walkFiles(dir) {
	const out = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walkFiles(full));
		else out.push(full);
	}
	return out;
}

/**
 * Build a pathname -> lastmod (ISO) map from the content collections, so the
 * sitemap can emit a per-page <lastmod>. Uses the frontmatter `updated` date
 * when present, falling back to `published`.
 */
function buildLastmodMap() {
	const map = new Map();
	const collections = [
		{ dir: "src/content/posts", prefix: "/posts/" },
		{ dir: "src/content/technology", prefix: "/technology/" },
		{ dir: "src/content/read", prefix: "/read/" },
	];
	for (const { dir, prefix } of collections) {
		if (!fs.existsSync(dir)) continue;
		for (const file of walkFiles(dir)) {
			if (!file.endsWith(".md")) continue;
			const rel = path.relative(dir, file).replace(/\\/g, "/");
			const slug = rel.replace(/\.md$/, "").replace(/\/index$/, "");
			const raw = fs.readFileSync(file, "utf8");
			const updated = raw.match(/^updated:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1];
			const published = raw.match(/^published:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1];
			const dateStr = updated || published;
			if (!dateStr) continue;
			try {
				map.set(`${prefix}${slug}/`, new Date(dateStr).toISOString());
			} catch {
				// ignore unparseable dates
			}
		}
	}
	return map;
}

let lastmodMap;
function getLastmodMap() {
	if (!lastmodMap) lastmodMap = buildLastmodMap();
	return lastmodMap;
}

// https://astro.build/config
export default defineConfig({
	site: "https://www.hehonglei.cn",
	base: "/",
	trailingSlash: "always",
	build: {
		inlineStylesheets: "always",
	},
	image: {
		remotePatterns: [
			{ protocol: "https", hostname: "**.hehonglei.cn" },
			{ protocol: "https", hostname: "**.pages.dev" },
		],
	},
	integrations: [
		tailwind({
			nesting: true,
		}),
		swup({
			theme: false,
			animationClass: "transition-swup-", // see https://swup.js.org/options/#animationselector
			// the default value `transition-` cause transition delay
			// when the Tailwind class `transition-all` is used
			containers: ["main", "#toc", "#sidebar"],
			smoothScrolling: true,
			cache: true,
			preload: true,
			accessibility: true,
			updateHead: true,
			updateBodyClass: false,
			globalInstance: true,
		}),
		icon({
			include: {
				"material-symbols": ["*"],
				"fa6-brands": ["*"],
				"fa6-regular": ["*"],
				"fa6-solid": ["*"],
				"tabler": ["*"],
				"flat-color-icons": ["*"],
			},
		}),
		expressiveCode({
			themes: [expressiveCodeConfig.theme],
			plugins: [
				pluginCollapsibleSections(),
				pluginLineNumbers(),
				pluginLanguageBadge(),
				pluginCustomCopyButton()
			],
			defaultProps: {
				wrap: true,
				overridesByLang: {
					'shellsession': {
						showLineNumbers: false,
					},
				},
			},
			styleOverrides: {
				codeBackground: "var(--codeblock-bg)",
				borderRadius: "0.75rem",
				borderColor: "none",
				codeFontSize: "0.875rem",
				codeFontFamily: "'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
				codeLineHeight: "1.5rem",
				frames: {
					editorBackground: "var(--codeblock-bg)",
					terminalBackground: "var(--codeblock-bg)",
					terminalTitlebarBackground: "var(--codeblock-topbar-bg)",
					editorTabBarBackground: "var(--codeblock-topbar-bg)",
					editorActiveTabBackground: "none",
					editorActiveTabIndicatorBottomColor: "var(--primary)",
					editorActiveTabIndicatorTopColor: "none",
					editorTabBarBorderBottomColor: "var(--codeblock-topbar-bg)",
					terminalTitlebarBorderBottomColor: "none"
				},
				textMarkers: {
					delHue: 0,
					insHue: 180,
					markHue: 250
				}
			},
			frames: {
				showCopyToClipboardButton: false,
			}
		}),
        svelte(),
		sitemap({
			// Exclude paginated listing pages (e.g. /posts/2/, /3/); the first
			// page is the canonical entry for the collection.
			filter: (page) => !/\/\d+\/$/.test(new URL(page).pathname),
			serialize: (item) => {
				const lastmod = getLastmodMap().get(new URL(item.url).pathname);
				return lastmod ? { ...item, lastmod } : item;
			},
		}),
	],
	markdown: {
		remarkPlugins: [
			remarkMath,
			remarkReadingTime,
			remarkExcerpt,
			remarkGithubAdmonitionsToDirectives,
			remarkDirective,
			remarkSectionize,
			parseDirectiveNode,
		],
		rehypePlugins: [
			rehypeMermaidSvg,
			rehypeKatex,
			rehypeSlug,
			[
				rehypeComponents,
				{
					components: {
						github: GithubCardComponent,
						note: (x, y) => AdmonitionComponent(x, y, "note"),
						tip: (x, y) => AdmonitionComponent(x, y, "tip"),
						important: (x, y) => AdmonitionComponent(x, y, "important"),
						caution: (x, y) => AdmonitionComponent(x, y, "caution"),
						warning: (x, y) => AdmonitionComponent(x, y, "warning"),
						"code-tabs": CodeTabsComponent,
					},
				},
			],
			[
				rehypeAutolinkHeadings,
				{
					behavior: "append",
					properties: {
						className: ["anchor"],
					},
					content: {
						type: "element",
						tagName: "span",
						properties: {
							className: ["anchor-icon"],
							"data-pagefind-ignore": true,
						},
						children: [
							{
								type: "text",
								value: "#",
							},
						],
					},
				},
			],
		],
	},
	vite: {
		resolve: {
			alias: {
				"~": new URL("./src", import.meta.url).pathname,
			},
		},
		build: {
			// Explicit browser floor, aligned with the CSS feature floor (oklch colors).
			target: ["chrome111", "edge111", "firefox113", "safari15.4", "ios15.4"],
			rollupOptions: {
				onwarn(warning, warn) {
					// temporarily suppress this warning
					if (
						warning.message.includes("is dynamically imported by") &&
						warning.message.includes("but also statically imported by")
					) {
						return;
					}
					warn(warning);
				},
			},
		},
	},
});
