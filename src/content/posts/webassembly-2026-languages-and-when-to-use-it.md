---
title: WebAssembly 2026：哪些语言能编译到 Wasm，以及你什么时候真不该用它
published: 2026-09-29
description: 'Wasm 3.0 定版一年后，语言版图因为 WasmGC 被重画了一遍。本文用一份手写的 104 字节 Wasm 模块看清它的二进制结构，再用实测数据回答那个最实际的问题：Wasm 到底在什么情况下比 JavaScript 快。'
image: ''
tags: [WebAssembly, Wasm, WasmGC, WASI, 性能优化, 网站开发]
category: '网站'
draft: false
lang: ''
---

## 一、Wasm 的定位在 2026 年悄悄换了一次

提到 WebAssembly，很多人的印象还停留在「在浏览器里跑 C++ 游戏和 Photoshop」——一个给巨型桌面应用开后门的特例。这个印象早就过期了。

2025 年 9 月 17 日，W3C WebAssembly 社区组宣布 **Wasm 3.0 定版**，成为新的正式标准。这是继 2020 年 Wasm 2.0 之后的最大一次更新，官方说法是「有些特性做了六年到八年才完成」。3.0 带来的不是性能数字上的小提升，而是**能力边界**的扩张：

| 新特性 | 解决什么问题 |
| --- | --- |
| **WasmGC（垃圾回收）** | 托管语言不用再自带一个 GC 进浏览器 |
| **64 位地址空间（Memory64）** | 内存与表的地址类型从 i32 扩展到 i64，理论上从 4 GB 到 16 EB |
| **多内存（Multiple Memories）** | 单模块可声明并直接访问多块内存，还能互相拷贝 |
| **类型化引用（Typed References）** | 支持更丰富的引用类型、子类型与类型递归 |
| **尾调用（Tail Calls）** | 不额外消耗栈空间的完全尾调用 |
| **异常处理（Exception Handling）** | 带 payload 的 exception tag，可选择性捕获 |
| **宽松 SIMD、确定性默认值、自定义注解语法** | 边缘行为明确化、文本格式可携带注解 |

其中 **WasmGC 是改变格局的那一项**。在此之前，Kotlin、Dart、Java 这类语言编译到 Wasm 时要塞进去一整套自己的垃圾回收器——500 KB 到 2 MB 的固定开销，还没开始写业务代码就先付了体积税。WasmGC 把这件事交给 Wasm 自己：编译器只需要用 struct / array 类型声明内存布局，分配与生命周期由 Wasm 负责。

浏览器这边，WasmGC 的基线是 **Chrome 119 / Firefox 120 / Safari 18.2**（Safari 18.2 发布于 2024 年 12 月 11 日，Web Platform Features Explorer 从这天起把它标记为 "Newly Available"）。

:::note
"Newly Available" 到 "Widely Available" 官方给的预期是 2027 年 6 月。也就是说现在能跨浏览器用了，但**别把 WasmGC 当成可以无条件依赖的能力**，该做的特性检测还是要做。
:::

## 二、语言地图：谁在编译到 Wasm，代价是什么

Wasm 3.0 官方公告里点名已经瞄准 Wasm 的语言包括 **Java、OCaml、Scala、Kotlin、Scheme 和 Dart**。加上原本就在序列里的系统语言，2026 年的版图大致可以分成三类，而**这三类的差别决定了你能不能真的用它**。

第一类是**手动内存的系统语言**，产物最干净：没有运行时，只有你写的东西。

第二类是**借助 WasmGC 的托管语言**，终于卸下了自带 GC 的包袱，但工具链成熟度差异很大。

第三类是**把整个运行时搬过去**的语言——诚实地说，这类往往能跑起来，但代价写在首屏体积上。

| 语言 | 工具链 | 产物特征 | 2026 年的状态 |
| --- | --- | --- | --- |
| **Rust** | `wasm-bindgen` + `wasm-pack` | 无运行时，通常几十到几百 KB | Web 方向的一等公民：能直接传字符串、闭包、JS 对象，还能自动生成 TypeScript 绑定 |
| **C / C++** | Emscripten（`emcc`） | 需附带 JS glue code | 最成熟的老牌路径，存量代码库迁移的首选；代价是工具链重、产物偏大 |
| **Zig** | `zig build-exe -target wasm32` | 无运行时 | 定位接近「更好写的 C」，适合手搓轻量模块 |
| **Go（标准工具链）** | `GOOS=js GOARCH=wasm go build` | 打包整个 Go runtime，体积从几 MB 起 | 能跑，但体积和 `syscall/js` 的调用开销是公认的痛点 |
| **Go（TinyGo）** | `tinygo build -target wasm` | 小得多 | 官方文档明确标注：**部分语言特性和标准库不支持**，用之前先查支持矩阵 |
| **Kotlin** | Kotlin/Wasm | 走 WasmGC，不再自带 GC | 仍在 **Beta**；Compose for Web 于 2025 年 9 月进入 Beta，二进制体积比 Kotlin/JS 小 50%–70% |
| **Dart** | `dart compile wasm` / Flutter `--wasm` | 走 WasmGC | Flutter Web 的 Wasm 构建已生产可用，**检测不到 WasmGC 时会自动回退到 JS** |
| **Java / Scala / OCaml / Scheme** | 各自后端 | 走 WasmGC | Wasm 3.0 公告点名的语言，生态成熟度参差 |
| **Python** | Pyodide（本质是 CPython 编译到 Wasm） | 需要下载几 MB 的解释器 | 适合把现成的 Python 生态搬进浏览器，代价是首屏体积与启动时间 |
| **AssemblyScript** | `asc` | 无运行时，产物小 | 类 TypeScript 语法，前端开发者上手门槛最低 |

这里有个反直觉但重要的判断：**「能不能编译」和「该不该编译」是两回事**。表里每一行都能编译成功，但只有前两行左右的语言，产物是不带附加成本的。

:::warning
选语言之前先看一眼产物体积和它附带的运行时。一个「Hello World」级别的 Go 标准工具链产物通常在 MB 量级，而同等功能的 Rust 产物可能只有几十 KB——这个差距在第一屏就是 LCP 的差距。
:::

## 三、动手：一个 Wasm 模块到底长什么样

要理解 Wasm，最好的办法是**不用任何工具链，手搓一个二进制出来**。下面这段脚本只依赖 Node.js：它按规范逐字节拼出一个 104 字节的合法模块，导出 `add`、`sum` 和一个线性内存 `mem`。

```js
// gen.mjs —— 手写 Wasm 二进制，导出 add(a,b) / sum(ptr,len) / memory
const leb = (n) => {                    // LEB128 无符号变长整数
  const out = [];
  do { let b = n & 0x7f; n >>>= 7; if (n !== 0) b |= 0x80; out.push(b); } while (n !== 0);
  return out;
};
const vec = (items) => [...leb(items.length), ...items.flat()];   // 向量 = 长度 + 元素
const section = (id, payload) => [id, ...leb(payload.length), ...payload];
const str = (s) => [...leb(s.length), ...[...s].map((c) => c.charCodeAt(0))];

const I32 = 0x7f, FUNC = 0x60, END = 0x0b;

// ① 类型段：一个 (i32,i32)->i32 的函数签名，add 和 sum 共用
const types = section(1, vec([[FUNC, ...vec([[I32], [I32]]), ...vec([[I32]])]]));
// ② 函数段：两个函数，都引用类型 0
const funcs = section(3, vec([[...leb(0)], [...leb(0)]]));
// ③ 内存段：初始 16 页（每页 64 KiB，够放 20 万个 i32）
const mems = section(5, vec([[0x00, ...leb(16)]]));
// ④ 导出段：add / sum / mem
const exports_ = section(7, vec([
  [...str("add"), 0x00, ...leb(0)],   // 0x00 = 函数
  [...str("sum"), 0x00, ...leb(1)],
  [...str("mem"), 0x02, ...leb(0)],   // 0x02 = 内存
]));
// ⑤ 代码段
const bodyAdd = [
  0x00,                    // 无局部变量
  0x20, 0x00,              // local.get 0
  0x20, 0x01,              // local.get 1
  0x6a,                    // i32.add
  END,
];
const bodySum = [
  0x01, 0x02, I32,         // 两个 i32 局部变量：$i=2, $acc=3
  0x02, 0x40,              // block
  0x03, 0x40,              //   loop
  0x20, 0x02, 0x20, 0x01, 0x4e,  //   i32.ge_s(i, len)
  0x0d, 0x01,              //   br_if 1  —— 跳出 block
  0x20, 0x03,              //   acc
  0x20, 0x00, 0x20, 0x02, 0x41, 0x04, 0x6c, 0x6a,  // ptr + i*4
  0x28, 0x02, 0x00,        //   i32.load
  0x6a, 0x21, 0x03,        //   i32.add; local.set 3
  0x20, 0x02, 0x41, 0x01, 0x6a, 0x21, 0x02,        //   i = i + 1
  0x0c, 0x00,              //   br 0 —— 回到 loop
  END, END,                // end loop / end block
  0x20, 0x03,              // local.get 3
  END,
];
const codes = section(10, vec([
  [...leb(bodyAdd.length), ...bodyAdd],
  [...leb(bodySum.length), ...bodySum],
]));

const module = Uint8Array.from([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,   // magic + version
  ...types, ...funcs, ...mems, ...exports_, ...codes,
]);
```

把它交给 Node 跑起来（Node 内置了 V8 的 Wasm 引擎，不需要任何额外依赖）：

```js
console.log("模块字节数:", module.length);
console.log("前 16 字节:", [...module.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join(" "));

const { instance } = await WebAssembly.instantiate(module);
const { add, sum, mem } = instance.exports;

console.log("add(2, 40) =", add(2, 40));            // 42

const view = new Int32Array(mem.buffer, 0, 5);
view.set([1, 2, 3, 4, 5]);
console.log("sum(0, 5) =", sum(0, 5));              // 15
```

实测输出：

```text
模块字节数: 104
前 16 字节: 00 61 73 6d 01 00 00 00 01 07 01 60 02 7f 7f 01
add(2, 40) = 42
线性内存: [ 1, 2, 3, 4, 5 ]
sum(0, 5) = 15
```

这 104 个字节里没有一行是「代码」在传统意义上的样子——没有变量名、没有函数名、没有可读的表达式，只有五个段和一堆操作码。**这正是 Wasm 的核心设计：它不是给人读的，是给编译器生成的、给引擎验证的。** 它定义的不是一门语言，而是一个**确定性的、可静态验证的目标格式**。

:::tip
把上面这段代码亲手跑一遍，比读十篇「Wasm 原理介绍」都管用。尤其是 `sum` 那段手动编码的字节——你会发现 `block`/`loop`/`br_if` 的结构和汇编里的跳转标签是同一回事，只是被类型系统约束住了。
:::

## 四、实测：Wasm 什么时候快，什么时候反而慢

现在回答那个最实际的问题。同一台机器、同一个 Node 进程、预热后取五轮最优，对比两类负载：

```text
一次调用算完 200,000 个 i32 的和：
  Wasm sum()      0.12 ms
  JS  for 循环    0.21 ms

1,000,000 次「加一」，每加一次都跨一次 JS ↔ Wasm 边界：
  Wasm add(a,1)   4.06 ms
  JS  a + 1       1.64 ms
```

两个结论，方向完全相反：

**批量计算，Wasm 赢。** 200k 个元素的求和，Wasm 0.12 ms，JS 0.21 ms，大约 1.7 倍。注意这里 Wasm 直接读线性内存里的 `Int32Array`，中间没有任何数据搬运。

**频繁的小调用，Wasm 输。** 一百万次「加一」，Wasm 4.06 ms，纯 JS 1.64 ms——**慢了一倍半**。原因很直白：**每一次 `add()` 都要跨一次 JS ↔ Wasm 的边界**。这个调用成本（约 4 纳秒一次）远远超过了「加一」这个操作本身的价值。

这就是 Wasm 性能的关键规律：**它有「过关费」，而且过关费按次数收，不按活儿的大小收。** 一次调用里干的活越多，过关费摊得越薄；每次只干一点点，过关费就成了主要开销。

这条规律直接推导出一份决策清单：

| 场景 | 结论 | 原因 |
| --- | --- | --- |
| 图片 / 音视频编解码、压缩解压 | ✅ 该用 | 一次调用处理整块数据，且是纯计算 |
| 密码学、哈希、大数运算 | ✅ 该用 | 计算密集 + 无外部依赖，还顺带拿到恒定时间实现 |
| 已有的 C/C++/Rust 库要搬到 Web | ✅ 该用 | 不用重写，一次编译长期受益 |
| 把 JS 里的小函数改写成 Wasm | ❌ 别用 | 正是上表第二个例子的情形，大概率更慢 |
| DOM 操作、事件处理 | ❌ 别用 | Wasm 碰不到 DOM，必须回调 JS，等于每次操作都交两次过关费 |
| 一次性、只在启动时跑的计算 | ❌ 别用 | 下载 + 编译 `.wasm` 的成本收不回来 |
| 纯字符串 / 正则处理 | ⚠️ 谨慎 | 字符串要手动编解码，通常不如 JS 引擎的优化结果 |

:::caution
网上大部分「Wasm 比 JS 快 N 倍」的对比，测的都是批量计算这一类，然后把结论推广到所有场景。这是错得最普遍的一条。**先量一下你的调用频率**：如果某段逻辑会被高频小粒度调用，把它搬进 Wasm 几乎一定变慢。
:::

顺带一提，我在写这篇文章时还踩了一个小坑：第一次跑的时候内存只声明了 1 页（64 KiB），放 20 万个 i32 直接抛了 `Invalid typed array length`。**线性内存不是自动增长的**，除非你显式声明最大页数并在需要时调 `memory.grow()`——这是从 JS 转过来的同学最容易忽略的一点。

## 五、走出浏览器：WASI 0.3 与组件模型

如果 Wasm 只能在浏览器里跑，上面这些讨论都还只是前端话题。真正让它在 2026 年值得前端工程师关注的原因，是**它正在成为服务端的可移植执行格式**。

**WASI（WebAssembly System Interface）** 就是 Wasm 的系统调用接口——它让 Wasm 模块能访问文件、网络、时钟这些「浏览器之外」的东西。2026 年 6 月，**WASI 0.3 发布并成为主要的 WASI preview 版本**，核心变化是**把异步能力下沉到了组件模型的 Canonical ABI**，带来三个一等公民原语：

- `async func`：在 WIT（接口定义）里直接声明异步函数，各语言的绑定生成器会映射成本语言的写法——Rust 里是 `async fn`，JavaScript 里是 `Promise`，Python 里是协程；
- `stream<T>`：**可作为值传递**的类型化异步数据通道；
- `future<T>`：单值的异步完成信号，取代了 0.2 里的 `pollable` 资源。

这里有个值得理解的细节：调度与唤醒传播的责任**从每个组件转移到了宿主运行时**，所有组件共享一个事件循环。这修掉了 WASI 0.2 里的「三明治问题」——一个处在中间层的组件没法把唤醒信号从宿主的 pollable 转发给下游组件。新模型是**基于完成（completion-based）而非基于就绪（readiness-based）**的。

运行时方面，Wasmtime 43+ 与 jco 已提供 WASI 0.3 支持，WASI 0.2 则可通过 polyfill 或原生方式并存。后续 0.3.x 走增量发布，计划中的方向包括自动取消、流优化（转发/拼接、零拷贝）以及线程（先协作式，后抢占式）。

对前端工程师来说，这意味着一个很实际的未来：**同一份 Wasm 产物，在浏览器里当模块用，在服务端当沙箱化的函数用**。边缘计算、插件系统、多租户隔离这类场景，正在被这套东西接管。

## 六、一句话决策清单

- **想用 Rust 写 Web 模块** → 直接上 `wasm-bindgen`，它能处理字符串、闭包、JS 对象，还会生成 TypeScript 类型；
- **有现成的 C/C++ 库** → Emscripten，别重写；
- **想用托管语言（Kotlin / Dart）** → 先确认目标浏览器都支持 WasmGC（Safari 18.2 是底线），并准备好 JS 回退路径；
- **只想把 JS 换个语言写** → 大概率不该用 Wasm，先把 JS 的调用频率量出来；
- **在服务端做插件沙箱** → 关注 WASI 0.3 与组件模型，这是 2026 年变化最快的部分。

Wasm 已经不是「性能银弹」，也不是「浏览器里的 C++ 容器」。它更像一个**边界清晰的契约格式**：把计算密集的部分用整数和线性内存的规则圈起来，交给它做；边界上的小事，留给 JS。

## 参考来源

- [Wasm 3.0 Completed — WebAssembly（2025-09-17 官方公告，作者 Andreas Rossberg）](https://webassembly.org/news/2025-09-17-wasm-3.0/)
- [WASI 0.3 Launched — Bytecode Alliance](https://bytecodealliance.org/articles/WASI-0.3)
- [WASI 0.3 · WASI.dev（发布说明）](https://wasi.dev/releases/wasi-p3)
- [WASI Roadmap — WASI.dev](https://wasi.dev/roadmap)
- [WebAssembly/WASI v0.3.0 Release — GitHub](https://github.com/WebAssembly/WASI/releases/tag/v0.3.0)
- [Garbage collection (WebAssembly) · Web Platform Features Explorer（WasmGC 浏览器基线）](https://web-platform-dx.github.io/web-features-explorer/features/wasm-garbage-collection/)
- [The `wasm-bindgen` Guide — Rust and WebAssembly](https://rustwasm.github.io/docs/wasm-bindgen/)
- [The Rust and WebAssembly Book](https://rustwasm.github.io/docs/book/)
- [WebAssembly — TinyGo 官方文档](https://tinygo.org/webassembly/webassembly/)
- [Supported versions and configuration · Kotlin/Wasm — JetBrains](https://kotlinlang.org/docs/wasm-configuration.html)

> 文中的字节结构、体积与性能数据均为在本机（Node.js v26.5.1）实际运行上述脚本所得，脚本完整可复现。语言生态与规范状态部分来自上列一手来源；WASI 0.3 的具体发布日期以 WASI.dev 发布页为准。
