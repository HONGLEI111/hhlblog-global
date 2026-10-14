---
title: 'Advanced Service Worker Usage: Offline-First Strategies'
published: 2026-08-18
description: 'A deep dive into Service Worker caching strategies: Cache-First, Network-First, Stale-While-Revalidate, and offline fallback, with complete runnable progressive enhancement code examples.'
image: ''
tags: [Service Worker, PWA, Offline-First, Caching, Web Development]
category: Web
draft: false
---
## Introduction: The Network Is Not Reliable

As frontend developers, we often test applications on local development servers, where the network always responds instantly. But the real-world network is fragile: signals drop in the subway, café Wi-Fi is useless, and carriers only have 2G in remote areas. If your page only shows users a browser error page saying "This site can't be reached" when offline, the experience will be terrible.

The **Offline-First** design philosophy holds that: applications should assume "network unavailable" is the norm, treating offline as a first-class citizen in design rather than patching it in afterward. And the Service Worker is precisely the core primitive the browser provides for this concept—it acts like a programmable **network proxy**, intercepting all requests made by the page and letting you decide whether to go to the network, go to the cache, or combine both.

## Service Worker Lifecycle Recap

The Service Worker runs in a separate thread, completely decoupled from the page, with its own lifecycle:

```
install → waiting → activate → fetch (intercept request)
```

Three key events form its skeleton:

```js
self.addEventListener('install', (event) => {
  //Precache key resources, usually done during the install phase
  event.waitUntil(/*Precache the app shell */);
});

self.addEventListener('activate', (event) => {
  //Clean up old version caches, take over pages
  event.waitUntil(/*Delete old caches */);
  self.clients.claim(); //Immediately take over all pages
});

self.addEventListener('fetch', (event) => {
  //Core: decide the response strategy for each request
  event.respondWith(/*Return cache or network response */);
});
```

`event.waitUntil()` tells the browser "don't end the current lifecycle phase until this async task completes"; `event.respondWith()` lets you take over requests and return a custom `Response` object. Once you understand these two APIs, you understand the entire mental model of the Service Worker.

## Four Core Caching Strategies

Implementing offline-first is essentially about applying these four strategies in a "divide and conquer" manner based on request type.

### 1. Cache-First

Check the cache first; if there's a hit, return it directly; only on a miss do you request the network and write to the cache. Suitable for **static assets that don't change often** (such as hashed build artifacts `app.3f2a.js`, fonts, icons).

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

### 2. Network-First

Request the network first, and fall back to the cache on failure. Suitable for **requests that need freshness but also need a fallback when offline** (such as article content, API data).

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
    return new Response('Network unavailable, and no cache', { status: 503 });
  }
}
```

### 3. Stale-While-Revalidate

Immediately return the cache (fast), while simultaneously sending a request in the background to update the cache, so the next visit gets the new content. This is a compromise strategy that **balances speed and freshness**, best suited for the initial screen page.

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

Two extremes: `Cache-Only` only checks the cache (used for pre-cached app shells); `Network-Only` only goes to the network (used for critical requests like login and checkout that must never return stale data).

## Complete Implementation: A Runnable Offline-First Service Worker

Combining the above strategies gives you a production-grade Service Worker. The core idea is **routing by URL**:

```js
const VERSION = 'v3';
const APP_SHELL = [
  '/',
  '/styles/main.css',
  '/scripts/app.js',
  '/images/logo.svg',
];

//1. Install: precache the app shell to ensure the skeleton can load offline on first visit
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(`static-${VERSION}`).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting(); //The new version activates immediately without waiting for old pages to close
});

//2. Activate: delete old version caches to prevent storage from growing indefinitely
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

//3. Intercept requests: route to different strategies based on URL patterns
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  //Only handle same-origin GET requests (cross-origin and non-GET are left to the browser's default behavior)
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  //Navigation requests (HTML pages): fall back to the cached homepage when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  //Static assets: Cache-First
  if (url.pathname.startsWith('/static/') || url.pathname.startsWith('/scripts/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  //API data: Network-First, fall back to cache when offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  //Other resources: Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request));
});
```

> Note `response.clone()`: the body of `Response` can only be read once; to both write to the cache and return it to the page, you must first `clone()`.

## Offline Fallback: Give Users a Friendly Safety Net

Compared to the browser's built-in "can't connect" error page, a custom offline page can greatly improve the impression. The approach is to pre-cache an `offline.html` and return it when a navigation request fails:

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

## Common Pitfalls

- **Cache names should be versioned**: `static-v1`, `static-v2`… changing the version number is safer than overwriting the old cache, and combined with cleanup logic in the `activate` phase, it avoids the classic disaster of "code was updated but users keep hitting the old cache."
- **Don't cache cross-origin requests**: cross-origin responses require CORS support to be `cache.put()`, otherwise they fail silently. Always check `url.origin === location.origin` first.
- **`cache.addAll` is an atomic operation**: if even one resource 404s, the entire `install` fails and the Service Worker cannot activate. Double-check the paths in the pre-cache manifest.
- **Storage quota is limited**: the browser may reclaim the cache at any time, so don't stuff large files or videos into Cache Storage; important data should be persisted with IndexedDB.
## Conclusion

Service Worker turns "the network" from an uncontrollable external environment into a resource you can precisely orchestrate in code. The three strategies—Cache-First, Network-First, and Stale-While-Revalidate—cover the vast majority of scenarios, and the key lies in **routing by request type**—navigation, static assets, and APIs each have their own optimal solution. Offline-first isn't about making the app "completely independent of the network," but rather ensuring that when the network fails, users can still continue using it gracefully.

## References

- [MDN — Service Worker API](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API)
- [web.dev — The Offline Cookbook (Jake Archibald)](https://web.dev/articles/offline-cookbook)
- [Google Developers — PWA Offline-First Guide](https://web.dev/learn/pwa/caching)