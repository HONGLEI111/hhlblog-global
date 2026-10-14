---
title: A Deep Dive into Optimizing Blog Performance and Cross-Device Experience
published: 2026-08-19
description: 'A record of a comprehensive performance and cross-device experience optimization for this site: starting from audit data, fixing three hidden bugs, reducing first-screen JS from about 700KB to about 110KB, and building a set of automated validation tools.'
image: ''
tags: [Performance Optimization, Astro, Svelte, Engineering Practices, Responsive Design]
category: Web
draft: false
---
## Introduction

Recently I ran a "health check" on this site: a complete audit across three dimensions—build artifacts, runtime behavior, and multi-device adaptation—followed by prioritized optimizations. In the end, I reduced **per-page first-screen JS from about 700KB to about 110KB**, fixed three hidden bugs (one of which was an infinite loop in the search feature), and also filled in PWA, SEO, and browser fallback solutions along the way.

This article documents the whole process: what the audit found, which pitfalls I hit, and what lessons were distilled in the end. All data in this article comes from this site's real build artifacts and automated tests, and privacy-related configuration (analytics project ID, proxy service address, etc.) has been redacted.

## 1. Audit: Quantify First, Then Act

The first step in optimization is not changing code, but getting trustworthy data. I used three rulers:

1. **Build artifact analysis**: directly unpack the dist directory, sort JS/CSS/fonts/images by size, and list the resources actually referenced by each page
2. **Runtime observation**: use Playwright to load pages in a real browser and record network requests, console errors, and page exceptions
3. **Multi-breakpoint walkthrough**: check horizontal overflow and layout behavior at nine widths from 320 to 1920

The audit results were shocking—the most serious issue was this table:

| Resource | Size | Load timing | Problem |
| --- | --- | --- | --- |
| Mermaid diagram core | About 587KB | **Force-loaded on every page** | The homepage and articles without diagrams pay the cost for nothing |
| PhotoSwipe lightbox | About 46KB | Loaded on every page | Only needed when an image is opened |
| Search index runtime | About 250KB | Loaded on every page | Should be on demand |
| Theme CSS | About 251KB | Loaded on every page | Risk of duplicate inclusion |
| Total JS per page | **About 700KB** | — | Poor experience on mobile 4G |

> The table above reflects the situation at the time of the audit. The Mermaid item later went further: after switching to build-time rendering into inline SVG, the diagram runtime **no longer enters the browser at all**, see [Diagram System Notes](https://github.com/HONGLEI111/HHLBlog/blob/main/docs/diagrams.md).

There were also two functional findings:

- **Search fails under some deployment pipelines**: the build command did not include the search index generation step, and the index loader had logic issues
- **Small-screen overflow**: the welcome notification extends beyond the screen on devices ≤344px wide

## 2. Three Hidden Bugs Worth Recording

### Bug 1: One glob quietly changed the entire bundling behavior

During the audit I found a strange phenomenon: nowhere in the project imported the theme style files, yet they were present in the build artifacts. After a long investigation, the culprit was a line of image-loading code:

```ts
// 优化前：把整个 src 目录都变成了模块图的一部分
const files = import.meta.glob("../../**", { import: "default" });
```

The intent of this line was to dynamically import images, but `../../**` pulled **all files** under `src`—including all CSS and Stylus—into the dependency graph. The reason the theme styles "mysteriously" appeared in the artifacts was entirely due to this side effect.

The fix was to narrow the glob to the actual image directory and change the styles to explicit imports: dependencies should be written clearly, not rely on coincidence.

### Bug 2: A self-invalidating infinite loop in a Svelte effect

The search component originally used `$effect` to implement "search as you type," but at runtime it spewed errors frantically (`effect_update_depth_exceeded`). The reason was that the `search()` function called inside the effect read state that it itself wrote:

```ts
$effect(() => {
  if (initialized && keyword) search(keyword, true);
});

async function search(keyword) {
  // ...
  result = searchResults;          // 写入新数组
  showPanel(result.length > 0);    // 又读取 result.length
}
```

Each search replaced `result` with a **new array reference**, and because the effect depended on `result`, it triggered its own re-execution—an infinite loop. The fix was to change search to be event-driven (the `oninput` handler calls it directly), and to rerun pending queries once the index was ready.

**Lesson**: If a function called inside `$effect` reads and writes the same reactive state, stop first and think clearly about the dependency boundaries; interaction-triggered logic is often more straightforward with event handlers.

### Bug 3: Module-level import() is "fake lazy loading"

The first time I "optimized" PhotoSwipe, I changed the static import to a module-level dynamic import:

```ts
let lightboxModule = import("photoswipe/lightbox"); // 看起来懒，其实立即发起请求
```

The verification script caught it immediately: the homepage still requested PhotoSwipe. The reason is that **`import()` initiates the network request the moment it is called**, regardless of whether it is awaited. True lazy loading must put `import()` inside the callback for "when the user actually needs it"—the final solution was: load and initialize the lightbox only when an article image is clicked for the first time.

**Lesson**: Lazy loading must be verified all the way down to the network panel; "changing to a dynamic import" does not equal "loading on demand."

## 3. Optimization Checklist

Implemented in three batches according to benefit and risk:

**P0 (largest benefit, low risk)**

- Change Mermaid to "load only if the page contains diagrams," directly saving about 587KB per page
- Change PhotoSwipe to "load only when an image is clicked"
- Fix notification overflow and viewport configuration
- Add search index generation to the build command, and make the index load only on the first search interaction
- Add a `@supports` static fallback for theme colors + explicitly declare browser targets

**P1 (mobile experience)**

- Change fonts to bundle only the latin subset (Chinese is left to the system font stack)
- Convert cover images uniformly to webp, delete 539KB of unreferenced dead assets, compress favicon from 74KB to 1.7KB
- Change the table of contents at 1280–1535 resolution to a collapsible drawer (previously it was simply invisible); add a mobile table-of-contents drawer and a back-to-top button
- Keep floating buttons/panels clear of the iPhone safe area, and switch heights to dvh to accommodate address-bar resizing
- Add `prefers-reduced-motion` support and tighten global transition animations
- Add SEO and sharing metadata such as og:image / theme-color / apple-touch-icon

**P2 (enhancements)**

- PWA: manifest + Service Worker (cache-first for static assets, network-first for HTML), readable on weak networks
- Downgrade the AI assistant component to idle hydration so it does not block the first screen
- Add Playwright responsive smoke tests to CI, automatically run on PRs

## 4. Results Comparison

| Metric | Before optimization | After optimization |
| --- | --- | --- |
| First-screen JS per page | About 700KB (about 200KB gzip) | **About 110KB (about 45KB gzip)** |
| Mermaid (587KB) | Force-loaded on every page | Loaded on demand only on pages containing diagrams; now further changed to build-time inline SVG, with no browser-side loading at all |
| PhotoSwipe (46KB) | Loaded on every page | Loaded only on first image click |
| Search index (250KB) | Loaded on every page and could be missing | Loaded only on first search, always generated at build time |
| Homepage cover images | 4 eager JPGs | 1 eager + webp |
| Fonts | All language subsets | latin subset |
| Search feature | Infinite loop bug | Working normally, 4 results measured in practice |

All changes were only considered done after passing three layers of verification:

- **Type checking**: 0 errors
- **28 runtime verifications**: whether lazy loading takes effect, the full search flow, font subsets, PWA registration, SEO meta asserted item by item—all passed
- **45 responsive assertions**: nine widths × five routes, no horizontal overflow, no page errors—all passed

## 5. Reusable Lessons

1. **Quantify before optimizing**: unpacking build artifacts + capturing packets in the network panel is more accurate than any guess
2. **Three essentials of lazy loading**: put `import()` inside event callbacks, confirm chunk splitting in the artifacts, and confirm via runtime packet capture that it is not being prefetched
3. **Use effects cautiously**: do not read data you wrote yourself inside a reactive effect; prefer event handlers for interaction logic
4. **Dependencies must be explicit**: hidden dependencies introduced by glob will backfire sooner or later; after switching to explicit imports, the entire build becomes predictable
5. **Compatibility needs a floor**: clearly declare target browsers, then provide fallbacks for new features, so both ends feel secure
6. **Turn verification into scripts**: finishing the optimization is not the endpoint; assertions in CI are the guardrail against regressions

All changes and verification scripts from this optimization have been open-sourced in the repository; if you are interested, you can browse the commit history. If you also maintain an Astro blog, I hope this practical record helps you avoid a few pitfalls.