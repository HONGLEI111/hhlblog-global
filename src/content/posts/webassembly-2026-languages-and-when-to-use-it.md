---
title: 'WebAssembly in 2026: Which Languages Compile to Wasm, and When You Really Shouldn''t Use It'
published: 2026-09-29
description: 'A year after Wasm 3.0 was finalized, the language landscape has been redrawn by WasmGC. This article uses a hand-written 104-byte Wasm module to reveal its binary structure, then answers the most practical question with real benchmark data: under what circumstances is Wasm actually faster than JavaScript?'
image: ''
tags: [WebAssembly, Wasm, WasmGC, WASI, Performance Optimization, Web Development]
category: Web
draft: false
---
## 1. Wasm's Positioning Quietly Shifted Once in 2026

When people mention WebAssembly, many still picture "running C++ games and Photoshop in the browser"—a special case that opens a back door for giant desktop applications. That impression is long outdated.

On September 17, 2025, the W3C WebAssembly Community Group announced that **Wasm 3.0 was finalized**, becoming the new official standard. This is the biggest update since Wasm 2.0 in 2020, and the official statement is that "some features took six to eight years to complete." What 3.0 brings is not a small improvement in performance numbers, but an expansion of **capability boundaries**:

| New Feature | What Problem It Solves |
| --- | --- |
| **WasmGC (Garbage Collection)** | Managed languages no longer need to bring their own GC into the browser |
| **64-bit Address Space (Memory64)** | Address types for memory and tables expand from i32 to i64, theoretically from 4 GB to 16 EB |
| **Multiple Memories** | A single module can declare and directly access multiple memories, and can also copy between them |
| **Typed References** | Supports richer reference types, subtyping, and type recursion |
| **Tail Calls** | Full tail calls that do not consume additional stack space |
| **Exception Handling** | Exception tags with payloads, with selective catching |
| **Relaxed SIMD, Deterministic Defaults, Custom Annotation Syntax** | Edge behaviors are clarified, and the text format can carry annotations |

Among these, **WasmGC is the one that changes the game**. Before this, when languages like Kotlin, Dart, and Java compiled to Wasm, they had to stuff in an entire garbage collector of their own—a fixed overhead of 500 KB to 2 MB, paying a size tax before writing any business code. WasmGC hands this over to Wasm itself: the compiler only needs to declare memory layout using struct / array types, and allocation and lifetime are handled by Wasm.

On the browser side, the baseline for WasmGC is **Chrome 119 / Firefox 120 / Safari 18.2** (Safari 18.2 was released on December 11, 2024, and Web Platform Features Explorer has marked it as "Newly Available" since that day).

:::note
The official expectation from "Newly Available" to "Widely Available" is June 2027. In other words, it can now be used across browsers, but **do not treat WasmGC as a capability you can rely on unconditionally**; feature detection should still be done where needed.
:::

## 2. Language Map: Who Is Compiling to Wasm, and at What Cost

The official Wasm 3.0 announcement named languages already targeting Wasm, including **Java, OCaml, Scala, Kotlin, Scheme, and Dart**. Adding the systems languages that were already in the lineup, the 2026 landscape can roughly be divided into three categories, and **the differences among these three categories determine whether you can actually use it**.

The first category is **systems languages with manual memory management**, whose output is the cleanest: no runtime, only what you wrote.

The second category is **managed languages leveraging WasmGC**, which have finally shed the burden of bundling their own GC, but toolchain maturity varies greatly.

The third category is **languages that move the entire runtime over**—honestly speaking, these often can run, but the cost is written in the first-screen size.

| Language | Toolchain | Output Characteristics | Status in 2026 |
| --- | --- | --- | --- |
| **Rust** | `wasm-bindgen` + `wasm-pack` | No runtime, usually tens to hundreds of KB | A first-class citizen in the Web direction: can directly pass strings, closures, and JS objects, and can also automatically generate TypeScript bindings |
| **C / C++** | Emscripten (`emcc`) | Requires accompanying JS glue code | The most mature veteran path, the first choice for migrating existing codebases; the cost is a heavy toolchain and relatively large output |
| **Zig** | `zig build-exe -target wasm32` | No runtime | Positioned close to "a better C," suitable for hand-rolling lightweight modules |
| **Go (standard toolchain)** | `GOOS=js GOARCH=wasm go build` | Packages the entire Go runtime, starting from several MB in size | It can run, but size and the call overhead of `syscall/js` are widely recognized pain points |
| **Go (TinyGo)** | `tinygo build -target wasm` | Much smaller | The official documentation clearly states: **some language features and standard library support are unavailable**; check the support matrix before use |
| **Kotlin** | Kotlin/Wasm | Uses WasmGC, no longer bundles its own GC | Still in **Beta**; Compose for Web entered Beta in September 2025, with binary size 50%–70% smaller than Kotlin/JS |
| **Dart** | `dart compile wasm` / Flutter `--wasm` | Uses WasmGC | Flutter Web's Wasm build is production-ready, and **automatically falls back to JS when WasmGC is not detected** |
| **Java / Scala / OCaml / Scheme** | Their respective backends | Use WasmGC | Languages named in the Wasm 3.0 announcement, with varying ecosystem maturity |
| **Python** | Pyodide (essentially CPython compiled to Wasm) | Requires downloading a multi-MB interpreter | Suitable for bringing the existing Python ecosystem into the browser, at the cost of first-screen size and startup time |
| **AssemblyScript** | `asc` | No runtime, small output | TypeScript-like syntax, with the lowest barrier to entry for frontend developers |

There is a counterintuitive but important judgment here: **"whether it can compile" and "whether it should compile" are two different things**. Every row in the table can compile successfully, but only languages around the first two rows produce output without additional costs.

:::warning
Before choosing a language, take a look at the output size and the runtime it brings with it. A "Hello World"-level Go standard toolchain output is usually on the order of MB, while an equivalent Rust output may be only tens of KB—this gap is the LCP gap on the first screen.
:::
## 3. Hands-On: What a Wasm Module Actually Looks Like

To understand Wasm, the best approach is to **hand-craft a binary without any toolchain**. The script below relies only on Node.js: it assembles a valid 104-byte module byte by byte according to the spec, exporting `add`, `sum`, and a linear memory `mem`.

```js
// gen.mjs — hand-written Wasm binary, exporting add(a,b) / sum(ptr,len) / memory
const leb = (n) => {                    // LEB128 unsigned variable-length integer
  const out = [];
  do { let b = n & 0x7f; n >>>= 7; if (n !== 0) b |= 0x80; out.push(b); } while (n !== 0);
  return out;
};
const vec = (items) => [...leb(items.length), ...items.flat()];   // vector = length + elements
const section = (id, payload) => [id, ...leb(payload.length), ...payload];
const str = (s) => [...leb(s.length), ...[...s].map((c) => c.charCodeAt(0))];

const I32 = 0x7f, FUNC = 0x60, END = 0x0b;

// ① Type section: one (i32,i32)->i32 function signature, shared by add and sum
const types = section(1, vec([[FUNC, ...vec([[I32], [I32]]), ...vec([[I32]])]]));
// ② Function section: two functions, both referencing type 0
const funcs = section(3, vec([[...leb(0)], [...leb(0)]]));
// ③ Memory section: initial 16 pages (64 KiB each, enough for 200,000 i32s)
const mems = section(5, vec([[0x00, ...leb(16)]]));
// ④ Export section: add / sum / mem
const exports_ = section(7, vec([
  [...str("add"), 0x00, ...leb(0)],   // 0x00 = function
  [...str("sum"), 0x00, ...leb(1)],
  [...str("mem"), 0x02, ...leb(0)],   // 0x02 = memory
]));
// ⑤ Code section
const bodyAdd = [
  0x00,                    // no local variables
  0x20, 0x00,              // local.get 0
  0x20, 0x01,              // local.get 1
  0x6a,                    // i32.add
  END,
];
const bodySum = [
  0x01, 0x02, I32,         // two i32 local variables: $i=2, $acc=3
  0x02, 0x40,              // block
  0x03, 0x40,              //   loop
  0x20, 0x02, 0x20, 0x01, 0x4e,  //   i32.ge_s(i, len)
  0x0d, 0x01,              //   br_if 1  — break out of block
  0x20, 0x03,              //   acc
  0x20, 0x00, 0x20, 0x02, 0x41, 0x04, 0x6c, 0x6a,  // ptr + i*4
  0x28, 0x02, 0x00,        //   i32.load
  0x6a, 0x21, 0x03,        //   i32.add; local.set 3
  0x20, 0x02, 0x41, 0x01, 0x6a, 0x21, 0x02,        //   i = i + 1
  0x0c, 0x00,              //   br 0 — back to loop
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

Hand it to Node to run (Node has V8's Wasm engine built in, no extra dependencies needed):

```js
console.log("Module byte count:", module.length);
console.log("First 16 bytes:", [...module.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join(" "));

const { instance } = await WebAssembly.instantiate(module);
const { add, sum, mem } = instance.exports;

console.log("add(2, 40) =", add(2, 40));            // 42

const view = new Int32Array(mem.buffer, 0, 5);
view.set([1, 2, 3, 4, 5]);
console.log("sum(0, 5) =", sum(0, 5));              // 15
```

Actual output:

```text
Module byte count: 104
First 16 bytes: 00 61 73 6d 01 00 00 00 01 07 01 60 02 7f 7f 01
add(2, 40) = 42
Linear memory: [ 1, 2, 3, 4, 5 ]
sum(0, 5) = 15
```

In these 104 bytes, not a single line looks like "code" in the traditional sense—no variable names, no function names, no readable expressions, just five sections and a bunch of opcodes. **This is precisely the core design of Wasm: it's not meant for humans to read, it's meant for compilers to generate and engines to validate.** What it defines is not a language, but a **deterministic, statically verifiable target format**.

:::tip
Running the code above yourself is more useful than reading ten "Introduction to Wasm Principles" articles. Especially that hand-encoded byte sequence in `sum`—you'll realize that the structure of `block`/`loop`/`br_if` is the same thing as jump labels in assembly, just constrained by a type system.
:::

## 4. Measured: When Wasm Is Fast, and When It's Actually Slow

Now to answer the most practical question. Same machine, same Node process, best of five rounds after warm-up, comparing two types of workloads:

```text
Summing 200,000 i32 values in one call:
  Wasm sum()      0.12 ms
  JS  for loop    0.21 ms

1,000,000 "add one" operations, each one crossing the JS ↔ Wasm boundary:
  Wasm add(a,1)   4.06 ms
  JS  a + 1       1.64 ms
```

Two conclusions, pointing in completely opposite directions:

**Batch computation: Wasm wins.** Summing 200k elements, Wasm takes 0.12 ms, JS takes 0.21 ms—about 1.7×. Note that here Wasm reads `Int32Array` directly from linear memory, with no data copying in between.

**Frequent small calls: Wasm loses.** One million "add one" operations, Wasm takes 4.06 ms, pure JS takes 1.64 ms—**one and a half times slower**. The reason is straightforward: **every `add()` has to cross the JS ↔ Wasm boundary**. This call overhead (about 4 nanoseconds per call) far exceeds the value of the "add one" operation itself.

This is the key rule of Wasm performance: **it has a "toll fee," and the toll is charged per crossing, not by the size of the job.** The more work done in a single call, the thinner the toll is spread; if each call does only a tiny bit, the toll becomes the main cost.

This rule directly yields a decision checklist:

| Scenario | Verdict | Reason |
| --- | --- | --- |
| Image / audio-video codec, compression/decompression | ✅ Use it | One call processes an entire block of data, and it's pure computation |
| Cryptography, hashing, big-number arithmetic | ✅ Use it | Compute-intensive + no external dependencies, plus you get constant-time implementations for free |
| Existing C/C++/Rust libraries to port to the Web | ✅ Use it | No rewrite needed, one compile yields long-term benefits |
| Rewriting small JS functions into Wasm | ❌ Don't | This is exactly the second example above, almost certainly slower |
| DOM manipulation, event handling | ❌ Don't | Wasm can't touch the DOM, must call back into JS—meaning two tolls per operation |
| One-off computation that only runs at startup | ❌ Don't | The cost of downloading + compiling `.wasm` can't be recouped |
| Pure string / regex processing | ⚠️ Be careful | Strings must be manually encoded/decoded, usually worse than the JS engine's optimized results |

:::caution
Most "Wasm is N× faster than JS" comparisons online test batch computation, then generalize the conclusion to all scenarios. This is the most widespread mistake. **First measure your call frequency**: if a piece of logic gets called frequently at a fine granularity, moving it into Wasm will almost certainly make it slower.
:::

By the way, I hit a small pitfall while writing this article: the first time I ran it, the memory was declared with only 1 page (64 KiB), and putting 200k i32 values in it threw a `Invalid typed array length` directly. **Linear memory doesn't grow automatically** unless you explicitly declare a maximum page count and call `memory.grow()` when needed—this is the easiest thing for people coming from JS to overlook.
## 5. Leaving the Browser: WASI 0.3 and the Component Model

If Wasm could only run in the browser, all the discussion above would still just be a frontend topic. The real reason it deserves frontend engineers' attention in 2026 is that **it is becoming a portable execution format for the server side**.

**WASI (WebAssembly System Interface)** is Wasm's system call interface—it lets Wasm modules access files, networks, clocks, and other things "outside the browser." In June 2026, **WASI 0.3 was released and became the primary WASI preview version**, with the core change being **pushing async capabilities down into the component model's Canonical ABI**, bringing three first-class primitives:

- `async func`: Declare async functions directly in WIT (the interface definition), and binding generators for each language map them to that language's idioms—in Rust it's `async fn`, in JavaScript it's `Promise`, in Python it's coroutines;
- `stream<T>`: A typed asynchronous data channel that **can be passed as a value**;
- `future<T>`: A single-value async completion signal, replacing the `pollable` resource from 0.2.

There's a detail here worth understanding: responsibility for scheduling and wakeup propagation **shifts from each component to the host runtime**, with all components sharing a single event loop. This fixes the "sandwich problem" in WASI 0.2—a component in the middle layer couldn't forward wakeup signals from the host's pollable to downstream components. The new model is **completion-based rather than readiness-based**.

On the runtime side, Wasmtime 43+ and jco already provide WASI 0.3 support, while WASI 0.2 can coexist via polyfill or natively. Subsequent 0.3.x releases will be incremental, with planned directions including automatic cancellation, stream optimizations (forwarding/splicing, zero-copy), and threads (cooperative first, then preemptive).

For frontend engineers, this means a very practical future: **the same Wasm artifact can be used as a module in the browser and as a sandboxed function on the server**. Scenarios like edge computing, plugin systems, and multi-tenant isolation are being taken over by this stack.

## 6. One-Line Decision Checklist

- **Want to write Web modules in Rust** → Go straight to `wasm-bindgen`; it handles strings, closures, JS objects, and generates TypeScript types;
- **Have an existing C/C++ library** → Emscripten, don't rewrite it;
- **Want to use a managed language (Kotlin / Dart)** → First confirm all target browsers support WasmGC (Safari 18.2 is the baseline), and prepare a JS fallback path;
- **Just want to write JS in a different language** → You probably shouldn't use Wasm; first measure your JS call frequency;
- **Building a plugin sandbox on the server** → Pay attention to WASI 0.3 and the component model; this is the fastest-changing part of 2026.

Wasm is no longer a "performance silver bullet," nor a "C++ container in the browser." It's more like a **contract format with clear boundaries**: fence off the compute-intensive parts using the rules of integers and linear memory, and hand them over; leave the small stuff at the boundary to JS.

## References

- [Wasm 3.0 Completed — WebAssembly (2025-09-17 official announcement, author Andreas Rossberg)](https://webassembly.org/news/2025-09-17-wasm-3.0/)
- [WASI 0.3 Launched — Bytecode Alliance](https://bytecodealliance.org/articles/WASI-0.3)
- [WASI 0.3 · WASI.dev (release notes)](https://wasi.dev/releases/wasi-p3)
- [WASI Roadmap — WASI.dev](https://wasi.dev/roadmap)
- [WebAssembly/WASI v0.3.0 Release — GitHub](https://github.com/WebAssembly/WASI/releases/tag/v0.3.0)
- [Garbage collection (WebAssembly) · Web Platform Features Explorer (WasmGC browser baseline)](https://web-platform-dx.github.io/web-features-explorer/features/wasm-garbage-collection/)
- [The `wasm-bindgen` Guide — Rust and WebAssembly](https://rustwasm.github.io/docs/wasm-bindgen/)
- [The Rust and WebAssembly Book](https://rustwasm.github.io/docs/book/)
- [WebAssembly — TinyGo official documentation](https://tinygo.org/webassembly/webassembly/)
- [Supported versions and configuration · Kotlin/Wasm — JetBrains](https://kotlinlang.org/docs/wasm-configuration.html)

> The byte structures, sizes, and performance data in this article were all obtained by actually running the above scripts on a local machine (Node.js v26.5.1), and the scripts are fully reproducible. The language ecosystem and specification status sections come from the first-hand sources listed above; the specific release date of WASI 0.3 is subject to the WASI.dev release page.