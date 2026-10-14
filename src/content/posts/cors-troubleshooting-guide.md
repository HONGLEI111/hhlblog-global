---
title: 跨域（CORS）问题排查完全指南
published: 2026-09-01
description: '从同源策略讲起，拆解 CORS 的简单请求、预检请求与关键响应头，并用 Express、原生 Node、Nginx 三种后端配置实战排查「No Access-Control-Allow-Origin」等经典报错。'
image: ''
tags: [CORS, 跨域, HTTP, Web安全, 网站开发]
category: '网站'
draft: false
lang: ''
---

## 引言：每个前端都见过的那行红字

如果你做过前后端分离的项目，几乎一定在控制台见过它：

```
Access to fetch at 'https://api.example.com/api/users' from origin
'https://app.example.com' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

这就是跨域问题。它出现的频率极高，却总被当作「后端没配好」一笔带过。这篇文章把 CORS 的机制从头拆开，再落到三种后端框架的配置和排查上，让你下次看到这行红字时不再靠「加个 `*`」碰运气。

## 1. 前置概念：同源策略

浏览器有一个铁律——**同源策略（Same-Origin Policy）**。它规定：一个页面里的脚本，只能读取「同源」资源的响应。

「同源」的判定标准是三个部分完全一致：**协议（scheme）+ 主机（host）+ 端口（port）**。三者任一不同，就是跨域：

| 当前页面 | 目标 URL | 是否同源 |
|----------|----------|---------|
| `https://app.example.com` | `https://app.example.com/api` | ✅ 同源 |
| `https://app.example.com` | `https://app.example.com:8443/api` | ❌ 端口不同 |
| `https://app.example.com` | `http://app.example.com/api` | ❌ 协议不同 |
| `https://app.example.com` | `https://api.example.com/api` | ❌ 主机不同 |

注意路径、查询参数都不参与同源判定——`/a` 和 `/b` 永远是同源的。

同源策略存在的意义是**安全**：没有它，任何网站都能用你的 Cookie 去请求你的网银、邮箱并读取结果。它是浏览器安全的基石，但同时也挡住了「合法」的前后端分离场景——前端跑在 `localhost:5173`，后端跑在 `localhost:3000`，端口不同就是跨域。

**CORS（Cross-Origin Resource Sharing，跨源资源共享）就是浏览器为「合法跨域」开的一扇门**：由服务器通过响应头明确声明「哪些来源可以访问我」。

## 2. 两种请求：简单请求 vs 预检请求

CORS 把跨域请求分成两类，处理方式完全不同，这是理解一切报错的关键。

**简单请求（Simple Request）**——同时满足以下条件，浏览器直接发请求：

- 方法为 `GET`、`HEAD`、`POST` 之一；
- 只使用「安全名单」里的请求头，如 `Accept`、`Accept-Language`、`Content-Language`，以及取值限于 `application/x-www-form-urlencoded`、`multipart/form-data`、`text/plain` 的 `Content-Type`；
- 没有使用 `ReadableStream`、`XMLHttpRequest.upload` 事件监听等。

简单请求不会触发额外请求，浏览器只是「先斩后奏」——**请求照发，但响应能不能被脚本读到，取决于返回头里有没有 `Access-Control-Allow-Origin`**。

**预检请求（Preflight Request）**——只要不满足上面任意一条，浏览器就会先发一个 `OPTIONS` 请求「探路」：

```
OPTIONS /api/users HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: content-type, authorization
```

服务器必须对这个 `OPTIONS` 返回允许的方法和头，浏览器才会放行真正的请求。这就是为什么你在 Network 面板里常看到同一个接口出现两次请求、一次是 `OPTIONS`。

## 3. 关键响应头一览

CORS 的配置本质上就是设置下面这几个响应头：

| 响应头 | 作用 |
|--------|------|
| `Access-Control-Allow-Origin` | 允许的来源，`*` 或具体 origin。**必填**，缺了就直接报错 |
| `Access-Control-Allow-Methods` | 预检时允许的方法列表 |
| `Access-Control-Allow-Headers` | 预检时允许的请求头列表 |
| `Access-Control-Allow-Credentials` | 是否允许带 Cookie/凭证，值为 `true` |
| `Access-Control-Expose-Headers` | 允许前端 JS 读取的**响应头**（默认只能读到少数几个） |
| `Access-Control-Max-Age` | 预检结果可缓存的秒数 |

有两个容易忽略的点：

1. **`Access-Control-Expose-Headers` 管的是「读响应头」**。默认情况下，跨域响应的 `Content-Type`、`Cache-Control` 等少数头可以被 JS 读到，但你自定义的 `X-Total-Count`、`X-RateLimit-Remaining` 等是**读不到的**——除非在 `Access-Control-Expose-Headers` 里列出来。

2. **`Access-Control-Max-Age` 管的是「预检缓存」**。预检请求本身有开销，浏览器会缓存预检结果，最长缓存 `Access-Control-Max-Age` 指定的秒数（Chromium 实际上限约 2 小时）。这既是性能优化，也是「改了配置却不生效」的常见元凶。

## 4. 服务端实战配置

### 4.1 Express + cors 中间件

`cors` 是 Node 生态最常用的中间件，能覆盖绝大多数场景：

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

### 4.2 原生 Node（不用任何依赖）

理解原理最好的方式是自己写一遍。核心逻辑是：**先处理 `OPTIONS` 预检，再给普通请求回显 `Origin`**。

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

注意上面反复出现的 `Vary: Origin`：当响应内容会根据 `Origin` 变化时（白名单回显就是这种情况），必须加 `Vary: Origin`，否则 CDN / 中间缓存可能把 A 源的响应缓存下来发给了 B 源，造成「串源」的诡异 bug。

### 4.3 Nginx 反向代理

很多生产环境用 Nginx 做网关，跨域头在网关层统一加：

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

`add_header` 末尾的 `always` 很关键：没有它，Nginx 在 4xx/5xx 等非 200 响应上不会加这些头——而恰恰是「后端报错了」时，前端最需要这些头才能读到错误信息。

## 5. 带凭证（Cookie）的跨域

默认情况下，跨域请求**不会**携带 Cookie。如果接口依赖 Cookie 做会话，需要两端配合：

**前端**：`fetch` 里设 `credentials: 'include'`（或 axios 里设 `withCredentials: true`）：

```javascript
fetch('https://api.example.com/api/me', {
  credentials: 'include',
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**后端**：必须回显**具体的 origin**，并加 `Access-Control-Allow-Credentials: true`。

这里有一个高频陷阱：**带凭证时，`Access-Control-Allow-Origin` 不能是 `*`**。规范要求「要么回显具体来源，要么不能带凭证」，二者互斥。你会在控制台看到这样一条明确的报错：

```
The value of the 'Access-Control-Allow-Origin' header in the response
must not be the wildcard '*' when the request's credentials mode is 'include'.
```

解决办法就是前面示例里的白名单回显写法：拿到 `Origin`，判断是否在白名单，是则原样回显。

## 6. 经典报错对照表

| 控制台报错 | 原因 | 解决 |
|-----------|------|------|
| `No 'Access-Control-Allow-Origin' header is present` | 服务器没返回该头，或来源不在白名单 | 后端返回正确的 `Access-Control-Allow-Origin` |
| `must not be the wildcard '*' when credentials mode is 'include'` | 带凭证时用了 `*` | 回显具体 origin + `Allow-Credentials: true` |
| `Method PUT is not allowed by Access-Control-Allow-Methods` | 预检返回的方法列表缺这个 | 在 `Allow-Methods` 里加上 |
| `Request header field x-auth-token is not allowed by Access-Control-Allow-Headers` | 自定义头未被允许 | 在 `Allow-Headers` 里加上 |
| 改完配置还是报错 | 预检结果被缓存 | 等待缓存过期，或手动调小 `Max-Age` |

排查时还有两个「真相」值得记牢：

1. **CORS 是浏览器行为，不是服务器行为**。用 curl 或 Postman 请求接口永远「通」，因为它们根本不执行同源策略。所以「Postman 能通、浏览器不通」不代表后端坏了，只能说明 CORS 头没配。

2. **简单请求是「发了但读不到」**。浏览器把请求发出去了，服务器也处理了，只是响应被浏览器拦下不交给 JS。所以简单请求的跨域问题，看 Network 面板里请求是成功的（200），但控制台报 CORS——别被「请求成功了呀」误导。

## 7. 两个进阶陷阱

**陷阱一：`null` origin。**

当页面从 `file://` 协议打开，或位于 `sandbox` 的 iframe 里时，请求的 `Origin` 头是字符串 `"null"`。如果你的白名单是 `Set(['https://app.example.com'])`，它当然不匹配——但有些粗心的配置会写 `origin: 'null'` 来「放行」，这其实等于向任何从 `file://` 打开的恶意本地页面敞开了大门，是安全隐患。正确做法是不要接受 `null` 作为可信来源。

**陷阱二：盲目 `*` 的代价。**

开发时图省事写 `Access-Control-Allow-Origin: *` 确实能立刻让报错消失，但它同时意味着**任何网站**都能读取该接口的公开响应。对于纯公开、不涉及凭证和敏感数据的接口（如公共 API、静态资源）`*` 是可以接受的；一旦接口涉及用户数据，就应该用白名单。

## 结语

CORS 的难点从来不在「加个头」——而在理解它背后的三个层次：**同源策略为什么要拦、简单请求和预检请求的区别、以及浏览器 vs 服务器的责任边界**。理清这三点，绝大多数跨域报错都能在五分钟内定位。

一个实用的收尾建议：开发期与其到处配 CORS，不如用前端 dev server 的**代理**把 `/api` 转发到后端（Vite、webpack、CRA 都内置了 `proxy` 配置），让浏览器视角里前后端「同源」，从根上绕过跨域；生产环境再老老实实在网关层配好白名单。这样开发体验干净，生产又安全。

---

## 参考来源

- [MDN - Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [MDN - Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
- [RFC 6454 - The Web Origin Concept](https://datatracker.ietf.org/doc/html/rfc6454)
- [Fetch 规范 - CORS protocol](https://fetch.spec.whatwg.org/#http-cors-protocol)
- [cors - Node.js 中间件官方文档](https://www.npmjs.com/package/cors)
- [web.dev - 从浏览器看 CORS 与安全性](https://web.dev/articles/cross-origin-resource-sharing)
