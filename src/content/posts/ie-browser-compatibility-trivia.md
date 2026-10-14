---
title: IE 那些年的奇葩行为：一部浏览器兼容性血泪史
published: 2026-09-13
description: '从盒模型之争到 CSS 表达式，从条件注释到 UA 字符串谍战，回顾 Internet Explorer 留给前端世界的那些「遗产」。'
image: ''
tags: [浏览器, 兼容性, CSS, 前端, 程序员笑话]
category: '前端'
draft: false
lang: ''
---

2022 年 6 月 15 日，微软正式为 IE11 敲响丧钟。消息传出后，有工程师在「葬礼」上摆了一个祭坛，供着一块印有蓝色 `e` 的蛋糕——这不是玩笑，是**被 IE 折磨到 PTSD 的前端开发者们自发的庆祝**。

要理解这份怨气从何而来，得先回到那个「一个浏览器，一本书」的年代。

## 一个「标准」，两个盒子

前端史上最著名的分歧，叫做**盒模型之争**。

在 IE6 的怪异模式（Quirks Mode）下，一个 `width: 100px` 且带 `padding: 10px` 的盒子，总宽度就是 100px；而在遵循 W3C 标准模式下，内容宽 100px，加上内边距和边框之后，实际占 120px。

```css
.box {
  width: 100px;
  padding: 10px;
  border: 1px solid;
  /* 标准模式：实际占 122px（content-box） */
  /* IE 怪异模式：实际占 100px（border-box） */
}
```

当年大家都骂 IE「不标准」。可十几年后，CSS 工作组默默加了一个属性——`box-sizing: border-box`，也就是**把 IE 当年的算法变成了标准**。兜兜转转，原来 IE 才是那个「提前实现需求」的人。

## 那些只有 IE 才有的 API

IE 的独门绝技，随便就能列一串：

```css
/* 1. 透明度：全世界都用 opacity，只有 IE 用滤镜 */
.box {
  opacity: 0.5;
  filter: alpha(opacity=50); /* IE6/7 专供 */
}
```

比滤镜更离谱的是 **CSS 表达式**——允许你在样式表里写 JavaScript：

```css
/* IE5~IE7：让元素宽度随窗口变化 */
.sidebar {
  width: expression(document.body.clientWidth < 600 ? "600px" : "auto");
}
```

这玩意儿会在**每次重绘时重新求值**，性能直接崩塌，还顺手打开了 XSS 的后门。后来微软自己把它禁用了。

至于 AJAX 的源头——`XMLHttpRequest`，在 IE 里的写法是这样的：

```javascript
var xhr = new ActiveXObject("Microsoft.XMLHTTP"); // IE 专属
```

对，一个网络请求对象，居然要靠 ActiveX 控件来创建。

## 条件注释：微软亲手发的「独门暗号」

IE 提供了一种只有它自己认识的 HTML 注释语法：

```html
<!--[if lt IE 9]>
  <script src="/js/html5shiv.js"></script>
  <link rel="stylesheet" href="/css/ie8.css" />
<![endif]-->
```

标准浏览器会把它当注释忽略，IE 则会执行里面的内容。于是那些年的 `<head>` 里，几乎都住着一段这样的「暗号」，配套的还有 `_height: 100px`、`*display: inline` 这类只对特定 IE 生效的 CSS hack。**兼容性从一门技术，变成了一门巫术。**

## 假扮自己不存在的 `document.all`

IE 留下最持久的「遗产」藏在 HTML 标准里。直到今天，你打开控制台输入：

```javascript
typeof document.all // "undefined"
document.all == undefined // true
```

`document.all` 明明存在，却假装自己不存在——因为当年的代码普遍用 `if (document.all)` 来检测 IE，标准委员会为了不让这些老代码跑进错误的逻辑分支，**把这个对象本身定义成了一个「伪装成 undefined 的存在」**。一行规范，为一段历史立了块碑。

## 结语

IE 的很多「奇葩」，其实源于它在浏览器战争中的领先地位：它先于标准实现了很多东西，于是标准只好反过来兼容它。只是对当年那些一边调 `hasLayout` 一边骂街的开发者来说，这份「前瞻性」实在没什么说服力。

好消息是：今天的 Edge 已经是 Chromium 换皮，而 Safari 正兢兢业业地接过了「新 IE」这顶帽子。旧王已死，新王当立。

---

**参考来源**

- [Internet Explorer 11 桌面应用停止支持公告](https://learn.microsoft.com/en-us/lifecycle/announcements/internet-explorer-11-end-of-support) — 微软官方 2022 年退役说明
- [HTML 标准中关于 `document.all` 的诡异定义](https://html.spec.whatwg.org/multipage/obsolete.html#dom-document-all) — 规范里为兼容 IE 而生的特例
- [MDN：`box-sizing`](https://developer.mozilla.org/en-US/docs/Web/CSS/box-sizing) — 盒模型之争与 `border-box` 的由来
- [IE 条件注释（Conditional Comments）官方文档](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/compatibility/ms537512(v=vs.85)) — 那段「独门暗号」的原始说明
