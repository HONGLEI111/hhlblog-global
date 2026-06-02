---
title: Node.js 26 正式发布：Temporal API 默认启用，最后一个奇偶版本
published: 2026-05-05
description: 'Node.js 26 正式发布，Temporal API 默认可用，V8 14.6、Undici 8、Map Upsert 正式落地。这是最后一个沿用奇偶策略的主版本，从 Node.js 27 开始将改为年度发布节奏，每个版本都将进入 LTS。'
image: ''
tags: [Node.js, JavaScript, 后端]
category: '后端'
draft: false 
lang: ''
---

## 1. 引言

2026年5月5日，Node.js 团队正式发布了 **Node.js 26.0.0**（Current），由核心开发者 Rafael Gonzaga 在 GitHub PR 中宣布。这个版本不仅是技术栈的一次重大升级，更标志着一个时代的终结——**它是最后一个沿用奇偶版本策略的主版本**。

Node.js 26 的核心亮点是 **Temporal API 默认可用**——无需任何实验性标志即可使用现代日期/时间 API，彻底告别 `Date` 对象的种种痛点。与此同时，Node.js 团队正式宣布：从 **Node.js 27** 开始，将改为**每年一个主版本**的发布节奏，每个版本都将进入 LTS 阶段。

---

## 2. 核心定位：承前启后的「终章」

### 2.1 最后一个奇偶版本

自 Node.js 诞生以来，一直遵循**奇偶版本策略**：

- **偶数版本**（22、24、26）→ LTS，推荐生产使用
- **奇数版本**（23、25）→ Current 实验版，不进入 LTS，新功能试水

研发运营了十余年的这套规则，将在 Node.js 26 之后画上句号。

### 2.2 为什么需要改变？

Node.js 官方博客解释了这次变革的四大驱动力：

| 原因 | 说明 |
|------|------|
| **奇数版本采用率极低** | 大多数用户和企业完全跳过奇数版本，等待 LTS |
| **社区长期困惑** | 新开发者对"用偶数、跳奇数"的规则感到困惑 |
| **维护者不可持续性** | 志愿者为主的团队需同时维护 4-5 个活跃版本线，负担过重 |
| **企业可预测性** | 固定的年度节奏让升级规划更为简单 |

### 2.3 Node.js 26 发布计划

| 里程碑 | 时间 |
|--------|------|
| 26.0.0 Current 发布 | 2026年5月5日 |
| 进入 LTS | 2026年10月 |
| 进入维护期 | 2027年10月 |
| End of Life | **2029年4月** |

---

## 3. Temporal API：现代日期时间的元年

### 3.1 为什么需要 Temporal？

JavaScript 的 `Date` 对象自 1995 年诞生以来，一直是开发者最频繁抱怨的 API 之一：

- **月份从 0 开始**（0 = 一月），几乎每个人都踩过这个坑
- **可变对象**：修改一个 Date 实例可能产生难以追踪的副作用
- **时区处理弱**：缺乏原生的时区感知能力
- **日期运算复杂**：计算"30天后的日期"需要手动处理跨月/跨年

Temporal API 彻底解决了这些问题。在 Node.js 26 中，**它已全面可用，无需任何实验性标志**。

### 3.2 核心类型体系

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

### 3.3 实际使用对比

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

### 3.4 实现细节

Temporal 的底层实现使用了 Rust 语言编写的 `temporal_rs` 库，并非仅仅依赖 V8 引擎。这意味着其他 JavaScript 引擎（如 JavaScriptCore、SpiderMonkey）也可以直接集成，为 Temporal 成为跨运行时标准奠定了基础。

---

## 4. V8 14.6：引擎大升级

Node.js 26 搭载了 **V8 14.6.202.33**（对应 Chromium 146），`NODE_MODULE_VERSION` 升至 **147**，所有原生 C++ 插件需要重新编译。

### 4.1 Map Upsert 方法（Stage 3+）

V8 14.6 带来了 TC39 Upsert 提案的原生支持：

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

`WeakMap` 也获得了相同的 `getOrInsert` / `getOrInsertComputed` 方法。

### 4.2 Iterator 辅助方法

```js
// Iterator.concat() — 合并多个迭代器为单一序列
const a = [1, 2, 3].values();
const b = [4, 5, 6].values();
const combined = Iterator.concat(a, b);

for (const n of combined) {
  console.log(n); // 1, 2, 3, 4, 5, 6
}
```

### 4.3 其他 V8 14.6 增强

| 特性 | 说明 |
|------|------|
| `Error.isError()` | 跨 Realm/Worker 的可靠错误检测 |
| `RegExp.escape()` | 安全转义正则特殊字符 |
| `Float16Array` | 16 位浮点 TypedArray（ML/AI 推理、WebGPU 互操作） |
| `Promise.try()` | 统一同步/异步函数调用包装 |
| **async/await 性能** | 约 15% 的性能提升 |

---

## 5. Undici 8 与 HTTP 层更新

Node.js 26 将内置 HTTP 客户端升级至 **Undici 8.0.2**——这是 Node.js 全局 `fetch()` 的底层实现。

### 5.1 核心改进

- **WHATWG Fetch 规范对齐**：行为更接近浏览器环境的 `fetch` 语义
- **HTTP/1.1 和 HTTP/2**：持久连接管理优化
- **连接池策略调整**：`Pool` 和 `Agent` 类的行为变更
- **错误对象格式统一**：错误处理更一致

### 5.2 直接依赖 Undici 的项目注意事项

如果在项目中直接 `import` 了 `undici`，升级 Node.js 26 后建议检查：

```js
// 如果使用了 Undici 的底层 API
import { Pool, Agent, Dispatcher } from 'undici';

// 检查 Undici 8 的完整 changelog
// 特别关注 Pool 配置项和 Dispatcher 扩展点
```

---

## 6. 破坏性变更

### 6.1 彻底移除的 API

| 移除项 | 替代方案 |
|--------|----------|
| `http.Server.prototype.writeHeader()` | 使用 `writeHead()`（注意大小写） |
| 旧版 Stream 内部模块（`_stream_wrap`、`_stream_readable`、`_stream_writable`、`_stream_duplex`、`_stream_transform`、`_stream_passthrough`） | 使用现代 Stream API |
| `--experimental-transform-types` 标志 | TypeScript 转换功能已移除 |
| crypto DEP0182 | 已 End-of-Life，需迁移到新的 crypto API |

### 6.2 新增运行时弃用

```js
// module.register() — 进入运行时弃用
// 将输出弃用警告：DEP0201
```

| 弃用项 | 弃用编号 |
|--------|----------|
| `module.register()` | DEP0201 |
| Stream 相关弃用 | DEP0203 |
| Crypto 相关弃用 | DEP0204 |

---

## 7. 构建与平台变更

| 变更项 | 详情 |
|--------|------|
| **GCC 最低版本** | GCC 13.2+（从 12 提升） |
| **Python 要求** | Python 3.9 不再受支持，需 3.10+ |
| **Windows SDK** | 升级至 SDK 11 |
| **AIX / IBM i** | 迁移至 Power 9 硬件，旧版 Power 处理器不再支持 |
| **Linux s390x** | 启用 V8 中间层优化编译器 Maglev |
| **ICU** | 更新至 78.3（国际化支持增强） |
| **libuv** | 更新至 1.52.1（底层 I/O 引擎） |

---

## 8. 其他值得关注的更新

### 8.1 SQLite 增强

Node.js 26 为内置 `node:sqlite` 模块启用了 Percentile 扩展，在数据分析和统计场景中尤为重要：

```js
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
// Percentile 扩展已默认启用
```

### 8.2 Node.js 26.1.0：实验性 FFI

紧随 26.0.0，**26.1.0** 引入了实验性的 `node:ffi` 模块，允许直接从 JavaScript 调用原生动态库：

```bash
node --experimental-ffi script.js
```

这对高性能计算和系统级应用具有战略意义——JS 代码可以零开销调用 C/Rust 编写的原生函数。

### 8.3 安全修复

- 修复 **CVE-2026-21717**：V8 数组索引哈希冲突漏洞

### 8.4 async/await 性能提升

得益于 V8 14.6 的优化，async/await 操作的性能提升了约 **15%**，对重度使用异步操作的服务端应用是直接的利好。

---

## 9. Node.js 27 与未来：年度发布新纪元

### 9.1 新发布节奏

从 Node.js 27 开始，将采用**三阶段**发布模型：

```
Alpha（6个月）     →  Current（6个月）    →  LTS（30个月）
   10月 ~ 3月           4月 ~ 10月              共计 2.5 年
   破坏性变更允许        稳定化阶段             安全修复
   灵活发布节奏         禁止破坏性变更          长期支持
```

### 9.2 Node.js 27 Alpha 即将开启

| 里程碑 | 时间 |
|--------|------|
| Alpha 开始 | 2026年10月 |
| 27.0.0 Current | 2027年4月 |
| 进入 LTS | 2027年10月 |
| EOL | 2030年4月 |

**关键变化：**

- ✅ **每个版本都进入 LTS** —— 不再有"跳过奇数版"规则
- ✅ **版本号与年份对齐** —— 27 对应 2027，28 对应 2028
- ✅ **Alpha 通道** —— 替代奇数版的实验角色，库作者可提前测试破坏性变更
- ✅ **活跃版本线减少** —— 从 4-5 个缩减至最多 3 个

### 9.3 未来十年路线图

| 版本 | Alpha | Current | LTS | EOL |
|------|-------|---------|-----|-----|
| 27.x | 2026年10月 | 2027年4月 | 2027年10月 | 2030年4月 |
| 28.x | 2027年10月 | 2028年4月 | 2028年10月 | 2031年4月 |
| 29.x | 2028年10月 | 2029年4月 | 2029年10月 | 2032年4月 |
| 30.x | 2029年10月 | 2030年4月 | 2030年10月 | 2033年4月 |

---

## 10. 升级指南

### 10.1 从 Node.js 24/25 升级

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

### 10.2 升级检查清单

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

### 10.3 各版本线状态速查

| 版本 | 状态 | EOL | 建议 |
|------|------|-----|------|
| 20.x | **EOL** | 2026年4月30日 | ⚠️ 立即迁移 |
| 22.x | 维护 LTS | 2027年4月30日 | 安全，但建议迁移到 24 |
| 24.x | 活跃 LTS | 2028年4月30日 | ✅ 当前生产推荐 |
| 25.x | 维护期 | 2026年6月1日 | 即将 EOL |
| **26.x** | **Current** | **2029年4月30日** | 🆕 10月进入 LTS |

---

## 11. 总结

Node.js 26 是一个**"清理 + 加速 + 终结"**三位一体的版本：

| 维度 | 评价 |
|------|------|
| **Temporal API** | 现代日期时间的起点，默认可用 |
| **V8 14.6** | Map Upsert、Iterator.concat、15% async 性能提升 |
| **Undici 8** | HTTP 层持续演进，更规范、更高效 |
| **破坏性变更** | 清理旧 Stream/crypto/HTTP API 历史包袱 |
| **时代终结** | 最后一个奇偶版本，10月进入 LTS |
| **新时代** | Node.js 27 起年度发布，每个版本都是 LTS |

**Node.js 26 是第一章的结尾，也是第二章的序章。** 它继承了十年来奇偶版本的成熟与稳定，同时开启了 Node.js 年度发行、全面 LTS 的新时代。无论你选择在当前就升级到 Node.js 26，还是继续建立在 Node.js 24 的生产基线上——关键在于理解这个分水岭版本的意义：**Node.js 正在变得更加可预测、更可持续、更面向未来。**
