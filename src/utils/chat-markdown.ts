// Assistant replies are rendered as Markdown. `markdown-it` runs with HTML
// disabled (raw HTML in a model reply is never markup we want), and the result
// goes through `sanitize-html` as a second layer, because a model reply is
// untrusted output and a single missed path would be an XSS on the blog.

import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const md = new MarkdownIt({
	html: false, // escape any literal HTML the model emits
	linkify: true, // bare URLs become links
	breaks: false,
	typographer: false,
});

// highlight.js is not a dependency, so fenced code is rendered as plain
// `<pre><code>` inside the blog's existing code styling.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: [
		"p",
		"br",
		"hr",
		"strong",
		"em",
		"del",
		"s",
		"code",
		"pre",
		"blockquote",
		"ul",
		"ol",
		"li",
		"a",
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		"table",
		"thead",
		"tbody",
		"tr",
		"th",
		"td",
		"span",
	],
	// Deliberately no `target`/`rel`: sanitize-html strips attributes outside
	// this list, so external links are opened by a delegated click handler in
	// the widget instead (which also keeps `rel="noopener"` on them).
	allowedAttributes: {
		a: ["href", "title"],
		code: ["class"],
		span: ["class"],
	},
	// Only real link schemes: `javascript:` and `data:` URLs must not survive.
	allowedSchemes: ["http", "https", "mailto"],
	allowedSchemesAppliedToAttributes: ["href"],
	allowProtocolRelative: false,
};

/** Render one assistant message to sanitized HTML. */
export function renderMarkdown(source: string): string {
	return sanitizeHtml(md.render(source), SANITIZE_OPTIONS);
}

/** Strip Markdown syntax down to readable plain text (used for copy actions). */
export function markdownToPlainText(source: string): string {
	return source
		.replace(/```[\s\S]*?```/g, (block) => block.replace(/```[^\n]*\n?/g, ""))
		.replace(/^#{1,6}\s+/gm, "")
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.trim();
}
