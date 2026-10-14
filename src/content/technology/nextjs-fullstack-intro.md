---
title: 'Getting Started with Next.js Full-Stack Development: Building a Modern Web App from Scratch'
published: 2026-06-17
description: Learn Next.js from scratch by understanding the App Router, Server Components, routing, and data fetching, and master the core paradigms of modern full-stack development.
image: ''
tags: [Next.js, React, Full-Stack, SSR, Frontend Fundamentals]
category: Frontend
draft: false
---
## 1. Introduction

**Next.js** is currently the most popular React full-stack framework. It extends React's component-based capabilities to the **server side**, allowing you to write frontend pages and backend APIs in the same project.

Recalling the three rendering modes (CSR / SSR / SSG) we discussed in the previous article, what makes Next.js unique is: **it allows these three modes to work seamlessly together in the same project** — you can decide the rendering strategy on a per-page basis.

---

## 2. Creating Your First Next.js Project

### 2.1 Initialization

```bash
npx create-next-app@latest my-blog
cd my-blog
npm run dev
```

The initialization wizard will ask you a few questions:

```
✔ Would you like to use TypeScript?     Yes
✔ Would you like to use ESLint?         Yes
✔ Would you like to use Tailwind CSS?   Yes
✔ Would you like to use App Router?     Yes（推荐）
```

After starting, visit `http://localhost:3000`, and your first Next.js project is up and running.

### 2.2 Project Structure

```
my-blog/
├── app/                  # App Router 的核心目录
│   ├── layout.tsx        # 根布局（所有页面共享）
│   ├── page.tsx          # 首页 /
│   ├── about/
│   │   └── page.tsx      # /about
│   ├── blog/
│   │   ├── page.tsx      # /blog
│   │   └── [slug]/
│   │       └── page.tsx  # /blog/hello-world
│   └── api/
│       └── posts/
│           └── route.ts  # /api/posts
├── components/           # 公共组件
├── lib/                  # 工具函数
├── public/               # 静态资源
├── package.json
└── next.config.ts
```

**Core rule: the file system is the router.** The folder structure under the `app/` directory maps directly to URL paths.

---

## 3. App Router: Files as Routes

### 3.1 Basic Conventions

| File | Purpose |
|------|------|
| `page.tsx` | Page content |
| `layout.tsx` | Layout (wraps child pages, preserves state when switching pages) |
| `loading.tsx` | Loading UI (automatically wraps `Suspense`) |
| `error.tsx` | Error handling UI (automatically wraps `ErrorBoundary`) |
| `not-found.tsx` | 404 page |
| `route.ts` | API routes (pure backend) |

### 3.2 Routing Example

```
app/
├── page.tsx                  → /
├── about/page.tsx            → /about
├── blog/page.tsx             → /blog
├── blog/[slug]/page.tsx      → /blog/hello, /blog/world
└── dashboard/
    ├── layout.tsx            → dashboard 共享布局
    ├── page.tsx              → /dashboard
    └── settings/page.tsx     → /dashboard/settings
```

### 3.3 Dynamic Routes and Parameters

```tsx
// app/blog/[slug]/page.tsx
export default async function BlogPost({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const post = await getPost(slug);

    return (
        <article>
            <h1>{post.title}</h1>
            <p>{post.content}</p>
        </article>
    );
}
```

URL `/blog/hello-world` → `slug = "hello-world"`.

---

## 4. Server Components vs Client Components

Next.js 13+ introduced **React Server Components (RSC)**, which is the key to understanding modern Next.js.

### 4.1 Server Components by Default

```tsx
// ✅ 这是 Server Component（默认）
// 可以直接访问数据库、文件系统
import { db } from '@/lib/db';

export default async function PostList() {
    const posts = await db.post.findMany(); // 直接查数据库！

    return (
        <ul>
            {posts.map(post => (
                <li key={post.id}>{post.title}</li>
            ))}
        </ul>
    );
}
```

### 4.2 Use Client Components When Interactivity Is Needed

```tsx
'use client'; // ← 加这一行，变为客户端组件

import { useState } from 'react';

export default function LikeButton() {
    const [likes, setLikes] = useState(0);

    return (
        <button onClick={() => setLikes(likes + 1)}>
            ❤️ {likes} 赞
        </button>
    );
}
```

### 4.3 When to Use Which?

| Requirement | Which Component to Use |
|------|----------|
| Fetching data from a database | **Server Component** |
| Displaying static content | **Server Component** |
| Handling user interactions (onClick, onChange...) | Client Component |
| Using state (useState, useReducer) | Client Component |
| Using browser APIs (localStorage, window) | Client Component |
| Using Effects (useEffect) | Client Component |

> **Best practice: use Server Components as much as possible, and only add client-side interactivity where necessary.** This minimizes the JS bundle sent to the client and achieves optimal performance.

---

## 5. Data Fetching

### 5.1 Fetching Directly in Server Components

```tsx
// app/posts/page.tsx
// 无需 useEffect + useState，直接 async/await
export default async function PostsPage() {
    const posts = await fetch('https://api.example.com/posts', {
        next: { revalidate: 3600 }, // ISR：每小时重新验证
    }).then(res => res.json());

    return (
        <div>
            {posts.map(post => (
                <article key={post.id}>
                    <h2>{post.title}</h2>
                    <p>{post.excerpt}</p>
                </article>
            ))}
        </div>
    );
}
```

### 5.2 Next.js Enhances fetch

Next.js extends the native `fetch` API with cache control:

```tsx
// 缓存，默认行为（类似 SSG）
fetch('/api/data');

// 每次请求重新获取（类似 SSR）
fetch('/api/data', { cache: 'no-store' });

// 定时重新验证（ISR — 增量静态再生）
fetch('/api/data', { next: { revalidate: 60 } }); // 60秒
```

### 5.3 Using ORMs to Interact with the Database Directly

Because Server Components run on the server, you can directly use ORMs like Prisma, Drizzle, etc.:

```tsx
// app/users/page.tsx
import { prisma } from '@/lib/prisma';

export default async function UsersPage() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return (
        <table>
            <thead>
                <tr><th>姓名</th><th>邮箱</th></tr>
            </thead>
            <tbody>
                {users.map(user => (
                    <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
```

---
## 6. API Routes: Writing Backend Endpoints

Next.js isn't just a frontend framework — it can also write backend APIs:

### 6.1 Creating an API Endpoint

```tsx
// app/api/posts/route.ts
import { NextResponse } from 'next/server';

// GET /api/posts
export async function GET() {
    const posts = await prisma.post.findMany();
    return NextResponse.json(posts);
}

// POST /api/posts
export async function POST(request: Request) {
    const body = await request.json();
    const post = await prisma.post.create({ data: body });
    return NextResponse.json(post, { status: 201 });
}
```

### 6.2 Dynamic API Routes

```tsx
// app/api/posts/[id]/route.ts
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
        return NextResponse.json(
            { error: '文章不存在' },
            { status: 404 }
        );
    }

    return NextResponse.json(post);
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
```

### 6.3 Server Actions: Another "Backend" Approach

Next.js also provides **Server Actions** — you can call server-side functions directly in forms without manually creating an API:

```tsx
// app/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;

    await prisma.post.create({
        data: { title, content },
    });

    revalidatePath('/posts'); // 刷新缓存
}
```

```tsx
// app/new-post/page.tsx
import { createPost } from '@/app/actions';

export default function NewPostPage() {
    return (
        <form action={createPost}>
            <input name="title" placeholder="标题" required />
            <textarea name="content" placeholder="内容" required />
            <button type="submit">发布</button>
        </form>
    );
}
```

---

## 7. Rendering Strategy in Practice

Next.js supports choosing rendering strategies at the page level:

```tsx
// 1. SSG（默认）— 构建时生成，永不改变
export default function AboutPage() {
    return <div>关于我们</div>;
}

// 2. ISR — 构建时生成，定时刷新
export const revalidate = 3600; // 每3600秒重新生成

// 3. SSR — 每次请求都重新生成
export const dynamic = 'force-dynamic';

// 4. 动态 SSG — 为每条数据预生成页面
export async function generateStaticParams() {
    const posts = await getPosts();
    return posts.map(post => ({ slug: post.slug }));
}
```

---

## 8. Deployment

The most natural deployment platform for Next.js is **Vercel** (the creator of Next.js), but it can also be deployed to any environment that supports Node.js:

```bash
# 生产构建
npm run build

# 启动生产服务器
npm run start
```

| Deployment Method | Characteristics |
|---------|------|
| Vercel | Zero config, automatic optimization, global CDN |
| Docker | Containerized deployment, suitable for self-hosting |
| Node.js Server | Traditional approach, `next start` |
| Static Export | `next export`, pure static files served from CDN |

---

## 9. Suggested Learning Path

| Stage | Content | Key Concepts |
|------|------|---------|
| Beginner | Creating projects, page routing, basic components | App Router conventions |
| Intermediate | Server Components, data fetching, API Routes | RSC, caching strategies |
| Practical | Authentication (NextAuth), database (Prisma), forms | Server Actions |
| Advanced | Middleware, internationalization, performance optimization, error monitoring | Edge Runtime |

---

## 10. Summary

The core value of Next.js in one sentence: **It upgrades React from a "frontend library" to a "full-stack framework."**

| Traditional React (CSR) | Next.js |
|-------------------|---------|
| Renders in the browser | Server-side rendering + client-side interaction |
| Requires a separately built backend | Built-in API Routes / Server Actions |
| Manual route configuration | File system as routing |
| Poor SEO | Native SEO-friendly |
| Single rendering mode | SSG / SSR / ISR chosen on demand |

After learning the fundamentals of HTML/CSS/JavaScript, understanding React's component-based thinking, and grasping the differences between the three rendering modes, Next.js is the "ultimate weapon" that integrates all this knowledge together. From idea to launch, one repository is all you need.