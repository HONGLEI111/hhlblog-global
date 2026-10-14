---
title: 'Frontend Rendering Patterns: Differences and Choices Between CSR, SSR, and SSG'
published: 2026-06-17
description: A deep dive into the three frontend rendering patterns—Client-Side Rendering (CSR), Server-Side Rendering (SSR), and Static Site Generation (SSG)—and how to choose the right approach for your use case.
image: ''
tags: [CSR, SSR, SSG, Rendering Patterns, Next.js, Frontend Fundamentals]
category: Frontend
draft: false
---
## 1. Introduction

When you open a website, where does the HTML you see come from?

This question seems simple, but the answer determines a website's **performance, SEO, and user experience**. The core question of frontend rendering modes is: **when and where is the HTML generated?**

| Rendering Mode | HTML Generation Timing | Generation Location |
|---------|-------------|---------|
| CSR | After the browser loads JS | Client side (browser) |
| SSR | On every request | Server |
| SSG | At build time | Server (one-time) |

---

## 2. CSR: Client-Side Rendering

### 2.1 Workflow

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

### 2.2 A Typical CSR Page

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

What the browser receives is an **empty shell**; the actual page content is dynamically generated on the client side by  `bundle.js`.

### 2.3 Pros and Cons

| Advantages | Disadvantages |
|------|------|
| Low server pressure (only returns static files) | **Longer first-screen blank time** (waiting for JS to load) |
| Smooth page transitions (SPA, no refresh) | **Poor SEO** (search engines may not see the content) |
| Simple development, clean frontend-backend separation | Poor experience on low-performance devices |
| Suitable for CDN deployment | Time to First Byte (TTFB) does not equal time to interactivity |

### 2.4 Use Cases

- Admin management systems, dashboards
- Single-page applications (SPAs) requiring heavy interactivity
- Pages that are not SEO-sensitive

---

## 3. SSR: Server-Side Rendering

### 3.1 Workflow

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

### 3.2 A Simple SSR Example (Node.js)

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

The HTML the user receives **already contains the complete content**; they can see the text without waiting for JS to load.

### 3.3 What Is Hydration?

The HTML returned by SSR is **static** — buttons are visible, but clicking does nothing. The browser needs to load JS and "attach" event listeners to the existing DOM. This process is called **Hydration**.

 ```
服务端渲染的 HTML（干巴巴的页面）
  + JS 加载 + 事件绑定
  = 可交互的页面（「活」了）
```

### 3.4 Pros and Cons

| Advantages | Disadvantages |
|------|------|
| **Fast first screen** — directly returns HTML with content | High server pressure (must render on every request) |
| **SEO-friendly** — search engines can crawl the complete content | Slower TTFB (server rendering takes time) |
| Friendly to low-performance devices | Complex deployment (requires a Node.js server) |
| Users can see content faster | First-screen visibility does not mean interactivity (Hydration takes time) |

### 3.5 Use Cases

- Content-oriented websites (blogs, news, e-commerce detail pages)
- SEO-sensitive pages
- Scenarios requiring fast display, such as homepages

---

## 4. SSG: Static Site Generation

### 4.1 Workflow

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

### 4.2 How SSG Works

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

### 4.3 Pros and Cons

| Advantages | Disadvantages |
|------|------|
| **Extremely fast** — it's just pure HTML | **Content updates require rebuilding** |
| Can be deployed to a CDN, with nearly zero server cost | Long build times when there are many pages |
| Best SEO | Not suitable for real-time data (such as personalized user content) |
| Highest security (no server-side logic) | The number of dynamic route pages must be determined in advance |

### 4.4 Use Cases

- Technical blogs, documentation sites
- Corporate websites, marketing pages
- Landing pages
- Sites with infrequently changing content

---

## 5. Comparison of the Three Modes

| Dimension | CSR | SSR | SSG |
|------|-----|-----|-----|
| First-screen speed | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| SEO | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Server load | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Interactive experience | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Real-time data | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |
| Build time | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Deployment complexity | Simple | Medium | Simple |

---

## 6. Hybrid Approaches in Modern Frameworks

Real projects rarely use only one rendering mode. Modern frameworks such as **Next.js, Nuxt, and Astro** support mixed usage:

 ```
同一个项目里：
  /about       → SSG（内容不变）
  /blog/[slug] → SSG（文章在构建时生成）
  /dashboard   → CSR（登入后的个人面板）
  /search?q=   → SSR（搜索结果因人而异）
```

### Next.js Rendering Strategies

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

### Astro's Islands Architecture

Astro defaults to SSG but supports "interactive islands" within pages:

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

## 7. How to Choose a Rendering Mode?

A simple decision flow:

 ```
内容会频繁变化吗？
  ├── 是 → 需要实时数据 + SEO？
  │        ├── 是 → SSR
  │        └── 否 → CSR
  └── 否 → SEO 重要吗？
           ├── 是 → SSG
           └── 否 → CSR 或 SSG 都行
```

Or start from the **page type**:

| Page Type | Recommended Mode | Reason |
|---------|---------|------|
| Blog posts | SSG | Content rarely changes after writing; just build and leave it |
| Product detail pages | SSG + ISR | Descriptions stay the same; price/stock can be refreshed periodically |
| Search results pages | SSR | Results differ for each query |
| User dashboards | CSR | Personalized content after login, no SEO needed |
| Homepage | SSG | Display-oriented content, pursuing ultimate speed |
| Real-time data dashboards | CSR / SSR | Requires real-time refresh |

---

## 8. Summary

The essential difference between the three rendering modes can be summed up in one sentence each:

| Mode | Core Question |
|------|---------|
| **CSR** | HTML is generated in the browser → server is relaxed, first screen is slow |
| **SSR** | HTML is generated on the server (on every request) → first screen is fast, server is burdened |
| **SSG** | HTML is generated at build time → first screen is fastest, content stays put |

No mode is a "silver bullet." The trend in modern frontend frameworks is **mixed usage**, letting each page choose the rendering approach that suits it best. Understanding these three modes is a key step in your journey from "writing pages" to "designing architecture."