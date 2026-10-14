# HHLBlog

A personal blog built with [Astro](https://astro.build) + [Svelte 5](https://svelte.dev) + [Tailwind CSS](https://tailwindcss.com), forked from the [Fuwari](https://github.com/saicaca/fuwari) theme.

> 📖 [中文文档](README.zh_CN.md)

## ✨ Features

- **Astro 5** static site generation with **Svelte 5** interactive islands
- **Dark / Light / Auto** theme modes with a visitor-adjustable theme hue
- **Pagefind** full-text search with an inline navbar widget
- **i18n** — interface strings in 10 languages (`zh_CN` default, per-post `lang` override)
- **SPA-like navigation** via Swup page transitions
- **Markdown extended syntax** — KaTeX math, Mermaid diagrams, Expressive Code highlighting, admonitions, GitHub repository cards
- **Responsive layout** — desktop sidebar + mobile floating panels
- **RSS feed**, sitemap, SEO meta tags, PhotoSwipe image viewer
- **AI chat widget** backed by a Cloudflare Worker proxy

## 🚀 Quick Start

```bash
# 1. Install dependencies (Node.js >= 20, pnpm >= 9)
pnpm install

# 2. Customize your site in src/config.ts

# 3. Start the dev server
pnpm dev          # http://localhost:4321

# 4. Build for production (builds to ./dist and generates the Pagefind index)
pnpm build
```

## 📁 Project Structure

```
.
├── public/                   # Static assets (favicons, images)
├── scripts/                  # Content scaffolding scripts
├── src/
│   ├── assets/               # Images referenced from source code
│   ├── components/
│   │   ├── blog/             # Blog collection components
│   │   ├── common/           # Shared UI primitives (Image)
│   │   ├── controls/         # Interactive controls (search, theme switch, pagination, back-to-top)
│   │   ├── features/         # Feature components (AI chat widget)
│   │   ├── landing/          # Homepage landing sections
│   │   ├── layout/           # Structural layout components (Navbar, Footer, PostCard, ...)
│   │   ├── misc/             # Markdown renderer, License, image wrapper
│   │   ├── read/             # Read collection components
│   │   ├── technology/       # Technology collection components
│   │   ├── ui/               # Design system primitives
│   │   └── widget/           # Sidebar widgets
│   ├── config.ts             # Site configuration (title, theme, banner, profile, ...)
│   ├── content/              # Markdown content collections
│   ├── i18n/                 # Internationalization (10 languages)
│   ├── layouts/              # Page layouts
│   ├── pages/                # Route pages
│   ├── plugins/              # Remark/Rehype plugins
│   ├── styles/               # CSS / Stylus stylesheets
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utility functions
└── workers/
    └── chat-proxy/           # Cloudflare Worker — AI chat proxy
```

## 🛠️ Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Astro 5 |
| UI runtime | Svelte 5 |
| Styling | Tailwind CSS 3, Stylus |
| Content | Markdown |
| Search | Pagefind |
| Icons | astro-icon (Iconify) |
| Math | KaTeX, remark-math |
| Diagrams | Mermaid syntax, beautiful-mermaid (inline SVG at build time) |
| Code blocks | Expressive Code |
| Page transitions | Swup |
| Images | sharp, PhotoSwipe |
| Lint / format | Biome |
| Chat backend | Cloudflare Workers |

## 📝 Content Collections

| Collection | Path | Purpose |
| --- | --- | --- |
| `posts` | `src/content/posts/` | Blog articles |
| `technology` | `src/content/technology/` | Technical tutorials & notes |
| `read` | `src/content/read/` | Book reviews & reading notes |
| `spec` | `src/content/spec/` | Special pages (e.g. About) |

Create new content with the scaffolding scripts:

```bash
pnpm new-post <filename>         # New blog post
pnpm new-technology <filename>   # New technology article
pnpm new-read <filename>         # New reading note
```

Post frontmatter:

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
lang: zh_CN              # optional; defaults to the site language
---
```

## 🌍 i18n

Interface strings ship in 10 languages: `zh_CN`, `zh_TW`, `en`, `ja`, `ko`, `es`, `vi`, `id`, `th`, `tr`.

- Set the site-wide language in `src/config.ts` (`siteConfig.lang`).
- Override per post via the `lang` frontmatter field.

## 🤖 Chat Widget (optional)

The AI chat widget in the sidebar is served by a Cloudflare Worker proxy in `workers/chat-proxy/`, which forwards requests to a DeepSeek-compatible API and keeps your API key off the client.

```bash
cd workers/chat-proxy
pnpm install
wrangler secret put DEEPSEEK_API_KEY
wrangler deploy
```

The site itself builds fine without the worker; the widget simply has no backend until it is deployed.

## ⚡ Commands

All commands are run from the project root:

| Command | Action |
| --- | --- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start the dev server at `localhost:4321` |
| `pnpm build` | Build the production site + Pagefind index into `./dist/` |
| `pnpm preview` | Preview the production build locally |
| `pnpm check` | Run Astro diagnostics |
| `pnpm new-post <filename>` | Create a new blog post |
| `pnpm new-technology <filename>` | Create a new technology article |
| `pnpm new-read <filename>` | Create a new reading note |
| `pnpm format` | Format the codebase with Biome |
| `pnpm lint` | Lint with Biome |

## ✏️ Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

This project is licensed under the [MIT License](LICENSE).

The theme is based on [Fuwari](https://github.com/saicaca/fuwari) by [saicaca](https://github.com/saicaca).
