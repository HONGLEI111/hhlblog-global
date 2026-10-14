---
title: Browser Support and Cross-Device Compatibility Report
published: 2026-08-19
description: A summary of this site's browser compatibility range, PC/tablet/mobile adaptation strategy, performance characteristics, accessibility support, and the corresponding automated verification methods.
image: ''
tags: [browser compatibility, responsive design, performance optimization, Astro, this site]
category: Website
draft: false
---
## Introduction

"What browsers does this site support?" "How does it feel on mobile?" — these are two questions every frontend project has to answer sooner or later. This article compiles the current support status of this site (a static blog built on Astro 5 + Tailwind CSS + Svelte 5) into a public report — both as an explanation for visitors and as the basis for my own compatibility decisions.

## 1. Browser Support Matrix

This site's definition of "full support" is: **layout, colors, interactions, and animations all work correctly**. The support matrix based on this standard is as follows:

| Platform | Minimum Version | Notes |
| --- | --- | --- |
| Chrome / Edge (desktop + Android) | 111+ | Full support |
| Firefox | 113+ | Full support |
| Safari (macOS + iOS) | 15.4+ | Full support |
| Other Chromium-based browsers (Opera, Arc, WeChat/QQ built-in browsers, etc.) | Engine ≥111 | Full support |
| Older browsers (2019–2021) | — | Page structure fully usable, theme colors fall back to static palette |
| IE 11 and earlier | — | Not supported |

In other words, **evergreen browsers released after 2022 are all within the full support range**, covering the vast majority of real users.

## 2. How the Support Floor Was Determined

This floor wasn't decided arbitrarily — it's determined jointly by the build configuration and CSS features:

**JS layer**: The build explicitly declares `build.target = ["chrome111", "edge111", "firefox113", "safari15.4", "ios15.4"]`, and the output syntax (ES2020 level) can be parsed by older browsers too. What actually sets the floor is CSS.

**CSS layer**: All theme colors on this site use the `oklch()` color space (combined with an adjustable hue variable `--hue` to enable theme color switching), and `oklch()` only gained support starting from Chrome 111 / Firefox 113 / Safari 15.4. To handle this, we added a layer of defense:

```css
@supports not (color: oklch(0.56 0.14 250)) {
  :root { --primary: #5a55c9; /* 静态回退配色 */ }
}
```

Browsers that don't support `oklch()` will fall back entirely to this static fallback palette. The page remains fully readable — it just loses the ability to dynamically switch colors. This is exactly the progressive enhancement approach.

The remaining new features also follow the principle of "must be usable, decorative elements can degrade":

| Feature | Purpose | Degradation Strategy |
| --- | --- | --- |
| `:has()` | Hide trailing empty line numbers in code blocks | Purely decorative, no impact if it fails |
| `field-sizing: content` | Chat input auto-height | Falls back to JS manual height calculation |
| `mask-image` | Table of contents fade-out mask | Also provides `-webkit-`-prefixed version |
| `dvh` units | Mobile address bar resize adaptation | Write `100vh` first, then `100dvh`; older browsers use the former |

## 3. Multi-Device Adaptation Strategy

The site uses Tailwind's four breakpoints (`sm: 640 / md: 768 / lg: 1024 / 2xl: 1536`), with differentiated layouts for different devices:

| Device | Adaptation Highlights |
| --- | --- |
| **PC (≥1024px)** | Three-column layout: left side for profile/categories/tags, center for content, right side for article table of contents (sidebar is persistent at ≥1536px; between 1280–1535 it becomes a collapsible drawer instead of "disappearing") |
| **Tablet (768–1023px)** | Sidebar stacks into a single column, cards switch to a two-column grid, cover images adapt; top navigation collapses into a hamburger menu below lg |
| **Mobile (<768px)** | Hamburger menu + slide-out panel; **collapsible table of contents drawer** at the top of articles; back-to-top button available on all devices; bottom floating buttons avoid the iPhone bottom safe area (`env(safe-area-inset-*)`) |

There are a few easily overlooked details on mobile: the welcome notification uses `min(400px, calc(100vw - 2rem))` for its width to prevent overflow on small screens; the viewport explicitly declares `initial-scale=1, viewport-fit=cover`; all touch interactions retain `active` state feedback.

## 4. Performance Characteristics

- **Pure static output (SSG)**: 111 pages generated at build time, no server-side runtime
- **First-screen JS is about 110KB (about 45KB gzipped)**: PhotoSwipe lightbox and full-text search index are **loaded on demand** — only downloaded when the user actually clicks an image or starts searching. Diagrams (Mermaid) have been rendered as **inline SVG at build time** since 2026, so the browser no longer needs a diagram runtime, meaning it takes up zero first-screen JS (see [Diagram System Documentation](https://github.com/HONGLEI111/HHLBlog/blob/main/docs/diagrams.md))
- **Images**: Local images generate AVIF + WebP dual-format srcset at build time, with `<picture>` selecting based on browser capability (AVIF requires Safari 16.4+; WebP fallback covers this site's declared Safari 15.4 floor). Banners offer eleven tiers from 360–2560, so 2K screens no longer upscale a 1920px source image; homepage card covers generate four tiers (400/560/800/1120) based on the actual 2:1 card display size. The first-screen banner at the 1920px tier is 122KB AVIF (152KB WebP); at a 1440px viewport hitting the 1536 tier it's 94KB
- **Fonts**: Self-hosted and only bundling the latin subset, with `unicode-range` enabling on-demand download by the browser; Chinese fonts are delegated to the system font stack (Windows Microsoft YaHei / macOS PingFang)
- **Offline capability (PWA)**: The Service Worker uses cache-first for static assets and network-first for HTML, so already-read content remains browsable on weak or offline connections

## 5. Accessibility and Experience Details

- **Restrained motion**: All entrance animations, waves, and marquees are automatically disabled under `prefers-reduced-motion: reduce`
- **Dark mode**: Follows the system (`prefers-color-scheme`) or manual toggle, with injection before the first frame to avoid flicker
- **Semantics and focus**: Navigation and buttons all have aria-labels; fully keyboard-operable; focus states are visible
- **Page transitions**: Swup provides fade transitions with synchronized focus management, and has a complete static fallback for environments with JS disabled

## 6. Automated Verification

Support status isn't maintained by "I tried it once" — it's codified into scripts and CI:

- `astro check`: Full TypeScript type checking; only merged with 0 errors
- **45 responsive assertions**: Playwright traverses the homepage, article pages, tech pages, and tools pages at nine widths — 320 / 360 / 390 / 768 / 1024 / 1280 / 1440 / 1536 / 1920 — asserting no horizontal overflow and no runtime errors
- **28 runtime verifications**: Whether lazy loading works, the full search pipeline, font subsets, PWA registration, SEO meta, etc., asserted item by item
- CI automatically builds (including the search index) and runs responsive smoke tests on PRs

If you find any issues on a particular device or browser, feel free to let me know — this matrix will continue to be revised based on feedback.