---
title: 'Understanding the React Server Components Rendering Model: Flight Protocol, Serialization, and Streaming'
published: 2026-09-21
description: 'Open up the black box of React Server Components: walk through the Flight wire format line by line, figure out which values can cross the wire, and see how Suspense boundaries enable streaming that sends the shell first and fills in the gaps later, with hands-on packet capture and debugging methods.'
image: ''
tags: [Frontend, React, Server Components, RSC, Flight, Streaming]
category: Frontend
draft: false
---
After React 19 turned Server Components from an experimental feature into the default architecture, most people's approach is "add one line of `'use client'`, then pray." That's enough for everyday use, but you get stuck as soon as you hit these situations:

- A server component's props pass a class instance, and at runtime you get an inscrutable serialization error;
- You clearly only changed a single number, yet the Network panel shows an extra `?_rsc=1a2b3` request;
- The page's first paint is fast, but some slow component just won't show up, and you don't know whether to blame the database or the rendering.

The answers to these questions are all hidden in a protocol called **Flight**. This article doesn't repeat the basic concepts of "what is RSC" (that part was covered in [React 19 Stable Release: Server Components Become the Default Architecture](/posts/react-19-stable-release/)); instead, it takes Flight apart: what exactly it sends over the network, which values can cross the wire, and how "the Suspense boundary first takes a placeholder, then fills it in" is implemented at the byte level.

Every payload in this article was **actually run on React 19.3.0 + Node 22**, not copied from the docs—the last section gives a reproduction script.

## 1. The problem with SSR: HTML is a snapshot with no structure

To understand why a new protocol is needed, first look at what it replaced.

The output of traditional SSR is an HTML string. It's friendly to humans, unfriendly to machines:

```tsx
// Server: render into an HTML string
const html = renderToString(<App post={post} />)
// => "<div class=\"post\"><h1>Title</h1><p>Body...</p></div>"
```

In this HTML, **component boundaries, props, and data types are all lost**. What the client gets is just a pile of DOM nodes. So to update any small part of the page, there are only two paths:

1. **Re-render the whole page**—request the HTML again, and the user sees a full-page refresh;
2. **Write another JSON API**—manually move the data from the database again, maintaining a copy of the data shape on both the frontend and backend.

The first path sacrifices experience; the second sacrifices development efficiency: the same page requires maintaining two sets of code, "rendering logic" and "data interface."

RSC's idea is to change what gets transmitted: **don't send HTML, send a UI description**. This description must be able to carry component types, props, and placeholders for "there will be content here later." It must be a format that machines can understand and that can be streamed—this is Flight.

:::note
Flight is an implementation detail of React, not a public data interface for business use. Its format changes with React versions, and you should **not** let client code parse it. Understanding it is for debugging, not for depending on it.
:::

## 2. Flight's two halves and the wire format

There are two paired packages in the official React repository; understanding this pair is the prerequisite for understanding the protocol:

| Package | Runtime environment | Responsibility |
| --- | --- | --- |
| The **server** entry of `react-server-dom-*` | Server | Renders Server Components and **serializes** the result into a Flight payload |
| The **client** entry of `react-server-dom-*` | Client | Receives the payload, **deserializes** it into a React element tree, and hands it to the reconciler |

The key point is: **Flight's serialization is not `JSON.stringify`**. React elements, client component references, server function references, and Promises are not things JSON can express. So React defines its own wire format.

### One chunk per line

The payload is a series of **lines**, each shaped like `<十六进制 id>:<载荷>`, separated by newlines. The line with the shortest id (`0`) is the root model, and the remaining lines each carry an "externalized object."

Below is a real output, with line breaks and indentation added for readability (the original has each chunk on one line):

```
1:"my-client-module"
2:"static/chunks/client.js"
3:I["$1",["$2"],"Button"]
0:["$","div",null,{"children":[
     ["$","h1",null,{"children":"Title"}],
     ["$","$L3",null,{"label":"hi"}]
   ]}]
```

Taking it apart:

- `0:` is the root. **A React element is encoded as a four-tuple** `["$", type, key, props]`—`"$"` is the element sentinel, `type` can be the string `"h1"` or a reference to another line like `"$L3"`, the third is the key, and the fourth is the props.
- `3:I[...]` is an **Import line**; `I` indicates that this is metadata for a client module: module id, chunk file, export name. So the way a client component is encoded is "send a **signpost**"—the server doesn't execute it, it just tells the client where to load it from.
- The `$L` in `"$L3"` is lazy: after the client receives it, it wraps it in a `React.lazy` to load and register this module.

### Value encoding prefixes

Primitive types (strings, numbers, booleans, `null`) are directly JSON literals. Things JSON can't express use the `$` prefix, which is also why **ordinary strings starting with `$` must be escaped**.

| Value | Wire encoding | Notes |
| --- | --- | --- |
| `undefined` | `$undefined` | |
| `Infinity` / `-0` / `NaN` | `$Infinity` / `$-0` / `$NaN` | Special numeric values JSON can't express |
| `Date` | `$D` + ISO string | Restored on the client into a real `Date` instance |
| `BigInt` | `$n` + number | |
| `Map` | `$Q<id>` | Content externalized as `id:[["k","v"]]` |
| `Set` | `$W<id>` | Content externalized as `id:[v1,v2]` |
| Global Symbol | `$S` + name | Externalized as `id:"$S名称"` |
| Another chunk | `$<id>` | Pure reference |
| Some path in an already-resolved chunk | `$<id>:<path>` | Used for repeated references and circular references |
| Promise | `$@<id>` | The value arrives later with that chunk |
| The literal `$` | `$$` | Escaped; the client strips one layer |

A few real fragments:

```jsonc
// Date / BigInt / Map / Set / NaN
{"date":"$D2026-09-21T10:30:00.000Z","bigint":"$n123","map":"$Q7","set":"$W8","nan":"$NaN"}
// Corresponding external row
7:[["a",1]]
8:[1,2]

// Literal $ gets escaped
{"dollar":"$$100 dollars"}   // Client receives "$100 dollars"

// Symbol.for('my.symbol')
{"sym":"$a"}   加上   a:"$Smy.symbol"
```

### Binary lines

Not all lines are JSON. Binary data (`TypedArray`, `ArrayBuffer`, long text) uses another line format: **line number + single-character tag + hexadecimal byte length + `,` + raw bytes**.

```js
new Uint8Array([72, 101, 108, 108, 111])   // "Hello"
```

On the wire it's:

```
9:o5,Hello
```

`o` is the tag for `Uint8Array`, `5` is the byte length in **hexadecimal**, followed directly by the raw bytes. This path is used instead of JSON escaping because once binary data is JSON-escaped into an array, its size balloons several times over.
## 3. Boundaries of the Serialization Rules

Which values can cross the wire — many claims floating around online are outdated. The table below is the result of **testing each one individually** (passing a value as props to a client component and seeing whether it errors):

| Value | Can it cross? | Notes |
| --- | --- | --- |
| Plain objects / arrays / primitives | ✅ | |
| `Date` | ✅ | What the client receives is a `Date` instance, **no need** to `toISOString()` first |
| `Map` / `Set` | ✅ | **No need** to convert to an array or `Object.fromEntries()` |
| `BigInt` | ✅ | |
| `TypedArray` / `ArrayBuffer` | ✅ | Goes over the binary row |
| Global Symbol (`Symbol.for`) | ✅ | |
| Promise | ✅ | Consumed with client-side `use()` |
| JSX elements | ✅ | |
| **Circular references / duplicate references** | ✅ | See below |
| Local Symbol (`Symbol('x')`) | ❌ | Only unique within the current process; the client can't reconstruct it |
| `WeakMap` / `WeakSet` | ❌ | Cannot be enumerated |
| class instances | ❌ | **The most common pitfall** |
| Plain functions | ❌ | Unless marked with `'use server'` |

Real errors look like this — recognizing them basically lets you pinpoint the problem instantly:

```
Only plain objects, and a few built-ins, can be passed to Client Components
from Server Components. Classes or null prototypes are not supported.
```

```
Functions cannot be passed directly to Client Components unless you explicitly
expose it by marking it with "use server".
```

```
Only global symbols received from Symbol.for(...) can be passed to Client Components.
```

### Circular references can actually cross the wire

Many articles (including some AI-generated best-practice checklists) will tell you "RSC doesn't support circular references." **Testing shows this is wrong.**

```js
const cir = { name: 'a' }
cir.self = cir
const shared = { tag: 'shared' }
render(<Client user={cir} s1={shared} s2={shared} />)
```

The actual payload is:

```jsonc
0:["$","div",null,{"children":["$","$L1",null,{
     "c":{"name":"a","self":"$0:props:children:props:c"},
     "s1":{"tag":"shared"},
     "s2":"$0:props:children:props:s1"}
   }]}]
```

The mechanism is **path references**: `$0:props:children:props:c` means "go to the root chunk, follow this path, and that's me." The second `shared` similarly becomes a path reference to `s1` — so not only does it support cycles, it also incidentally does **identity deduplication**: the same object appearing in two places is still the same object after serialization, and `===` holds.

This also explains why it doesn't recurse infinitely: the second time it encounters the same object, it just writes the path and doesn't expand again.

### The real pitfall: class instances

`Date`, `Map`, `Set` can all cross the wire — only class instances can't, even if all their fields are plain data:

```js
class User {
  constructor(name) { this.name = name }
  greet() { return 'hi' }     // The client can't get this method, so the whole instance can't cross over
}
```

In the real world this pitfall usually comes from ORMs: the vast majority of ORM queries don't return plain objects, but entity class instances with prototypes (Prisma, TypeORM, Sequelize all do this). So "query it out and stuff it straight into a client component" easily blows up at runtime.

The fix is to explicitly pick fields rather than throwing the whole entity over:

```tsx
// ❌ Boom: user is an ORM entity instance
<Profile user={user} />

// ✅ Explicitly construct a plain object
<Profile user={{ id: user.id, name: user.name }} />
```

TypeScript can't catch this error — at the type level `User` is perfectly legal; the problem only surfaces at runtime.

## 4. Streaming Rendering: Send the Shell First, Fill the Holes Later

The payloads we've seen so far were sent all at once. Real streaming happens when there's **asynchronous content**.

Look at an example with Suspense: a slow component (`await` a Promise that resolves after 1 second) wrapped in `<Suspense>`. The actual output order looks like this (irrelevant lines omitted):

```jsonc
// ① Send the shell first: chunk 0 arrives immediately, the slow component's position is a lazy placeholder
0:["$","div",null,{"children":[
     ["$","h1",null,{"children":"快速标题"}],
     ["$","$5",null,{"fallback":["$","p",null,{"children":"loading..."}],
                     "children":"$L6"}]     // ← Slot: points to chunk 6
   ]}]

// ② ...1 second passes, only then does the server fill in chunk 6
6:["$","p",null,{"children":"服务端慢数据"}]
```

The key is **`"children":"$L6"`**: in the shell, this position is first written as a "lazy reference pointing to chunk 6." Once the client gets the shell, it can immediately render the title and fallback — no need to wait for the slow component at all. When chunk 6 arrives, React swaps the fallback for the real content.

Note that chunk 6 **appears far after chunk 0** — this is exactly the literal meaning of "out-of-order streaming": content is emitted in **readiness order**, not in tree order. Components lower on the page can absolutely arrive before ones above them.

Promises go through the same mechanism, with the prefix `$@`:

```jsonc
0:["$","div",null,{"children":[
     ["$","p",null,{"children":["promise:","$@1"]}]
   ]}]
1:"异步值"
```

The Promise is replaced in its original line by its **resolved value**. If the Promise is rejected, an error line appears:

```jsonc
2:E{"digest":""}
```

`E` is the error tag, and `digest` is the error digest the server prepares for production — the raw error message doesn't cross the wire (to avoid leaking server-side details); the client gets the digest and needs to match it against server logs.

### This mechanism explains three things

**Why slow components don't hold up the first paint.** First-paint time depends on when the shell finishes sending, not on when the slowest piece of data comes back. Multiple Suspense boundaries each fill their own holes independently; the slowest one only affects its own section.

**Why total time is "the slowest" rather than "the sum."** Each boundary sends as soon as it's ready; the total time for several concurrent queries is determined by the slowest one, not the sum.

**Why changing a single number triggers a `?_rsc=` request.** Client-side navigation doesn't need the full HTML page — just the new Flight payload. Server components may have already re-rendered or need to re-render, so the payload has to be regenerated and sent again. This is also why `?_rsc=xxxx` requests keep showing up in the Network panel of RSC apps, and why the response headers contain `Content-Type: text/x-component`.

## 5. Capture It Yourself

All the payloads above can be reproduced on your own with 20 lines of code. Install two packages:

```bash
npm i react@19 react-server-dom-webpack@19
```

Then call the low-level server rendering API directly (note `--conditions=react-server`, otherwise Node will resolve to the client React build):

```js
// probe.js
const React = require('react')
const { renderToPipeableStream } = require('react-server-dom-webpack/server.node')
const { PassThrough } = require('stream')
const h = React.createElement

const tree = h('div', null,
  h('p', null, 'date:', new Date('2026-09-21T10:30:00.000Z')),
  h('p', null, 'map:', new Map([['a', 1]])),
  h('p', null, 'dollar:', '$100 dollars'),
)

const pass = new PassThrough()
let raw = ''
pass.on('data', (c) => (raw += c))
pass.on('end', () => { console.log(raw); process.exit(0) })

// When there are no client components, the webpack module table can just pass an empty object
renderToPipeableStream(tree, {}).pipe(pass)
```

```bash
NODE_ENV=production node --conditions=react-server probe.js
```

The output is the real wire format.

:::note
**When debugging, note that dev and prod payloads differ.** The development build **adds two extra slots** after the element quadruple (owner and call stack), and also emits an extra batch of debug lines starting with `D` plus a separate debug channel. So the payload you capture in development is much "fatter" than in production — don't use it to infer production behavior. All the examples above were captured under `NODE_ENV=production`.
:::

To capture it in the browser, look in the Network panel for the request where `Content-Type` is `text/x-component` — that's the Flight response.
## 6. Four Common Misconceptions

**Misconception 1: RSC is an upgraded version of SSR.** No, the two solve different problems. SSR solves "the first screen needs HTML"; RSC solves "server components don't go into the client bundle, and the UI description can be transmitted independently." The two can coexist (as they do in Next.js), or only one of them can be present.

**Misconception 2: A Server Component is just "a React component that runs on the server."** The key is that **it does not get compiled into the client bundle**. The database drivers, secrets, and tens of KB of markdown parsers it depends on all stay on the server. What this brings is a size benefit, not a "where it runs" benefit.

**Misconception 3: The Flight payload is an API for external consumption.** Treating it as an API to be parsed is equivalent to welding yourself to React's internal implementation. If you need to expose data externally, just write an API honestly.

**Misconception 4: All components "cross the wire" by default.** Quite the opposite: **by default they don't cross the wire**. Only modules marked with `'use client'` get replaced with references and sent to the client, and only functions marked with `'use server'` become callable references.

## 7. Summary

What the Flight protocol does can be summed up in one sentence: **encode a tree of React elements into lines of text that can arrive out of order and be filled in later.**

Looking back from this perspective, many phenomena fall into place:

- Why server component props can't pass functions—because what crosses the wire must be **data**, and functions can only become **references**;
- Why a slow component doesn't hold up the first screen—because its position can first be held with `$L<id>`, and the content is filled in afterward as a new line;
- Why changing a single number triggers an extra `?_rsc=` request—because the server component may have already re-rendered or needs to re-render, and the payload needs to be regenerated.

The value of RSC is not in the act of "running on the server" itself, but in **making what is transmitted between server and client no longer the final product, but a UI description that can be incrementally completed**. Once you understand this, where `'use client'` should be added, what shouldn't be stuffed into props, and which layer of Suspense a slow component should be wrapped in will all go from "gut feeling" to "well-grounded."

## References

- [React official docs: Server Components](https://react.dev/reference/rsc/server-components)
- [React official docs: Server Functions](https://react.dev/reference/rsc/server-functions)
- [React official docs: `use` API](https://react.dev/reference/react/use)
- [React repository: `react-server-dom-webpack` source code (wire format and serialization implementation)](https://github.com/facebook/react/tree/main/packages/react-server-dom-webpack)
- [React PR #28847: Flight encoding ReadableStream and AsyncIterable](https://github.com/facebook/react/pull/28847)

> All payloads in this article were obtained by actually running `NODE_ENV=production` under React 19.3.0 / Node.js 22.22.1.