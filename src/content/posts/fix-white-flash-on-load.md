---
title: 'Fixing the White Flash on Landing Page Load: A CSS Transition Performance Issue'
published: 2026-05-27
description: Diagnosing and fixing a white flash on the blog landing page during load in dark mode, caused by a Tailwind transition class on the html tag that animated the background color on the first frame.
image: ''
tags: [CSS, Frontend, Performance Optimization, Bug Fix, Blog]
category: Frontend
draft: false
---
## Problem Description

The blog landing page shows a brief white flash on load, especially noticeable in dark mode. The moment the page opens, it first displays a white background, then transitions to a dark background—this flicker lasts about 150ms and significantly impacts the user experience.

## Investigation Process

### Step 1: Pinpointing when the flash occurs

Opening the DevTools Performance panel to record the loading process, I found that the flash occurs during the First Paint stage. At this point, the page background color suddenly switches from a light value to a dark value, with a smooth transition animation.

### Step 2: Checking the theme initialization logic

My blog is built with Astro, and dark mode is implemented by adding a `.dark` class to `<html>`. CSS variables use Stylus's `define` mixin to define light/dark values separately:

```stylus
define({
  --page-bg: oklch(0.95 0.01 var(--hue)) oklch(0.16 0.014 var(--hue))
  --card-bg: white oklch(0.23 0.015 var(--hue))
  // ...
})
```

After compilation it generates:

```css
:root { --page-bg: oklch(0.95 0.01 var(--hue)); }
:root.dark { --page-bg: oklch(0.16 0.014 var(--hue)); }
```

In `<head>` there is already an inline script responsible for reading the theme preference from `localStorage` and setting the `dark` class before the page renders. The logic itself is fine, and the script does indeed execute before `<body>` renders.

### Step 3: Finding the real culprit

Looking back at the `<html>` tag:

```html
<html class="bg-[var(--page-bg)] transition ...">
```

**`transition` is a Tailwind utility class**, which when expanded is equivalent to:

```css
transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
transition-duration: 150ms;
```

The entire flicker chain becomes clear:

1. The browser starts parsing HTML, CSS variables are initially light values (`--page-bg: oklch(0.95 ...)`)
2. The inline script executes, adding the `.dark` class
3. CSS variables switch to dark values (`--page-bg: oklch(0.16 ...)`)
4. **Because `<html>` has `transition`, the background-color change gets animated**
5. Light background → dark background, 150ms transition = user sees a white flash

## Fix

Insert a temporary `<style>` tag at the very beginning of `<head>` to **disable all transitions** before the first frame is painted, then remove it after the first frame is painted to restore normal theme-switching transitions:

```html
<!-- Layout.astro <head> 最开头 -->
<style id="prevent-flash">
  *, *::before, *::after {
    transition: none !important;
  }
</style>
```

Combined with JavaScript to clean up after the first frame:

```javascript
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const preventFlash = document.getElementById('prevent-flash');
    if (preventFlash) preventFlash.remove();
  });
});
```

**The purpose of the double `requestAnimationFrame`**: the first rAF executes before the browser's next repaint, and the second rAF ensures the browser has completed the first frame paint. At this point, removing the anti-flash style still leaves subsequent theme switches with smooth transitions.

## Summary

The root cause of this bug is tiny—just a seemingly harmless `transition` class on `<html>`, but its impact covers all color properties across the entire page.

When debugging, it's easy to fall into the blind spot of "if the logic is correct, there shouldn't be a problem." In this case, the theme-switching logic was completely correct; the problem was at the visual level—CSS transitions interacted unexpectedly with the first frame paint.

Key takeaway: **broad-scope CSS transitions (such as adding transition to `<html>` or `*`) will definitely produce visual side effects during first-frame loading**. Either don't use them, or use an anti-flash pattern as a fallback.