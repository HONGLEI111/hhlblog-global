---
title: Astro 入门：以内容为中心的现代 Web 框架
published: 2026-06-17
description: '从零学习 Astro —— 一个专为内容型网站设计的框架，默认零 JS、岛屿架构、多框架混用，让博客和文档站飞起来。'
image: ''
tags: [Astro, SSG, 前端框架, 前端基础]
category: '前端'
draft: false
lang: ''
---

## 1. 引言

**Astro** 是一个专为**内容驱动型网站**设计的 Web 框架。它的核心理念很简单：**大部分页面内容不需要 JavaScript，就不应该发送 JavaScript。**

在 React/Vue 社区卷服务端渲染、卷流式传输、卷一切的时候，Astro 走了一条完全不同的路：

> 你的博客文章、文档页面、营销网站，**99% 的内容是静态的**。为什么要为这 99% 的部分加载一个完整的 JS 运行时？

这个思路让 Astro 一炮而红——它连续两年（2023/2024）获得「前端满意度」第一名，并在 2025 年成为 GitHub 上 Star 增长最快的 Web 框架之一。

（你正在看的这个博客就是用 Astro 构建的。）

---

## 2. 岛屿架构：Astro 的杀手锏

### 2.1 传统 SPA 的问题

传统的 React/Vue 单页应用：

```
整个页面 = 一个巨大的 JS 应用
├── 导航栏（需要交互）
├── 文章内容（纯静态文字）
├── 侧边栏（纯静态）
├── 评论区（需要交互）
└── 页脚（纯静态）
```

加载这个页面，浏览器要下载**整个应用的 JS**，然后「水合」全部组件。即使 80% 的内容永远不会变化，也要为它们付出 JS 的代价。

### 2.2 Astro 的答案

```
整个页面 = 纯 HTML（默认）
├── 导航栏          → 纯 HTML（零 JS）
├── 文章内容         → 纯 HTML（零 JS）
├── 侧边栏           → 纯 HTML（零 JS）
├── 🏝️ 评论区       → React 组件（按需水合）
└── 🏝️ 点赞按钮     → Vue 组件（按需水合）
```

这就是**岛屿架构**：页面默认是静态 HTML，只有真正需要交互的部分才作为「岛屿」加载 JS。每个岛屿独立加载、独立水合，互不干扰。

---

## 3. 创建第一个 Astro 项目

### 3.1 初始化

```bash
# npm
npm create astro@latest my-site

# pnpm（推荐）
pnpm create astro@latest my-site
```

初始化向导：

```
✔ How would you like to start?                  → Empty
✔ Do you plan to write TypeScript?              → Yes
✔ How strict should TypeScript be?              → Strict
✔ Install dependencies?                         → Yes
✔ Initialize a new git repository?              → Yes
```

启动开发服务器：

```bash
cd my-site
pnpm dev
```

访问 `http://localhost:4321`，你的第一个 Astro 站点就跑起来了。

### 3.2 项目结构

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

## 4. Astro 组件语法

### 4.1 基础结构

`.astro` 文件由两部分组成：**组件脚本**（服务端运行）和**模板**（输出 HTML）。

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

> **关键区别**：`---` 之间的代码运行在**服务端（构建时）**，不会发送到浏览器。模板部分输出纯 HTML。

### 4.2 Props 和插槽

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

使用这个组件：

```astro
---
import Card from '../components/Card.astro';
---

<Card title="Astro 入门" subtitle="从零开始">
    <p>这是一段插入到 slot 中的内容。</p>
</Card>
```

### 4.3 样式默认隔离

Astro 的 `<style>` 标签**默认 scoped**——样式只作用于当前组件，不会泄露到页面的其他部分。这是内置能力，不需要 CSS Modules 或 styled-components。

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

## 5. 内容集合（Content Collections）

对于博客、文档站这类以内容为主的站点，Astro 提供了**内容集合**——一个类型安全的内容管理系统。

### 5.1 定义集合

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

### 5.2 编写内容

```markdown
---
# src/content/blog/hello-world.md
title: 你好世界
published: 2026-06-17
tags: [Astro, 博客]
---

这是我的第一篇 Astro 博客文章。
```

### 5.3 查询和渲染

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

## 6. 混合使用其他框架

Astro 最神奇的地方：**你可以在同一个页面用 React、Vue、Svelte 组件。**

### 6.1 添加集成

```bash
# 添加 React 支持
pnpm astro add react

# 添加 Vue 支持
pnpm astro add vue

# 添加 Svelte 支持
pnpm astro add svelte
```

### 6.2 在 Astro 中使用框架组件

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

### 6.3 client 指令：控制水合时机

每个框架组件都需要一个 `client:*` 指令来决定何时加载 JS：

| 指令 | 行为 | 适用场景 |
|------|------|---------|
| `client:load` | 页面加载后立即水合 | 高优先级交互（如导航菜单） |
| `client:idle` | 浏览器空闲时水合 | 低优先级交互 |
| `client:visible` | 组件进入视口时水合 | 页面下方的交互组件 |
| `client:media` | 匹配媒体查询时水合 | 仅在移动端加载的组件 |
| `client:only` | 跳过 SSR，仅客户端渲染 | 依赖浏览器 API 的组件 |

```astro
<!-- 示例：在不同时机加载不同组件 -->
<MobileMenu client:media="(max-width: 768px)" />
<SearchDialog client:idle />
<CommentSection client:visible />
<ThemeToggle client:load />
```

---

## 7. 路由与页面模式

### 7.1 SSR 模式（默认）

Astro 默认是 SSG（构建时生成纯 HTML）。如果需要 SSR（每次请求动态渲染），在文件顶部加上：

```astro
---
export const prerender = false;
---

<!-- 这个页面在每次请求时动态渲染 -->
<h1>当前时间：{new Date().toLocaleTimeString()}</h1>
```

或者在 `astro.config.mjs` 中全局启用：

```javascript
export default defineConfig({
    output: 'server',  // 或 'hybrid'（混合模式）
});
```

### 7.2 三种输出模式

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| `static`（默认） | 构建时生成全静态 HTML | 博客、文档站、官网 |
| `server` | 每次请求在服务端渲染 | 需要动态数据的站点 |
| `hybrid` | 大部分页面静态，少数页面动态 | 静态博客 + 登录/搜索功能 |

---

## 8. Astro vs 其他框架

| 维度 | Astro | Next.js | Nuxt |
|------|-------|---------|------|
| 核心理念 | 零 JS 默认，岛屿增强 | React 全栈框架 | Vue 全栈框架 |
| 默认渲染 | SSG | SSG | SSG |
| JS 体积 | **极低**（默认 0KB） | 中等 | 中等 |
| 多框架支持 | ✅ 原生支持 | ❌ 仅 React | ❌ 仅 Vue |
| 学习曲线 | **平缓**（类 HTML 模板） | 陡峭（RSC、App Router） | 中等 |
| 最佳场景 | 博客、文档、营销站 | 复杂全栈应用 | 复杂全栈应用 |
| 构建速度 | **极快**（Go + Rust 引擎） | 中等 | 中等 |

---

## 9. 什么时候选 Astro？

选择 Astro 的典型信号：

| 场景 | 理由 |
|------|------|
| 个人博客 | 纯静态，零 JS，Lighthouse 满分 |
| 技术文档站 | 内容为主，极少交互 |
| 公司官网 / 营销页 | 首屏要快，SEO 要求高 |
| 电商展示页 | 商品展示为主，交互通过岛屿 |
| 微前端聚合 | 不同团队用不同框架，Astro 统合输出 |

不选 Astro 的信号：

| 场景 | 推荐替代 |
|------|---------|
| 极度复杂的前端交互（如在线 Excel） | React / Vue SPA |
| 需要客户端状态管理贯穿全站 | Next.js / Nuxt |
| 团队已经深度投入某个框架生态 | 在其生态内选方案 |

---

## 10. 小结

Astro 的成功来自一个简单的观察：**大多数网站的「交互」可能就几个按钮，但传统框架为整站加载了一个重型运行时。**

它的设计哲学可以总结为：

> 默认输出 HTML，按需注入 JavaScript。「多框架」不是噱头，而是解决了一个现实问题——不同团队、不同场景可以各用擅长的工具，最终由 Astro 统合为最佳性能的静态站点。

如果你要建一个博客、文档站、营销页面，或者任何「内容 > 交互」的网站，Astro 可能是目前的最佳选择。就像这个博客一样——你现在看到的每一篇文章，都是 Astro 在构建时生成的纯 HTML，没有任何多余的 JS。

```
学习路径建议：
1. 用 Astro 搭一个个人博客（3~5 天）→ 理解 SSG 和内容集合
2. 加入一两个 React/Vue 岛屿组件（1~2 天）→ 理解岛屿架构
3. 尝试 hybrid 模式，添加搜索功能（3~5 天）→ 理解动态路由
```
