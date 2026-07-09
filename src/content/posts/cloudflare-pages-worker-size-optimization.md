---
title: Cloudflare Pages Worker 体积优化实战：从 24 MB 到 3 MB 的瘦身之旅
published: 2026-07-09
description: '将 Astro SSR 博客部署到 Cloudflare Pages 时遭遇 Worker 体积超限问题，通过图标按需导入、页面预渲染等一系列优化手段，最终将 Worker 体积从 24 MB 压缩到 3 MB 以内。'
image: ''
tags: [Cloudflare, Astro, 性能优化, SSR]
category: '前端'
draft: false
lang: ''
---

## 1. 背景

我的个人博客基于 Astro 5 构建，使用 `@astrojs/cloudflare` 适配器以 SSR 模式部署在 Cloudflare Pages 上。某次常规更新后，突然发现部署失败，Wrangler 报错：

```
✘ [ERROR] The Pages project "my-blog" does not exist.
```

这个问题很容易解决——在 Cloudflare Dashboard 中创建对应名称的 Pages 项目即可。但紧接着第二个错误来了：

```
Error: Failed to publish your Function. Got error: Your Worker exceeded
the size limit of 3 MiB. Please upgrade to a paid plan to deploy Workers
up to 10 MiB.
```

查看构建日志，Worker 总大小竟然高达 **24 MiB**。本文记录了我一步步排查并解决这个问题的过程。

## 2. 问题定位：谁吃掉了 24 MB？

部署时 Wrangler 会打印模块清单。我按大小排序后，找到了几个「大块头」：

| 模块 | 大小 | 占比 |
|------|------|------|
| MainGridLayout | 14,898 KB | 61% |
| data-layer-content | 3,748 KB | 15% |
| rss.xml | 776 KB | 3% |
| config | 536 KB | 2% |
| 独立文章块（约 68 篇） | ~5,000 KB | 20% |

`MainGridLayout` 一个组件占了全部体积的 **61%**，这明显不正常。

### 2.1 根因 #1：图标全量打包（14.9 MB）

`MainGridLayout` 中使用了 `astro-icon` 的 `<Icon>` 组件，而 `astro.config.mjs` 中是这样配置的：

```js
icon({
  include: {
    "material-symbols": ["*"],  // 全量导入
    "fa6-brands": ["*"],
    "fa6-regular": ["*"],
    "fa6-solid": ["*"],
    "tabler": ["*"],
    "flat-color-icons": ["*"],
  },
}),
```

`["*"]` 意味着将 **6 套图标集的所有图标数据** 全部打包进 SSR Worker。仅在 `@iconify-json/material-symbols` 一个包中就有成千上万个图标，每个图标的 SVG path 数据都被序列化为 JS 对象。

更关键的是，在 SSR 模式下，`astro-icon` 不会将 `@iconify-json/*` 标记为外部依赖（而在静态模式下会），导致所有图标数据被内联到 chunk 中。这就是 `MainGridLayout` 14.9 MB 的来源。

### 2.2 根因 #2：内容数据层膨胀（3.7 MB + 5 MB）

项目有 68 篇 Markdown 文章，源文件合计约 460 KB。但在 SSR 模式下，Astro 5 将整个内容集合序列化为 JS 模块并打包进 Worker：

- **data-layer-content（3.7 MB）**：所有文章的前言字段 + 正文 + 渲染后的 HTML + 集合元数据
- **独立文章块（~5 MB）**：每篇文章对应一个 60-110 KB 的 chunk，包含 expressive-code 语法高亮、Mermaid 图表等编译产物

这两部分合计约 **8.7 MB**，本质是将静态内容不必要地塞进了运行时。

### 2.3 根因 #3：RSS Feed 引入重型依赖（776 KB）

`rss.xml.ts` 导入了 `markdown-it` 和 `sanitize-html` 两个包，只是为了在 RSS 的 `<content:encoded>` 中渲染文章全文。这对于一个已有 description 字段的 RSS feed 来说是完全多余的。

## 3. 优化方案

### 3.1 图标按需导入（节省 14.6 MB）

首先统计项目中实际用到的所有图标。可以通过 grep 扫描全部 `.astro`、`.svelte` 文件中的 `<Icon name="...">` 引用：

```bash
grep -rn 'name=' --include="*.astro" --include="*.svelte" src/ \
  | grep -iE 'material-symbols:|fa6-|tabler:|flat-color-icons:|ic:'
```

整理出实际使用的图标清单（我的项目约 60 个），将配置改为：

```js
icon({
  include: {
    "material-symbols": [
      "arrow-forward-rounded",
      "book-2-outline-rounded",
      "chevron-right-rounded",
      // ... 约 30 个实际用到的图标
    ],
    "fa6-brands": ["github", "react", "vuejs", /* ... */],
    "fa6-solid": ["arrow-up-right-from-square"],
    "fa6-regular": ["address-card"],
    "tabler": ["rocket", "brand-tailwind", /* ... */],
  },
}),
```

> **注意：** 如果你的组件中有动态图标名（如 `<Icon name={item.icon} />`），需要把所有可能的运行时值也加进去。我在首页的 TechStack、MovingTechStack、Projects 等组件中发现了大量此类用法。

效果立竿见影：`MainGridLayout` chunk 从 **14,898 KB → 269 KB**。

### 3.2 预渲染内容页面（节省 6-8 MB）

对于博客这类内容驱动的站点，绝大多数页面在构建时就是确定的。Astro 5 支持对特定页面使用 `export const prerender = true`：

```astro
---
// src/pages/posts/[...slug].astro
export const prerender = true;

export async function getStaticPaths() {
  // ...返回所有文章路径
}
---
```

为以下 6 个内容页面添加了预渲染声明：

| 页面 | 预渲染内容 |
|------|-----------|
| `posts/[...slug]` | 27 篇文章详情页 |
| `posts/[...page]` | 文章列表分页 |
| `technology/[...slug]` | 36 篇技术文章 |
| `technology/[...page]` | 技术文章分页 |
| `read/[...slug]` | 3 篇阅读笔记 |
| `read/[...page]` | 阅读笔记分页 |

预渲染后，这些页面的内容不再打包进 Worker，而是输出为静态 HTML 文件，由 CDN 直接服务。

> **踩坑记录：** 预渲染时 Astro 会尝试优化远程图片（调用 `inferRemoteSize` 获取尺寸）。如果你的图片托管在 Cloudflare R2 等外部服务，需要确保构建环境能访问这些 URL。另一个选择是在 `ImageWrapper` 组件中提供显式的 `width`/`height`，并设置 `inferSize: false` 来跳过运行时图片尺寸推断。

同时修复了一个潜伏的 bug：`BlogCard.astro`、`PostCard.astro` 等多个组件使用了 `currentLang` 变量但从未定义（`const currentLang = Astro.locals?.lang`），在 SSR 模式下因为 `Astro.locals` 有全局默认值而没暴露，切换到预渲染后就报错了。

### 3.3 其他优化

- **banner 图片显式尺寸**：给 `<ImageWrapper>` 添加 `width={1920} height={1080}`，避免预渲染时的网络请求
- **RSS feed 预渲染**：为 `rss.xml.ts` 添加 `export const prerender = true`，在构建时生成静态 XML
- **robots.txt 预渲染**：同上

## 4. 优化效果

| 阶段 | Worker 大小 | 状态 |
|------|------------|------|
| 优化前 | ~24 MB | ❌ 部署失败 |
| 图标按需导入 | ~11 MB | ❌ 仍超 3 MB |
| 图标 + 预渲染 | ~3 MB 以内 | ✅ 部署成功 |

最终，Worker 体积从 **24 MB 压缩到 3 MB 以内**，成功部署到 Cloudflare Pages 免费计划。

## 5. 总结与建议

如果你的 Astro SSR 项目也遇到了类似的 Worker 体积问题，建议按以下顺序排查：

1. **检查依赖打包情况**：`astro-icon` 的全量导入是最常见的体积炸弹，务必使用精确匹配的图标名而非 `["*"]`
2. **评估 SSR 的必要性**：纯内容展示页面应尽可能预渲染。Astro 5 中 `export const prerender = true` 可以精确控制每个页面的渲染策略
3. **审视重型依赖**：`markdown-it`、`sanitize-html` 等库体积不小，如果只在非关键路径使用，考虑按需加载或寻找替代方案
4. **监控构建产物**：每次构建后检查 `dist/_worker.js/chunks/` 目录，及时发现体积异常增长

项目虽小，部署到生产环境时这些细节往往会成为「最后一公里」的障碍。希望本文的排查思路能为你提供参考。
