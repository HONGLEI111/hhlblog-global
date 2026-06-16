---
title: WWDC26 上的 Web 技术革命：Safari 27 带来了什么
published: 2026-06-16
description: 'WWDC26 WebKit 专场发布了 Safari 27 的五大重磅特性：CSS Grid Lanes 原生瀑布流、完全自定义的 <select> 元素、<model> 3D 模型嵌入、visionOS 沉浸式网站环境，以及跨浏览器 Web Extensions 打包。本文逐一解析每个特性的用法与设计意图。'
image: ''
tags: [Apple, Safari, CSS, Web, WWDC, 前端]
category: '前端'
draft: false
lang: ''
---

## 1. 引言

2026 年 6 月，Apple 在 WWDC26 上由 WebKit 团队带来了 Safari 27 的一系列 Web 平台新特性。相比往年 Safari 更新的"挤牙膏"节奏，今年的 Web 技术专场堪称一场**小爆发**——从 CSS 布局到表单控件、从 3D 内容嵌入到空间计算 Web 体验，每一项都直击前端开发者多年来的痛点。

本文逐项解析五大核心特性，并附上代码示例，帮助你快速理解这些新能力将如何改变我们的开发方式。

---

## 2. 五大核心特性

### 2.1 CSS Grid Lanes — 原生瀑布流布局

这是本次 WWDC 最受前端开发者关注的 CSS 新特性。**Grid Lanes** 让 Web 平台原生支持了 Pinterest 式的瀑布流/砖石（Masonry）布局——不需要任何 JavaScript，几行 CSS 即可实现。

**传统方案的痛点**

在此之前，实现瀑布流布局只有两条路：

| 方案 | 问题 |
|------|------|
| JavaScript 计算 | 性能差、窗口 resize 卡顿、需要 ResizeObserver + 绝对定位 |
| CSS Grid + `grid-auto-rows: masonry` | 自 2020 年起一直是实验性提案，从未进入任何浏览器 |

**Grid Lanes 的解决方案**

Grid Lanes 引入了 `grid-template-columns` 的新语法 `lanes()`，让元素在列间自然流动：

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

与之前被废弃的 `masonry` 关键词不同，Grid Lanes 的设计更通用——它不仅支持瀑布流，还支持**任何自定义的格子排列算法**，是一个远比"砖石布局"更大的概念。

**核心特点**：
- **纯 CSS 实现**，零 JavaScript，浏览器原生渲染优化
- **自适应**，配合 `auto-fill`、`minmax()` 即可响应式
- **排序可控**，支持 `grid-lane-order: column | row | shortest-column` 等排列策略

在 WebKit 的演示中，一个 200 张图片的瀑布流页面，从 JS 方案切换到 Grid Lanes 后，布局计算耗时从 **~120ms 降至 ~4ms**。

---

### 2.2 完全自定义的 `<select>` 元素

前端开发者与 `<select>` 元素的战争已经持续了二十多年。Safari 27 终于给出了原生解决方案：`appearance: base-select` + 一套全新的伪元素体系。

**新伪元素体系**

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

**关键能力**

| 伪元素 / 选择器 | 作用 |
|---|---|
| `::picker()` | 样式化下拉面板（背景、圆角、阴影、模糊） |
| `::picker-icon` | 自定义下拉箭头图标 |
| `::checkmark` | 自定义选中标记 |
| `option:checked` | 当前选中项的样式 |
| `option:hover` | hover 状态 |
| `::picker(select)` 内的 flex/grid | 选项布局完全自由 |

这意味着终于可以抛弃那些动辄几十 KB 的自定义 select 库（如 Choices.js、Select2、react-select 等），用纯原生 CSS 实现设计稿级别的下拉选择器。

---

### 2.3 `<model>` 元素 — 网页内嵌 3D 模型

Safari 27 新增了 `<model>` HTML 元素，允许在网页中直接嵌入交互式 3D 模型，无需任何 JavaScript 库或 WebGL 代码。

**基本用法**

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

**支持的功能**

| 属性 / 能力 | 说明 |
|---|---|
| `src` | 模型文件 URL（支持 USDZ、glTF 2.0、OBJ） |
| `camera-controls` | 用户可旋转/缩放/平移视角 |
| `auto-rotate` | 自动缓慢旋转展示 |
| `ar` | 点击可启动 AR 查看（iOS/iPadOS 上的 Quick Look） |
| `environment` | 环境光照预设（`auto` / `studio` / `outdoor`） |
| `poster` | 模型加载前的占位图 URL |
| `loading` | 懒加载（`lazy` / `eager`） |

**JavaScript API**

`<model>` 元素暴露了完整的 JavaScript 控制接口：

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

`<model>` 元素最早在 iOS 上的 Quick Look 中预览 USDZ 文件时就已埋下伏笔，现在正式进入 Web 标准。对于电商、教育、产品展示类网站，这是一个重要工具。

---

### 2.4 visionOS 沉浸式网站环境

这是本次 WWDC 最具未来感的一项能力。Safari 27 在 visionOS 27 上支持**空间 Web 体验**：网站可以声明自己是"沉浸式"的，从而在 Apple Vision Pro 上以空间化的方式呈现。

**声明沉浸式体验**

```html
<meta name="apple-immersive" content="full">
<meta name="apple-immersive-environment" content="starry-night">
```

浏览器会将页面渲染为漂浮在用户空间中的面板，同时支持 **WebXR** 标准的空间交互：

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

WebKit 团队强调，这不是创造一套新的"visionOS-only"标准，而是在现有 **WebXR Device API** 标准上的扩展实现。这意味着同一个 WebXR 页面也可以在 Meta Quest、Pico 等设备上运行。

**实际应用场景**：
- **产品展示**：家居品牌让用户在空间中查看家具
- **数据可视化**：3D 图表和数据仪表盘
- **在线教育**：解剖模型、分子结构等立体教学
- **艺术展览**：空间化的 Web 艺术体验

---

### 2.5 跨浏览器 Web Extensions 打包

Safari 27 大幅简化了 Safari 扩展的开发和分发流程。

**主要变化**

| 之前 | 之后（Safari 27） |
|------|-------------------|
| 必须通过 Xcode 项目打包 | 直接提交扩展文件包，无需 Xcode |
| 只能在 Mac 上构建和提交 | 任意平台均可构建和提交（通过 App Store Connect API） |
| Safari 专用 API 差异大 | 更接近 Chrome/Firefox 扩展 API，遵循 W3C WebExtensions 社区组规范 |
| 无法跨浏览器复用 | 一套代码 → Chrome + Firefox + Safari，零修改或极小修改 |

**新的打包方式**

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

这对独立开发者和开源项目尤其友好——以前为 Safari 维护扩展需要一台 Mac 和一个 Apple Developer 账号，现在通过 CI/CD 就能完成提交。

---

## 3. 这些特性的意义

如果你把五大特性放在一起看，会发现它们指向同一个方向：**Web 平台正在接管越来越多原本属于"原生"的领域**。

| 特性 | 取代了什么 |
|------|-----------|
| CSS Grid Lanes | Masonry.js 及其他 JS 布局库 |
| 自定义 `<select>` | react-select、Choices.js、Select2 |
| `<model>` 元素 | Three.js / model-viewer 的基础场景 |
| 沉浸式 Web | 原生 visionOS / iOS App 的独占体验 |
| Web Extensions 打包 | Xcode + Mac 的构建垄断 |

这是一种稳步推进的标准化策略：先让某个需求在社区中通过 JS 库解决（验证需求），再通过标准化 API 将其内建到平台中（提供原生性能和安全保障），让 JS 方案降级为降级兼容（polyfill）。

---

## 4. 什么时候能用

WebKit 在 WWDC 现场的回应：

| 时机 | 可用性 |
|------|--------|
| **现在** | Safari Technology Preview 中可测试所有新特性 |
| **2026 年 9 月** | Safari 27 随 iOS 27 / macOS 27 正式发布 |
| **跨浏览器** | Grid Lanes 规范已进入 W3C CSS WG 的 ED 阶段；`<select>` 样式化在 Open UI CG 中有跨浏览器共识；`<model>` 在 Immersive Web CG 中推进 |

需要注意的是，**CSS Grid Lanes** 和**自定义 `<select>`** 是最有可能快速跨浏览器跟进的两个特性——Chrome 和 Firefox 的工程师已经在相关标准讨论中表达了支持意向。`<model>` 元素目前在 Safari 独占，但 Google 在 Android 生态中有类似需求（Scene Viewer），标准化前景可期。

---

## 5. 参考资料

- [Web Technology Sessions at WWDC26 — WebKit Blog](https://webkit.org/blog/17974/web-technology-sessions-at-wwdc26/)
- [CSS Grid Lanes Specification — W3C Editor's Draft](https://drafts.csswg.org/css-grid-3/)
- [Customizable `<select>` — Open UI Community Group](https://open-ui.org/components/selectlist/)
- [WebXR Device API — W3C](https://www.w3.org/TR/webxr/)
- [Safari Web Extensions — Apple Developer Documentation](https://developer.apple.com/documentation/safariservices/safari_web_extensions)
