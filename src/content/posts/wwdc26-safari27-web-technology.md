---
title: 'The Web Technology Revolution at WWDC26: What Safari 27 Brings'
published: 2026-06-16
description: 'The WWDC26 WebKit session unveiled five major features in Safari 27: native masonry layout with CSS Grid Lanes, fully customizable <select> elements, <model> 3D model embedding, immersive website environments in visionOS, and cross-browser Web Extensions packaging. This article breaks down how each feature works and the design intent behind it.'
image: ''
tags: [Apple, Safari, CSS, Web, WWDC, Frontend]
category: Frontend
draft: false
---
## 1. Introduction

In June 2026, at WWDC26, Apple's WebKit team brought a series of new Web platform features to Safari 27. Compared to the "incremental" pace of Safari updates in previous years, this year's Web technology session can be called a **minor explosion**—from CSS layout to form controls, from 3D content embedding to spatial computing web experiences, each one directly addressing pain points front-end developers have had for years.

This article analyzes the five core features one by one, with code examples, to help you quickly understand how these new capabilities will change the way we develop.

---

## 2. Five Core Features

### 2.1 CSS Grid Lanes — Native Masonry Layout

This is the CSS new feature that drew the most attention from front-end developers at this WWDC. **Grid Lanes** gives the Web platform native support for Pinterest-style masonry layout—no JavaScript required, achievable with just a few lines of CSS.

**Pain points of traditional solutions**

Before this, there were only two ways to implement masonry layout:

| Solution | Problem |
|------|------|
| JavaScript calculation | Poor performance, laggy on window resize, requires ResizeObserver + absolute positioning |
| CSS Grid + `grid-auto-rows: masonry` | Has been an experimental proposal since 2020, never shipped in any browser |

**The Grid Lanes solution**

Grid Lanes introduces the new syntax `grid-template-columns` `lanes()`, allowing elements to flow naturally between columns:

```css
.masonry {
  display: grid;
  grid-template-columns: lanes(300px, 300px, 300px);
  gap: 16px;
}

/* 配合 auto-fill 实现响应式 */
.masonry-responsive {
  display: grid;
  grid-template-columns: lanes(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
```

Unlike the previously abandoned `masonry` keyword, Grid Lanes is designed to be more general—it not only supports masonry, but also **any custom grid arrangement algorithm**, making it a much bigger concept than "masonry layout."

**Core characteristics**:
- **Pure CSS implementation**, zero JavaScript, browser-native rendering optimization
- **Adaptive**, responsive when combined with `auto-fill`, `minmax()`
- **Controllable ordering**, supports arrangement strategies such as `grid-lane-order: column | row | shortest-column`

In WebKit's demo, for a masonry page with 200 images, after switching from the JS solution to Grid Lanes, layout computation time dropped from **~120ms to ~4ms**.

---

### 2.2 Fully Customizable `<select>` Element

The war between front-end developers and the `<select>` element has lasted for more than twenty years. Safari 27 finally provides a native solution: `appearance: base-select` + a brand-new pseudo-element system.

**New pseudo-element system**

```css
/* 启用新的可样式化 select */
select {
  appearance: base-select;
}

/* 下拉触发器（替代浏览器默认箭头） */
select::picker(select) {
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(20px);
}

/* 选项列表 */
select::picker(select) option {
  padding: 12px 16px;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 选中标记 */
select::checkmark {
  color: var(--accent-color);
  margin-left: auto;
}

/* 选中态 */
select::picker(select) option:checked {
  background: var(--accent-color-light);
}
```

**Key capabilities**

| Pseudo-element / Selector | Purpose |
|---|---|
| `::picker()` | Style the dropdown panel (background, border radius, shadow, blur) |
| `::picker-icon` | Custom dropdown arrow icon |
| `::checkmark` | Custom selected marker |
| `option:checked` | Style for the currently selected item |
| `option:hover` | hover state |
| flex/grid inside `::picker(select)` | Fully free option layout |

This means we can finally abandon those custom select libraries that weigh tens of KB (such as Choices.js, Select2, react-select, etc.) and implement design-spec-level dropdown selectors with pure native CSS.

---

### 2.3 `<model>` Element — Embedding 3D Models in Web Pages

Safari 27 adds the `<model>` HTML element, allowing interactive 3D models to be embedded directly in web pages without any JavaScript library or WebGL code.

**Basic usage**

```html
<model
  src="airpods.usdz"
  width="600"
  height="400"
  camera-controls
  auto-rotate
  ar
>
  <p>您的浏览器不支持 3D 模型显示，请升级 Safari 27</p>
</model>
```

**Supported features**

| Attribute / Capability | Description |
|---|---|
| `src` | Model file URL (supports USDZ, glTF 2.0, OBJ) |
| `camera-controls` | Users can rotate/zoom/pan the view |
| `auto-rotate` | Automatically rotates slowly for display |
| `ar` | Click to launch AR viewing (Quick Look on iOS/iPadOS) |
| `environment` | Environment lighting presets (`auto` / `studio` / `outdoor`) |
| `poster` | Placeholder image URL before the model loads |
| `loading` | Lazy loading (`lazy` / `eager`) |

**JavaScript API**

The `<model>` element exposes a complete JavaScript control interface:

```javascript
const model = document.querySelector('model');

// 播放内置动画
model.playAnimation('idle');

// 监听加载状态
model.addEventListener('load', () => {
  console.log('模型已加载，三角形数量：', model.triangleCount);
});

// 编程式控制相机
model.camera.orbit(0, 45, 2);  // theta, phi, radius
```

The `<model>` element first hinted at this back when previewing USDZ files in Quick Look on iOS, and now it has officially entered the Web standard. For e-commerce, education, and product showcase websites, this is an important tool.

---

### 2.4 visionOS Immersive Website Environments

This is the most futuristic capability of this WWDC. Safari 27 supports **spatial web experiences** on visionOS 27: websites can declare themselves "immersive," and thus be presented in a spatial way on Apple Vision Pro.

**Declaring an immersive experience**

```html
<meta name="apple-immersive" content="full">
<meta name="apple-immersive-environment" content="starry-night">
```

The browser renders the page as a panel floating in the user's space, while also supporting **WebXR** standard spatial interaction:

```javascript
// 检测沉浸式 Web 支持
if ('xr' in navigator) {
  const session = await navigator.xr.requestSession('immersive-vr', {
    requiredFeatures: ['hand-tracking'],
  });

  // 使用 WebXR API 创建空间化的 UI 面板
  const layer = new XRWebGLLayer(session, gl);
  session.updateRenderState({ baseLayer: layer });
}
```

The WebKit team emphasizes that this is not creating a new "visionOS-only" standard, but rather an extended implementation on top of the existing **WebXR Device API** standard. This means the same WebXR page can also run on devices such as Meta Quest and Pico.

**Practical application scenarios**:
- **Product showcase**: Furniture brands let users view furniture in space
- **Data visualization**: 3D charts and data dashboards
- **Online education**: Three-dimensional teaching such as anatomical models and molecular structures
- **Art exhibitions**: Spatial web art experiences

---

### 2.5 Cross-Browser Web Extensions Packaging

Safari 27 greatly simplifies the development and distribution process for Safari extensions.

**Main changes**

| Before | After (Safari 27) |
|------|-------------------|
| Must be packaged through an Xcode project | Submit the extension package directly, no Xcode required |
| Can only be built and submitted on a Mac | Can be built and submitted on any platform (via App Store Connect API) |
| Large differences in Safari-specific APIs | Closer to Chrome/Firefox extension APIs, following the W3C WebExtensions Community Group specification |
| Cannot be reused across browsers | One codebase → Chrome + Firefox + Safari, with zero or minimal modifications |

**New packaging approach**

```bash
# 无需 Xcode，直接用命令行工具打包
safari-web-extension build ./my-extension

# 通过 App Store Connect API 提交
xcrun altool --upload-app \
  -f my-extension.zip \
  -t osx \
  --apiKey YOUR_KEY \
  --apiIssuer YOUR_ISSUER
```

This is especially friendly to independent developers and open-source projects—previously, maintaining an extension for Safari required a Mac and an Apple Developer account, but now submission can be completed through CI/CD.

---
## 3. What These Features Mean

If you look at the five major features together, you'll see they all point in the same direction: **the Web platform is taking over more and more territory that originally belonged to "native."**

| Feature | What it replaces |
|------|-----------|
| CSS Grid Lanes | Masonry.js and other JS layout libraries |
| Custom `<select>` | react-select, Choices.js, Select2 |
| `<model>` element | Basic scenes in Three.js / model-viewer |
| Immersive Web | Exclusive experiences of native visionOS / iOS apps |
| Web Extensions packaging | Xcode + Mac build monopoly |

This is a steadily advancing standardization strategy: first let a need be solved in the community through JS libraries (validating demand), then build it into the platform through standardized APIs (providing native performance and security guarantees), relegating the JS approach to fallback compatibility (polyfill).

---

## 4. When It Will Be Available

WebKit's response at WWDC:

| Timing | Availability |
|------|--------|
| **Now** | All new features testable in Safari Technology Preview |
| **September 2026** | Safari 27 officially released with iOS 27 / macOS 27 |
| **Cross-browser** | The Grid Lanes spec has entered the ED stage of the W3C CSS WG; `<select>` styling has cross-browser consensus in the Open UI CG; `<model>` is advancing in the Immersive Web CG |

It's worth noting that **CSS Grid Lanes** and **custom `<select>`** are the two features most likely to be quickly followed across browsers—engineers at Chrome and Firefox have already expressed support in related standards discussions. The `<model>` element is currently exclusive to Safari, but Google has similar needs in the Android ecosystem (Scene Viewer), so the prospects for standardization look promising.

---

## 5. References

- [Web Technology Sessions at WWDC26 — WebKit Blog](https://webkit.org/blog/17974/web-technology-sessions-at-wwdc26/)
- [CSS Grid Lanes Specification — W3C Editor's Draft](https://drafts.csswg.org/css-grid-3/)
- [Customizable `<select>` — Open UI Community Group](https://open-ui.org/components/selectlist/)
- [WebXR Device API — W3C](https://www.w3.org/TR/webxr/)
- [Safari Web Extensions — Apple Developer Documentation](https://developer.apple.com/documentation/safariservices/safari_web_extensions)