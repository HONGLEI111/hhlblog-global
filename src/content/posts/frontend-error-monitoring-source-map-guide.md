---
title: 'Frontend Error Monitoring in Practice: From window.onerror to Source Map Recovery'
published: 2026-10-12
description: 'A production alert gives you just one line: app.9f2c1a.js:1:48213, and that line is two hundred functions crammed together. This article breaks error monitoring into three stages—capture, upload, and recovery—covering the five parameters of window.onerror and the pitfalls of catching resource errors, why the reason in unhandledrejection isn''t always an Error, why production should use sourcemap: "hidden", and a ready-to-run script that maps a minified stack trace back to source file, line, and column.'
image: ''
tags: [Error Monitoring, Source Map, Vite, Observability, Frontend]
category: Frontend
draft: false
---
## 1. A production error gives you just one line of gibberish

A typical production alert looks like this:

```
TypeError: Cannot read properties of undefined (reading 'id')
    at r (app.9f2c1a.js:1:48213)
    at HTMLButtonElement.<anonymous> (app.9f2c1a.js:1:52190)
```

The entire `app.9f2c1a.js` is a single line, at column 48213. The function name is `r`. The only thing certain in this line of information is "something blew up somewhere."

To turn it into "`src/report.ts` line 87, `user.id` is probably undefined," you need three separate links in the chain to each work:

1. **Capture** — an error happened; how does the page know?
2. **Report** — once it knows, how do you bring back the scene (version, environment, user)?
3. **Restore** — the coordinates you brought back are minified; how do you map them back to source locations?

If any one link breaks, the whole chain might as well not exist. And each of these three links has its own very classic pitfalls.

## 2. Capture: the five parameters of window.onerror

The oldest approach is to assign to `window.onerror`:

```js
// 五个参数，是历史遗留的不对称设计
window.onerror = (message, source, lineno, colno, error) => {
  report({ message, source, line: lineno, column: colno, stack: error?.stack });
  return true; // ⚠️ 返回 true 会抑制浏览器默认的控制台输出
};
```

`window.onerror` (and the property of the same name in Workers) is **the only event handler property that can receive multiple parameters**; all other handlers receive just a single event object. But the more common approach is `addEventListener`:

```js
window.addEventListener('error', (event) => {
  // 这里只拿到一个 ErrorEvent，字段是同名的 message / filename / lineno / colno / error
});
```

The two approaches are asymmetric, and mixing them in the same project easily leads to the illusion that "some errors have a stack and some don't."

### By default it doesn't catch resource errors

When `<img>`, `<script>`, or `<link>` fail to load, the browser likewise dispatches an `error` event, but **they are ordinary `Event` and do not bubble** — a listener attached to `window` that goes through the bubbling phase will never see them. To catch them too, you have to listen during the capture phase:

```js
window.addEventListener('error', (event) => {
  if (event instanceof ErrorEvent) {
    // 运行时错误：有 stack、有文件名和行列号
    report({
      type: 'js', message: event.message, source: event.filename,
      line: event.lineno, column: event.colno, stack: event.error?.stack,
    });
  } else {
    // 资源加载失败：只有 event.target，没有 stack
    const el = event.target;
    report({ type: 'resource', tag: el?.tagName, url: el?.currentSrc || el?.src || el?.href });
  }
}, true); // ← capture: true，两类错误通吃
```

The way to tell them apart is `instanceof ErrorEvent`, not "whether `event.error` exists" — the latter is `null` in cross-origin script scenarios, which would misclassify runtime errors as resource errors.

### Where "Script error." comes from

If a script comes from another domain and doesn't carry the `crossorigin` attribute, and the server doesn't return CORS headers either, the browser wipes out all error details and leaves only `Script error.` — `message`, `lineno`, `stack` are all empty. This is the established behavior for preventing cross-origin scripts from leaking information to the page.

```html
<script src="https://cdn.example.com/vendor.js" crossorigin="anonymous"></script>
```

The CDN side needs to return `Access-Control-Allow-Origin`. If you don't do this step, the cross-origin errors you collect amount to "something did go wrong, but we don't know what."

## 3. Errors inside Promises aren't in onerror

A rejection from `Promise` doesn't go through `onerror`; it goes through `unhandledrejection`:

```js
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  report({
    type: 'promise',
    // reason 不一定是 Error：可能 reject 的是字符串、普通对象，甚至 undefined
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : '',
  });
  // event.preventDefault(); // 控制台不再打印这条 rejection，本地调试会被静默，慎用
});
```

`PromiseRejectionEvent` has two read-only properties: `promise` (the rejected Promise) and `reason` (the reason for the rejection). It **doesn't bubble, but can be canceled** — `preventDefault()` prevents the runtime from printing it to the console.

There's another easily overlooked fact: **rejections produced inside cross-origin scripts won't trigger this event**, for the same reason as "Script error." — leak prevention. So rejections that a third-party SDK swallows internally or leaves unhandled are, in all likelihood, ones you won't receive; you can only require the SDK to catch them at its own boundary.

The engineering approach is to write a unified entry point that normalizes all these sources (runtime errors, resource errors, rejections, usually plus framework error boundaries and `console.error` hijacking) into the same kind of payload, then hand it to the reporting layer for batching, sampling, and using `sendBeacon` as a fallback when the page unloads — an ordinary `fetch` gets interrupted during the `unload` phase.

## 4. Restore: what exactly is stored in a Source Map

A Source Map is itself a JSON, and the v3 format doesn't have many fields:

```json
{
  "version": 3,
  "file": "app.9f2c1a.js",
  "sources": ["src/report.ts"],
  "sourcesContent": ["// 原封不动的源码……"],
  "names": ["report"],
  "mappings": "AAAA,IAAM,KAAK;..."
}
```

The part that actually does the work is `mappings`: a string of base64 VLQ-encoded "segments," each describing "column N of the bundled output → line and column of the original file." `sourcesContent` is optional; it inlines the source code into the map — so that even if the original file can't be accessed via URL, it can still be restored.

The formal standard for this format is **ECMA-426** (1st edition, December 2024); the earlier rev3 draft is at `tc39/source-map-spec`. It also defines the **index map**: using a `sections` array, each item carrying `offset` and its own map, to express concatenated outputs like `vendor.js + app.js`.

How does the output get associated with the map? Two ways:

```
SourceMap: /static/js/app.9f2c1a.js.map      ← HTTP 响应头
//# sourceMappingURL=app.9f2c1a.js.map       ← 源码里的魔法注释
```

The comment prefix is `//#` rather than the original `//@`, because `//@` collided with IE's conditional compilation directive (`//@cc_on`). The CSS equivalent is `/*# sourceMappingURL=... */`.

## 5. Build configuration: production should use sourcemap: "hidden"

The `sourceMappingURL` comment is a double-edged sword: when the browser sees it, it goes and fetches the map, and you can view the source directly in DevTools — **but any visitor can do the same, which means your source code is effectively public**.

Vite's `build.sourcemap` has four possible values (default `false`):

| Value | Output |
| --- | --- |
| `false` | Generates no map at all |
| `true` | Generates `.js.map` and writes a `sourceMappingURL` comment into the output |
| `'inline'` | Embeds the map as a data URI directly into the JS file itself |
| `'hidden'` | Generates `.js.map` but **writes no comment** |

What production wants is `'hidden'`: the map is still produced, but the browser won't proactively load it, so the source code isn't visible to the public internet; after the monitoring platform has uploaded the map, delete `.map` from the release artifacts.

```js
// vite.config.js
export default defineConfig({
  build: {
    sourcemap: 'hidden', // 生成 map 但不写注释
  },
});
```

`'inline'` looks like the least hassle, but it introduces two problems: the artifact size grows along with the source code size, and the map is shipped to the browser together with the JS — which amounts to shipping the source code along with it.

:::note
`build.sourcemap` only governs JS. The CSS map is controlled separately by `css.sourcemap`; don't expect that setting one gives you everything.
:::
## 6. Restoring a minified stack to source locations

Use `@jridgewell/trace-mapping` to look up the original coordinates from the map:

```js
// restore-stack.mjs
// npm i @jridgewell/trace-mapping
import { readFileSync } from 'node:fs';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';

const map = new TraceMap(JSON.parse(readFileSync('dist/app.9f2c1a.js.map', 'utf8')));

// V8 堆栈的一行：at foo (app.js:1:48213) 或 at app.js:1:48213
const FRAME = /^\s*at\s+(?:(.*?)\s+\()?([^\s()]+):(\d+):(\d+)\)?$/;

export function restore(stack) {
  return stack
    .split('\n')
    .map((line) => {
      const m = FRAME.exec(line);
      if (!m) return line;
      const [, fn, , lineNo, colNo] = m; // 第三个字段是打包文件名，这里用不到
      const pos = originalPositionFor(map, {
        line: Number(lineNo),
        column: Number(colNo) - 1, // ⚠️ 见下
      });
      if (!pos.source) return line; // 该位置没有映射（如运行时注入的代码），原样保留
      // 优先用 names 里查出来的原名，压缩后的 fn 往往只是 r、n 这样的单字母
      const name = pos.name || fn;
      return `    at ${name ? `${name} (` : ''}${pos.source}:${pos.line}:${pos.column + 1})`;
    })
    .join('\n');
}
```

Restoring the alert above gives you:

```
    at report (src/report.ts:87:12)
    at HTMLButtonElement.<anonymous> (src/user-card.ts:203:9)
```

Two things you must pay attention to:

1. **1-based vs. 0-based conversion for line/column.** `originalPositionFor`'s convention is "lines start at 1, columns start at 0," while both line and column in a V8 stack are 1-based. So subtract 1 from the column, but not from the line. Subtract one too few or one too many and you'll land on an adjacent token—the location looks "roughly right" but actually points to a different function call, which is harder to spot than a plain error.
2. **Get the function name from `names`.** Minified `fn` is often a single letter like `r` or `n`; each segment in the map carries the original identifier, and the `pos.name` returned by `originalPositionFor` is the original name looked up from `names`—use it when present.

:::note
For quick local debugging you can also just use Chrome DevTools: **Sources panel → right-click the minified file → Add source map**, manually attach `.map`, and the effect is the same—just not batchable.
:::

## 7. Two details that make restoration actually work

**Upload must happen before the error occurs.** Monitoring platforms won't go back and reprocess old events; the map must already be there before the error is reported.

**The identity must match.** If the release carried by the event doesn't match the release used at upload time, matching fails. The newer approach is to use a **Debug ID**: after building, inject the same ID into both the artifacts and the map, upload them together, then deploy the **post-injection** artifacts. This way matching no longer depends on file paths and release names—CDN path changes and hashed filenames don't matter.

```bash
sentry-cli sourcemaps inject ./dist
sentry-cli sourcemaps upload ./dist   # 然后部署 inject 后的 ./dist，并删掉其中的 .map
```

After injection, the comment at the end of the minified file looks like this, in a fixed order:

```js
//# debugId=2e5a1c...e1
//# sourceMappingURL=app.9f2c1a.js.map
```

:::warning
Some CDNs' auto-minify features (e.g., Cloudflare's Auto-Minify) strip comments from JS, so `sourceMappingURL` and `debugId` disappear together and the stack can never be restored again. After going live, `curl` the tail of the artifact to confirm the comment is still there—far cheaper than troubleshooting after the fact.
:::

## 8. Pre-launch checklist

- [ ] Sync errors go through `addEventListener('error', handler, true)` (capture phase); runtime errors and resource errors are handled separately
- [ ] `unhandledrejection` has a listener, and there's a fallback for when `reason` isn't `Error`
- [ ] Cross-origin scripts carry `crossorigin="anonymous"`, and the CDN returns `Access-Control-Allow-Origin`
- [ ] Production builds use `sourcemap: 'hidden'`, and `.map` isn't published publicly (or is deleted after upload)
- [ ] Maps are uploaded before release; matching uses Debug ID, not path + release
- [ ] Errors inside iframes get their own listener—an iframe is a separate browsing context, and the parent window's `error` event won't catch it

## Conclusion

The quality of error monitoring is determined by the weakest link in the chain: **miss Promise capture and your error count drops sharply, making the charts look perfectly healthy; fail to upload the map and your stack is just a line of gibberish, making every error look the same.** Neither of these is hard; what's hard is validating them as one complete chain.

The most effective way to verify is to ship a **test version that deliberately throws errors**: throw a sync error on page load, `Promise.reject` a string, and reference a 404 image, then follow it from the browser all the way to the monitoring backend, checking whether all three errors arrive and whether the stack correctly points to a line in `src/`. Get it right once and it'll be solid from then on.

---

## References

- [MDN - Window: error event](https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event)
- [MDN - Window: unhandledrejection event](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)
- [ECMA-426 Source map format specification](https://tc39.es/ecma426/)
- [Vite - Build Options (build.sourcemap)](https://vite.dev/config/build-options)
- [Sentry Docs - JavaScript Source Maps](https://docs.sentry.io/platforms/javascript/sourcemaps/)
- [Sentry Docs - Troubleshooting Source Maps](https://docs.sentry.io/platforms/javascript/sourcemaps/troubleshooting_js/)
- [npm - @jridgewell/trace-mapping](https://www.npmjs.com/package/@jridgewell/trace-mapping)