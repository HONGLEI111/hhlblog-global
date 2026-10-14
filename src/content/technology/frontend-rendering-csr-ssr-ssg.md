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
Browser requests URL
  ￬
Server returns an almost empty HTML (only one <div id="root"></div>)
  ￬
Browser downloads JS Bundle
  ￬
JS executes, generates HTML and inserts it into the page
  ￬
✅ Page is interactive
```

### 2.2 A Typical CSR Page

```html
<!-- HTML returned by the server -->
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
Browser requests URL
  ￬
Server executes JS / renders components
  ￬
Server generates complete HTML (including data)
  ￬
Browser receives complete HTML → renders directly
  ￬
JS "hydration", page becomes interactive
  ￬
✅ Page is interactive
```

### 3.2 A Simple SSR Example (Node.js)

```javascript
import { renderToString } from 'react-dom/server';

app.get('/article/:id', async (req, res) => {
    const article = await db.getArticle(req.params.id);  // Query the database
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
Server-rendered HTML (a dry, bare page)
  + JS loading + event binding
  = an interactive page (it's "alive")
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
At build time:
  Read data (Markdown / API / CMS)
    ￬
  Pre-render all pages into pure HTML
    ￬
  Output static files to dist/

At request time:
  Browser requests URL
    ￬
  CDN / static server directly returns the pre-generated HTML
    ￬
  ✅ Extremely fast response
```

### 4.2 How SSG Works

```javascript
// Runs at build time, generates static HTML
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
Within the same project:
  /about       → SSG (content does not change)
  /blog/[slug] → SSG (articles are generated at build time)
  /dashboard   → CSR (personal dashboard after logging in)
  /search?q=   → SSR (search results vary from person to person)
```

### Next.js Rendering Strategies

```jsx
// SSG: default behavior, generated at build time
export default function AboutPage() {
    return <div>About Us</div>;
}

// SSR: regenerated on every request
export const dynamic = 'force-dynamic';

// ISR: Incremental Static Regeneration — SSG + scheduled updates
export const revalidate = 3600; // Regenerate every 3600 seconds (1 hour)
```

### Astro's Islands Architecture

Astro defaults to SSG but supports "interactive islands" within pages:

```astro
---
// This part runs at build time
const posts = await getAllPosts();
---

<!-- Static content, output HTML directly -->
<h1>My Blog</h1>
{posts.map(post => <article>{post.title}</article>)}

<!-- "Island": this component renders on the client, preserving interactivity -->
<LikeButton client:load />
<CommentSection client:visible />
```

---

## 7. How to Choose a Rendering Mode?

A simple decision flow:

```
Will the content change frequently?
  ├── Yes → Need real-time data + SEO?
  │        ├── Yes → SSR
  │        └── No → CSR
  └── No → Is SEO important?
           ├── Yes → SSG
           └── No → Either CSR or SSG works
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