---
title: HTTP 缓存策略完全指南：从浏览器到 CDN
published: 2026-08-04
description: '全面解析 HTTP 缓存机制：强缓存、协商缓存、Cache-Control 指令、CDN 缓存策略，附带实战配置示例与调试技巧。'
image: ''
tags: [HTTP, 缓存, CDN, Web性能, 浏览器, Cache-Control, ETag]
category: '网站'
draft: false
lang: ''
---

## 1. 为什么缓存如此重要

Web 性能优化的核心原则之一：**最快的请求是不发请求**。

HTTP 缓存是 Web 性能的基石。一个合理的缓存策略可以让页面加载时间减少 50% 以上，同时显著降低服务器负载和带宽成本。根据 HTTP Archive 的数据，一个页面平均有 70% 的请求是可缓存的静态资源——图片、CSS、JS、字体文件。如果这些资源每次都被重新下载，是对带宽和后端资源的巨大浪费。

但缓存也是一把双刃剑。配置不当会导致用户看到过期内容，或者更新了一个 JS 文件后用户却仍然使用旧版本，引发各种诡异 bug。本文将从前端和运维两个视角，系统讲解 HTTP 缓存的完整知识体系。

## 2. HTTP 缓存的两大类型

HTTP 缓存分为**强缓存**和**协商缓存**两大类。它们的核心区别在于：是否需要向服务器发起请求来验证缓存是否有效。

### 2.1 强缓存

强缓存的意思是：浏览器在缓存期内**根本不发请求**，直接使用本地缓存。

实现强缓存的 HTTP 响应头是 `Cache-Control`（HTTP/1.1）和 `Expires`（HTTP/1.0）。

```
HTTP/1.1 200 OK
Cache-Control: max-age=31536000, immutable
```

- `max-age=<seconds>`：缓存的最大有效时间（秒），从请求时间开始计算
- `immutable`：告诉浏览器这个资源永远不会变，即使用户按 F5 刷新也不要重新验证

**Expires vs Cache-Control**

`Expires` 使用绝对时间，存在时钟不同步的问题：

```
Expires: Wed, 21 Oct 2026 07:28:00 GMT
```

如果 `Cache-Control` 和 `Expires` 同时存在，`Cache-Control` 优先级更高。在现代 Web 开发中，我们应统一使用 `Cache-Control`。

### 2.2 协商缓存

当强缓存过期后，浏览器会向服务器发起**带验证器的请求**，由服务器判断资源是否发生了变化。如果没变，返回 `304 Not Modified`，浏览器继续使用本地缓存；如果变了，返回 `200 OK` 和新内容。

协商缓存依赖两对 HTTP 头：

**Last-Modified / If-Modified-Since**

```
# 响应头
Last-Modified: Tue, 01 Jul 2026 10:30:00 GMT

# 后续请求头
If-Modified-Since: Tue, 01 Jul 2026 10:30:00 GMT
```

服务器比较文件的最后修改时间。缺点是精度只有秒级，且文件内容不变但 mtime 变了（比如重新部署）也会导致缓存失效。

**ETag / If-None-Match**

```
# 响应头
ETag: "abc123"

# 后续请求头
If-None-Match: "abc123"
```

`ETag` 是一个资源内容的哈希值，比 `Last-Modified` 更精确。内容不变、ETag 就不变。ETag 的优先级高于 `Last-Modified`。

## 3. Cache-Control 指令详解

`Cache-Control` 是缓存策略的核心。我们来逐一拆解每个指令的含义：

| 指令 | 作用 | 典型场景 |
|------|------|----------|
| `public` | 任何节点都可缓存（浏览器、CDN、代理） | 公共静态资源 |
| `private` | 仅浏览器可缓存 | 用户个人数据 |
| `no-cache` | 可以缓存，但每次使用前必须验证 | 需要及时更新的页面 |
| `no-store` | 完全不缓存 | 敏感数据（银行页面） |
| `max-age=N` | 缓存有效期 N 秒 | 所有资源 |
| `s-maxage=N` | 仅 CDN/代理的缓存时间 | CDN 缓存策略 |
| `must-revalidate` | 过期后必须向服务器验证 | 重要资源 |
| `stale-while-revalidate` | 过期后可先用旧缓存，后台异步更新 | 提升响应速度 |
| `stale-if-error` | 服务器出错时可使用过期缓存 | 容灾降级 |
| `immutable` | 资源永不变化，不发起验证请求 | 带指纹的静态资源 |

## 4. 实战：针对不同资源的缓存策略

### 4.1 带哈希的静态资源（JS/CSS/图片）

这是最适合激进缓存的一类资源。文件名里的内容哈希（如 `main.a1b2c3d.js`）保证了文件内容变化时 URL 也会变：

```
Cache-Control: public, max-age=31536000, immutable
```

- `max-age=31536000`：缓存一年
- `immutable`：即使 F5 刷新也不重新验证，因为 URL 变 = 内容变

Vite、Webpack、Next.js 等现代打包工具默认都输出带哈希的文件名。

### 4.2 HTML 页面

HTML 不能激进缓存，因为它是应用的入口点。一旦被缓存，用户就看不到更新：

```
Cache-Control: no-cache
```

或者用一个较短的 max-age：

```
Cache-Control: public, max-age=0, must-revalidate
```

`no-cache` 和 `max-age=0, must-revalidate` 效果类似——每次都验证，但允许返回 304。

### 4.3 API 接口

对于 REST API 响应，缓存策略取决于数据的实时性要求：

```javascript
// 用户个人信息：不缓存
res.setHeader('Cache-Control', 'private, no-cache, no-store');

// 公共的文章列表：可以缓存 60 秒
res.setHeader('Cache-Control', 'public, max-age=60');

// 近乎不变的数据（如国家列表）：缓存 1 天
res.setHeader('Cache-Control', 'public, max-age=86400');
```

### 4.4 字体文件

字体文件体积大且很少变化，适合长期缓存：

```
Cache-Control: public, max-age=31536000, immutable
```

但需要注意跨域问题：浏览器对字体文件强制 CORS 检查，确保 CDN 配置了 `Access-Control-Allow-Origin`。

### 4.5 Service Worker 脚本

Service Worker 的缓存有特殊规则：浏览器会忽略 Cache-Control，最多缓存 24 小时。这是浏览器的安全机制，确保恶意 SW 不会永久驻留。

## 5. CDN 缓存策略

现代 Web 应用几乎都使用 CDN，CDN 层有自己的缓存逻辑。

### 5.1 CDN 缓存键

CDN 根据**缓存键** 来区分不同资源。默认缓存键是 `域名 + URI`。但对于多语言站点或 A/B 测试，可能需要自定义缓存键：

```
# 把 Accept-Language 加入缓存键，实现按语言缓存
Cache-Key: ${host}${uri}${http_accept_language}
```

### 5.2 CDN 刷新（Purge）

当需要紧急更新资源时，有两个选项：

- **Purge（清除）**：立即删除 CDN 缓存，下一次请求回源
- **Prefetch（预热）**：提前把资源推送到 CDN 边缘节点

Purge 操作有冷却时间（各 CDN 厂商不同），不能频繁调用。

### 5.3 源站与 CDN 缓存时间的协调

一个常见的问题是：源站的 `Cache-Control: max-age=3600` 和 CDN 控制台设置的缓存时间冲突怎么办？

结论：**大多数 CDN 以源站的 Cache-Control 为准**。但你可以用 `s-maxage` 单独控制 CDN 层的缓存时间：

```
Cache-Control: public, max-age=3600, s-maxage=86400
```

这表示浏览器缓存 1 小时，CDN 缓存 24 小时。

## 6. 缓存失效策略

缓存更新是最难的问题之一。业界主要有以下几种策略：

### 6.1 文件名指纹（File Fingerprinting）

最佳实践。每个构建产物的文件名包含其内容的哈希值：

```
main.abc123.js  →  main.def456.js
```

旧文件可以继续被缓存，新文件因为 URL 不同而被当作新资源。这就是为什么 Webpack/Vite 默认都输出 `[name].[contenthash].js`。

### 6.2 Cache Busting：查询参数

在 URL 后面加 `?v=1.0.1`：

```html
<link rel="stylesheet" href="/style.css?v=2.0.0">
```

这种方式简单但问题很多：
- 很多 CDN 默认忽略查询参数，导致 bust 失效
- 中间代理可能不缓存带查询参数的资源
- 无法与 `immutable` 配合使用

**不推荐**，应优先使用文件名指纹。

### 6.3 Purge API

通过 CDN 提供的 API 主动清除缓存。适合紧急修复场景（如线上 bug），但不适合作为常规更新手段。

## 7. 调试与验证

### 7.1 Chrome DevTools

在 Network 面板中，检查资源的 Size 列：

- `(disk cache)` / `(memory cache)`：强缓存命中
- `304 Not Modified`：协商缓存命中
- `200 OK（具体大小）`：从服务器重新下载

注意：**禁用缓存**的勾选只在 DevTools 打开时生效，不要忘记取消勾选来验证实际缓存行为。

### 7.2 cURL 命令行调试

```bash
# 查看完整响应头
curl -I https://example.com/style.css

# 发送 If-None-Match 验证协商缓存
curl -I -H 'If-None-Match: "abc123"' https://example.com/style.css

# 模拟浏览器缓存行为
curl -H 'Cache-Control: max-age=0' https://example.com/style.css
```

### 7.3 常见问题排查

| 现象 | 可能原因 | 排查方向 |
|------|----------|----------|
| 资源更新后用户看到旧版本 | HTML 被缓存了 | 检查 HTML 的 Cache-Control |
| 每次刷新都重新下载 | 缺少强缓存头 | 给静态资源加 `max-age` 和 `immutable` |
| CDN 缓存不生效 | CDN 忽略了响应头 | 检查 CDN 控制台配置 |
| F5 刷新时所有资源重新验证 | 没加 `immutable` | 给带哈希的资源加 `immutable` |

## 8. 最佳实践总结

1. **静态资源使用文件名指纹 + 长期缓存**：`Cache-Control: public, max-age=31536000, immutable`
2. **HTML 入口用 `no-cache` 或短 `max-age`**：确保用户能拿到最新页面结构
3. **API 根据数据实时性分级缓存**：用户数据不缓存，公共数据可短缓存
4. **用 `s-maxage` 差异化控制 CDN 缓存**：CDN 可以比浏览器缓存更久
5. **部署时不要 Purge 所有缓存**：文件名指纹策略下，旧资源和旧 HTML 是兼容的
6. **利用 `stale-while-revalidate` 和 `stale-if-error`** 提升用户体验和可用性

缓存策略没有银弹。关键是根据资源的**变更频率**和**用户对实时性的要求**来选择正确的策略。理解 HTTP 缓存的底层机制，你就能自信地做出这些权衡。

## 参考来源

- [MDN: Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
- [web.dev: HTTP Caching](https://web.dev/articles/http-cache)
- [Cloudflare: What is Cache-Control?](https://www.cloudflare.com/learning/cdn/glossary/what-is-cache-control/)
- [Google: HTTP Caching overview](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching)
- [HTTP Archive: State of the Web](https://httparchive.org/)
