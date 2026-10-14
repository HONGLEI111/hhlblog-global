---
title: Service Worker 高级用法：离线优先策略
published: 2026-08-18
description: '深入 Service Worker 的缓存策略：Cache-First、Network-First、Stale-While-Revalidate 与离线回退，附完整可运行的渐进式增强代码示例'
image: ''
tags: [Service Worker, PWA, 离线优先, 缓存, Web开发]
category: '网站'
draft: false
lang: ''
---

## 引言：网络不是可靠的

作为前端开发者，我们常常在本地开发服务器上测试应用，网络永远是「秒回」的。但真实世界的网络是脆弱的：地铁里信号中断、咖啡厅的 Wi-Fi 形同虚设、运营商在偏远地区只有 2G。如果你的页面在断网时只给用户一个「无法访问此网站」的浏览器错误页，体验会非常糟糕。

**离线优先（Offline-First）** 的设计哲学认为：应用应该假设「网络不可用」是常态，把离线当作一等公民来设计，而不是事后补丁。而 Service Worker 正是浏览器为这一理念提供的核心原语——它像一个可编程的**网络代理**，拦截页面发出的所有请求，让你决定是走网络、走缓存，还是两者结合。

## Service Worker 生命周期回顾

Service Worker 运行在独立的线程中，与页面完全解耦，有一套自己的生命周期：

```
install → waiting → activate → fetch（拦截请求）
```

三个关键事件构成了它的骨架：

```js
self.addEventListener('install', (event) => {
  // 预缓存关键资源，通常在 install 阶段完成
  event.waitUntil(/* 预缓存 app shell */);
});

self.addEventListener('activate', (event) => {
  // 清理旧版本缓存、接管页面
  event.waitUntil(/* 删除旧 cache */);
  self.clients.claim(); // 立即接管所有页面
});

self.addEventListener('fetch', (event) => {
  // 核心：决定每个请求的响应策略
  event.respondWith(/* 返回缓存或网络响应 */);
});
```

`event.waitUntil()` 告诉浏览器「这个异步任务完成前，不要结束当前生命周期阶段」；`event.respondWith()` 则让你接管请求，返回自定义的 `Response` 对象。理解了这两个 API，就理解了 Service Worker 的全部心智模型。

## 四种核心缓存策略

离线优先的实现，本质上是把这四种策略按请求类型「分而治之」。

### 1. Cache-First（缓存优先）

先查缓存，命中就直接返回；未命中才请求网络，并写入缓存。适合**不常变化的静态资源**（如带哈希的构建产物 `app.3f2a.js`、字体、图标）。

```js
async function cacheFirst(request) {
  const cache = await caches.open('static-v1');
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}
```

### 2. Network-First（网络优先）

先请求网络，失败再回退到缓存。适合**需要新鲜度、但离线时也要能兜底**的请求（如文章正文、API 数据）。

```js
async function networkFirst(request) {
  const cache = await caches.open('dynamic-v1');
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('网络不可用，且无缓存', { status: 503 });
  }
}
```

### 3. Stale-While-Revalidate（先返回缓存，后台更新）

立即返回缓存（快），同时后台发请求更新缓存，下次访问即拿到新内容。这是**兼顾速度与新鲜度**的折中策略，最适合首屏页面。

```js
async function staleWhileRevalidate(request) {
  const cache = await caches.open('pages-v1');
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    cache.put(request, response.clone());
    return response;
  });
  return cached || fetchPromise;
}
```

### 4. Cache-Only / Network-Only

两个极端：`Cache-Only` 只查缓存（用于预缓存好的 app shell）；`Network-Only` 只走网络（用于登录、下单等绝不能返回过期数据的关键请求）。

## 完整实现：一个可运行的离线优先 Service Worker

把上述策略组合起来，就是一个生产级的 Service Worker。核心思想是**按 URL 路由**：

```js
const VERSION = 'v3';
const APP_SHELL = [
  '/',
  '/styles/main.css',
  '/scripts/app.js',
  '/images/logo.svg',
];

// 1. 安装：预缓存 app shell，保证首次离线也能加载骨架
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(`static-${VERSION}`).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting(); // 新版本立即激活，不等待旧页面关闭
});

// 2. 激活：删除旧版本缓存，避免 storage 无限膨胀
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('static-') && key !== `static-${VERSION}`)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 3. 拦截请求：按 URL 模式路由到不同策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源 GET 请求（跨域、非 GET 交给浏览器默认行为）
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // 导航请求（HTML 页面）：离线时回退到缓存的首页
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // 静态资源：Cache-First
  if (url.pathname.startsWith('/static/') || url.pathname.startsWith('/scripts/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // API 数据：Network-First，离线回退缓存
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 其余资源：Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request));
});
```

> 注意 `response.clone()`：`Response` 的 body 只能被读取一次，既要写缓存又要返回给页面，必须先 `clone()`。

## 离线回退：给用户一个友好的兜底

比起浏览器自带的「无法连接」错误页，一个自定义的离线页面能大幅提升观感。做法是预缓存一个 `offline.html`，在导航请求失败时返回它：

```js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(`static-${VERSION}`).then((cache) =>
      cache.addAll([...APP_SHELL, '/offline.html'])
    )
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/offline.html')
      )
    );
  }
});
```

## 常见陷阱

- **缓存命名要带版本**：`static-v1`、`static-v2`…… 换版本号比覆盖旧缓存更安全，配合 `activate` 阶段的清理逻辑，能避免「更新了代码但用户一直命中旧缓存」的经典翻车。
- **不要缓存跨域请求**：跨域响应需要 CORS 支持才能被 `cache.put()`，否则会静默失败。务必先判断 `url.origin === location.origin`。
- **`cache.addAll` 是原子操作**：只要一个资源 404，整个 `install` 就失败，Service Worker 无法激活。预缓存清单里的路径要反复确认。
- **Storage 配额有限**：浏览器可能随时回收缓存，不要把大文件、视频塞进 Cache Storage，重要数据应配合 IndexedDB 持久化。

## 结语

Service Worker 把「网络」从不可控的外部环境，变成了你可以在代码里精确编排的资源。Cache-First、Network-First、Stale-While-Revalidate 三种策略覆盖了绝大多数场景，而关键在于**按请求类型做路由**——导航、静态资源、API 各有各的最优解。离线优先不是让应用「完全脱离网络」，而是让网络失败时，用户依然能优雅地继续使用。

## 参考来源

- [MDN — Service Worker API](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API)
- [web.dev — The Offline Cookbook（Jake Archibald）](https://web.dev/articles/offline-cookbook)
- [Google Developers — PWA 离线优先指南](https://web.dev/learn/pwa/caching)
