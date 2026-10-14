---
title: 'The Complete Guide to HTTP Caching Strategies: From Browser to CDN'
published: 2026-08-04
description: 'A comprehensive breakdown of HTTP caching mechanisms: strong caching, negotiated caching, Cache-Control directives, and CDN caching strategies, with practical configuration examples and debugging tips.'
image: ''
tags: [HTTP, Caching, CDN, Web Performance, Browser, Cache-Control, ETag]
category: Web
draft: false
---
## 1. Why Caching Matters So Much

One of the core principles of web performance optimization: **the fastest request is no request at all**.

HTTP caching is the cornerstone of web performance. A well-designed caching strategy can reduce page load time by more than 50%, while significantly lowering server load and bandwidth costs. According to HTTP Archive data, an average page has 70% of its requests being cacheable static resources—images, CSS, JS, and font files. If these resources were re-downloaded every time, it would be a huge waste of bandwidth and backend resources.

But caching is also a double-edged sword. Improper configuration can cause users to see stale content, or after updating a JS file, users still use the old version, triggering all sorts of bizarre bugs. This article will systematically explain the complete knowledge system of HTTP caching from both frontend and operations perspectives.

## 2. The Two Major Types of HTTP Caching

HTTP caching is divided into two major categories: **strong caching** and **negotiated caching**. The core difference lies in whether a request needs to be sent to the server to verify whether the cache is still valid.

### 2.1 Strong Caching

Strong caching means: during the cache period, the browser **doesn't send a request at all** and directly uses the local cache.

The HTTP response headers that implement strong caching are `Cache-Control` (HTTP/1.1) and `Expires` (HTTP/1.0).

```
HTTP/1.1 200 OK
Cache-Control: max-age=31536000, immutable
```

- `max-age=<seconds>`: The maximum valid time of the cache (in seconds), calculated from the request time
- `immutable`: Tells the browser that this resource will never change, and even if the user presses F5 to refresh, it should not re-validate

**Expires vs Cache-Control**

`Expires` uses absolute time, which has the problem of clock desynchronization:

```
Expires: Wed, 21 Oct 2026 07:28:00 GMT
```

If `Cache-Control` and `Expires` both exist, `Cache-Control` takes higher priority. In modern web development, we should uniformly use `Cache-Control`.

### 2.2 Negotiated Caching

After strong caching expires, the browser sends a **request with a validator** to the server, and the server determines whether the resource has changed. If it hasn't changed, it returns `304 Not Modified`, and the browser continues to use the local cache; if it has changed, it returns `200 OK` and the new content.

Negotiated caching relies on two pairs of HTTP headers:

**Last-Modified / If-Modified-Since**

```
# 响应头
Last-Modified: Tue, 01 Jul 2026 10:30:00 GMT

# 后续请求头
If-Modified-Since: Tue, 01 Jul 2026 10:30:00 GMT
```

The server compares the file's last modification time. The drawback is that the precision is only at the second level, and if the file content doesn't change but the mtime does (such as after a redeployment), it will also cause cache invalidation.

**ETag / If-None-Match**

```
# 响应头
ETag: "abc123"

# 后续请求头
If-None-Match: "abc123"
```

`ETag` is a hash value of the resource content, which is more precise than `Last-Modified`. If the content doesn't change, the ETag doesn't change. ETag has higher priority than `Last-Modified`.

## 3. Detailed Explanation of Cache-Control Directives

`Cache-Control` is the core of caching strategy. Let's break down the meaning of each directive one by one:

| Directive | Purpose | Typical Scenario |
|------|------|----------|
| `public` | Any node can cache (browser, CDN, proxy) | Public static resources |
| `private` | Only the browser can cache | User personal data |
| `no-cache` | Can be cached, but must be validated before each use | Pages that need timely updates |
| `no-store` | No caching at all | Sensitive data (banking pages) |
| `max-age=N` | Cache valid for N seconds | All resources |
| `s-maxage=N` | Cache time for CDN/proxy only | CDN caching strategy |
| `must-revalidate` | Must validate with server after expiration | Important resources |
| `stale-while-revalidate` | Can use stale cache after expiration, update asynchronously in background | Improve response speed |
| `stale-if-error` | Can use stale cache when server errors occur | Disaster recovery and degradation |
| `immutable` | Resource never changes, no validation request initiated | Static resources with fingerprints |

## 4. In Practice: Caching Strategies for Different Resources

### 4.1 Static Resources with Hashes (JS/CSS/Images)

This is the type of resource most suited for aggressive caching. The content hash in the filename (such as `main.a1b2c3d.js`) ensures that the URL changes when the file content changes:

```
Cache-Control: public, max-age=31536000, immutable
```

- `max-age=31536000`: Cache for one year
- `immutable`: Even F5 refresh won't re-validate, because URL change = content change

Modern bundlers like Vite, Webpack, and Next.js all output hashed filenames by default.

### 4.2 HTML Pages

HTML cannot be aggressively cached because it is the entry point of the application. Once cached, users won't see updates:

```
Cache-Control: no-cache
```

Or use a shorter max-age:

```
Cache-Control: public, max-age=0, must-revalidate
```

`no-cache` and `max-age=0, must-revalidate` have similar effects—validate every time, but allow returning 304.

### 4.3 API Endpoints

For REST API responses, the caching strategy depends on the real-time requirements of the data:

```javascript
// 用户个人信息：不缓存
res.setHeader('Cache-Control', 'private, no-cache, no-store');

// 公共的文章列表：可以缓存 60 秒
res.setHeader('Cache-Control', 'public, max-age=60');

// 近乎不变的数据（如国家列表）：缓存 1 天
res.setHeader('Cache-Control', 'public, max-age=86400');
```

### 4.4 Font Files

Font files are large in size and rarely change, making them suitable for long-term caching:

```
Cache-Control: public, max-age=31536000, immutable
```

But cross-origin issues need attention: browsers enforce CORS checks on font files, so make sure the CDN is configured with `Access-Control-Allow-Origin`.

### 4.5 Service Worker Scripts

Service Worker caching has special rules: browsers ignore Cache-Control and cache for at most 24 hours. This is a browser security mechanism to ensure that malicious SWs don't persist permanently.

## 5. CDN Caching Strategies

Modern web applications almost all use CDNs, and the CDN layer has its own caching logic.

### 5.1 CDN Cache Keys

CDNs distinguish different resources based on **cache keys**. The default cache key is `域名 + URI`. But for multilingual sites or A/B testing, custom cache keys may be needed:

```
# 把 Accept-Language 加入缓存键，实现按语言缓存
Cache-Key: ${host}${uri}${http_accept_language}
```

### 5.2 CDN Purge

When resources need to be urgently updated, there are two options:

- **Purge**: Immediately delete the CDN cache, and the next request goes back to origin
- **Prefetch**: Push resources to CDN edge nodes in advance

Purge operations have a cooldown period (varies by CDN provider) and cannot be called frequently.

### 5.3 Coordinating Origin and CDN Cache Times

A common question is: what happens when the origin's `Cache-Control: max-age=3600` conflicts with the cache time set in the CDN console?

Conclusion: **Most CDNs prioritize the origin's Cache-Control**. But you can use `s-maxage` to separately control the CDN layer's cache time:

```
Cache-Control: public, max-age=3600, s-maxage=86400
```

This means the browser caches for 1 hour, and the CDN caches for 24 hours.

## 6. Cache Invalidation Strategies

Cache updates are one of the hardest problems. The industry mainly has the following strategies:

### 6.1 File Fingerprinting

The best practice. Each build artifact's filename contains a hash of its content:

```
main.abc123.js  →  main.def456.js
```

Old files can continue to be cached, and new files are treated as new resources because of their different URLs. This is why Webpack/Vite output `[name].[contenthash].js` by default.

### 6.2 Cache Busting: Query Parameters

Append `?v=1.0.1` to the URL:

```html
<link rel="stylesheet" href="/style.css?v=2.0.0">
```

This approach is simple but has many problems:
- Many CDNs ignore query parameters by default, causing busting to fail
- Intermediate proxies may not cache resources with query parameters
- Cannot be used in conjunction with `immutable`

**Not recommended**; filename fingerprinting should be preferred.

### 6.3 Purge API

Proactively clear the cache through the API provided by the CDN. Suitable for emergency fix scenarios (such as production bugs), but not suitable as a regular update method.

## 7. Debugging and Verification

### 7.1 Chrome DevTools

In the Network panel, check the Size column of resources:

- `(disk cache)` / `(memory cache)`: Strong cache hit
- `304 Not Modified`: Negotiated cache hit
- `200 OK（具体大小）`: Re-downloaded from the server

Note: The **Disable cache** checkbox only takes effect while DevTools is open. Don't forget to uncheck it to verify actual caching behavior.

### 7.2 cURL Command-Line Debugging

```bash
# 查看完整响应头
curl -I https://example.com/style.css

# 发送 If-None-Match 验证协商缓存
curl -I -H 'If-None-Match: "abc123"' https://example.com/style.css

# 模拟浏览器缓存行为
curl -H 'Cache-Control: max-age=0' https://example.com/style.css
```

### 7.3 Troubleshooting Common Issues

| Symptom | Possible Cause | Investigation Direction |
|------|----------|----------|
| Users see old version after resource update | HTML is cached | Check the HTML's Cache-Control |
| Re-downloaded on every refresh | Missing strong cache headers | Add `max-age` and `immutable` to static resources |
| CDN caching not working | CDN ignored response headers | Check CDN console configuration |
| All resources re-validated on F5 refresh | `immutable` not added | Add `immutable` to hashed resources |
## 8. Best Practices Summary

1. **Use filename fingerprinting + long-term caching for static assets**: `Cache-Control: public, max-age=31536000, immutable`
2. **Use `no-cache` or a short `max-age` for HTML entry points**: Ensure users get the latest page structure
3. **Cache APIs in tiers based on data real-time requirements**: Don't cache user data; public data can be briefly cached
4. **Use `s-maxage` to differentiate CDN cache control**: CDNs can cache longer than browsers
5. **Don't purge all caches on deployment**: Under a filename fingerprinting strategy, old assets and old HTML are compatible
6. **Leverage `stale-while-revalidate` and `stale-if-error`** to improve user experience and availability

There is no silver bullet for caching strategies. The key is to choose the right strategy based on an asset's **change frequency** and **users' real-time requirements**. Once you understand the underlying mechanisms of HTTP caching, you can confidently make these trade-offs.

## References

- [MDN: Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
- [web.dev: HTTP Caching](https://web.dev/articles/http-cache)
- [Cloudflare: What is Cache-Control?](https://www.cloudflare.com/learning/cdn/glossary/what-is-cache-control/)
- [Google: HTTP Caching overview](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching)
- [HTTP Archive: State of the Web](https://httparchive.org/)