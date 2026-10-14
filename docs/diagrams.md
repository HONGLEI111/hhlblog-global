# Diagrams (Mermaid) system

Every diagram on this site is **rendered to inline SVG at build time**. There is no diagram runtime in the browser.

## How it works

````text
```mermaid code block
   ↓  during astro build
src/plugins/rehype-mermaid-svg.mjs   (rehype stage, HAST)
   ↓  rendered by beautiful-mermaid
<figure class="diagram"><div class="diagram-canvas"><svg …></div></figure>
````

- **Renderer**: `beautiful-mermaid` (pure TS, no DOM dependency, synchronous). It supports only a subset of Mermaid syntax — see "Limitations" below.
- **Plugin**: `src/plugins/rehype-mermaid-svg.mjs`, first in `markdown.rehypePlugins` in `astro.config.mjs`. It replaces the element during the rehype stage, so astro-expressive-code does **not** wrap the diagram in a code block.
- **Colours**: the plugin hard-codes no colours; it hands `var(--diagram-*)` references to the renderer. The real values live in `src/styles/variables.styl`, one set for light and one for dark; the styling lives in the `figure.diagram` section of `src/styles/markdown.css`. Because the colours are CSS variables, **switching theme or hue does not require re-rendering any diagram**.

## Why not the official mermaid package

The site previously used `mermaid` with client-side rendering. The cost:

- every page containing a diagram downloaded roughly 587KB of runtime, and flashed raw source before rendering;
- the official themes only accept the two strings `theme: 'default' | 'dark'`, cannot see the site's `--hue`, and so fell out of step with the rest of the palette;
- getting closer to the theme meant fighting Mermaid's inline styles with `themeCSS` plus `!important`.

`beautiful-mermaid` accepts CSS variables natively, so all of that disappears — and it removes the runtime dependency entirely: rendering happens at build time, so diagrams are visible even with JavaScript disabled.

## Limitations (read before writing a diagram)

`beautiful-mermaid` is a **subset implementation** of Mermaid syntax. These constructs break:

| Construct | Consequence |
| --- | --- |
| HTML inside a label (`<br/>`, `<b>`, …) | **Node silently dropped** — no error, the whole node disappears |
| `subgraph` grouping | Duplicated group titles, every group shown under the first group's name, nodes possibly clipped |
| `pie` charts | Unsupported; throws at build time |
| `classDef` / `:::` / `style X fill:` | Unsupported; a syntax-class failure logs a warning, but the colour is not applied |

**Supported diagram types**: `graph` / `flowchart`, `stateDiagram-v2`, `sequenceDiagram`, `classDiagram`, `erDiagram`, `xychart-beta`.

### Conventions that follow from this

1. **Keep labels to a single line of plain text** — no `<br/>`, no `<b>`. To express hierarchy, fold the level into the label: `A["Kernel memory · page cache"]`.
2. **Do not use `subgraph`.** Put the grouping information into the node labels instead.
3. **Do not use `classDef` / `style fill:` for semantic colour.** The renderer does not take those colours over, and they cannot adapt to dark mode.
4. **Use `xychart-beta` instead of a pie chart**:

   ```mermaid
   xychart-beta horizontal
       title "Character frequency"
       x-axis [A, B, R, C, D]
       y-axis "Occurrences" 0 --> 5
       bar [5, 2, 2, 1, 1]
   ```

5. In a `quadrantChart`, any label containing spaces or non-ASCII characters **must be quoted**, or you get a lexical error — this applies to axis labels, `quadrant-1..4`, and data-point names alike.

## Failure behaviour

When a single diagram fails to render, the plugin prints

```text
[mermaid] could not render diagram (<source file path>): <reason>
```

and **keeps the original code block**. The build still succeeds. Therefore:

- a green build does **not** mean every diagram rendered — watch for that warning line;
- when you see it, check the "Limitations" table above first.

To verify that every diagram rendered, compare the counts:

```bash
npx astro build
# The number of rendered diagrams should equal the number of ```mermaid blocks in source
grep -ro 'figure class="diagram"' dist --include=*.html | wc -l
grep -ro '```mermaid' src/content | wc -l
```

## Automated checks

`scripts/verify-optimizations.mjs` carries the diagram assertions, alongside the
rest of the payload and PWA checks. It runs in CI (the `Responsive Smoke Test`
workflow) against a preview server, and locally as:

```bash
pnpm build && pnpm preview      # in one terminal
pnpm check:optimizations http://127.0.0.1:4321
```

The diagram-specific assertions are:

- diagram pages request the mermaid runtime **not at all**;
- diagrams are present in the HTML as **inline SVG**;
- no client-render target (`pre.mermaid`) is left behind;
- diagrams trigger no Google Fonts request (the renderer injects an `@import` by default; the plugin strips it).
