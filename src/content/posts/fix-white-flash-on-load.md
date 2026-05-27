---
title: 修复落地页加载白闪屏：CSS transition 引发的性能问题
published: 2026-05-27
description: '排查并修复博客落地页在暗色模式下的加载白闪屏问题，根因是 html 标签上的 Tailwind transition class 导致首帧背景色动画化'
image: ''
tags: [CSS, 前端, 性能优化, bug修复, 博客]
category: '前端'
draft: false
lang: ''
---

## 问题描述

博客落地页在加载时会出现短暂的白闪屏，尤其在暗色模式下非常明显。页面打开瞬间先显示白色背景，然后才过渡为深色背景——这个闪烁持续约 150ms，对用户体验影响很大。

## 排查过程

### 第一步：定位闪屏发生的时机

打开 DevTools Performance 面板录制加载过程，发现闪屏发生在首帧绘制（First Paint）阶段。此时页面背景色从亮色值突然切换到暗色值，且带有平滑过渡动画。

### 第二步：检查主题初始化逻辑

我的博客使用 Astro 构建，暗色模式通过给 `<html>` 添加 `.dark` class 实现。CSS 变量使用 Stylus 的 `define` mixin 分别定义亮色/暗色值：

```stylus
define({
  --page-bg: oklch(0.95 0.01 var(--hue)) oklch(0.16 0.014 var(--hue))
  --card-bg: white oklch(0.23 0.015 var(--hue))
  // ...
})
```

编译后生成：

```css
:root { --page-bg: oklch(0.95 0.01 var(--hue)); }
:root.dark { --page-bg: oklch(0.16 0.014 var(--hue)); }
```

在 `<head>` 中已经有一份内联脚本负责在页面渲染前从 `localStorage` 读取主题偏好并设置 `dark` class。逻辑本身没问题，脚本也确实在 `<body>` 渲染前执行了。

### 第三步：发现真凶

回头看 `<html>` 标签：

```html
<html class="bg-[var(--page-bg)] transition ...">
```

**`transition` 是 Tailwind 的 utility class**，展开后等价于：

```css
transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
transition-duration: 150ms;
```

整个闪烁链路就清楚了：

1. 浏览器开始解析 HTML，CSS 变量初始为亮色值（`--page-bg: oklch(0.95 ...)`）
2. 内联脚本执行，添加 `.dark` class
3. CSS 变量切换为暗色值（`--page-bg: oklch(0.16 ...)`）
4. **因为 `<html>` 有 `transition`，background-color 的变更被动画化**
5. 亮色背景 → 暗色背景，150ms 过渡 = 用户看到白闪

## 修复方案

在 `<head>` 最开头插入一个临时 `<style>` 标签，在首帧渲染前**禁用所有 transition**，首帧绘制完成后移除它，恢复正常的主题切换过渡：

```html
<!-- Layout.astro <head> 最开头 -->
<style id="prevent-flash">
  *, *::before, *::after {
    transition: none !important;
  }
</style>
```

配合 JavaScript 在首帧后清理：

```javascript
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const preventFlash = document.getElementById('prevent-flash');
    if (preventFlash) preventFlash.remove();
  });
});
```

**双 `requestAnimationFrame` 的作用**：第一个 rAF 在浏览器下一次重绘前执行，第二个 rAF 确保浏览器已经完成了首帧绘制，此时移除防闪屏 style，后续的主题切换依然有平滑过渡。

## 总结

这个 bug 的根因很小——就是 `<html>` 上一个看似无害的 `transition` class，但它的影响范围覆盖了整个页面的所有颜色属性。

查 bug 时容易陷入"逻辑正确就不该有问题"的思维盲区。这个 case 里主题切换的逻辑完全正确，问题出在视觉层面——CSS 过渡与首帧绘制产生了意外的交互。

关键心得：**broad-scope CSS transitions（如给 `<html>` 或 `*` 加 transition）在首帧加载时一定会产生视觉副作用**。要么别用，要么用防闪屏模式兜底。
