---
title: Next.js 全栈开发入门：从零搭建一个现代 Web 应用
published: 2026-06-17
description: '从零开始学习 Next.js，理解 App Router、Server Components、路由与数据获取，掌握现代全栈开发的核心范式。'
image: ''
tags: [Next.js, React, 全栈, SSR, 前端基础]
category: '前端'
draft: false
lang: ''
---

## 1. 引言

**Next.js** 是目前最流行的 React 全栈框架。它把 React 的组件化能力扩展到了**服务端**，让你可以在同一个项目里写前端页面和后端 API。

回顾上一篇文章我们讲的三种渲染模式（CSR / SSR / SSG），Next.js 的独特之处在于：**它让这三种模式在同一个项目中无缝协作** —— 你可以按页面粒度决定渲染策略。

---

## 2. 创建第一个 Next.js 项目

### 2.1 初始化

```bash
npx create-next-app@latest my-blog
cd my-blog
npm run dev
```

初始化向导会问你几个问题：

```
✔ Would you like to use TypeScript?     Yes
✔ Would you like to use ESLint?         Yes
✔ Would you like to use Tailwind CSS?   Yes
✔ Would you like to use App Router?     Yes（推荐）
```

启动后访问 `http://localhost:3000`，第一个 Next.js 项目就跑起来了。

### 2.2 项目结构

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

**核心规则：文件系统即路由。** `app/` 目录下的文件夹结构直接映射为 URL 路径。

---

## 3. App Router：文件即路由

### 3.1 基础约定

| 文件 | 作用 |
|------|------|
| `page.tsx` | 页面内容 |
| `layout.tsx` | 布局（包裹子页面，切换页面时保持状态） |
| `loading.tsx` | 加载中的 UI（自动包裹 `Suspense`） |
| `error.tsx` | 错误处理 UI（自动包裹 `ErrorBoundary`） |
| `not-found.tsx` | 404 页面 |
| `route.ts` | API 路由（纯后端） |

### 3.2 路由示例

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

### 3.3 动态路由和参数

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

URL `/blog/hello-world` → `slug = "hello-world"`。

---

## 4. Server Components vs Client Components

Next.js 13+ 引入了**React Server Components（RSC）**，这是理解现代 Next.js 的关键。

### 4.1 默认是服务端组件

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

### 4.2 需要交互时用客户端组件

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

### 4.3 什么时候用哪个？

| 需求 | 用哪种组件 |
|------|----------|
| 从数据库获取数据 | **Server Component** |
| 展示静态内容 | **Server Component** |
| 处理用户交互（onClick、onChange...） | Client Component |
| 使用状态（useState、useReducer） | Client Component |
| 使用浏览器 API（localStorage、window） | Client Component |
| 使用 Effect（useEffect） | Client Component |

> **最佳实践：尽可能使用 Server Component，只在必要处添加客户端交互。** 这样可以最小化发往客户端的 JS 体积，获得最佳性能。

---

## 5. 数据获取

### 5.1 在 Server Component 中直接获取

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

### 5.2 Next.js 增强了 fetch

Next.js 扩展了原生的 `fetch` API，增加了缓存控制：

```tsx
// 缓存，默认行为（类似 SSG）
fetch('/api/data');

// 每次请求重新获取（类似 SSR）
fetch('/api/data', { cache: 'no-store' });

// 定时重新验证（ISR — 增量静态再生）
fetch('/api/data', { next: { revalidate: 60 } }); // 60秒
```

### 5.3 使用 ORM 直接操作数据库

因为 Server Component 运行在服务器上，你可以直接使用 Prisma、Drizzle 等 ORM：

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

## 6. API 路由：编写后端接口

Next.js 不仅仅是前端框架，还能写后端 API：

### 6.1 创建 API 端点

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

### 6.2 动态 API 路由

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

### 6.3 Server Actions：另一种「后端」方式

Next.js 还提供了 **Server Actions** —— 你可以直接在表单里调用服务端函数，无需手动创建 API：

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

## 7. 渲染策略实战

Next.js 支持按页面粒度选择渲染策略：

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

## 8. 部署

Next.js 最自然的部署平台是 **Vercel**（Next.js 的创造者），但也可以部署到任何支持 Node.js 的环境：

```bash
# 生产构建
npm run build

# 启动生产服务器
npm run start
```

| 部署方式 | 特点 |
|---------|------|
| Vercel | 零配置，自动优化，全球 CDN |
| Docker | 容器化部署，适合自托管 |
| Node.js 服务器 | 传统方式，`next start` |
| 静态导出 | `next export`，纯静态文件放 CDN |

---

## 9. 学习路线建议

| 阶段 | 内容 | 关键概念 |
|------|------|---------|
| 入门 | 创建项目、页面路由、基础组件 | App Router 约定 |
| 进阶 | Server Components、数据获取、API Routes | RSC、缓存策略 |
| 实战 | 认证（NextAuth）、数据库（Prisma）、表单 | Server Actions |
| 深入 | 中间件、国际化、性能优化、错误监控 | Edge Runtime |

---

## 10. 小结

Next.js 的核心价值一句话总结：**它把 React 从一个「前端库」升级为「全栈框架」。**

| 传统 React（CSR） | Next.js |
|-------------------|---------|
| 在浏览器里渲染 | 服务端渲染 + 客户端交互 |
| 需要单独搭建后端 | 自带 API Routes / Server Actions |
| 手动配置路由 | 文件系统即路由 |
| SEO 差 | 原生 SEO 友好 |
| 单一渲染模式 | SSG / SSR / ISR 按需选择 |

学完 HTML/CSS/JavaScript 基础、理解了 React 的组件化思维、弄清了三种渲染模式的区别之后，Next.js 就是你将所有这些知识整合在一起的「最终武器」。从想法到上线，一个仓库就够了。
