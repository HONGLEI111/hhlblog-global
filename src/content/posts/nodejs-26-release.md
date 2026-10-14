---
title: 'Node.js 26 Released: Temporal API Enabled by Default, the Last Odd-Even Version'
published: 2026-05-05
description: Node.js 26 is officially released with the Temporal API available by default, plus V8 14.6, Undici 8, and Map Upsert landing in stable. This is the last major version to follow the odd-even strategy; starting with Node.js 27, releases will move to an annual cadence, with every version entering LTS.
image: ''
tags: [Node.js, JavaScript, Backend]
category: Backend
draft: false 
---
## 1. Introduction

On May 5, 2026, the Node.js team officially released **Node.js 26.0.0** (Current), announced by core developer Rafael Gonzaga in a GitHub PR. This release is not only a major upgrade to the tech stack, but also marks the end of an era—**it is the last major version to follow the odd-even versioning strategy**.

The core highlight of Node.js 26 is that the **Temporal API is available by default**—you can use the modern date/time API without any experimental flags, finally saying goodbye to all the pain points of the `Date` object. At the same time, the Node.js team officially announced that starting with **Node.js 27**, the release cadence will change to **one major version per year**, with every version entering the LTS phase.

---

## 2. Core Positioning: The "Final Chapter" That Bridges Past and Future

### 2.1 The Last Odd-Even Version

Since the birth of Node.js, it has always followed the **odd-even versioning strategy**:

- **Even-numbered versions** (22, 24, 26) → LTS, recommended for production use
- **Odd-numbered versions** (23, 25) → Current experimental releases, do not enter LTS, used for testing new features

This set of rules, developed and operated for over a decade, will come to an end after Node.js 26.

### 2.2 Why Is Change Needed?

The official Node.js blog explained the four major drivers behind this transformation:

| Reason | Explanation |
|------|------|
| **Extremely low adoption of odd-numbered versions** | Most users and enterprises skip odd-numbered versions entirely, waiting for LTS |
| **Long-standing community confusion** | New developers find the "use even, skip odd" rule confusing |
| **Maintainer unsustainability** | The volunteer-driven team must simultaneously maintain 4-5 active version lines, an excessive burden |
| **Enterprise predictability** | A fixed annual cadence makes upgrade planning simpler |

### 2.3 Node.js 26 Release Schedule

| Milestone | Time |
|--------|------|
| 26.0.0 Current release | May 5, 2026 |
| Enter LTS | October 2026 |
| Enter maintenance period | October 2027 |
| End of Life | **April 2029** |

---

## 3. Temporal API: The Dawn of Modern Date and Time

### 3.1 Why Is Temporal Needed?

JavaScript's `Date` object has been one of the most frequently complained-about APIs since its birth in 1995:

- **Months start from 0** (0 = January), almost everyone has fallen into this trap
- **Mutable objects**: Modifying a Date instance can produce hard-to-trace side effects
- **Weak timezone handling**: Lacks native timezone awareness
- **Complex date arithmetic**: Calculating "the date 30 days from now" requires manual handling of month/year boundaries

The Temporal API completely solves these problems. In Node.js 26, **it is fully available without any experimental flags**.

### 3.2 Core Type System

```
Temporal
├── PlainDate          — 纯日期（无时间、无时区）
├── PlainTime          — 纯时间（无日期、无时区）
├── PlainDateTime      — 日期 + 时间（无时区）
├── PlainYearMonth     — 年 + 月
├── PlainMonthDay      — 月 + 日
├── ZonedDateTime      — 日期 + 时间 + 时区（完整表示）
├── Instant            — 绝对时间点（纳秒精度，自 Unix epoch 起）
├── Duration           — 时间段（年/月/周/天/时/分/秒/毫秒/微秒/纳秒）
├── TimeZone           — 时区标识
└── Calendar           — 日历系统
```

### 3.3 Practical Usage Comparison

```js
// ❌ 旧 Date API — 月份从 0 开始，修改是可变操作
const oldDate = new Date(2026, 4, 6);  // 4 = 五月？
oldDate.setDate(oldDate.getDate() + 30); // 修改了原对象

// ✅ 新 Temporal API — 语义清晰，不可变
const date = Temporal.PlainDate.from('2026-05-08');
const nextMonth = date.add({ days: 30 });  // 返回新对象，date 不变

// 时区感知
const meeting = Temporal.ZonedDateTime.from('2026-05-08T10:00[Asia/Shanghai]');
const inNY = meeting.withTimeZone('America/New_York');
console.log(inNY.toString()); // 2026-05-07T22:00:00-04:00[America/New_York]
```

### 3.4 Implementation Details

Temporal's underlying implementation uses the `temporal_rs` library written in Rust, rather than relying solely on the V8 engine. This means other JavaScript engines (such as JavaScriptCore and SpiderMonkey) can also integrate it directly, laying the foundation for Temporal to become a cross-runtime standard.

---

## 4. V8 14.6: A Major Engine Upgrade

Node.js 26 ships with **V8 14.6.202.33** (corresponding to Chromium 146), `NODE_MODULE_VERSION` has been raised to **147**, and all native C++ addons need to be recompiled.

### 4.1 Map Upsert Methods (Stage 3+)

V8 14.6 brings native support for the TC39 Upsert proposal:

```js
// 传统写法：两次哈希查找
if (!map.has(key)) {
  map.set(key, computeExpensiveValue());
}
const value = map.get(key);

// 新写法：一次哈希查找
const value = map.getOrInsertComputed(key, () => computeExpensiveValue());

// 或使用静态值
const value = map.getOrInsert(key, defaultValue);
```

`WeakMap` also gains the same `getOrInsert` / `getOrInsertComputed` methods.

### 4.2 Iterator Helper Methods

```js
// Iterator.concat() — 合并多个迭代器为单一序列
const a = [1, 2, 3].values();
const b = [4, 5, 6].values();
const combined = Iterator.concat(a, b);

for (const n of combined) {
  console.log(n); // 1, 2, 3, 4, 5, 6
}
```

### 4.3 Other V8 14.6 Enhancements

| Feature | Explanation |
|------|------|
| `Error.isError()` | Reliable error detection across Realms/Workers |
| `RegExp.escape()` | Safely escape regex special characters |
| `Float16Array` | 16-bit float TypedArray (ML/AI inference, WebGPU interoperability) |
| `Promise.try()` | Unified sync/async function call wrapping |
| **async/await performance** | Approximately 15% performance improvement |

---

## 5. Undici 8 and HTTP Layer Updates

Node.js 26 upgrades the built-in HTTP client to **Undici 8.0.2**—this is the underlying implementation of Node.js's global `fetch()`.

### 5.1 Core Improvements

- **WHATWG Fetch spec alignment**: Behavior is closer to browser-environment `fetch` semantics
- **HTTP/1.1 and HTTP/2**: Optimized persistent connection management
- **Connection pool strategy adjustments**: Behavior changes in the `Pool` and `Agent` classes
- **Unified error object format**: More consistent error handling

### 5.2 Notes for Projects That Directly Depend on Undici

If your project directly `import`s `undici`, after upgrading to Node.js 26 it is recommended to check:

```js
// 如果使用了 Undici 的底层 API
import { Pool, Agent, Dispatcher } from 'undici';

// 检查 Undici 8 的完整 changelog
// 特别关注 Pool 配置项和 Dispatcher 扩展点
```

---

## 6. Breaking Changes

### 6.1 Completely Removed APIs

| Removed Item | Replacement |
|--------|----------|
| `http.Server.prototype.writeHeader()` | Use `writeHead()` (note the casing) |
| Legacy Stream internal modules (`_stream_wrap`, `_stream_readable`, `_stream_writable`, `_stream_duplex`, `_stream_transform`, `_stream_passthrough`) | Use the modern Stream API |
| `--experimental-transform-types` flag | TypeScript transformation feature has been removed |
| crypto DEP0182 | Already End-of-Life, needs migration to the new crypto API |

### 6.2 New Runtime Deprecations

```js
// module.register() — 进入运行时弃用
// 将输出弃用警告：DEP0201
```

| Deprecated Item | Deprecation Number |
|--------|----------|
| `module.register()` | DEP0201 |
| Stream-related deprecations | DEP0203 |
| Crypto-related deprecations | DEP0204 |

---

## 7. Build and Platform Changes

| Change Item | Details |
|--------|------|
| **Minimum GCC version** | GCC 13.2+ (raised from 12) |
| **Python requirement** | Python 3.9 is no longer supported, 3.10+ required |
| **Windows SDK** | Upgraded to SDK 11 |
| **AIX / IBM i** | Migrated to Power 9 hardware, older Power processors no longer supported |
| **Linux s390x** | Enabled V8's mid-tier optimizing compiler Maglev |
| **ICU** | Updated to 78.3 (enhanced internationalization support) |
| **libuv** | Updated to 1.52.1 (underlying I/O engine) |

---

--- END CONTENT ---
## 8. Other Notable Updates

### 8.1 SQLite Enhancements

Node.js 26 enables the Percentile extension for the built-in `node:sqlite` module, which is particularly important in data analysis and statistical scenarios:

```js
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
// Percentile 扩展已默认启用
```

### 8.2 Node.js 26.1.0: Experimental FFI

Following closely after 26.0.0, **26.1.0** introduces the experimental `node:ffi` module, allowing native dynamic libraries to be called directly from JavaScript:

```bash
node --experimental-ffi script.js
```

This is strategically significant for high-performance computing and system-level applications — JS code can call native functions written in C/Rust with zero overhead.

### 8.3 Security Fixes

- Fixed **CVE-2026-21717**: V8 array index hash collision vulnerability

### 8.4 async/await Performance Improvements

Thanks to optimizations in V8 14.6, async/await operation performance has improved by approximately **15%**, a direct benefit for server-side applications that heavily use asynchronous operations.

---

## 9. Node.js 27 and the Future: A New Era of Annual Releases

### 9.1 New Release Cadence

Starting from Node.js 27, a **three-phase** release model will be adopted:

```
Alpha（6个月）     →  Current（6个月）    →  LTS（30个月）
   10月 ~ 3月           4月 ~ 10月              共计 2.5 年
   破坏性变更允许        稳定化阶段             安全修复
   灵活发布节奏         禁止破坏性变更          长期支持
```

### 9.2 Node.js 27 Alpha Coming Soon

| Milestone | Time |
|--------|------|
| Alpha begins | October 2026 |
| 27.0.0 Current | April 2027 |
| Enters LTS | October 2027 |
| EOL | April 2030 |

**Key Changes:**

- ✅ **Every version enters LTS** — no more "skip odd versions" rule
- ✅ **Version numbers aligned with years** — 27 corresponds to 2027, 28 to 2028
- ✅ **Alpha channel** — replaces the experimental role of odd versions, allowing library authors to test breaking changes early
- ✅ **Fewer active release lines** — reduced from 4-5 to at most 3

### 9.3 The Next Decade Roadmap

| Version | Alpha | Current | LTS | EOL |
|------|-------|---------|-----|-----|
| 27.x | October 2026 | April 2027 | October 2027 | April 2030 |
| 28.x | October 2027 | April 2028 | October 2028 | April 2031 |
| 29.x | October 2028 | April 2029 | October 2029 | April 2032 |
| 30.x | October 2029 | April 2030 | October 2030 | April 2033 |

---

## 10. Upgrade Guide

### 10.1 Upgrading from Node.js 24/25

```bash
# 使用 nvm
nvm install 26
nvm use 26

# 或使用 fnm
fnm install 26
fnm use 26

# 验证版本
node --version  # v26.0.0
```

### 10.2 Upgrade Checklist

```
Node.js 26 升级检查清单
├── ☐ 运行 npx npm-check-updates 检查依赖兼容性
├── ☐ 检查原生 C++ 插件是否兼容 NODE_MODULE_VERSION 147
├── ☐ 搜索 writeHeader() 替换为 writeHead()
├── ☐ 检查是否直接 import 'undici'（需查 Undici 8 changelog）
├── ☐ 移除 --experimental-transform-types 标志
├── ☐ 检查 crypto 旧 API 使用情况（DEP0182）
├── ☐ 验证 GCC 编译环境 ≥ 13.2（源码编译场景）
├── ☐ 将旧 Date 操作逐步迁移至 Temporal API
├── ☐ 在 CI 中加入 Node.js 26 测试矩阵
└── ☐ 短期：Node.js 24（活跃 LTS，最保守选择）
    中期：Node.js 26（10月进入 LTS，特性最先进）
    紧急：Node.js 22（维护 LTS，迁移窗口充裕）
    立即迁移：Node.js 20（已于 2026年4月30日 EOL！）
```

### 10.3 Quick Reference of Release Line Status

| Version | Status | EOL | Recommendation |
|------|------|-----|------|
| 20.x | **EOL** | April 30, 2026 | ⚠️ Migrate immediately |
| 22.x | Maintenance LTS | April 30, 2027 | Safe, but recommend migrating to 24 |
| 24.x | Active LTS | April 30, 2028 | ✅ Current production recommendation |
| 25.x | Maintenance | June 1, 2026 | Nearing EOL |
| **26.x** | **Current** | **April 30, 2029** | 🆕 Enters LTS in October |

---

## 11. Summary

Node.js 26 is a **"cleanup + acceleration + finale"** trifecta release:

| Dimension | Assessment |
|------|------|
| **Temporal API** | The starting point for modern date/time, available by default |
| **V8 14.6** | Map Upsert, Iterator.concat, 15% async performance improvement |
| **Undici 8** | HTTP layer continues to evolve, more standardized and efficient |
| **Breaking Changes** | Cleanup of legacy Stream/crypto/HTTP API baggage |
| **End of an Era** | The last odd-even version, entering LTS in October |
| **New Era** | Annual releases starting from Node.js 27, every version is LTS |

**Node.js 26 is the end of chapter one and the prologue to chapter two.** It inherits the maturity and stability of a decade of odd-even versions, while opening a new era of annual Node.js releases and universal LTS. Whether you choose to upgrade to Node.js 26 now or continue building on the Node.js 24 production baseline — the key is understanding the significance of this watershed version: **Node.js is becoming more predictable, more sustainable, and more future-oriented.**