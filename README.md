# HHLBlog

A fast, content-first blog built with [Astro 5](https://astro.build) + [Svelte 5](https://svelte.dev) + [Tailwind CSS](https://tailwindcss.com), forked from the [Fuwari](https://github.com/saicaca/fuwari) theme.

The site is **fully static** and **English-only**: `pnpm build` emits plain HTML/CSS/JS into `dist/` with a [Pagefind](https://pagefind.app) search index, so it can be hosted on any static host.

## ✨ Features

- **Astro 5** static output with **Svelte 5** interactive islands
- **Dark / light / auto** theme modes with a visitor-adjustable theme hue
- **Pagefind** full-text search with an inline navbar widget
- **SPA-like navigation** via Swup page transitions
- **Markdown extras** — KaTeX math, Mermaid diagrams rendered to inline SVG at build time, Expressive Code highlighting, admonitions, code tabs, GitHub repository cards
- **Responsive layout** — desktop sidebar plus mobile floating panels
- **RSS feed**, sitemap with per-page `lastmod`, canonical URLs, Open Graph images, PhotoSwipe image viewer
- **Optional AI chat widget** backed by a Cloudflare Worker proxy (see below)
- **Unit tests** for the content generators and the chat context builder

## 🚀 Quick Start

```bash
# Node.js >= 22, pnpm >= 9
pnpm install
pnpm dev          # http://localhost:4321
pnpm build        # static build + Pagefind index into ./dist
pnpm preview      # preview the production build
```

Customize the site in [`src/config.ts`](src/config.ts) — title, description, nav links, profile, banner, favicon. The canonical URL lives in `astro.config.mjs` (`site`).

## 📁 Project Structure

```
.
├── public/                   # Static assets (favicons, og-image, service worker)
├── scripts/                  # Content generators, checks, optional translation tooling
├── src/
│   ├── assets/               # Images imported from source code
│   ├── components/
│   │   ├── blog/             # Blog collection components
│   │   ├── common/           # Shared UI primitives
│   │   ├── controls/         # Search, theme switch, pagination, back-to-top
│   │   ├── features/         # AI chat widget
│   │   ├── landing/          # Homepage sections
│   │   ├── layout/           # Navbar, Footer, PostCard, PostPage, ...
│   │   ├── misc/             # Markdown renderer, License, image wrapper
│   │   ├── read/             # Read collection components
│   │   ├── ui/               # Design system primitives
│   │   └── widget/           # Sidebar widgets
│   ├── config.ts             # Site configuration
│   ├── content/              # Markdown content collections
│   ├── i18n/                 # English interface strings (see "Language" below)
│   ├── layouts/              # Page layouts
│   ├── pages/                # Routes
│   ├── plugins/              # Remark / Rehype plugins
│   ├── styles/               # CSS / Stylus stylesheets
│   └── utils/                # Utilities
└── workers/
    └── chat-proxy/           # Cloudflare Worker — optional AI chat proxy
```

## 🛠️ Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Astro 5 (static output) |
| UI runtime | Svelte 5 |
| Styling | Tailwind CSS 3, Stylus |
| Content | Markdown |
| Search | Pagefind |
| Icons | astro-icon (Iconify) |
| Math | KaTeX, remark-math |
| Diagrams | Mermaid syntax via beautiful-mermaid (inline SVG at build time) |
| Code blocks | Expressive Code |
| Page transitions | Swup |
| Images | sharp, PhotoSwipe |
| Lint / format | Biome |
| Tests | Vitest |
| Chat backend | Cloudflare Workers (optional) |

## 📝 Content Collections

| Collection | Path | Purpose |
| --- | --- | --- |
| `posts` | `src/content/posts/` | Blog articles |
| `technology` | `src/content/technology/` | Technical tutorials and notes |
| `read` | `src/content/read/` | Book reviews and reading notes |
| `spec` | `src/content/spec/` | Special pages (e.g. About) |

Scaffold new content:

```bash
pnpm new-post <filename>         # New blog post
pnpm new-technology <filename>   # New technology article
pnpm new-read <filename>         # New reading note
```

Frontmatter:

```yaml
---
title: My First Post
published: 2024-01-01
updated: 2024-06-01      # optional
description: A short description.
image: ./cover.jpg       # optional
tags: [Foo, Bar]
category: Front-end      # optional
draft: false             # true hides the post from production builds
---
```

Reading-note entries additionally accept `author`, `bookTitle`, `rating` and `cover`.

## 🌐 Language

The site is **English-only by design**. Interface strings live in `src/i18n/languages/en.ts` and are read through `i18n(key)`; `siteConfig.lang` selects the dictionary (`src/i18n/translation.ts` documents how to add another one back).

`scripts/translate-content.mjs` is the one-off tool that produced the English content from Chinese sources. It is **not** wired into the build. It protects code fences, math, HTML and URLs behind placeholders and verifies that none of them are lost:

```bash
DEEPSEEK_API_KEY=sk-... node scripts/translate-content.mjs --collection posts --concurrency 4
node scripts/check-translations.mjs   # fails if user-visible text still contains CJK
```

## 🤖 AI Chat Widget (optional)

The chat widget is **disabled unless you point it at a proxy**. It never calls a third-party endpoint on its own.

1. Deploy the proxy in `workers/chat-proxy/`:

   ```bash
   cd workers/chat-proxy
   pnpm install
   wrangler secret put DEEPSEEK_API_KEY
   # Set ALLOWED_ORIGINS to the exact origins allowed to call it, e.g.
   #   ALLOWED_ORIGINS="https://www.example.com"
   wrangler deploy
   ```

2. Point the site at it and rebuild:

   ```bash
   PUBLIC_CHAT_PROXY_URL="https://your-proxy.workers.dev/" pnpm build
   ```

Without `PUBLIC_CHAT_PROXY_URL` the widget is not mounted at all, and the internal guard keeps any stray call from reaching the network. The proxy strips client-supplied system prompts, so it cannot be repurposed as a general-purpose LLM endpoint.

> The query tokenizer in `src/utils/chat-context.ts` is tuned for Chinese
> (no word delimiters, Chinese stopwords). English queries fall back to
> whitespace tokenization; translating the stopword list is a known follow-up.

## ⚡ Commands

All commands run from the project root:

| Command | Action |
| --- | --- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Static build + Pagefind index into `./dist/` |
| `pnpm preview` | Preview the production build |
| `pnpm check` | Astro diagnostics |
| `pnpm type-check` | `tsc --noEmit --isolatedDeclarations` |
| `pnpm test` | Vitest unit tests |
| `pnpm check:responsive` | Playwright responsive smoke test (needs a running server) |
| `pnpm check:nav` | Playwright navigation smoke test (needs a running server) |
| `pnpm new-post` / `new-technology` / `new-read` | Scaffold content |
| `pnpm format` / `pnpm lint` | Biome (these **write** files) |
| `pnpm clean` | Remove `dist/`, `.astro/` and temp caches |

`pnpm type-check` currently reports pre-existing `--isolatedDeclarations`
errors (TS9007/TS9010/TS9013); CI does not run it.

## ✏️ Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

Two licences apply, and they cover different things:

| Scope | Licence |
| --- | --- |
| **Source code** | [MIT](LICENSE) |
| **Post content** (`src/content/**`) | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |

The MIT notice in [LICENSE](LICENSE) covers the upstream theme copyright
(`Copyright (c) 2024 saicaca`) and this fork's modifications. Every rendered
post is stamped CC BY-NC-SA 4.0 by `src/components/misc/License.astro`, which is
why commercial reuse of the *content* is not permitted even though the *code*
is.

The theme is based on [Fuwari](https://github.com/saicaca/fuwari) by [saicaca](https://github.com/saicaca).
