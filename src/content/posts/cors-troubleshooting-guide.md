---
title: A Complete Guide to Troubleshooting CORS Issues
published: 2026-09-01
description: Starting from the same-origin policy, this guide breaks down CORS simple requests, preflight requests, and key response headers, then walks through practical troubleshooting of classic errors like "No Access-Control-Allow-Origin" using Express, native Node, and Nginx backend configurations.
image: ''
tags: [CORS, Cross-Origin, HTTP, Web Security, Web Development]
category: Web
draft: false
---
## Introduction: The Red Line Every Frontend Developer Has Seen

If you've ever worked on a project with a separated frontend and backend, you've almost certainly seen this in the console:

```
Access to fetch at 'https://api.example.com/api/users' from origin
'https://app.example.com' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

This is the cross-origin problem. It shows up extremely often, yet it's always glossed over as "the backend isn't configured properly." This article takes apart the CORS mechanism from the ground up, then lands on configuration and troubleshooting for three backend frameworks, so that next time you see this red line, you won't be relying on "just add a `*`" and hoping for the best.

## 1. Prerequisite Concept: Same-Origin Policy

Browsers have an iron rule—the **Same-Origin Policy**. It states: scripts in a page can only read responses from "same-origin" resources.

The criterion for "same-origin" is that three parts match exactly: **scheme + host + port**. If any one of the three differs, it's cross-origin:

| Current Page | Target URL | Same Origin? |
|----------|----------|---------|
| `https://app.example.com` | `https://app.example.com/api` | ✅ Same origin |
| `https://app.example.com` | `https://app.example.com:8443/api` | ❌ Different port |
| `https://app.example.com` | `http://app.example.com/api` | ❌ Different scheme |
| `https://app.example.com` | `https://api.example.com/api` | ❌ Different host |

Note that the path and query parameters do not participate in the same-origin determination—`/a` and `/b` are always same-origin.

The purpose of the same-origin policy is **security**: without it, any website could use your cookies to request your online banking, email, and read the results. It is the cornerstone of browser security, but at the same time it blocks the "legitimate" separated frontend-backend scenario—the frontend runs on `localhost:5173`, the backend runs on `localhost:3000`, and a different port means cross-origin.

**CORS (Cross-Origin Resource Sharing) is the door the browser opens for "legitimate cross-origin"**: the server explicitly declares through response headers "which origins may access me."

## 2. Two Kinds of Requests: Simple Requests vs Preflight Requests

CORS divides cross-origin requests into two categories, handled in completely different ways, and this is the key to understanding all error messages.

**Simple Request**—when all of the following conditions are met, the browser sends the request directly:

- The method is one of `GET`, `HEAD`, `POST`;
- Only request headers from the "safe list" are used, such as `Accept`, `Accept-Language`, `Content-Language`, and `Content-Type` whose values are limited to `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`;
- No `ReadableStream`, `XMLHttpRequest.upload` event listeners, etc. are used.

A simple request does not trigger an extra request; the browser simply "acts first and reports later"—**the request is sent as usual, but whether the response can be read by the script depends on whether the response headers include `Access-Control-Allow-Origin`**.

**Preflight Request**—as long as any one of the above conditions is not met, the browser first sends a `OPTIONS` request to "scout the way":

```
OPTIONS /api/users HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: content-type, authorization
```

The server must return the allowed methods and headers for this `OPTIONS`, and only then will the browser let the real request through. This is why you often see the same endpoint appear twice in the Network panel, one of them being `OPTIONS`.

## 3. Overview of Key Response Headers

Configuring CORS is essentially just setting the following response headers:

| Response Header | Purpose |
|--------|------|
| `Access-Control-Allow-Origin` | Allowed origins, `*` or a specific origin. **Required**; if missing, it errors out immediately |
| `Access-Control-Allow-Methods` | List of allowed methods during preflight |
| `Access-Control-Allow-Headers` | List of allowed request headers during preflight |
| `Access-Control-Allow-Credentials` | Whether to allow cookies/credentials, with the value `true` |
| `Access-Control-Expose-Headers` | **Response headers** that frontend JS is allowed to read (by default only a few can be read) |
| `Access-Control-Max-Age` | Number of seconds the preflight result can be cached |

There are two easily overlooked points:

1. **`Access-Control-Expose-Headers` governs "reading response headers."** By default, a few headers such as `Content-Type` and `Cache-Control` in a cross-origin response can be read by JS, but your custom `X-Total-Count`, `X-RateLimit-Remaining`, etc. **cannot be read**—unless they are listed in `Access-Control-Expose-Headers`.

2. **`Access-Control-Max-Age` governs "preflight caching."** The preflight request itself has overhead, so the browser caches the preflight result, for at most the number of seconds specified by `Access-Control-Max-Age` (the actual upper limit in Chromium is about 2 hours). This is both a performance optimization and a common culprit behind "I changed the config but it didn't take effect."
## 4. Server-Side Practical Configuration

### 4.1 Express + cors Middleware

`cors` is the most commonly used middleware in the Node ecosystem, covering the vast majority of scenarios:

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  // 只放行明确的白名单，而不是无脑用 *
  origin: ['https://app.example.com', 'https://admin.example.com'],
  credentials: true,                 // 允许带 Cookie
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 3600,                      // 预检结果缓存 1 小时
}));

app.get('/api/users', (req, res) => {
  res.set('X-Total-Count', '42');    // 需要 expose 才能被前端读到
  res.json([{ id: 1, name: 'Alice' }]);
});

app.listen(3000);
```

### 4.2 Native Node (Without Any Dependencies)

The best way to understand the principles is to write it yourself. The core logic is: **first handle the `OPTIONS` preflight, then echo `Origin` for regular requests**.

```javascript
const http = require('http');

const ALLOWED = new Set(['https://app.example.com']);

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;

  // 1. 处理预检请求
  if (req.method === 'OPTIONS') {
    const allowOrigin = ALLOWED.has(origin) ? origin : '';
    res.writeHead(204, {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '3600',
      'Vary': 'Origin',
    });
    res.end();
    return;
  }

  // 2. 普通请求：来源在白名单内才放行
  if (origin && ALLOWED.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
});

server.listen(3000);
```

Note the `Vary: Origin` that appears repeatedly above: when the response content varies based on `Origin` (which is exactly the case with whitelist echoing), you must add `Vary: Origin`. Otherwise, a CDN or intermediate cache might cache the response for origin A and serve it to origin B, causing a bizarre "cross-origin mix-up" bug.

### 4.3 Nginx Reverse Proxy

Many production environments use Nginx as a gateway, adding CORS headers uniformly at the gateway layer:

```nginx
location /api/ {
    if ($http_origin ~* "^https://(app|admin)\.example\.com$") {
        add_header 'Access-Control-Allow-Origin' "$http_origin" always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
        add_header 'Access-Control-Max-Age' '3600' always;
        add_header 'Vary' 'Origin' always;
    }

    if ($request_method = 'OPTIONS') {
        return 204;
    }
}
```

The `always` at the end of `add_header` is crucial: without it, Nginx won't add these headers on non-200 responses like 4xx/5xx—and it's precisely when "the backend throws an error" that the frontend needs these headers most to read the error information.

## 5. Cross-Origin with Credentials (Cookies)

By default, cross-origin requests do **not** carry cookies. If your API relies on cookies for sessions, both sides need to cooperate:

**Frontend**: Set `credentials: 'include'` in `fetch` (or set `withCredentials: true` in axios):

```javascript
fetch('https://api.example.com/api/me', {
  credentials: 'include',
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Backend**: Must echo the **specific origin** and add `Access-Control-Allow-Credentials: true`.

Here's a high-frequency trap: **when credentials are included, `Access-Control-Allow-Origin` cannot be `*`**. The spec requires "either echo a specific origin, or don't allow credentials"—the two are mutually exclusive. You'll see a clear error like this in the console:

```
The value of the 'Access-Control-Allow-Origin' header in the response
must not be the wildcard '*' when the request's credentials mode is 'include'.
```

The solution is the whitelist echo approach from the earlier example: grab `Origin`, check if it's in the whitelist, and if so, echo it back as-is.

## 6. Classic Error Reference Table

| Console Error | Cause | Solution |
|-----------|------|------|
| `No 'Access-Control-Allow-Origin' header is present` | Server didn't return the header, or the origin isn't in the whitelist | Backend returns the correct `Access-Control-Allow-Origin` |
| `must not be the wildcard '*' when credentials mode is 'include'` | Used `*` with credentials | Echo the specific origin + `Allow-Credentials: true` |
| `Method PUT is not allowed by Access-Control-Allow-Methods` | The method is missing from the preflight's returned method list | Add it to `Allow-Methods` |
| `Request header field x-auth-token is not allowed by Access-Control-Allow-Headers` | Custom header not allowed | Add it to `Allow-Headers` |
| Still erroring after config change | Preflight result is cached | Wait for cache to expire, or manually reduce `Max-Age` |

There are two "truths" worth remembering when troubleshooting:

1. **CORS is browser behavior, not server behavior**. Requesting the API with curl or Postman always "works" because they don't enforce the same-origin policy at all. So "Postman works but the browser doesn't" doesn't mean the backend is broken—it just means the CORS headers aren't configured.

2. **Simple requests are "sent but unreadable"**. The browser sends the request, the server processes it, but the response is blocked by the browser and not handed to JS. So for simple request cross-origin issues, you'll see the request succeed (200) in the Network panel but CORS errors in the console—don't be misled by "but the request succeeded!"

## 7. Two Advanced Traps

**Trap 1: `null` origin.**

When a page is opened via the `file://` protocol, or is inside an iframe with `sandbox`, the request's `Origin` header is the string `"null"`. If your whitelist is `Set(['https://app.example.com'])`, it naturally won't match—but some careless configurations write `origin: 'null'` to "allow" it, which effectively opens the door to any malicious local page opened from `file://`, creating a security vulnerability. The correct approach is to never accept `null` as a trusted origin.

**Trap 2: The cost of blindly using `*`.**

Writing `Access-Control-Allow-Origin: *` during development to save effort does make the errors disappear immediately, but it also means **any website** can read the public responses from that API. For purely public APIs that don't involve credentials or sensitive data (such as public APIs and static resources), `*` is acceptable; once an API involves user data, you should use a whitelist.

## Conclusion

The difficulty of CORS was never about "adding a header"—it's about understanding the three layers behind it: **why the same-origin policy blocks requests, the difference between simple requests and preflight requests, and the boundary of responsibility between browser vs. server**. Once you clarify these three points, the vast majority of cross-origin errors can be diagnosed within five minutes.

A practical closing suggestion: during development, instead of configuring CORS everywhere, use the frontend dev server's **proxy** to forward `/api` to the backend (Vite, webpack, and CRA all have built-in `proxy` configuration), making the frontend and backend appear "same-origin" from the browser's perspective, bypassing cross-origin issues at the root; then in production, properly configure the whitelist at the gateway layer. This way, the development experience is clean and production is secure.

---
## References

- [MDN - Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [MDN - Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
- [RFC 6454 - The Web Origin Concept](https://datatracker.ietf.org/doc/html/rfc6454)
- [Fetch Specification - CORS protocol](https://fetch.spec.whatwg.org/#http-cors-protocol)
- [cors - Node.js middleware official documentation](https://www.npmjs.com/package/cors)
- [web.dev - CORS and security from the browser's perspective](https://web.dev/articles/cross-origin-resource-sharing)