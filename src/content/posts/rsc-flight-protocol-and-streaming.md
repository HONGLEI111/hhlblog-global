---
title: 深入理解 React Server Components 渲染模型：Flight 协议、序列化与流式渲染
published: 2026-09-21
description: '打开 React Server Components 的黑盒：逐行拆解 Flight 线格式、搞清哪些值能过线、以及 Suspense 边界如何做到「先发壳、后补坑」的流式渲染，附可上手的抓包与调试方法。'
image: ''
tags: [前端, React, Server Components, RSC, Flight, 流式渲染]
category: '前端'
draft: false
lang: ''
---

React 19 让 Server Components 从实验特性变成默认架构之后，大多数人的使用方式是「加一行 `'use client'`，然后祈祷」。日常够用，但一旦遇到这些情况就会卡住：

- 服务端组件的 props 传了个 class 实例，运行时报了一个看不懂的序列化错误；
- 明明只是改了一个数字，Network 面板里却多出一条 `?_rsc=1a2b3` 的请求；
- 页面首屏很快，但某个慢组件迟迟不出现，你不知道该怪数据库还是怪渲染。

这些问题的答案，都藏在一个叫 **Flight** 的协议里。本文不重复「RSC 是什么」的基础概念（那部分在[《React 19 稳定版发布》](/posts/react-19-stable-release)里讲过），而是把 Flight 拆开看：它到底在网络上发了些什么、哪些值能过线、以及「Suspense 边界先占坑、后填坑」在字节层面是怎么实现的。

文中的每一段 payload 都是在 **React 19.3.0 + Node 22 上实跑出来的**，不是从文档抄的——最后一节会给出复现脚本。

## 一、SSR 的问题：HTML 是一张没有结构的快照

要理解为什么需要新协议，先看它替换掉了什么。

传统 SSR 的产物是 HTML 字符串。它对人友好，对机器不友好：

```tsx
// 服务端：渲染成一段 HTML 字符串
const html = renderToString(<App post={post} />)
// => "<div class=\"post\"><h1>标题</h1><p>正文...</p></div>"
```

这段 HTML 里，**组件边界、props、数据类型全都丢失了**。客户端拿到的只是一堆 DOM 节点。于是想更新页面上的任何一小块，只有两条路：

1. **整页重渲染**——重新请求一次 HTML，用户看到的是整页刷新；
2. **再写一套 JSON API**——手工把数据从数据库搬一遍，前后端各维护一份数据形状。

第一条路牺牲了体验，第二条路牺牲了研发效率：同一个页面要维护「渲染逻辑」和「数据接口」两套代码。

RSC 的思路是换一种传输物：**不发 HTML，发 UI 描述**。这份描述要能携带组件类型、props、以及"这里稍后会有内容"的占位符。它必须是一个机器能懂、且能流式传输的格式——这就是 Flight。

:::note
Flight 是 React 的实现细节，不是一个给业务用的公开数据接口。它的格式会随 React 版本变化，**不要**让客户端代码去解析它。理解它是为了会调试，不是为了依赖它。
:::

## 二、Flight 的两半与线格式

React 官方仓库里有两个成对的包，理解这一对是理解协议的前提：

| 包 | 运行环境 | 职责 |
| --- | --- | --- |
| `react-server-dom-*` 的 **server** 入口 | 服务端 | 渲染 Server Components，把结果**序列化**成 Flight payload |
| `react-server-dom-*` 的 **client** 入口 | 客户端 | 接收 payload，**反序列化**成 React 元素树，交给 reconciler |

关键在于：**Flight 的序列化不是 `JSON.stringify`**。React 元素、客户端组件引用、服务端函数引用、Promise 这些都不是 JSON 能表达的东西。所以 React 自己定义了一套线格式。

### 一行一个 chunk

payload 是一串**行**，每行形如 `<十六进制 id>:<载荷>`，行之间用换行分隔。id 最短的那一行（`0`）是根模型，其余行各自承载一个「被外置的对象」。

下面是一份真实输出，为了可读性做了换行和缩进（原文是每个 chunk 占一行）：

```
1:"my-client-module"
2:"static/chunks/client.js"
3:I["$1",["$2"],"Button"]
0:["$","div",null,{"children":[
     ["$","h1",null,{"children":"标题"}],
     ["$","$L3",null,{"label":"hi"}]
   ]}]
```

拆开看：

- `0:` 是根。**React 元素被编码成四元组** `["$", type, key, props]`——`"$"` 是元素哨兵，`type` 可以是字符串 `"h1"`，也可以是 `"$L3"` 这样指向另一行的引用，第三个是 key，第四个是 props。
- `3:I[...]` 是一个 **Import 行**，`I` 表示这是个客户端模块的元信息：模块 id、chunk 文件、导出名。所以客户端组件的编码方式是「发一个**指路牌**」——服务端不执行它，只告诉客户端去哪儿加载。
- `"$L3"` 里的 `$L` 是 lazy：客户端拿到后会包一层 `React.lazy` 来加载和注册这个模块。

### 值的编码前缀

基础类型（字符串、数字、布尔、`null`）直接就是 JSON 字面量。JSON 表达不了的走 `$` 前缀，这也是为什么**以 `$` 开头的普通字符串要被转义**。

| 值 | 线上编码 | 说明 |
| --- | --- | --- |
| `undefined` | `$undefined` | |
| `Infinity` / `-0` / `NaN` | `$Infinity` / `$-0` / `$NaN` | JSON 表达不了的特殊数值 |
| `Date` | `$D` + ISO 字符串 | 到客户端还原成真正的 `Date` 实例 |
| `BigInt` | `$n` + 数字 | |
| `Map` | `$Q<id>` | 内容外置成 `id:[["k","v"]]` |
| `Set` | `$W<id>` | 内容外置成 `id:[v1,v2]` |
| 全局 Symbol | `$S` + 名称 | 外置成 `id:"$S名称"` |
| 另一个 chunk | `$<id>` | 纯引用 |
| 已解析 chunk 中的某个路径 | `$<id>:<path>` | 用于重复引用与循环引用 |
| Promise | `$@<id>` | 值随该 chunk 稍后送达 |
| 字面量 `$` | `$$` | 转义，客户端会剥掉一层 |

几个真实片段：

```jsonc
// Date / BigInt / Map / Set / NaN
{"date":"$D2026-09-21T10:30:00.000Z","bigint":"$n123","map":"$Q7","set":"$W8","nan":"$NaN"}
// 对应的外置行
7:[["a",1]]
8:[1,2]

// 字面量 $ 会被转义
{"dollar":"$$100 dollars"}   // 客户端拿到 "$100 dollars"

// Symbol.for('my.symbol')
{"sym":"$a"}   加上   a:"$Smy.symbol"
```

### 二进制行

不是所有行都是 JSON。二进制数据（`TypedArray`、`ArrayBuffer`、长文本）走另一种行格式：**行号 + 单字符 tag + 十六进制字节长度 + `,` + 原始字节**。

```js
new Uint8Array([72, 101, 108, 108, 111])   // "Hello"
```

在线上就是：

```
9:o5,Hello
```

`o` 是 `Uint8Array` 的 tag，`5` 是**十六进制**的字节长度，后面直接跟原始字节。走这条路而不是 JSON 转义，是因为二进制数据一旦按 JSON 转义成数组，体积会膨胀好几倍。

## 三、序列化规则的边界

哪些值能过线，网上流传的说法有不少是过时的。下面这张表是**逐个实测**的结果（把一个值作为 props 传给客户端组件，看是否报错）：

| 值 | 能否过线 | 备注 |
| --- | --- | --- |
| 普通对象 / 数组 / 原始类型 | ✅ | |
| `Date` | ✅ | 客户端拿到的是 `Date` 实例，**不需要**先 `toISOString()` |
| `Map` / `Set` | ✅ | **不需要**转成数组或 `Object.fromEntries()` |
| `BigInt` | ✅ | |
| `TypedArray` / `ArrayBuffer` | ✅ | 走二进制行 |
| 全局 Symbol（`Symbol.for`） | ✅ | |
| Promise | ✅ | 配合客户端 `use()` 消费 |
| JSX 元素 | ✅ | |
| **循环引用 / 重复引用** | ✅ | 见下 |
| 局部 Symbol（`Symbol('x')`） | ❌ | 只在当前进程内唯一，客户端无法还原 |
| `WeakMap` / `WeakSet` | ❌ | 无法枚举 |
| class 实例 | ❌ | **最常见的坑** |
| 普通函数 | ❌ | 除非标了 `'use server'` |

真实报错长这样，认准它们基本能秒定位问题：

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

### 循环引用其实能过线

很多文章（包括一些 AI 生成的最佳实践清单）会告诉你「RSC 不支持循环引用」。**实测这条是错的。**

```js
const cir = { name: 'a' }
cir.self = cir
const shared = { tag: 'shared' }
render(<Client user={cir} s1={shared} s2={shared} />)
```

真实的 payload 是：

```jsonc
0:["$","div",null,{"children":["$","$L1",null,{
     "c":{"name":"a","self":"$0:props:children:props:c"},
     "s1":{"tag":"shared"},
     "s2":"$0:props:children:props:s1"}
   }]}]
```

机制是**路径引用**：`$0:props:children:props:c` 的意思是「去根 chunk，按这条路径走，就是我」。第二个 `shared` 同理变成了对 `s1` 的路径引用——所以它不仅支持环，还顺带做了**身份去重**：同一个对象在两处出现，序列化后仍是同一个对象，`===` 成立。

这也解释了为什么它不会无限递归：第二次遇到同一个对象时，直接写路径，不再展开。

### 真正的坑：class 实例

`Date`、`Map`、`Set` 都能过线，唯独 class 实例不行——哪怕它所有字段都是普通数据：

```js
class User {
  constructor(name) { this.name = name }
  greet() { return 'hi' }     // 这个方法客户端拿不到，所以整个实例都过不去
}
```

真实世界里这个坑通常来自 ORM：绝大多数 ORM 查询返回的都不是纯对象，而是带原型的实体类实例（Prisma、TypeORM、Sequelize 都是）。所以「查出来直接塞给客户端组件」很容易在运行时炸。

修法是显式挑字段，而不是把整个实体丢过去：

```tsx
// ❌ 炸：user 是 ORM 实体实例
<Profile user={user} />

// ✅ 显式构造纯对象
<Profile user={{ id: user.id, name: user.name }} />
```

TypeScript 拦不住这个错误——类型上 `User` 完全合法，问题只在运行时才暴露。

## 四、流式渲染：先发壳，后补坑

前面看到的 payload 是一次性发完的。真正的流式发生在**有异步内容**的时候。

看一个带 Suspense 的例子：一个慢组件（`await` 一个 1 秒后才 resolve 的 Promise）包在 `<Suspense>` 里。真实的输出顺序是这样的（中间省略无关行）：

```jsonc
// ① 先发壳：chunk 0 立刻到达，慢组件的位置是一个 lazy 占位
0:["$","div",null,{"children":[
     ["$","h1",null,{"children":"快速标题"}],
     ["$","$5",null,{"fallback":["$","p",null,{"children":"loading..."}],
                     "children":"$L6"}]     // ← 坑位：指向 chunk 6
   ]}]

// ② …1 秒过去，服务端才把 chunk 6 补上
6:["$","p",null,{"children":"服务端慢数据"}]
```

关键在于 **`"children":"$L6"`**：壳里这个位置先写成一个「指向 chunk 6 的 lazy 引用」。客户端拿到壳就能立刻渲染标题和 fallback，根本不需要等慢组件。等 chunk 6 到达，React 把 fallback 换成真实内容。

注意 chunk 6 **出现在 chunk 0 之后很远的位置**——这正是「乱序流式」的字面含义：内容按**就绪顺序**发出，而不是按树里的顺序。页面上从下往上的组件，完全可能比上面的先到。

Promise 走的是同一套机制，前缀是 `$@`：

```jsonc
0:["$","div",null,{"children":[
     ["$","p",null,{"children":["promise:","$@1"]}]
   ]}]
1:"异步值"
```

Promise 被 **resolve 后的值**替换掉原来那一行的位置。如果 Promise 被 reject，出现的是错误行：

```jsonc
2:E{"digest":""}
```

`E` 是错误 tag，`digest` 是服务端为生产环境准备的错误摘要——原始错误信息不会跨线传输（避免泄露服务端细节），客户端拿到的是 digest，需要靠服务端日志去对。

### 这套机制解释了三件事

**为什么慢组件不会拖住首屏。** 首屏时间取决于壳什么时候发完，而不是最慢的那个数据什么时候回来。多个 Suspense 边界各自独立补坑，最慢的那个只影响它自己那块。

**为什么总耗时是「最慢的」而不是「累加的」。** 每个边界一就绪就立刻发，几个并发查询的总时间由最慢的那个决定，而不是求和。

**为什么改一个数字会触发 `?_rsc=` 请求。** 客户端导航时不需要整页 HTML，只要新的 Flight payload——服务端组件可能已经或需要重新渲染，所以 payload 要重新生成再传一遍。这也是为什么 RSC 应用的 Network 面板里会反复出现 `?_rsc=xxxx` 这种请求，以及响应头里为什么会有 `Content-Type: text/x-component`。

## 五、自己抓一次

上面所有 payload 都能自己复现，20 行代码就够。装两个包：

```bash
npm i react@19 react-server-dom-webpack@19
```

然后直接调底层的服务端渲染 API（注意 `--conditions=react-server`，否则 Node 会解析到客户端的 React 构建）：

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

// 没有客户端组件时，webpack 模块表传空对象即可
renderToPipeableStream(tree, {}).pipe(pass)
```

```bash
NODE_ENV=production node --conditions=react-server probe.js
```

输出就是真实的线格式。

:::note
**调试时要注意 dev 和 prod 的 payload 不一样。** 开发构建会在元素四元组后面**多补两个槽位**（owner 和调用栈），还会额外发一批 `D` 开头的调试行和一条独立的调试通道。所以你在开发环境抓到的 payload 会比生产环境"胖"很多，别照着它去推生产行为。上面所有示例都是 `NODE_ENV=production` 下抓的。
:::

浏览器里抓的话，看 Network 面板里 `Content-Type` 为 `text/x-component` 的请求——它就是 Flight 的响应。

## 六、四个常见误解

**误解一：RSC 是 SSR 的升级版。** 不是，两者解决的问题不同。SSR 解决的是"首屏要有 HTML"，RSC 解决的是"服务端组件不进客户端 bundle，且 UI 描述可以独立传输"。两者可以同时存在（Next.js 里就是），也可以只有其中一个。

**误解二：Server Component 就是"在服务器上运行的 React 组件"。** 关键在于**它不会被编译进客户端 bundle**。它依赖的数据库驱动、密钥、几十 KB 的 markdown 解析器都留在服务端。这一点带来的是体积收益，不是"运行位置"的收益。

**误解三：Flight payload 是给外部消费的 API。** 把它当成 API 去解析，等于把自己焊死在 React 的内部实现上。需要对外提供数据，还是老老实实写 API。

**误解四：所有组件默认都会"过线"。** 恰恰相反：**默认不过线**。只有 `'use client'` 标记的模块才会被替换成引用发到客户端，只有 `'use server'` 标记的函数才会变成可调用的引用。

## 七、总结

Flight 协议做的事，可以概括成一句话：**把一棵 React 元素树，编码成一条条可以乱序到达、可以延后填充的文本行。**

从这个视角回看，很多现象就顺理成章了：

- 为什么服务端组件的 props 不能传函数——因为过线的东西必须是**数据**，函数只能变成**引用**；
- 为什么慢组件不会拖住首屏——因为它的位置可以先用 `$L<id>` 占住，内容随后以新的一行补上；
- 为什么改一个数字会触发额外的 `?_rsc=` 请求——因为服务端组件可能已经或需要重新渲染，payload 需要重新生成。

RSC 的价值不在于"跑在服务端"这个动作本身，而在于**让服务端与客户端之间传输的不再是最终产物，而是可以增量补全的 UI 描述**。理解了这一点，`'use client'` 该加在哪、什么东西不该往 props 里塞、慢组件该裹哪一层 Suspense，都会从"凭感觉"变成"有依据"。

## 参考资料

- [React 官方文档：Server Components](https://react.dev/reference/rsc/server-components)
- [React 官方文档：Server Functions](https://react.dev/reference/rsc/server-functions)
- [React 官方文档：`use` API](https://react.dev/reference/react/use)
- [React 仓库：`react-server-dom-webpack` 源码（线格式与序列化实现）](https://github.com/facebook/react/tree/main/packages/react-server-dom-webpack)
- [React PR #28847：Flight 编码 ReadableStream 与 AsyncIterable](https://github.com/facebook/react/pull/28847)

> 文中所有 payload 均在 React 19.3.0 / Node.js 22.22.1 下以 `NODE_ENV=production` 实跑取得。
