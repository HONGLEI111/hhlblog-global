# hhlblog-global

A personal blog built with [Astro](https://astro.build) + [Svelte 5](https://svelte.dev) + [Tailwind CSS](https://tailwindcss.com), forked from the [Fuwari](https://github.com/saicaca/fuwari) theme.

> [中文说明](README.zh_CN.md)

## ✨ Features

- **Astro 5** static site generation with **Svelte 5** interactive islands
- **Dark / Light / System** theme modes with dynamic hue
- **Pagefind** full-text search with inline navbar widget + dedicated search page
- **i18n** — 7 languages (zh_CN, en, zh_TW, ja, ko, vi, es), with AI-powered build-time translation
- **SPA-like navigation** via Swup page transitions
- **Markdown** with KaTeX math, Mermaid diagrams, code highlighting (Expressive Code)
- **Responsive** — desktop sidebar + mobile floating panels
- **RSS**, sitemap, SEO meta tags, PhotoSwipe image viewer
- **Chat widget** (AI-powered assistant)

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production (with AI translation)
ANTHROPIC_API_KEY=sk-ant-... pnpm build

# Build without AI translation (uses cached/fallback translations)
pnpm build
```

## 📁 Project Structure

```
src/
├── components/
│   ├── blog/          # Blog collection components
│   ├── common/        # Shared UI primitives
│   ├── controls/      # Interactive controls (search, theme switch)
│   ├── features/      # Feature components (chat, search page)
│   ├── landing/       # Homepage landing sections
│   ├── layout/        # Structural layout components
│   ├── misc/          # Miscellaneous (Markdown, License, Images)
│   ├── read/          # Read collection components
│   ├── technology/    # Technology collection components
│   ├── ui/            # Design system primitives
│   └── widget/        # Sidebar widgets
├── config.ts          # Site configuration
├── content/           # Markdown content collections
├── i18n/              # Internationalization (7 languages)
├── layouts/           # Page layouts
├── pages/             # Route pages
├── plugins/           # Remark/Rehype plugins
├── styles/            # CSS / Stylus stylesheets
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Astro 5.13 |
| UI Runtime | Svelte 5 |
| Styling | Tailwind CSS 3, Stylus |
| Content | Markdown / MDX |
| Search | Pagefind 1.4 |
| Icons | astro-icon (Iconify) |
| Math | KaTeX, remark-math |
| Diagrams | Mermaid |
| Code | Expressive Code |
| Transitions | Swup |
| Images | sharp, PhotoSwipe |
| Lint/Format | Biome |

## 🌍 i18n

The blog supports 7 languages. `zh_CN` and `en` are manually maintained; others (`ja`, `ko`, `zh_TW`, `vi`, `es`) are generated at build time via Anthropic Claude API.

```bash
# Generate translations manually
ANTHROPIC_API_KEY=sk-ant-... pnpm translate
```

See [scripts/translate-i18n.mjs](scripts/translate-i18n.mjs) for details.

## 📝 Content Collections

- **posts** — Blog articles
- **technology** — Technical tutorials & notes
- **read** — Book reviews & reading notes
- **spec** — Special pages (about, friends, guestbook)

Create new content:

```bash
pnpm new-post       # New blog post
pnpm new-technology # New tech article
pnpm new-read       # New reading note
```

## 📄 License

This project is open source under the [MIT License](LICENSE).

The theme is based on [Fuwari](https://github.com/saicaca/fuwari) by [saicaca](https://github.com/saicaca).
