---
title: 'TypeScript 6.0 Officially Released: The Last JS Version, Paving the Way for Go-Native 7.0'
published: 2026-03-23
description: TypeScript 6.0 has been officially released, marking the last major version built on the JavaScript codebase. It enables strict by default, clears types by default, adds ES2025 support and the Temporal API, while paving the way for the upcoming Go rewrite, TypeScript 7.0.
image: ''
tags: [TypeScript, Frontend, JavaScript]
category: Frontend
draft: false 
---
## 1. Introduction

On March 23, 2026, Microsoft officially released **TypeScript 6.0**, announced by TypeScript Chief Product Manager Daniel Rosenwasser on the official DevBlog. This is a **milestone release** in TypeScript's evolution, bridging the past and the future.

TypeScript 6.0 has a very special identity—**it is the last major version built on the existing JavaScript codebase**. Microsoft has confirmed that TypeScript 7.0 will use the **Go language** to completely rewrite the compiler and language service, codenamed **"Project Corsa"**, with an expected **10x improvement** in compilation speed.

The core mission of TypeScript 6.0 is: before fully migrating to the Go native compiler, clean up as much historical debt as possible, adjust default behaviors, and introduce new type system capabilities, allowing developers to **smoothly transition** to the upcoming TypeScript 7.0 era.

---

## 2. Core Positioning: A "Bridge Version" Connecting Past and Future

### 2.1 Why Is It the Last JS Version?

Since its inception, TypeScript's compiler has been self-hosted using TypeScript/JavaScript. As project scale grew and the user base expanded (over **10 million** developers worldwide), the performance bottleneck of JS single-threading became increasingly prominent.

Microsoft launched **Project Corsa** in 2025—rewriting the TypeScript compiler core in Go:

| Dimension | Current JS Compiler | Upcoming Go Compiler |
|------|---------------|-------------------|
| Concurrency Model | Single-threaded + Worker | Shared-memory multi-threading |
| Compilation Speed | Baseline | **10x** improvement |
| Memory Efficiency | JS GC managed | Native memory management |
| LSP Response | Depends on project size | Extremely low latency |

### 2.2 Development Progress of 7.0

TypeScript 7.0 is "very close to completion," and Nightly Builds can be experienced early through the following:

```bash
npm install -D @typescript/native-preview
```

Meanwhile, VS Code users can install the corresponding Nightly extension to test the actual performance of the Go native compiler on large codebases.

---

## 3. New Features

### 3.1 `es2025` Target / Lib

TypeScript 6.0 adds `es2025` as a compilation target and library option. The core content of the `es2025` type comes from TC39 proposals that have reached **Stage 4**:

- **`RegExp.escape()`**: Safely escape special characters in regular expressions
- **`Promise.try()`**: Unified Promise wrapping for sync/async function calls
- **Iterator helper methods**: Chained operations like `Iterator.prototype.map/filter/take/drop`
- **Set methods**: Set operations like `Set.prototype.union/intersection/difference/symmetricDifference`

```typescript
// es2025 new capabilities example
const escaped = RegExp.escape("foo.bar");  // "foo\\.bar"

const result = await Promise.try(() => mayThrow());

const nums = new Set([1, 2, 3]);
const evens = new Set([2, 4, 6]);
const union = nums.union(evens);  // Set {1, 2, 3, 4, 6}
```

### 3.2 Temporal API Type Support

The `Temporal` API has reached Stage 4 and will become the standard date-time handling solution for JavaScript. TypeScript 6.0 provides full type support through the `esnext.temporal` lib:

```typescript
// Temporal API — modern JavaScript date handling
const now = Temporal.Now.plainDateTimeISO();
const meeting = now.add({ hours: 2, minutes: 30 });

const duration = meeting.since(now);
console.log(duration.toString()); // "PT2H30M"
```

### 3.3 Map "Upsert" Methods

TypeScript 6.0 adds two practical type methods to `Map`:

- **`getOrInsert(key, value)`**: Insert a default value when the key doesn't exist and return it
- **`getOrInsertComputed(key, factory)`**: Compute and insert via a factory function when the key doesn't exist

```typescript
const cache = new Map<string, number[]>();

// Traditional approach
let items = cache.get("key");
if (!items) {
  items = [];
  cache.set("key", items);
}

// 6.0 new approach
const items = cache.getOrInsertComputed("key", () => []);
```

### 3.4 Subpath Imports (`#/`)

TypeScript 6.0 officially supports Node.js-style in-package import paths under `nodenext` and `bundler` module resolution modes:

```json
// package.json
{
  "imports": {
    "#utils/*": "./src/utils/*.ts",
    "#components/*": "./src/components/*.ts"
  }
}
```

```typescript
// Concise imports with the # prefix
import { formatDate } from "#utils/date";
import { Button } from "#components/Button";
```

### 3.5 `--stableTypeOrdering` Flag

TypeScript 6.0 adds the `--stableTypeOrdering` migration diagnostic flag. When enabled, 6.0's type ordering algorithm aligns with 7.0's **deterministic ordering algorithm**.

> ⚠️ Note: This flag may reduce type-checking speed by **25%**. Only use it when preparing to migrate to 7.0.

### 3.6 DOM Type Merging

The contents of `dom.iterable` and `dom.asynciterable` have been merged into the `dom` lib, and developers no longer need to separately declare iterable DOM types.

---

## 4. Major Breaking Changes

### 4.1 Overview of Default Value Changes

This is the most far-reaching change in TypeScript 6.0—**multiple historical defaults were flipped all at once**:

| Config Option | Old Default | New Default | Impact |
|--------|---------|----------|------|
| `strict` | `false` | **`true`** | All strict checks enabled by default |
| `types` | Auto-crawl `@types` | **`[]` (empty array)** | No longer auto-loads global types |
| `module` | `commonjs` | **`esnext`** | Outputs ESM by default |
| `target` | `es5` | **`es2025`** | Defaults to the latest standard target |
| `rootDir` | Auto-inferred | **`.`** | Output structure explicitly controlled |

### 4.2 The Huge Impact of `types: []`

The most closely watched change is `types` defaulting to an empty array. This means **`@types` packages are no longer automatically discovered and loaded**, and must be explicitly declared via the `types` field.

**The Microsoft team revealed that some projects saw cold build times reduced by 20%-50% as a result.**

After upgrading, you must immediately check `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["node"]  // Must be declared explicitly
  }
}
```

Otherwise, you'll encounter numerous missing identifier errors such as `Cannot find name 'console'` and `Cannot find name 'process'`.

### 4.3 `rootDir` Defaults to `.`

This change affects the output directory structure:

```bash
# Old behavior (rootDir automatically inferred as src/)
# Output: dist/index.js

# New behavior (rootDir defaults to .)
# Output: dist/src/index.js   ← an extra level!
```

When upgrading, it's recommended to explicitly set:

```json
{
  "compilerOptions": {
    "rootDir": "./src"
  }
}
```

### 4.4 `strict: true` Enabled by Default

TypeScript 6.0 enables `strict: true` by default, meaning all of the following sub-options are enabled by default:

- `strictNullChecks`
- `strictBindCallApply`
- `strictFunctionTypes`
- `strictPropertyInitialization`
- `noImplicitAny`
- `noImplicitThis`
- `alwaysStrict`
- `useUnknownInCatchVariables`

If your project previously did not enable strict mode, you may see numerous new type errors after upgrading. **Most errors are legitimate**, reflecting potential bugs in the code.

---
## 5. Deprecated Configuration (to be completely removed in 7.0)

Options marked as **deprecated** in TypeScript 6.0 will be **completely removed in 7.0**. Developers should migrate as early as possible:

### 5.1 Compiler Options

| Deprecated Item | Replacement |
|--------|---------|
| `target: es5` | Use `es2015` or higher |
| `--downlevelIteration` | Use native iteration with the new target |
| `module: amd / umd / systemjs` | Use `esnext` or another standard module format |
| `--moduleResolution node` (node10) | `node16` / `nodenext` / `bundler` |
| `--moduleResolution classic` | Any modern resolution strategy |
| `--baseUrl` | Use `paths` instead |
| `--outFile` | Use a bundler |
| `--esModuleInterop false` | Enable `esModuleInterop` uniformly |
| `--allowSyntheticDefaultImports false` | Enable default imports uniformly |
| `--alwaysStrict false` | Comply with the new `strict` defaults |

### 5.2 Syntax Deprecations

- **Module namespace syntax**: `module Foo { }` → Use `namespace Foo { }`
- **Import Assertions**: `import ... assert { type: "json" }` → Use `import ... with { type: "json" }`

### 5.3 How to Cope

In 6.0, you can temporarily suppress deprecation errors via configuration:

```json
{
  "compilerOptions": {
    "ignoreDeprecations": "6.0"
  }
}
```

But note: **7.0 will no longer support these options at all**, and `ignoreDeprecations: "6.0"` will also cease to work by then.

---

## 6. Upgrade Guide

### 6.1 Minimal Migration Steps

The recommended process for upgrading an existing project to TypeScript 6.0:

```bash
# 1. Upgrade TypeScript
npm install -D typescript@latest

# 2. Check the TypeScript version
npx tsc --version
```

### 6.2 Required Configuration Adjustments

After upgrading, most projects need **two configuration adjustments immediately**:

```json
{
  "compilerOptions": {
    // 1. Explicitly declare the type source (required!)
    "types": ["node"],

    // 2. Explicitly set rootDir (otherwise the output structure breaks)
    "rootDir": "./src"
  }
}
```

### 6.3 Recommended Migration Path

```
现有项目
  ├── 升级至 TypeScript 6.0
  ├── 处理 strict 默认开启带来的新错误
  ├── 显式设置 types、rootDir
  ├── 逐一消除弃用警告
  ├── 配置新的 module/target 默认值
  ├── （可选）启用 --stableTypeOrdering tests 7.0 compatibility
  └── 准备迎接 TypeScript 7.0 Go 编译器
```

### 6.4 Incremental Migration in Large Projects

For large codebases, it is recommended to:

1. **First run 6.0 compilation separately in CI**, without blocking the main workflow
2. **Gradually fix strict errors**, batch by file or directory
3. **Use `ignoreDeprecations` to buy time**, but have a clear plan for eliminating them
4. **Try out `@typescript/native-preview` early**, to assess 7.0 compatibility in advance

---

## 7. Release Timeline and Outlook

### 7.1 Timeline

| Date | Milestone |
|------|--------|
| February 11, 2026 | TypeScript 6.0 **Beta** released |
| March 6, 2026 | TypeScript 6.0 **RC** released |
| **March 23, 2026** | **TypeScript 6.0 officially GA** |
| Coming months | TypeScript 7.0 stable release expected |

### 7.2 Outlook for TypeScript 7.0

TypeScript 7.0 will be a **complete compiler rewrite**—not an incremental improvement, but a rebuild of the entire compilation pipeline in Go:

- **Shared-memory multithreading**: Full utilization of multi-core CPUs, rather than Worker thread communication
- **Native code performance**: Moving away from JS GC, achieving deterministic memory management
- **10x compilation speed**: Compilation times for large projects will drop from minutes to seconds
- **Extremely low LSP latency**: Code completion, error hints, refactoring—everything will be faster

### 7.3 Ecosystem Impact

TypeScript's Go rewrite is not just a performance upgrade; it also marks a **systems-programming-language-ification** trend in the JavaScript toolchain:

```
工具链演进趋势：
JavaScript → TypeScript（自举）→ Go/Rust/Zig（系统语言）

已完成 / 进行中：
✅ esbuild（Go）    — 极速打包器
✅ Rolldown（Rust） — Vite 8 底层
✅ Oxc（Rust）      — 高性能解析器
✅ Turbopack（Rust）— Next.js 打包
🔄 TypeScript（Go） — 编译器 7.0
```

This trend means that frontend engineering is shifting from "good enough" to "native performance," and the developer experience will see a qualitative leap.

---

## 8. Summary

TypeScript 6.0 is a **bold yet pragmatic** release:

| Dimension | Assessment |
|------|------|
| **New capabilities** | ES2025, Temporal API, Subpath Imports—staying in sync with standards |
| **Default flips** | strict/types/module/target—clearing out historical baggage in one go |
| **Deprecation cleanup** | Removing outdated module formats and resolution strategies—reducing the burden for the Go rewrite |
| **Bridge role** | `stableTypeOrdering`, `ignoreDeprecations`—smooth transition |

**TypeScript 6.0 is both an endpoint and a starting point.** It ends the era of TypeScript's JavaScript self-hosting, while opening a new era of the Go-native compiler. For developers, now is the time to start upgrading and adapting—because when TypeScript 7.0 arrives, you will be standing at a **10x faster starting line**.