---
title: 前端渲染模式：CSR、SSR 和 SSG 的区别与选择
published: 2026-06-17
description: '深入理解三种前端渲染模式：客户端渲染（CSR）、服务端渲染（SSR）和静态站点生成（SSG），以及如何根据场景选择合适方案。'
image: ''
tags: [CSR, SSR, SSG, 渲染模式, Next.js, 前端基础]
category: '前端'
draft: false
lang: ''
---

## 1. 引言

打开一个网站，你看到的 HTML 是从哪里来的？

这个问题看起来简单，但答案却决定了网站的**性能、SEO、用户体验**。前端渲染模式的核心问题就是：**HTML 在什么时候、在哪里被生成？**

| 渲染模式 | HTML 生成时机 | 生成位置 |
|---------|-------------|---------|
| CSR | 浏览器加载 JS 后 | 客户端（浏览器） |
| SSR | 每次请求时 | 服务器 |
| SSG | 构建时 | 服务器（一次性） |

---

## 2. CSR：客户端渲染

### 2.1 工作流程

```
浏览器请求 URL
  ￬
服务器返回几乎空的 HTML（只有一个 <div id="root"></div>）
  ￬
浏览器下载 JS Bundle
  ￬
JS 执行，生成 HTML 并插入页面
  ￬
✅ 页面可交互
```

### 2.2 典型的 CSR 页面

```html
<!-- 服务器返回的 HTML -->
<!DOCTYPE html>
<html>
<head>
    <title>My SPA</title>
</head>
<body>
    <div id="root"></div>
    <script src="/bundle.js"></script>
</body>
</html>
```

浏览器收到的是一个**空壳**，真正的页面内容由 `bundle.js` 在客户端动态生成。

### 2.3 优缺点

| 优势 | 劣势 |
|------|------|
| 服务器压力小（只返回静态文件） | **首屏白屏时间较长**（等 JS 加载） |
| 页面切换流畅（SPA，无刷新） | **SEO 差**（搜索引擎可能看不到内容） |
| 开发简单，前后端分离彻底 | 低性能设备体验差 |
| 适合 CDN 部署 | 首字节时间（TTFB）不等于可交互时间 |

### 2.4 适用场景

- 后台管理系统、仪表盘
- 需要大量交互的单页应用（SPA）
- SEO 不敏感的页面

---

## 3. SSR：服务端渲染

### 3.1 工作流程

```
浏览器请求 URL
  ￬
服务器执行 JS / 渲染组件
  ￬
服务器生成完整 HTML（含数据）
  ￬
浏览器接收完整 HTML → 直接渲染
  ￬
JS 「水合」（hydration），页面变为可交互
  ￬
✅ 页面可交互
```

### 3.2 一个简单的 SSR 例子（Node.js）

```javascript
import { renderToString } from 'react-dom/server';

app.get('/article/:id', async (req, res) => {
    const article = await db.getArticle(req.params.id);  // 查数据库
    const html = renderToString(<ArticlePage data={article} />);

    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>${article.title}</title></head>
        <body>
            <div id="root">${html}</div>
            <script src="/bundle.js"></script>
        </body>
        </html>
    `);
});
```

用户收到的 HTML **已经包含了完整内容**，不需要等 JS 加载就能看到文字。

### 3.3 Hydration（水合）是什么？

SSR 返回的 HTML 是**静态的** —— 按钮可以看，但点击没反应。浏览器需要加载 JS，将事件监听器「挂载」到已有的 DOM 上，这个过程叫 **Hydration**（水合）。

```
服务端渲染的 HTML（干巴巴的页面）
  + JS 加载 + 事件绑定
  = 可交互的页面（「活」了）
```

### 3.4 优缺点

| 优势 | 劣势 |
|------|------|
| **首屏快** — 直接返回有内容的 HTML | 服务器压力大（每次请求都要渲染） |
| **SEO 友好** — 搜索引擎能爬取完整内容 | TTFB 较慢（服务器渲染需要时间） |
| 对低性能设备友好 | 部署复杂（需要 Node.js 服务器） |
| 用户可以更快看到内容 | 首屏可见不代表可交互（Hydration 需时间） |

### 3.5 适用场景

- 内容型网站（博客、新闻、电商详情页）
- SEO 敏感页面
- 首页等需要快速展示的场景

---

## 4. SSG：静态站点生成

### 4.1 工作流程

```
构建时：
  读取数据（Markdown / API / CMS）
    ￬
  预渲染所有页面为纯 HTML
    ￬
  输出静态文件到 dist/

请求时：
  浏览器请求 URL
    ￬
  CDN / 静态服务器直接返回预生成的 HTML
    ￬
  ✅ 极速响应
```

### 4.2 SSG 的工作模式

```javascript
// 构建时运行，生成静态 HTML
export async function getStaticPaths() {
    const posts = await getAllPosts();
    return posts.map(post => ({
        params: { slug: post.slug }
    }));
}

export async function getStaticProps({ params }) {
    const post = await getPost(params.slug);
    return { props: { post } };
}
```

### 4.3 优缺点

| 优势 | 劣势 |
|------|------|
| **速度极快** — 就是纯 HTML | **内容更新需重新构建** |
| 可以部署到 CDN，几乎零服务器成本 | 页面数量多时构建时间长 |
| SEO 最优 | 不适合实时数据（如用户个性化内容） |
| 安全性最高（无服务端逻辑） | 动态路由的页面数量需提前确定 |

### 4.4 适用场景

- 技术博客、文档站
- 企业官网、营销页面
- Landing page
- 内容不频繁变化的站点

---

## 5. 三种模式对比

| 维度 | CSR | SSR | SSG |
|------|-----|-----|-----|
| 首屏速度 | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| SEO | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 服务器负载 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 交互体验 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 实时数据 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |
| 构建时间 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| 部署复杂度 | 简单 | 中等 | 简单 |

---

## 6. 现代框架的混合方案

真实的项目很少只用一种渲染模式。**Next.js、Nuxt、Astro** 等现代框架支持混合使用：

```
同一个项目里：
  /about       → SSG（内容不变）
  /blog/[slug] → SSG（文章在构建时生成）
  /dashboard   → CSR（登入后的个人面板）
  /search?q=   → SSR（搜索结果因人而异）
```

### Next.js 的渲染策略

```jsx
// SSG：默认行为，构建时生成
export default function AboutPage() {
    return <div>关于我们</div>;
}

// SSR：每次请求时重新生成
export const dynamic = 'force-dynamic';

// ISR：增量静态再生 — SSG + 定时更新
export const revalidate = 3600; // 每3600秒（1小时）重新生成一次
```

### Astro 的岛屿架构

Astro 默认 SSG，但支持页面中的「交互岛屿」：

```astro
---
// 这部分在构建时运行
const posts = await getAllPosts();
---

<!-- 静态内容，直接输出 HTML -->
<h1>我的博客</h1>
{posts.map(post => <article>{post.title}</article>)}

<!-- 「岛屿」：这个组件在客户端渲染，保持交互能力 -->
<LikeButton client:load />
<CommentSection client:visible />
```

---

## 7. 如何选择渲染模式？

一个简单的决策流程：

```
内容会频繁变化吗？
  ├── 是 → 需要实时数据 + SEO？
  │        ├── 是 → SSR
  │        └── 否 → CSR
  └── 否 → SEO 重要吗？
           ├── 是 → SSG
           └── 否 → CSR 或 SSG 都行
```

或者从**页面类型**入手：

| 页面类型 | 推荐模式 | 理由 |
|---------|---------|------|
| 博客文章 | SSG | 内容写后基本不改，构建完放着就行 |
| 商品详情页 | SSG + ISR | 描述不变，价格/库存可定时刷新 |
| 搜索结果页 | SSR | 每次查询结果不同 |
| 用户仪表盘 | CSR | 登入后个性化内容，无需 SEO |
| 首页 | SSG | 展示型内容，追求极致速度 |
| 实时数据大屏 | CSR / SSR | 需要实时刷新 |

---

## 8. 小结

三种渲染模式的本质区别只有一句话：

| 模式 | 核心问题 |
|------|---------|
| **CSR** | HTML 在浏览器里生成 → 服务器轻松，首屏慢 |
| **SSR** | HTML 在服务器上生成（每次请求） → 首屏快，服务器累 |
| **SSG** | HTML 在构建时生成 → 首屏最快，内容不动 |

没有哪种模式是「银弹」。现代前端框架的趋势是**混合使用**，让每个页面选择最适合它的渲染方式。理解这三种模式，是你从「写页面」走向「设计架构」的关键一步。
