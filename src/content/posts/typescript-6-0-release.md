---
title: TypeScript 6.0 正式发布：最后一个 JS 版本，为 Go 原生 7.0 铺路
published: 2026-03-23
description: 'TypeScript 6.0 正式发布，这是基于 JavaScript 代码库构建的最后一个主版本。strict 默认开启、types 默认清空、ES2025 支持、Temporal API，同时为即将到来的 Go 重写版 TypeScript 7.0 铺平道路。'
image: ''
tags: [TypeScript, 前端, JavaScript]
category: '前端'
draft: false 
lang: ''
---

## 1. 引言

2026年3月23日，微软正式发布了 **TypeScript 6.0**，由 TypeScript 首席产品经理 Daniel Rosenwasser 在官方 DevBlog 上宣布。这是 TypeScript 发展历程中一个承前启后的**里程碑版本**。

TypeScript 6.0 有一个非常特殊的身份——**这是基于现有 JavaScript 代码库构建的最后一个主版本**。微软已确认，TypeScript 7.0 将使用 **Go 语言**全面重写编译器和语言服务，代号 **"Project Corsa"**，预计编译速度将**提升 10 倍**。

TypeScript 6.0 的核心使命是：在彻底迁移到 Go 原生编译器之前，尽可能多地清理历史债务、调整默认行为、引入新的类型系统能力，让开发者**平稳过渡**到即将到来的 TypeScript 7.0 时代。

---

## 2. 核心定位：承前启后的「桥梁版本」

### 2.1 为什么是最后一个 JS 版本？

TypeScript 自诞生以来，编译器一直使用 TypeScript/JavaScript 自举实现。随着项目规模的增长和用户基数的膨胀（全球超过 **1000 万**开发者），JS 单线程性能瓶颈日益凸显。

微软在 2025 年启动了 **Project Corsa**——使用 Go 语言重写 TypeScript 编译器核心：

| 维度 | 当前 JS 编译器 | 即将到来的 Go 编译器 |
|------|---------------|-------------------|
| 并发模型 | 单线程 + Worker | 共享内存多线程 |
| 编译速度 | 基准线 | 提升 **10 倍** |
| 内存效率 | JS GC 管理 | 原生内存管理 |
| LSP 响应 | 取决于项目大小 | 极低延迟 |

### 2.2 7.0 的开发进度

TypeScript 7.0 已经"非常接近完成"，Nightly Build 可通过以下方式提前体验：

```bash
npm install -D @typescript/native-preview
```

同时 VS Code 用户可安装对应的 Nightly 扩展，在大型代码库上测试 Go 原生编译器的实际表现。

---

## 3. 全新特性

### 3.1 `es2025` Target / Lib

TypeScript 6.0 新增了 `es2025` 作为编译目标和库选项。`es2025` 类型的核心内容来自已进入 **Stage 4** 的 TC39 提案：

- **`RegExp.escape()`**：安全转义正则表达式中的特殊字符
- **`Promise.try()`**：统一同步/异步函数调用的 Promise 包装
- **Iterator 辅助方法**：`Iterator.prototype.map/filter/take/drop` 等链式操作
- **Set 方法**：`Set.prototype.union/intersection/difference/symmetricDifference` 等集合运算

```typescript
// es2025 新增能力示例
const escaped = RegExp.escape("foo.bar");  // "foo\\.bar"

const result = await Promise.try(() => mayThrow());

const nums = new Set([1, 2, 3]);
const evens = new Set([2, 4, 6]);
const union = nums.union(evens);  // Set {1, 2, 3, 4, 6}
```

### 3.2 Temporal API 类型支持

`Temporal` API 已进入 Stage 4，将成为 JavaScript 标准的日期时间处理方案。TypeScript 6.0 通过 `esnext.temporal` lib 提供完整类型支持：

```typescript
// Temporal API — 现代 JavaScript 日期处理
const now = Temporal.Now.plainDateTimeISO();
const meeting = now.add({ hours: 2, minutes: 30 });

const duration = meeting.since(now);
console.log(duration.toString()); // "PT2H30M"
```

### 3.3 Map "Upsert" 方法

TypeScript 6.0 为 `Map` 新增了两个实用的类型方法：

- **`getOrInsert(key, value)`**：键不存在时插入默认值并返回
- **`getOrInsertComputed(key, factory)`**：键不存在时通过工厂函数计算并插入

```typescript
const cache = new Map<string, number[]>();

// 传统写法
let items = cache.get("key");
if (!items) {
  items = [];
  cache.set("key", items);
}

// 6.0 新写法
const items = cache.getOrInsertComputed("key", () => []);
```

### 3.4 Subpath Imports (`#/`)

TypeScript 6.0 在 `nodenext` 和 `bundler` 模块解析模式下，正式支持 Node.js 风格的包内导入路径：

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
// 使用 # 前缀简洁导入
import { formatDate } from "#utils/date";
import { Button } from "#components/Button";
```

### 3.5 `--stableTypeOrdering` 标志

TypeScript 6.0 新增了 `--stableTypeOrdering` 迁移诊断标志。启用后，6.0 的类型排序算法与 7.0 的**确定性排序算法**保持一致。

> ⚠️ 注意：此标志可能导致类型检查速度降低 **25%**，仅在准备迁移到 7.0 时使用。

### 3.6 DOM 类型合并

`dom.iterable` 和 `dom.asynciterable` 的内容已合并入 `dom` lib，开发者不再需要为可迭代 DOM 类型单独声明。

---

## 4. 重大 Breaking Changes

### 4.1 默认值变更一览

这是 TypeScript 6.0 中影响最为广泛的变更——**多个历史默认值被一举翻转**：

| 配置项 | 旧默认值 | 新默认值 | 影响 |
|--------|---------|----------|------|
| `strict` | `false` | **`true`** | 所有严格检查默认开启 |
| `types` | 自动爬取 `@types` | **`[]`（空数组）** | 不再自动加载全局类型 |
| `module` | `commonjs` | **`esnext`** | 默认输出 ESM |
| `target` | `es5` | **`es2025`** | 默认目标最新标准 |
| `rootDir` | 自动推断 | **`.`** | 输出结构明确控制 |

### 4.2 `types: []` 的巨大影响

最受关注的变化当属 `types` 默认值改为空数组。这意味着 **`@types` 包不再被自动发现并加载**，需要通过 `types` 字段显式声明。

**微软团队透露，部分项目的冷构建时间因此缩短了 20%-50%。**

升级后必须立即检查 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "types": ["node"]  // 必须显式声明
  }
}
```

否则会出现大量 `Cannot find name 'console'`、`Cannot find name 'process'` 等标识符缺失错误。

### 4.3 `rootDir` 默认改为 `.`

这一变更会影响输出目录结构：

```bash
# 旧行为（rootDir 自动推断为 src/）
# 输出：dist/index.js

# 新行为（rootDir 默认为 .）
# 输出：dist/src/index.js   ← 多了一层！
```

升级时建议显式设置：

```json
{
  "compilerOptions": {
    "rootDir": "./src"
  }
}
```

### 4.4 `strict: true` 默认开启

TypeScript 6.0 默认开启 `strict: true`，这意味着以下所有子选项均默认启用：

- `strictNullChecks`
- `strictBindCallApply`
- `strictFunctionTypes`
- `strictPropertyInitialization`
- `noImplicitAny`
- `noImplicitThis`
- `alwaysStrict`
- `useUnknownInCatchVariables`

如果你的项目之前未启用 strict 模式，升级后可能会看到大量新的类型错误。**大多数错误是合理的**，反映了代码中潜在的 bug。

---

## 5. 已弃用配置（7.0 中将彻底移除）

TypeScript 6.0 中标记为**弃用**的选项，将在 **7.0 中彻底移除**。开发者应尽早迁移：

### 5.1 编译器选项

| 弃用项 | 替代方案 |
|--------|---------|
| `target: es5` | 使用 `es2015` 或更高版本 |
| `--downlevelIteration` | 配合新 target 使用原生迭代 |
| `module: amd / umd / systemjs` | 使用 `esnext` 或其他标准模块格式 |
| `--moduleResolution node` (node10) | `node16` / `nodenext` / `bundler` |
| `--moduleResolution classic` | 任何现代解析策略 |
| `--baseUrl` | 使用 `paths` 替代 |
| `--outFile` | 使用打包工具 |
| `--esModuleInterop false` | 统一启用 `esModuleInterop` |
| `--allowSyntheticDefaultImports false` | 统一启用默认导入 |
| `--alwaysStrict false` | 遵守新的 `strict` 默认值 |

### 5.2 语法弃用

- **模块命名空间语法**：`module Foo { }` → 使用 `namespace Foo { }`
- **Import Assertions**：`import ... assert { type: "json" }` → 使用 `import ... with { type: "json" }`

### 5.3 如何应对

在 6.0 中，可通过配置暂时抑制弃用错误：

```json
{
  "compilerOptions": {
    "ignoreDeprecations": "6.0"
  }
}
```

但请注意：**7.0 将完全不再支持这些选项**，`ignoreDeprecations: "6.0"` 届时也将失效。

---

## 6. 升级指南

### 6.1 最小化迁移步骤

将现有项目升级到 TypeScript 6.0 的建议流程：

```bash
# 1. 升级 TypeScript
npm install -D typescript@latest

# 2. 检查 TypeScript 版本
npx tsc --version
```

### 6.2 必需配置调整

升级后，大多数项目需要**立即进行两项配置调整**：

```json
{
  "compilerOptions": {
    // 1. 显式声明类型来源（必须！）
    "types": ["node"],

    // 2. 显式设置 rootDir（否则输出结构错乱）
    "rootDir": "./src"
  }
}
```

### 6.3 推荐迁移路径

```
现有项目
  ├── 升级至 TypeScript 6.0
  ├── 处理 strict 默认开启带来的新错误
  ├── 显式设置 types、rootDir
  ├── 逐一消除弃用警告
  ├── 配置新的 module/target 默认值
  ├── （可选）启用 --stableTypeOrdering 测试 7.0 兼容性
  └── 准备迎接 TypeScript 7.0 Go 编译器
```

### 6.4 在大型项目中渐进式迁移

对于大型代码库，建议：

1. **先在 CI 中单独运行 6.0 编译**，不阻塞主流程
2. **逐步修复 strict 错误**，按文件或目录分批进行
3. **使用 `ignoreDeprecations` 争取时间**，但要有明确的消除计划
4. **尝鲜 `@typescript/native-preview`**，提前评估 7.0 的兼容性

---

## 7. 发布历程与展望

### 7.1 时间线

| 日期 | 里程碑 |
|------|--------|
| 2026年2月11日 | TypeScript 6.0 **Beta** 发布 |
| 2026年3月6日 | TypeScript 6.0 **RC** 发布 |
| **2026年3月23日** | **TypeScript 6.0 正式 GA** |
| 未来几个月 | TypeScript 7.0 稳定版预计发布 |

### 7.2 对 TypeScript 7.0 的展望

TypeScript 7.0 将是一次**彻底的编译器重写**——不是增量改进，而是用 Go 语言重新构建整个编译管线：

- **共享内存多线程**：充分利用多核 CPU，而非 Worker 线程通信
- **原生代码性能**：远离 JS GC，获得确定性的内存管理
- **10 倍编译速度**：大型项目的编译时间将从分钟级降至秒级
- **极低 LSP 延迟**：代码补全、错误提示、重构——一切都将更快

### 7.3 生态影响

TypeScript 的 Go 重写不仅仅是一次性能升级，更标志着 JavaScript 工具链的**系统编程语言化**趋势：

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

这一趋势意味着，前端工程化正在从 "够用即可" 转向 "原生性能"，开发者体验将迎来质的飞跃。

---

## 8. 总结

TypeScript 6.0 是一个**大胆而务实**的版本：

| 维度 | 评价 |
|------|------|
| **新能力** | ES2025、Temporal API、Subpath Imports——保持与标准同步 |
| **默认值翻转** | strict/types/module/target——一次性清理历史包袱 |
| **弃用清理** | 移除过时的模块格式和解析策略——为 Go 重写减负 |
| **桥梁角色** | `stableTypeOrdering`、`ignoreDeprecations`——平滑过渡 |

**TypeScript 6.0 是终点，也是起点。** 它终结了 TypeScript 的 JavaScript 自举时代，同时开启了 Go 原生编译器的全新时代。对于开发者而言，现在就该开始升级和适配——因为当 TypeScript 7.0 到来时，你将站在一个**快 10 倍的起跑线上**。
