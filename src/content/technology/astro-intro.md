---
title: 'Getting Started with Astro: A Modern Content-First Web Framework'
published: 2026-06-17
description: Learn Astro from scratch — a framework built for content-driven sites, with zero JS by default, islands architecture, and multi-framework support that makes blogs and documentation sites fly.
image: ''
tags: [Astro, SSG, Frontend Frameworks, Frontend Fundamentals]
category: Frontend
draft: false
---
## 1. Introduction

**Astro** is a web framework designed specifically for **content-driven websites**. Its core philosophy is simple: **if most of a page's content doesn't need JavaScript, then JavaScript shouldn't be sent.**

While the React/Vue community races on server-side rendering, streaming, and everything else, Astro took a completely different path:

> Your blog posts, documentation pages, marketing sites—**99% of the content is static**. Why load a full JS runtime for that 99%?

This approach made Astro an instant hit—it won first place in "Frontend Satisfaction" for two consecutive years (2023/2024), and in 2025 became one of the fastest-growing web frameworks on GitHub by stars.

(The blog you're reading right now is built with Astro.)

---

## 2. Islands Architecture: Astro's Killer Feature

### 2.1 The Problem with Traditional SPAs

Traditional React/Vue single-page applications:

 ```
整个页面 = 一个巨大的 JS 应用
├── 导航栏（需要交互）
├── 文章内容（纯静态文字）
├── 侧边栏（纯静态）
├── 评论区（需要交互）
└── 页脚（纯静态）
```

To load this page, the browser has to download **the entire application's JS**, then "hydrate" all components. Even if 80% of the content never changes, you still pay the JS cost for it.

### 2.2 Astro's Answer

 ```
整个页面 = 纯 HTML（默认）
├── 导航栏          → 纯 HTML（零 JS）
├── 文章内容         → 纯 HTML（零 JS）
├── 侧边栏           → 纯 HTML（零 JS）
├── 🏝️ 评论区       → React 组件（按需水合）
└── 🏝️ 点赞按钮     → Vue 组件（按需水合）
```

This is **islands architecture**: pages are static HTML by default, and only the parts that truly need interactivity load JS as "islands." Each island loads and hydrates independently, without interfering with the others.

---

## 3. Creating Your First Astro Project

### 3.1 Initialization

 ```bash
# npm
npm create astro@latest my-site

# pnpm（推荐）
pnpm create astro@latest my-site
```

The initialization wizard:

 ```
✔ How would you like to start?                  → Empty
✔ Do you plan to write TypeScript?              → Yes
✔ How strict should TypeScript be?              → Strict
✔ Install dependencies?                         → Yes
✔ Initialize a new git repository?              → Yes
```

Start the dev server:

 ```bash
cd my-site
pnpm dev
```

Visit `http://localhost:4321`, and your first Astro site is up and running.

### 3.2 Project Structure

 ```
my-site/
├── astro.config.mjs      # Astro 配置文件
├── src/
│   ├── pages/            # 路由页面（文件系统路由）
│   │   ├── index.astro   # 首页 /
│   │   ├── about.astro   # /about
│   │   └── blog/
│   │       └── [slug].astro  # 动态路由 /blog/xxx
│   ├── components/       # 可复用组件
│   ├── content/          # 内容集合（博客文章等）
│   ├── layouts/          # 页面布局
│   └── styles/           # 全局样式
├── public/               # 静态资源（直接复制到构建产物）
└── package.json
```

---

## 4. Astro Component Syntax

### 4.1 Basic Structure

A `.astro` file consists of two parts: the **component script** (runs on the server) and the **template** (outputs HTML).

 ```astro
---
// 组件脚本（fence）：在服务端/构建时运行
// 可以 import 其他组件、调用 API、查数据库
const name = "Astro";
const items = ["SSG", "岛屿架构", "多框架"];
---

<!-- 模板部分：直接输出 HTML -->
<h1>你好，{name}！</h1>    <!-- { } 内嵌 JS 表达式 -->

<ul>
    {items.map(item => <li>{item}</li>)}
</ul>
```

> **Key difference**: the code between `---` runs on the **server (at build time)** and is not sent to the browser. The template portion outputs pure HTML.

### 4.2 Props and Slots

 ```astro
---
// components/Card.astro
export interface Props {
    title: string;
    subtitle?: string;
}

const { title, subtitle } = Astro.props;
---

<div class="card">
    <h2>{title}</h2>
    {subtitle && <p class="subtitle">{subtitle}</p>}
    <!-- 插槽：父组件可以插入内容 -->
    <slot />
</div>

<style>
    /* 组件级样式，默认 scoped */
    .card {
        padding: 1.5rem;
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .subtitle {
        color: #666;
        font-size: 0.9rem;
    }
</style>
```

Using this component:

 ```astro
---
import Card from '../components/Card.astro';
---

<Card title="Astro 入门" subtitle="从零开始">
    <p>这是一段插入到 slot 中的内容。</p>
</Card>
```

### 4.3 Styles Are Scoped by Default

Astro's `<style>` tag is **scoped by default**—styles only apply to the current component and don't leak into other parts of the page. This is a built-in capability; you don't need CSS Modules or styled-components.

 ```astro
<!-- 这个 h1 样式只影响本组件 -->
<style>
    h1 { color: red; }
</style>

<!-- 如果需要全局样式 -->
<style is:global>
    :root {
        --primary: #3b82f6;
    }
</style>
```

---

## 5. Content Collections

For content-centric sites like blogs and documentation sites, Astro provides **content collections**—a type-safe content management system.

### 5.1 Defining a Collection

 ```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
    type: 'content', // 'content' 表示 Markdown/MDX
    schema: z.object({
        title: z.string(),
        published: z.date(),
        description: z.string().optional(),
        tags: z.array(z.string()).default([]),
        draft: z.boolean().default(false),
    }),
});

export const collections = {
    blog: blogCollection,
};
```

### 5.2 Writing Content

 ```markdown
---
# src/content/blog/hello-world.md
title: 你好世界
published: 2026-06-17
tags: [Astro, 博客]
---

这是我的第一篇 Astro 博客文章。
```

### 5.3 Querying and Rendering

 ```astro
---
// src/pages/blog/index.astro
import { getCollection } from 'astro:content';

const posts = await getCollection('blog', ({ data }) => {
    return import.meta.env.PROD ? !data.draft : true;
});

// 按日期排序
posts.sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf());
---

<h1>博客</h1>
<ul>
    {posts.map(post => (
        <li>
            <a href={`/blog/${post.slug}`}>{post.data.title}</a>
            <time>{post.data.published.toLocaleDateString()}</time>
        </li>
    ))}
</ul>
```

---
## 6. Mixing Other Frameworks

Astro's most magical feature: **you can use React, Vue, and Svelte components on the same page.**

### 6.1 Adding Integrations

```bash
# 添加 React 支持
pnpm astro add react

# 添加 Vue 支持
pnpm astro add vue

# 添加 Svelte 支持
pnpm astro add svelte
```

### 6.2 Using Framework Components in Astro

```astro
---
// pages/island-demo.astro
import ReactCounter from '../components/ReactCounter.jsx';
import VueTodoList from '../components/VueTodoList.vue';
import SvelteChart from '../components/SvelteChart.svelte';
---

<!-- 静态内容，Astro 直接渲染为 HTML -->
<h1>多框架演示</h1>
<p>下面的组件来自不同的框架：</p>

<!-- React 组件 -->
<ReactCounter client:load />

<!-- Vue 组件 -->
<VueTodoList client:visible />

<!-- Svelte 组件 -->
<SvelteChart client:idle />
```

### 6.3 Client Directives: Controlling Hydration Timing

Every framework component needs a `client:*` directive to determine when to load JS:

| Directive | Behavior | Use Case |
|------|------|---------|
| `client:load` | Hydrate immediately after page load | High-priority interactions (e.g., navigation menus) |
| `client:idle` | Hydrate when the browser is idle | Low-priority interactions |
| `client:visible` | Hydrate when the component enters the viewport | Interactive components lower on the page |
| `client:media` | Hydrate when a media query matches | Components that only load on mobile |
| `client:only` | Skip SSR, client-side rendering only | Components that depend on browser APIs |

```astro
<!-- 示例：在不同时机加载不同组件 -->
<MobileMenu client:media="(max-width: 768px)" />
<SearchDialog client:idle />
<CommentSection client:visible />
<ThemeToggle client:load />
```

---

## 7. Routing and Page Modes

### 7.1 SSR Mode (Default)

Astro is SSG by default (generates pure HTML at build time). If you need SSR (dynamic rendering on each request), add this at the top of the file:

```astro
---
export const prerender = false;
---

<!-- 这个页面在每次请求时动态渲染 -->
<h1>当前时间：{new Date().toLocaleTimeString()}</h1>
```

Or enable it globally in `astro.config.mjs`:

```javascript
export default defineConfig({
    output: 'server',  // 或 'hybrid'（混合模式）
});
```

### 7.2 Three Output Modes

| Mode | Description | Use Case |
|------|------|---------|
| `static` (default) | Generates fully static HTML at build time | Blogs, documentation sites, corporate sites |
| `server` | Renders on the server on each request | Sites that need dynamic data |
| `hybrid` | Most pages static, a few pages dynamic | Static blog + login/search functionality |

---

## 8. Astro vs Other Frameworks

| Dimension | Astro | Next.js | Nuxt |
|------|-------|---------|------|
| Core philosophy | Zero JS by default, island enhancement | React full-stack framework | Vue full-stack framework |
| Default rendering | SSG | SSG | SSG |
| JS bundle size | **Extremely low** (0KB by default) | Medium | Medium |
| Multi-framework support | ✅ Native support | ❌ React only | ❌ Vue only |
| Learning curve | **Gentle** (HTML-like templates) | Steep (RSC, App Router) | Medium |
| Best scenario | Blogs, docs, marketing sites | Complex full-stack apps | Complex full-stack apps |
| Build speed | **Extremely fast** (Go + Rust engine) | Medium | Medium |

---

## 9. When to Choose Astro?

Typical signals for choosing Astro:

| Scenario | Reason |
|------|------|
| Personal blog | Purely static, zero JS, perfect Lighthouse score |
| Technical documentation site | Content-focused, minimal interaction |
| Company website / marketing page | Fast first paint, high SEO requirements |
| E-commerce showcase page | Product display-focused, interactions via islands |
| Micro-frontend aggregation | Different teams use different frameworks, Astro unifies the output |

Signals not to choose Astro:

| Scenario | Recommended Alternative |
|------|---------|
| Extremely complex frontend interactions (e.g., online Excel) | React / Vue SPA |
| Need client-side state management across the entire site | Next.js / Nuxt |
| Team is already deeply invested in a particular framework ecosystem | Choose a solution within that ecosystem |

---

## 10. Summary

Astro's success comes from a simple observation: **most websites' "interactions" might just be a few buttons, but traditional frameworks load a heavy runtime for the entire site.**

Its design philosophy can be summarized as:

> Output HTML by default, inject JavaScript on demand. "Multi-framework" isn't a gimmick—it solves a real problem: different teams and different scenarios can each use the tools they're best at, and Astro ultimately unifies them into a static site with optimal performance.

If you want to build a blog, documentation site, marketing page, or any website where "content > interaction," Astro may be the best choice right now. Just like this blog—every article you're reading right now is pure HTML generated by Astro at build time, with no unnecessary JS.

```
学习路径建议：
1. 用 Astro 搭一个个人博客（3~5 天）→ 理解 SSG 和内容集合
2. 加入一两个 React/Vue 岛屿组件（1~2 天）→ 理解岛屿架构
3. 尝试 hybrid 模式，添加搜索功能（3~5 天）→ 理解动态路由
```