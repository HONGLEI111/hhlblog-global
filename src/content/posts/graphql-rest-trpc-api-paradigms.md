---
title: GraphQL vs REST vs tRPC：API 设计范式对比
published: 2026-09-16
description: '同一个博客系统，用 REST、GraphQL、tRPC 三种范式各实现一遍，对比它们在数据获取、类型安全、缓存与演进成本上的真实差异，并给出一张可执行的选型决策表。'
image: ''
tags: [GraphQL, REST, tRPC, API, 互联网]
category: '互联网'
draft: false
lang: ''
---

## 引言：三种范式，三种「谁说了算」

API 设计的争论很少是技术优劣之争，更多是**控制权归属**之争：

- **REST**：服务端说了算。服务端定义好一个个资源端点，客户端只能按端点的形状取数据——多了浪费带宽，少了要再发一次请求。
- **GraphQL**：客户端说了算。客户端提交一棵查询树，服务端照着这棵树的形状返回，多一个字段不要，少一个字段不行。
- **tRPC**：类型系统说了算。没有 IDL、没有 schema 文件，服务端的函数签名直接编译成客户端的类型提示，改一个字段名，前端立刻编译报错。

后两者都在解决 REST 最被诟病的问题——**over-fetching（取多了）与 under-fetching（取少了）**，但走的是两条完全相反的路：GraphQL 用一套运行时解释器换灵活性，tRPC 用放弃跨语言能力换零成本类型安全。

下面用同一个业务场景把三种范式各写一遍。

## 统一场景：博客详情页

页面需要展示一篇文章的标题、正文、作者名，以及最新 3 条评论。数据存在三张表：`posts`、`users`、`comments`。

### REST 的写法

REST 把每个资源建模成一个 URL，用 HTTP 动词表达操作：

```http
GET /api/posts/42 HTTP/1.1
Accept: application/json
```

```json
{
  "id": 42,
  "title": "API 设计范式对比",
  "body": "...",
  "authorId": 7
}
```

问题立刻出现：客户端拿到了 `authorId`，但**要的是作者名**。于是它必须再发两个请求：

```http
GET /api/users/7
GET /api/posts/42/comments?limit=3&sort=desc
```

一个页面渲染，三个 HTTP 往返。这就是 under-fetching。

工程上通常用两种办法补救：

**方案 A：聚合端点（BFF 模式）**

```js
// GET /api/post-page/42
app.get('/api/post-page/:id', async (req, res) => {
  const post = await db.posts.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not Found' });

  // 并行取作者与评论，避免串行等待
  const [author, comments] = await Promise.all([
    db.users.findById(post.authorId),
    db.comments.findByPost(post.id, { limit: 3, sort: 'desc' }),
  ]);

  res.json({
    id: post.id,
    title: post.title,
    body: post.body,
    author: { id: author.id, name: author.name },
    comments: comments.map(toCommentDTO),
  });
});
```

**方案 B：稀疏字段集（Sparse Fieldsets）**

```http
GET /api/posts/42?include=author,comments&fields=title,body&comments.limit=3
```

方案 A 的问题是端点会爆炸——每加一个页面就要加一个聚合端点，服务端变成前端需求的传声筒。方案 B 的问题是查询参数解析逻辑会慢慢长成一个失控的小语言。

### GraphQL 的写法

GraphQL 换了个思路：只暴露**一张**端点 `POST /graphql`，形状由查询决定。先定义类型（Schema）：

```graphql
type User {
  id: ID!
  name: String!
}

type Comment {
  id: ID!
  body: String!
  author: User!
  createdAt: String!
}

type Post {
  id: ID!
  title: String!
  body: String!
  author: User!
  comments(limit: Int = 10, sort: SortOrder = DESC): [Comment!]!
}

enum SortOrder { ASC DESC }

type Query {
  post(id: ID!): Post
}
```

客户端一次请求，形状自己拼：

```graphql
query PostPage($id: ID!) {
  post(id: $id) {
    title
    body
    author { name }
    comments(limit: 3, sort: DESC) {
      body
      author { name }
    }
  }
}
```

服务端需要一个解析器（resolver）。这里藏着 GraphQL 最经典的坑——**N+1 查询**：如果 `Post.comments` 和 `Comment.author` 各自去查一次数据库，10 条评论就是 1 + 1 + 10 次查询。

```js
const resolvers = {
  Query: {
    post: (_, { id }) => db.posts.findById(id),
  },
  Post: {
    author: (post) => db.users.findById(post.authorId),          // 每个 post 一次
    comments: (post, { limit, sort }) =>
      db.comments.findByPost(post.id, { limit, sort }),          // 每个 post 一次
  },
  Comment: {
    author: (comment) => db.users.findById(comment.authorId),    // 每条评论一次 ← N+1
  },
};
```

标准解法是 **DataLoader**：把同一轮事件循环内的 `findById` 调用聚合成一次 `WHERE id IN (...)`：

```js
import DataLoader from 'dataloader';

const userLoader = new DataLoader(async (ids) => {
  const rows = await db.users.findByIds(ids);
  const byId = new Map(rows.map((u) => [u.id, u]));
  return ids.map((id) => byId.get(id) ?? null); // 顺序必须与入参一致
});
```

```js
Comment: {
  author: (comment) => userLoader.load(comment.authorId),
}
```

DataLoader 是**按请求创建**的，不能全局复用——否则不同用户之间的缓存会互相污染，这是一个真实的安全事故来源。

### tRPC 的写法

tRPC 的前提是你**前后端都是 TypeScript**，且共享类型。它没有 schema 文件，服务端代码本身就是契约：

```ts
// server/router.ts
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

export const appRouter = t.router({
  postPage: t.procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const post = await db.posts.findById(input.id);
      if (!post) throw new TRPCError({ code: 'NOT_FOUND' });

      const [author, comments] = await Promise.all([
        db.users.findById(post.authorId),
        db.comments.findByPost(post.id, { limit: 3, sort: 'desc' }),
      ]);

      return {
        title: post.title,
        body: post.body,
        authorName: author.name,        // 注意：直接返回扁平结构
        comments: comments.map((c) => ({ body: c.body })),
      };
    }),
});

export type AppRouter = typeof appRouter;
```

客户端不需要生成代码，也不需要手写类型，`AppRouter` 的**类型**经 `import type` 传入即可：

```ts
// client.ts
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './server/router';

const trpc = createTRPCProxyClient<AppRouter>({
  links: [httpBatchLink({ url: '/api/trpc' })],
});

const page = await trpc.postPage.query({ id: '42' });
page.authorName;   // ✅ 自动补全，类型是 string
page.author;       // ❌ 编译错误：Property 'author' does not exist
```

把 `authorName` 改名成 `author`，只需改服务端一处，所有前端调用点立刻在编译期报错。这就是 tRPC 最大的卖点：**重构成本从「运行时 500」降到「编译期红波浪线」**。

代价同样明确：一旦你的消费方是 iOS、Android、Python 脚本或第三方合作伙伴，tRPC 就直接出局——那些环境拿不到你的 TypeScript 类型。

## 横向对比

| 维度 | REST | GraphQL | tRPC |
|------|------|---------|------|
| 客户端控制返回形状 | 否（需聚合端点/稀疏字段） | 是 | 部分（每个 procedure 一个形状） |
| 请求次数 | 多资源需多次 | 一次 | 一次（可用 batch link 合并多个） |
| 类型安全 | 需 OpenAPI + 代码生成 | 需 codegen（如 GraphQL Code Generator） | 天然内建，零生成 |
| HTTP 缓存 | ✅ 直接可用 CDN/浏览器缓存 | ⚠️ 基本只能 POST，需持久化查询或 CDN 特殊支持 | ⚠️ 默认 POST，需自行处理 |
| 跨语言消费方 | ✅ 任何语言 | ✅ 任何语言 | ❌ 仅 TypeScript |
| 版本演进 | URL 版本（/v2/）或 Header | 字段级 `@deprecated`，无需版本号 | 编译期同步，无版本概念 |
| 学习曲线 | 低 | 高（Schema、解析器、N+1、权限） | 低（会 TS 就会） |
| 典型复杂查询成本 | 低 | 高（需查询深度限制、复杂度分析） | 低（形状固定） |

## 各自的真实坑

**REST 的坑在演进。** 删除一个字段几乎不可能——你永远不知道哪个调用方还在读它。`GET /api/posts/42` 返回的 `authorId` 一旦公开就是事实上的契约。实践中用「加字段自由、删字段慎重、破坏性变更走新版本」来应对。

**GraphQL 的坑在运行时成本。** 客户端能自由拼查询树，也就能拼出一棵恶意的树：

```graphql
query Evil {
  post(id: 1) { comments { author { posts { comments { author { posts { ... } } } } } } }
}
```

循环嵌套查询能把数据库打穿。生产环境必须做三件事：**查询深度限制**、**基于节点数的复杂度评分**（拒绝超过阈值的查询）、**强制持久化查询**（只允许执行预先注册的查询文本）。另外 GraphQL 的授权也更棘手——`post(id: 1) { author { email } }` 需要在每个字段解析器里做权限判断，而不是在路由层一次性判断。

**tRPC 的坑在边界。** 它把「前后端同仓库、同语言」当成默认前提。一旦你要开放 API 给外部，就得在 tRPC 之外再写一套 REST 或 GraphQL 网关——而这时你会开始怀疑当初是否该直接上 OpenAPI。

## 选型决策

按顺序回答下面几个问题，基本只有一个答案会剩下：

1. **消费方只有你自己的 TypeScript 前端吗？** → 是则 **tRPC**，开发体验碾压另外两个。
2. **有非 JS 消费方（移动端、第三方、合作方）吗？** → 是则排除 tRPC。
3. **客户端的数据需求差异很大，或页面数量多到聚合端点维护不过来吗？** → 是则 **GraphQL**（典型场景：多端共用一套 API、前端字段需求频繁变动）。
4. **其余情况** → **REST + OpenAPI**。它是最无聊也最稳的选择：CDN 缓存直接可用、调试靠 curl 就够、任何语言、任何年代都能接。无聊在这里是优点。

一个务实的组合是**分层**：对外暴露 REST 或 GraphQL，内部前后端同构的部分用 tRPC；GraphQL 网关再聚合下游的 REST 微服务。这三种范式不是互斥的宗教，而是不同边界上的不同工具。

## 结语

三种范式的分歧点其实只有一个：**返回数据的形状，由谁在什么时候决定？** REST 由服务端在部署时决定，GraphQL 由客户端在请求时决定，tRPC 由类型系统在编译时决定。想清楚你的系统里「谁最清楚数据形状」以及「这个形状变化的频率」，选型就不再是站队问题。

---

## 参考来源

- [GraphQL 官方文档 — Introduction to GraphQL](https://graphql.org/learn/)
- [GraphQL 官方文档 — Security: Query Depth and Complexity Limiting](https://graphql.org/learn/security/)
- [DataLoader — GitHub 官方仓库（解决 N+1 查询）](https://github.com/graphql/dataloader)
- [tRPC 官方文档 — Introduction](https://trpc.io/docs/)
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)
- [Microsoft Azure Architecture Center — API design best practices](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design)
- [GraphQL over HTTP 规范](https://graphql.github.io/graphql-over-http/draft/)
