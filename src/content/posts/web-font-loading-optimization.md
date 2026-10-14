---
title: Web Font 加载优化：从 FOUT 到完美渲染
published: 2026-09-08
description: '系统讲解 Web 字体加载的性能问题：FOUT 与 FOIT 的区别、font-display 如何选择、preload、自托管与子集化、可变字体，附可落地的代码示例。'
image: ''
tags: [字体, Web性能, 网站开发, CSS, font-display, 优化]
category: '网站'
draft: false
lang: ''
---

## 一、字体为什么是性能杀手

打开一个现代网站，你看到的每一个字，背后都可能是一个或多个字体文件。一个完整的中文字体动辄 5–10 MB，即使是西文字体，单个字重（weight）的 WOFF2 文件也通常在 50–200 KB 之间。如果页面引用了 3 个字重 + 斜体，字体这一项就能轻松吃掉 500 KB 以上的下载量——比整个页面的 HTML、CSS、JS 加起来还大。

更麻烦的是，字体是「阻塞性资源」：浏览器只有在确定需要哪些字体后，才会去下载它们，而文本渲染又依赖字体。于是你会在页面上看到两种经典现象：

- **FOUT**（Flash of Unstyled Text）：先用系统字体渲染文字，字体下载完成后「跳」成目标字体；
- **FOIT**（Flash of Invisible Text）：文字先完全不可见（空白），字体就绪后才显示。

这两者本质上是同一个问题的两面：**字体下载有延迟，而渲染不能无限等待**。本文的目标，就是把这个「等待」控制得尽可能小、尽可能优雅。

## 二、font-display：控制等待行为的核心开关

CSS 的 `font-display` 是控制字体加载期间渲染行为最直接的工具。它定义在 `@font-face` 里，共有五个取值，语义围绕「阻塞期（block period）」和「交换期（swap period）」展开：

```css
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-display: swap;
}
```

| 取值 | 阻塞期 | 交换期 | 典型结果 |
|------|--------|--------|---------|
| `block` | 最长 3s | 无限 | 3 秒内文字不可见（FOIT），之后才显示 |
| `swap` | 极短（约 0ms） | 无限 | 立即显示系统字体，加载完成后替换（FOUT） |
| `fallback` | 约 100ms | 约 3s | 极短 FOIT，若 3 秒内没加载完就一直用系统字体 |
| `optional` | 约 100ms | 无 | 极短 FOIT，加载没赶上就不再切换字体 |
| `auto` | 浏览器决定 | 浏览器决定 | 相当于 `block` 的行为 |

**怎么选？** 一个被广泛接受的实践是：

- **正文文本**用 `swap`：用户能立刻读到内容，字体的「跳变」在可接受范围内；
- **品牌标志、图标字体**用 `optional` 或 `block`：这类元素宁可不显示也不希望出现「先用别的字体再跳」的违和感；
- **几乎永远**不要用默认的 `block` 来渲染长正文——3 秒的不可见文本会直接劝退用户。

## 三、preload：让字体下载抢跑

`font-display` 解决的是「加载期间显示什么」，但更理想的策略是**让字体早点开始下载**。默认情况下，浏览器要解析完 CSS、构建好渲染树、发现某段文本真正用到了这个字体，才会发起字体请求——这个「发现」动作往往发生在页面渲染的中后段。

用 `<link rel="preload">` 可以在 HTML 头部就告诉浏览器「这个字体很重要，赶紧去下」：

```html
<link rel="preload" href="/fonts/myfont.woff2" as="font" type="font/woff2" crossorigin>
```

两个关键点：

1. `as="font"` 是必须的，它让浏览器知道这是字体资源，赋予正确的优先级；
2. **必须加 `crossorigin`**——即使字体和你同域。这是一个经典坑：字体请求默认是「跨域」语义（CORS），漏掉 `crossorigin` 会导致字体被下载两次：一次是 preload 请求，一次是真正使用时的请求。

如果你的字体来自第三方 CDN（如 Google Fonts），还可以配合 `preconnect` 提前建立连接，省掉 DNS 解析和 TCP/TLS 握手的时间：

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

## 四、自托管 vs 第三方 CDN

Google Fonts 让「用上漂亮字体」的成本降到一行 `<link>`，但自托管（把字体文件放到自己的服务器/CDN 上）正在重新成为主流选择，理由有三：

1. **性能**：省去跨域连接、第三方重定向（Google Fonts 的 CSS 会 302 到 gstatic）和额外的 TLS 握手；
2. **隐私合规**：欧盟多个数据保护机构认定 Google Fonts 会把用户 IP 传给 Google，直接内嵌违反 GDPR（德国法院曾据此判罚）；
3. **可控性**：版本、缓存策略、加载策略完全自己掌控。

自托管并不复杂——从 [Google Fonts 下载页面](https://fonts.google.com/) 拿到 WOFF2 文件后，写一个标准的 `@font-face` 即可。现代浏览器普遍支持 WOFF2，它比 WOFF 和 TTF 平均小 30%，可以直接只保留 WOFF2：

```css
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  src: url('/fonts/inter-regular.woff2') format('woff2');
  font-display: swap;
}
```

## 五、子集化与 unicode-range：只加载用到的字

对中文站点来说，这一步的收益最大。完整中文字体几 MB 起步，但一个页面实际用到的汉字可能只有几百个。**子集化（subsetting）** 就是按字符集把字体切小，再通过 `unicode-range` 让浏览器按需下载：

```css
@font-face {
  font-family: 'NotoSansSC';
  src: url('/fonts/noto-sans-sc-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF; /* 拉丁字符 */
  font-display: swap;
}

@font-face {
  font-family: 'NotoSansSC';
  src: url('/fonts/noto-sans-sc-common.woff2') format('woff2');
  unicode-range: U+4E00-9FFF; /* 常用汉字 */
  font-display: swap;
}
```

`unicode-range` 让浏览器只下载「页面实际命中了对应字符区间」的那份子集。如果某段文本只包含英文字母，中文子集根本不会被请求。配合工具（如 `subset-font`、`fonttools` 的 `pyftsubset`）可以自动完成切分。

## 六、可变字体：一个文件顶一套字体

**可变字体（Variable Fonts）** 用一个文件承载连续的轴（axis）——字重、字宽、倾斜、光学尺寸等。原来「Regular + Medium + Bold + Italic」需要 4 个文件，现在 1 个文件搞定，请求数从 4 降到 1：

```css
@font-face {
  font-family: 'InterVariable';
  src: url('/fonts/inter-var.woff2') format('woff2-variations');
  font-weight: 100 900; /* 声明可变范围 */
  font-display: swap;
}

.text {
  font-family: 'InterVariable', sans-serif;
  font-weight: 575; /* 任意字重，无需额外文件 */
}
```

`font-weight: 100 900` 是可变字体专属写法，声明了这条轴的可变范围。此后任何介于 100–900 之间的字重都从同一个文件渲染，不会再触发额外下载。

## 七、进阶：用 Font Loading API 精细化控制

如果上面的 CSS 手段还不够，JavaScript 的 **CSS Font Loading API**（`document.fonts`）给了你程序化的控制能力。一个常见场景是：只加载「当前视口真正用到」的字体，用户滚动到某个区域再加载：

```js
const fonts = document.fonts;

// 检查某个字体是否已就绪
async function ensureFont(family, source) {
  const face = new FontFace(family, source, { weight: '400' });

  // 先注册，但字体文件会延迟到真正使用时才下载
  fonts.add(face);

  try {
    await face.load(); // 显式触发加载
    document.body.classList.add('font-ready');
  } catch (e) {
    console.error('字体加载失败，回退到系统字体', e);
  }
}

ensureFont('MyFont', 'url(/fonts/myfont.woff2) format("woff2")');
```

`document.fonts.ready` 是一个 Promise，会在所有 `@font-face` 声明的字体加载完成后 resolve，可以用来在字体就绪前后做视觉过渡。

## 八、小结

把上面的手段串成一条完整的优化链路，优先级从高到低是：

1. **减少字体体积**：子集化 + 只保留 WOFF2 + 用可变字体合并字重；
2. **让字体早点加载**：`preload`（同域）+ `preconnect`（跨域）；
3. **优雅地面对等待**：正文用 `font-display: swap`，图标和品牌用 `optional`；
4. **按需加载**：`unicode-range` + Font Loading API。

字体优化没有「银弹」，但每一点都立竿见影：一个 5 MB 的中文字体，做完子集化、WOFF2 压缩和按需加载后，实际传输量常常能降到原来的 5% 以下。这对移动网络下的用户，是从「白屏 5 秒」到「秒开」的差别。

## 参考来源

- web.dev — [Optimize WebFont loading](https://web.dev/articles/optimize-webfont-loading)
- MDN — [font-display](https://developer.mozilla.org/zh-CN/docs/Web/CSS/@font-face/font-display)
- MDN — [CSS Font Loading API](https://developer.mozilla.org/zh-CN/docs/Web/API/CSS_Font_Loading_API)
- Google Fonts — [Self-hosting guide](https://developers.google.com/fonts/docs)
