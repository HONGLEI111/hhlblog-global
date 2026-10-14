/**
 * rehype plugin: render `mermaid` fenced code blocks to inline SVG at build time.
 *
 * Runs at the HAST stage, so the diagrams are real `<svg>` in the built HTML —
 * no client-side runtime, nothing to hydrate, and the raw diagram source is
 * never shipped to the reader.
 *
 * Rendering is done by `beautiful-mermaid`, which is given `var(--…)`
 * references instead of hex colours. The SVG therefore carries no baked
 * palette: light/dark and the site hue are resolved by the stylesheet in
 * `src/styles/markdown.css`, so switching theme needs no re-render.
 */
import { renderMermaidSVG } from "beautiful-mermaid";
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import { visit } from "unist-util-visit";

/**
 * A quote-free stack. `beautiful-mermaid` interpolates this into the SVG it
 * emits, and a quoted family (e.g. `'Roboto'`) produces invalid CSS there.
 */
const FONT_STACK =
	"Roboto, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif";

/** Colour roles mapped to the stylesheet's `--diagram-*` tokens. */
const COLORS = {
	bg: "var(--diagram-bg)",
	fg: "var(--diagram-ink)",
	line: "var(--diagram-line)",
	accent: "var(--diagram-accent)",
	muted: "var(--diagram-muted)",
	surface: "var(--diagram-surface)",
	border: "var(--diagram-border)",
};

/**
 * Drop the Google Fonts requests `beautiful-mermaid` always emits (there is no
 * option to disable them). The site self-hosts Roboto, and the SVG inherits
 * typography from the surrounding stylesheet, so these would only add a
 * third-party network request.
 */
function stripExternalFonts(svg) {
	return svg
		.replace(
			/@import\s+url\(['"]?https:\/\/fonts\.googleapis\.com[^)]*\)\s*;?/g,
			"",
		)
		.replace(
			/text\s*\{\s*font-family:[^}]*\}/g,
			"text { font-family: inherit; }",
		);
}

export function rehypeMermaidSvg() {
	return (tree, file) => {
		visit(tree, "element", (node, index, parent) => {
			if (index === undefined || !parent) return;
			if (node.tagName !== "pre") return;

			const code = node.children.find(
				(child) => child.type === "element" && child.tagName === "code",
			);
			if (!code) return;

			const classes = code.properties?.className;
			const isMermaid =
				Array.isArray(classes) && classes.includes("language-mermaid");
			if (!isMermaid) return;

			const source = code.children
				.filter((child) => child.type === "text")
				.map((child) => child.value)
				.join("");
			if (!source.trim()) return;

			let svg;
			try {
				svg = stripExternalFonts(
					renderMermaidSVG(source, {
						...COLORS,
						font: FONT_STACK,
						transparent: true,
					}),
				);
			} catch (error) {
				const where = file?.path ? ` (${file.path})` : "";
				console.warn(
					`[mermaid] could not render diagram${where}: ${error instanceof Error ? error.message : String(error)}`,
				);
				// Leave the original code block in place so the build still
				// succeeds and the problem is visible in the output.
				return;
			}

			const svgNode = fromHtmlIsomorphic(svg, { fragment: true });
			parent.children[index] = {
				type: "element",
				tagName: "figure",
				properties: { className: ["diagram"] },
				children: [
					{
						type: "element",
						tagName: "div",
						properties: { className: ["diagram-canvas"] },
						children: svgNode.children,
					},
				],
			};
		});
	};
}
