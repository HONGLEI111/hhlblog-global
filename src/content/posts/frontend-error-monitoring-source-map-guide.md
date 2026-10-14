---
title: 前端错误监控实战：从 window.onerror 到 Source Map 还原
published: 2026-10-12
description: '线上告警只有一行 app.9f2c1a.js:1:48213，而这一行是两百个函数压成的。这篇文章把错误监控拆成捕获、上传、还原三段：window.onerror 的五个参数与资源错误的捕获陷阱、unhandledrejection 里 reason 不一定是 Error、为什么生产环境该用 sourcemap: "hidden"，以及一段能直接跑的脚本，把压缩堆栈还原回源码行列。'
image: ''
tags: [错误监控, Source Map, Vite, 可观测性, 前端]
category: '前端'
draft: false
lang: ''
---

## 一、线上报错只给你一行乱码

一个典型的生产告警长这样：

```
TypeError: Cannot read properties of undefined (reading 'id')
    at r (app.9f2c1a.js:1:48213)
    at HTMLButtonElement.<anonymous> (app.9f2c1a.js:1:52190)
```

整个 `app.9f2c1a.js` 只有一行，第 48213 列。函数名是 `r`。这行信息里唯一确定的事情是「有地方炸了」。

要把它变成「`src/report.ts` 第 87 行，`user.id` 可能是 undefined」，需要三段链路各自打通：

1. **捕获**——错误发生了，页面怎么知道？
2. **上报**——知道之后，怎么把现场（版本、环境、用户）带回来？
3. **还原**——带回来的坐标是压缩后的，怎么换回源码位置？

任何一段断了，链路都等于不存在。而这三段各自都有非常经典的坑。

## 二、捕获：window.onerror 的五个参数

最古老的写法是给 `window.onerror` 赋值：

```js
// 五个参数，是历史遗留的不对称设计
window.onerror = (message, source, lineno, colno, error) => {
  report({ message, source, line: lineno, column: colno, stack: error?.stack });
  return true; // ⚠️ 返回 true 会抑制浏览器默认的控制台输出
};
```

`window.onerror`（以及 Worker 里的同名属性）是**唯一一个能接收多个参数的事件处理属性**，其余 handler 都只收一个 event 对象。但更常见的写法是 `addEventListener`：

```js
window.addEventListener('error', (event) => {
  // 这里只拿到一个 ErrorEvent，字段是同名的 message / filename / lineno / colno / error
});
```

两种写法不对称，在同一个项目里混用很容易踩到「有的错误有 stack、有的没有」的幻觉。

### 它默认收不到资源错误

`<img>`、`<script>`、`<link>` 加载失败时浏览器同样派发 `error` 事件，但**它们是普通 `Event`，而且不冒泡**——挂在 `window` 上、走冒泡阶段的监听器永远等不到它们。要一起收，就得监听捕获阶段：

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

判别方式是 `instanceof ErrorEvent`，而不是「`event.error` 存不存在」——后者在跨域脚本场景下是 `null`，会把运行时错误误判成资源错误。

### "Script error." 是怎么来的

如果脚本来自别的域，且没带 `crossorigin` 属性、服务端也没回 CORS 头，浏览器会把错误细节全部抹掉，只留一句 `Script error.`——`message`、`lineno`、`stack` 全是空的。这是防跨域脚本把信息泄露给页面的既定行为。

```html
<script src="https://cdn.example.com/vendor.js" crossorigin="anonymous"></script>
```

CDN 那边要回 `Access-Control-Allow-Origin`。这一步不做，你收集到的跨域错误等于「确实出错了，但不知道是什么」。

## 三、Promise 里的错误不在 onerror 里

`Promise` 的 rejection 不经过 `onerror`，走的是 `unhandledrejection`：

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

`PromiseRejectionEvent` 有两个只读属性：`promise`（被 reject 的 Promise）和 `reason`（reject 的原因）。它**不冒泡、但可取消**，`preventDefault()` 会阻止运行时把它打到控制台。

还有一个容易忽略的事实：**跨域脚本里产生的 rejection 不会触发这个事件**，原因和 "Script error." 一样——防泄露。所以第三方 SDK 内部自己吞掉的或未处理的 rejection，你大概率收不到，只能要求 SDK 在自己的边界上接住。

工程上的做法是写一个统一入口，把这几类来源（运行时错误、资源错误、rejection，通常再加上框架的错误边界和 `console.error` 劫持）都 normalize 成同一种 payload，再交给上报层做批量、采样，以及页面卸载时用 `sendBeacon` 兜底——普通 `fetch` 在 `unload` 阶段会被打断。

## 四、还原：Source Map 里到底存了什么

Source Map 本身是一个 JSON，v3 格式的字段不多：

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

真正干活的是 `mappings`：一串 base64 VLQ 编码的“段”，每段描述「打包产物的第几列 → 原始文件的第几行第几列」。`sourcesContent` 是可选的，它把源码内联进 map——这样即使原始文件不能通过 URL 访问，也还能还原。

这份格式的正式标准是 **ECMA-426**（2024 年 12 月第 1 版），更早的 rev3 草案在 `tc39/source-map-spec`。它还定义了 **index map**：用 `sections` 数组、每项带 `offset` 和自己的 map，来表达 `vendor.js + app.js` 这类拼接产物。

产物怎么关联到 map？两种方式：

```
SourceMap: /static/js/app.9f2c1a.js.map      ← HTTP 响应头
//# sourceMappingURL=app.9f2c1a.js.map       ← 源码里的魔法注释
```

注释前缀是 `//#` 而不是最初的 `//@`，因为 `//@` 和 IE 的条件编译指令（`//@cc_on`）撞了。CSS 里对应的是 `/*# sourceMappingURL=... */`。

## 五、构建配置：生产环境该用 sourcemap: "hidden"

`sourceMappingURL` 注释是把双刃剑：浏览器看到它就会去拉 map，DevTools 里能直接看源码——**但任何访客也能照做，你的源码就等于公开了**。

Vite 的 `build.sourcemap` 有四个取值（默认 `false`）：

| 值 | 产物 |
| --- | --- |
| `false` | 不生成任何 map |
| `true` | 生成 `.js.map`，并在产物里写入 `sourceMappingURL` 注释 |
| `'inline'` | 把 map 作为 data URI 塞进 JS 文件本身 |
| `'hidden'` | 生成 `.js.map`，但**不写注释** |

生产环境要的是 `'hidden'`：map 照样产出，但浏览器不会主动加载它，源码不对公网可见；监控平台上传完 map 之后，再把 `.map` 从发布产物里删掉。

```js
// vite.config.js
export default defineConfig({
  build: {
    sourcemap: 'hidden', // 生成 map 但不写注释
  },
});
```

`'inline'` 看着最省事，但引入了两个问题：产物体积随源码体积一起增长，而且 map 随 JS 一起发到浏览器——等于把源码一起发了。

:::note
`build.sourcemap` 只管 JS。CSS 的 map 由 `css.sourcemap` 单独控制，别指望设一个就全都有了。
:::

## 六、把压缩堆栈还原成源码位置

用 `@jridgewell/trace-mapping` 可以从 map 里反查原始坐标：

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

还原上面那条告警，会得到：

```
    at report (src/report.ts:87:12)
    at HTMLButtonElement.<anonymous> (src/user-card.ts:203:9)
```

两个必须注意的点：

1. **行 / 列的 1-based 与 0-based 转换。** `originalPositionFor` 的约定是「行从 1 开始，列从 0 开始」，而 V8 堆栈里的行列都是 1-based。所以列要减 1、行不能减。少减或多减 1，你会落到相邻的 token 上——位置看起来「差不多对」，实际指向的是另一个函数调用，比直接报错更难发现。
2. **函数名要从 `names` 里取。** 压缩后的 `fn` 常常是 `r`、`n` 这类单字母；map 的每个段里带着原始标识符，`originalPositionFor` 返回的 `pos.name` 就是从 `names` 里查出来的原名，有值时优先用它。

:::note
本地临时排查也可以直接用 Chrome DevTools：**Sources 面板 → 右键压缩后的文件 → Add source map**，手动挂上 `.map`，效果一样，只是没法批量。
:::

## 七、让还原真正生效的两个细节

**上传要早于错误发生。** 监控平台不会回头重新处理旧事件，map 必须在错误上报之前就已经在那边了。

**身份要对得上。** 事件携带的 release 与上传时用的 release 不一致，匹配就失败。较新的做法是用 **Debug ID**：构建后先往产物和 map 里注入同一个 ID，再整体上传，然后部署**注入后**的产物。这样匹配不再依赖文件路径和 release 名——CDN 换路径、文件名带 hash 都不影响。

```bash
sentry-cli sourcemaps inject ./dist
sentry-cli sourcemaps upload ./dist   # 然后部署 inject 后的 ./dist，并删掉其中的 .map
```

注入之后，压缩文件尾部的注释长这样，顺序是固定的：

```js
//# debugId=2e5a1c...e1
//# sourceMappingURL=app.9f2c1a.js.map
```

:::warning
部分 CDN 的自动压缩功能（例如 Cloudflare 的 Auto-Minify）会剥掉 JS 里的注释，`sourceMappingURL` 和 `debugId` 会一起消失，堆栈就再也还原不出来了。上线后 `curl` 一下产物尾部确认注释还在，比事后排查便宜得多。
:::

## 八、上线前检查清单

- [ ] 同步错误走 `addEventListener('error', handler, true)`（捕获阶段），运行时错误与资源错误分别处理
- [ ] `unhandledrejection` 有监听，且对 `reason` 不是 `Error` 的情况做了兜底
- [ ] 跨域脚本带 `crossorigin="anonymous"`，CDN 返回了 `Access-Control-Allow-Origin`
- [ ] 生产构建用 `sourcemap: 'hidden'`，`.map` 不发布到公网（或上传后删除）
- [ ] map 上传早于发版；匹配用 Debug ID，而不是路径 + release
- [ ] iframe 内的错误单独挂监听——iframe 是独立浏览上下文，父窗口的 `error` 事件收不到它

## 结语

错误监控的质量由链路里最弱的一环决定：**捕获漏了 Promise，你的错误量就少一大截，图表看着很健康；map 没上传，你的堆栈就只有一行乱码，所有报错看起来都长一样。** 这两件事都不难，难的是把它们当成一个完整链路去验证。

最有效的验收方式是发一版**故意抛错的测试版本**：页面加载时抛一个同步错误、`Promise.reject` 一个字符串、再引一个 404 的图片，然后从浏览器端一路跟到监控后台，看三条错误是否都到了、堆栈是否能正确定位到 `src/` 里的某一行。跟通一次，后面就稳了。

---

## 参考来源

- [MDN - Window: error event](https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event)
- [MDN - Window: unhandledrejection event](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)
- [ECMA-426 Source map format specification](https://tc39.es/ecma426/)
- [Vite - Build Options（build.sourcemap）](https://vite.dev/config/build-options)
- [Sentry Docs - JavaScript Source Maps](https://docs.sentry.io/platforms/javascript/sourcemaps/)
- [Sentry Docs - Troubleshooting Source Maps](https://docs.sentry.io/platforms/javascript/sourcemaps/troubleshooting_js/)
- [npm - @jridgewell/trace-mapping](https://www.npmjs.com/package/@jridgewell/trace-mapping)
