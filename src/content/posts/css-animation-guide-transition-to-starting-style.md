---
title: CSS 动画终极指南：从 transition 到 @starting-style
published: 2026-09-14
description: '从 transition、@keyframes 一路讲到 @starting-style 与 allow-discrete，用一套可运行的弹层代码讲清「元素从无到有」的动画到底该怎么做。'
image: ''
tags: [CSS, 动画, 前端, Web平台]
category: '前端'
draft: false
lang: ''
---

## 一个问题：为什么 `display: none` 切回来就没动画了

几乎所有写过前端交互的人都撞过这堵墙：你给一个弹层写好 `transition: opacity .3s`，关闭时把它设成 `display: none`，再打开时——它凭空出现了，动画没了。

原因很直白：**`display: none` 的元素根本不在渲染树里**。元素还没被渲染，自然没有「从旧状态到新状态」可言，浏览器连起始样式都无从计算。于是过去十几年的通用做法是用 JS 打补丁：

```js
// 经典 hack：先删类，强制回流，再加类
panel.classList.remove('is-open');
void panel.offsetWidth; // 强制同步布局，逼迫浏览器「看到」初始状态
panel.classList.add('is-open');
```

这段代码能跑，但代价是每次开关都触发一次强制同步布局（forced reflow），而且把「动画」这件本该由 CSS 描述的事拆散到了两个语言里。

CSS 现在有了一等公民的解法：**`@starting-style`**。这篇文章从最基础的 `transition` 讲起，一路把这套新工具串成一条完整的链路。

## 第一层：transition —— 两点之间的插值

`transition` 描述的是「同一个属性在两个已知值之间如何平滑过渡」，它需要三个条件同时成立：

1. 属性本身是**可插值**的（`opacity`、`transform`、`color` 可以；`display`、`content` 不行）
2. 元素在过渡前后**都处于已渲染状态**
3. 属性值**发生了实际变化**（从 `opacity: 1` 到 `opacity: 1` 不会有任何反应）

第三点常被忽略，但它解释了一个经典困惑：为什么 `height: auto` 过渡不了？因为 `auto` 不是数值，浏览器无法在 `auto` 和 `200px` 之间求中间值。直到 `calc-size()` 与 `interpolate-size: allow-keywords` 出现，这个问题才有了纯 CSS 的答案——但那是另一个话题了。

```css
.card {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}

.card.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

注意这里只动 `opacity` 和 `transform`。这不是审美偏好，而是性能约束：这两个属性可以由合成器（compositor）线程独立处理，不触发重排与重绘。动 `height`、`margin`、`top` 会让浏览器每帧重新计算布局，在低端设备上立刻掉帧。

## 第二层：@keyframes —— 描述一条时间线

`transition` 只能描述「A → B」，当你要的是多段编排（先放大再回弹、无限旋转、骨架屏闪烁），就得换成 `animation`：

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: .5; }
}

.skeleton {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}

.input.is-error {
  animation: shake 400ms ease-in-out;
}
```

`animation` 与 `transition` 的关键区别在于**控制权**：`transition` 由属性值的变化驱动，`animation` 由元素被挂上动画名驱动。这也意味着 `@keyframes` 能表达「进入」这个动作——只要你愿意在元素渲染后立刻挂上它。

## 第三层：@starting-style —— 让「首次渲染」也有起点

现在回到开头的问题。`@starting-style` 做的事情可以一句话概括：**为元素「第一次被渲染时」提供一个起始样式**，让浏览器知道该从哪里开始过渡。

```css
.panel {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 300ms ease, transform 300ms ease;
}

/* 元素首次渲染（或从 display:none 恢复）时，从这里开始 */
@starting-style {
  .panel {
    opacity: 0;
    transform: translateY(-12px);
  }
}
```

关键点在于：`@starting-style` 里的声明**只用于计算过渡的起始值，不会最终生效**。浏览器把它当作「如果这个元素此刻是初始状态，它应该长什么样」，然后立刻过渡到常规规则里的终值。

但它单独用还不够——因为 `display: none` 的问题还没解决。

## 第四层：allow-discrete —— 让离散属性也能参与过渡

`display` 是离散属性：它要么是 `none`，要么不是，中间没有 50% 的 `display`。所以浏览器默认拒绝为它做过渡。`transition-behavior: allow-discrete` 改变了这条规则，它允许离散属性在过渡的**两端**发生翻转，而不是平滑插值：

```css
.panel {
  display: none;
  opacity: 0;
  transform: translateY(-12px);

  transition:
    display 300ms allow-discrete,
    opacity 300ms ease,
    transform 300ms ease;
}

.panel.is-open {
  display: block;
  opacity: 1;
  transform: translateY(0);
}
```

这里的语义值得拆开看：关闭时，`display` 从 `block` 翻到 `none` 被推迟到过渡结束才发生（否则元素会瞬间消失，看不到淡出）；打开时，`display` 立刻变成 `block`，从而让 `opacity` 和 `transform` 有机会过渡。这正是过去那几行 JS hack 想模拟的效果。

## 完整示例：一个不写一行 JS 动画的 Toast

把四层拼起来，就是一个完整的、由开关一个类名驱动的弹层：

```html
<div class="toast" id="toast">已保存到草稿箱</div>
<button onclick="document.getElementById('toast').classList.toggle('is-open')">
  切换 Toast
</button>
```

```css
.toast {
  position: fixed;
  inset-block-start: 1rem;
  inset-inline: 0;
  margin-inline: auto;
  width: fit-content;
  padding: .75rem 1.25rem;
  border-radius: 999px;
  background: #111;
  color: #fff;
  font-size: .875rem;

  /* 关闭态 */
  display: none;
  opacity: 0;
  transform: translateY(-16px) scale(.96);

  transition:
    display 250ms allow-discrete,
    opacity 250ms ease,
    transform 250ms cubic-bezier(.34, 1.56, .64, 1);
}

.toast.is-open {
  display: block;
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* 首次渲染 / 从 none 恢复时的起点 */
@starting-style {
  .toast.is-open {
    opacity: 0;
    transform: translateY(-16px) scale(.96);
  }
}

/* 无障碍：尊重系统的「减少动态效果」设置 */
@media (prefers-reduced-motion: reduce) {
  .toast {
    transition: display 0s, opacity 150ms linear;
    transform: none;
  }
}
```

注意 `@starting-style` 选择器里写的是 `.toast.is-open`——因为只有「打开」这个状态才需要起点。如果写成 `.toast`，关闭方向也会被赋予一个起始样式，反而会干扰过渡。

同样的模式可以直接套用到 `<dialog>`、`popover`、汉堡菜单、下拉面板上。尤其是在 popover API 里，`popover` 的显示隐藏本身就切换 `display`，两者配合起来是当前最省事的弹层动画方案。

## 浏览器支持与回退

截至 2026 年，`@starting-style` 与 `transition-behavior: allow-discrete` 已在 Chrome 117+、Safari 17.4+、Firefox 129+ 全量可用，主流浏览器的新版本都已覆盖。

对仍需要兼容旧内核的场景，推荐用 `@supports` 做渐进增强，而不是退回 JS hack：

```css
@supports (transition-behavior: allow-discrete) {
  .toast { transition: display 250ms allow-discrete, opacity 250ms ease; }
}

@supports not (transition-behavior: allow-discrete) {
  /* 旧浏览器：只做透明度过渡，元素即时显示/隐藏 */
  .toast { transition: opacity 250ms ease; }
  .toast.is-open { display: block; }
}
```

这样旧浏览器得到的是「不淡入但有淡出」的可用版本，新浏览器得到完整动画——没有任何一段 JS，也没有强制回流。

## 写在最后

这四层其实对应着递进的问题：

| 你想做的事 | 用什么 |
|---|---|
| 两个已知状态之间平滑切换 | `transition` |
| 多段编排、循环、复杂时间线 | `@keyframes` |
| 元素首次出现时也要有起点 | `@starting-style` |
| 让 `display` 这类离散属性参与切换 | `transition-behavior: allow-discrete` |

过去我们把「进入动画」交给 JS，不是因为 CSS 做不到，而是因为 CSS 缺少描述「无」的语言。`@starting-style` 补上的正是这一块：它让「什么都不存在」也成为一种可以插值的状态。从那以后，弹层动画就只是两个类名之间的事了。

---

## 参考来源

- [MDN — `@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style)
- [MDN — `transition-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/transition-behavior)
- [Chrome for Developers — Four new CSS features for smooth entry and exit animations](https://developer.chrome.com/blog/entry-exit-animations)
- [web.dev — Animating entry and exit with `@starting-style`](https://web.dev/blog/starting-style)
- [Can I use — CSS `@starting-style`](https://caniuse.com/mdn-css_at-rules_starting-style)
