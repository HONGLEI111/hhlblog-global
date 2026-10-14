---
title: 'GraphQL vs REST vs tRPC: Comparing API Design Paradigms'
published: 2026-09-16
description: The same blog system implemented three times with REST, GraphQL, and tRPC, comparing their real differences in data fetching, type safety, caching, and evolution cost, plus an actionable decision table for choosing between them.
image: ''
tags: [GraphQL, REST, tRPC, API, Internet]
category: Internet
draft: false
---
## Introduction: Three Paradigms, Three Kinds of "Who Gets to Decide"

API design debates are rarely about technical superiority—they're more about **who holds the control**:

- **REST**: The server decides. The server defines resource endpoints one by one, and the client can only fetch data in the shape of those endpoints—too much wastes bandwidth, too little requires another request.
- **GraphQL**: The client decides. The client submits a query tree, and the server returns data shaped exactly like that tree—not one field more, not one field less.
- **tRPC**: The type system decides. No IDL, no schema files—the server's function signatures compile directly into the client's type hints. Rename a field, and the frontend immediately fails to compile.

The latter two both solve REST's most criticized problems—**over-fetching and under-fetching**—but they take two completely opposite paths: GraphQL trades a runtime interpreter for flexibility, while tRPC trades away cross-language capability for zero-cost type safety.

Below, the same business scenario is written out in all three paradigms.

## Unified Scenario: Blog Detail Page

The page needs to display an article's title, body, author name, and the latest 3 comments. The data lives in three tables: `posts`, `users`, `comments`.

### The REST Approach

REST models each resource as a URL and uses HTTP verbs to express operations:

```http
GET /api/posts/42 HTTP/1.1
Accept: application/json
```

```json
{
  "id": 42,
  "title": "API design paradigm comparison",
  "body": "...",
  "authorId": 7
}
```

The problem immediately appears: the client gets `authorId`, but **what it needs is the author name**. So it must send two more requests:

```http
GET /api/users/7
GET /api/posts/42/comments?limit=3&sort=desc
```

One page render, three HTTP round trips. This is under-fetching.

In practice, two approaches are typically used to remedy this:

**Approach A: Aggregation Endpoint (BFF Pattern)**

```js
// GET /api/post-page/42
app.get('/api/post-page/:id', async (req, res) => {
  const post = await db.posts.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not Found' });

  // Fetch authors and comments in parallel to avoid serial waiting
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

**Approach B: Sparse Fieldsets**

```http
GET /api/posts/42?include=author,comments&fields=title,body&comments.limit=3
```

The problem with Approach A is that endpoints explode—every new page requires a new aggregation endpoint, and the server becomes a mouthpiece for frontend requirements. The problem with Approach B is that query parameter parsing logic slowly grows into an out-of-control mini-language.

### The GraphQL Approach

GraphQL takes a different approach: it exposes only **one** endpoint, `POST /graphql`, and the shape is determined by the query. First, define the types (Schema):

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

The client makes one request and assembles the shape itself:

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

The server needs a resolver. Here lies GraphQL's most classic pitfall—**the N+1 query problem**: if `Post.comments` and `Comment.author` each hit the database separately, 10 comments means 1 + 1 + 10 queries.

```js
const resolvers = {
  Query: {
    post: (_, { id }) => db.posts.findById(id),
  },
  Post: {
    author: (post) => db.users.findById(post.authorId),          // Once per post
    comments: (post, { limit, sort }) =>
      db.comments.findByPost(post.id, { limit, sort }),          // Once per post
  },
  Comment: {
    author: (comment) => db.users.findById(comment.authorId),    // Once per comment ← N+1
  },
};
```

The standard solution is **DataLoader**: batching `findById` calls within the same event loop tick into a single `WHERE id IN (...)`:

```js
import DataLoader from 'dataloader';

const userLoader = new DataLoader(async (ids) => {
  const rows = await db.users.findByIds(ids);
  const byId = new Map(rows.map((u) => [u.id, u]));
  return ids.map((id) => byId.get(id) ?? null); // Order must match the input arguments
});
```

```js
Comment: {
  author: (comment) => userLoader.load(comment.authorId),
}
```

DataLoader is **created per request** and must not be reused globally—otherwise caches between different users contaminate each other, which is a real source of security incidents.

### The tRPC Approach

tRPC assumes that **both your frontend and backend are TypeScript** and share types. It has no schema files—the server code itself is the contract:

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
        authorName: author.name,        // Note: return a flat structure directly
        comments: comments.map((c) => ({ body: c.body })),
      };
    }),
});

export type AppRouter = typeof appRouter;
```

The client doesn't need generated code or hand-written types; the **type** of `AppRouter` is passed in via `import type`:

```ts
// client.ts
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './server/router';

const trpc = createTRPCProxyClient<AppRouter>({
  links: [httpBatchLink({ url: '/api/trpc' })],
});

const page = await trpc.postPage.query({ id: '42' });
page.authorName;   // ✅ Auto-completed, type is string
page.author;       // ❌ Compile error: Property 'author' does not exist
```

Rename `authorName` to `author`, and you only need to change one place on the server—all frontend call sites immediately fail at compile time. This is tRPC's biggest selling point: **refactoring cost drops from "runtime 500" to "compile-time red squiggly line"**.

The trade-off is equally clear: once your consumers are iOS, Android, Python scripts, or third-party partners, tRPC is immediately out of the picture—those environments can't access your TypeScript types.
## Side-by-Side Comparison

| Dimension | REST | GraphQL | tRPC |
|------|------|---------|------|
| Client controls response shape | No (requires aggregation endpoints/sparse fieldsets) | Yes | Partial (one shape per procedure) |
| Number of requests | Multiple for multiple resources | One | One (can use batch link to merge multiple) |
| Type safety | Requires OpenAPI + code generation | Requires codegen (e.g., GraphQL Code Generator) | Built-in natively, zero generation |
| HTTP caching | ✅ CDN/browser cache works directly | ⚠️ Basically POST-only, requires persisted queries or special CDN support | ⚠️ POST by default, needs manual handling |
| Cross-language consumers | ✅ Any language | ✅ Any language | ❌ TypeScript only |
| Version evolution | URL versioning (/v2/) or Header | Field-level `@deprecated`, no version numbers needed | Compile-time sync, no versioning concept |
| Learning curve | Low | High (Schema, resolvers, N+1, authorization) | Low (if you know TS, you know it) |
| Typical complex query cost | Low | High (requires query depth limits, complexity analysis) | Low (fixed shape) |

## The Real Pitfalls of Each

**REST's pitfall is evolution.** Deleting a field is nearly impossible—you never know which caller is still reading it. Once the `authorId` returned by `GET /api/posts/42` is public, it's a de facto contract. In practice, the approach is "adding fields freely, deleting fields cautiously, breaking changes go through a new version."

**GraphQL's pitfall is runtime cost.** Clients can freely compose query trees, which means they can also compose a malicious one:

```graphql
query Evil {
  post(id: 1) { comments { author { posts { comments { author { posts { ... } } } } } } }
}
```

Cyclic nested queries can bring down your database. In production you must do three things: **query depth limiting**, **node-count-based complexity scoring** (rejecting queries that exceed a threshold), and **mandatory persisted queries** (only allowing execution of pre-registered query texts). Additionally, GraphQL authorization is trickier—`post(id: 1) { author { email } }` needs permission checks in each field resolver, rather than a one-time check at the routing layer.

**tRPC's pitfall is boundaries.** It assumes "same repo, same language for frontend and backend" as a default premise. Once you want to expose an API to external parties, you have to write a separate REST or GraphQL gateway alongside tRPC—and at that point you'll start wondering whether you should have just gone with OpenAPI in the first place.

## Choosing Your Approach

Answer the following questions in order, and basically only one answer will remain:

1. **Are the only consumers your own TypeScript frontend?** → If yes, **tRPC**—the developer experience crushes the other two.
2. **Are there non-JS consumers (mobile, third parties, partners)?** → If yes, rule out tRPC.
3. **Do client data requirements vary widely, or are there so many pages that aggregation endpoints can't keep up?** → If yes, **GraphQL** (typical scenarios: multiple clients sharing one API, frontend field requirements changing frequently).
4. **Everything else** → **REST + OpenAPI**. It's the most boring and most stable choice: CDN caching works directly, debugging with curl is enough, any language, any era can integrate. Boring is a virtue here.

A pragmatic combination is **layering**: expose REST or GraphQL externally, use tRPC internally for the parts where frontend and backend are isomorphic; the GraphQL gateway then aggregates downstream REST microservices. These three paradigms are not mutually exclusive religions, but different tools at different boundaries.

## Conclusion

The point of divergence among the three paradigms is really just one: **Who decides the shape of the returned data, and when?** REST has the server decide at deploy time, GraphQL has the client decide at request time, and tRPC has the type system decide at compile time. Once you think clearly about "who best understands the data shape" in your system and "how frequently that shape changes," choosing becomes less a matter of taking sides.

---

## References

- [GraphQL Official Docs — Introduction to GraphQL](https://graphql.org/learn/)
- [GraphQL Official Docs — Security: Query Depth and Complexity Limiting](https://graphql.org/learn/security/)
- [DataLoader — Official GitHub Repository (solving N+1 queries)](https://github.com/graphql/dataloader)
- [tRPC Official Docs — Introduction](https://trpc.io/docs/)
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)
- [Microsoft Azure Architecture Center — API design best practices](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design)
- [GraphQL over HTTP Specification](https://graphql.github.io/graphql-over-http/draft/)