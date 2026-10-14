---
title: CSS 容器查询实战：让组件根据自身尺寸响应式布局
published: 2026-08-31
description: '告别「只能看视口」的媒体查询——用 container-type 与 @container 让卡片、侧边栏等组件根据自身容器宽度自适应，附完整代码示例与常见陷阱。'
image: ''
tags: [CSS, 容器查询, 响应式设计, 前端]
category: '前端'
draft: false
lang: ''
---

## 引言：媒体查询的一个老问题

响应式设计诞生十多年来，`@media` 一直是我们唯一的武器。但它有一个结构性局限：**媒体查询只能感知视口（viewport），无法感知组件自身所处容器的大小**。

想象一个典型的场景：你写了一个「产品卡片」组件，宽度 300px 时应该竖向堆叠、600px 时应该横向排布。你用媒体查询写了：

```css
@media (min-width: 768px) {
  .card { flex-direction: row; }
}
```

这在小屏幕整页铺开时没问题。可一旦这个卡片被塞进一个 300px 宽的侧边栏里——即便视口有 1200px 宽——它依然会「误以为」自己是横向布局，把图片和文字挤成一团。

问题的本质是：**组件的布局取决于它自己的宽度，而不是整个屏幕的宽度**。CSS 容器查询（Container Queries）正是为解决这个问题而生。

## 一、核心概念：把「查询对象」从视口换成容器

容器查询的用法分两步：先声明哪个元素是「查询容器」，再写针对它的查询规则。

**第一步：用 `container-type` 声明查询容器**

```css
.sidebar {
  /* inline-size：根据行内方向尺寸（横向书写模式即宽度）建立查询容器 */
  container-type: inline-size;
}
```

**第二步：用 `@container` 针对容器写规则**

```css
@container (min-width: 400px) {
  .sidebar .card {
    display: flex;
    flex-direction: row;
  }
}
```

这条规则读作：「当 `.sidebar` 这个容器的宽度 ≥ 400px 时，把它内部的卡片改为横向布局」。注意这里判断的是**容器宽度**，视口有多宽已经无关紧要了。

`container-type` 的取值主要有三个：

| 值 | 含义 | 适用场景 |
|----|------|---------|
| `inline-size` | 只跟踪行内方向（宽度），**不会破坏元素自身的高度计算** | 绝大多数场景，首选 |
| `size` | 同时跟踪宽度和高度 | 需要 `@container (min-height: …)` 时 |
| `normal` | 不建立尺寸查询容器，但可参与样式查询 | 只需要 `style()` 查询时 |

其中 `size` 有一个容易踩的坑：**当你声明 `container-type: size` 时，浏览器会把这个容器的高度视为「未知」，除非你显式指定了高度**。否则会陷入「高度取决于内容 → 内容取决于查询 → 查询取决于高度」的循环依赖。所以日常使用请默认 `inline-size`，只有确实要查高度时才用 `size` 并记得给容器一个确定高度。

## 二、完整示例：一个自适应卡片

下面这个例子不用任何媒体查询，就能让卡片在「窄容器里竖排、宽容器里横排」。

```html
<div class="card">
  <img class="card-cover" src="cover.jpg" alt="" />
  <div class="card-body">
    <h3>CSS 容器查询</h3>
    <p>组件根据自身宽度自适应布局，与视口无关。</p>
    <button>了解详情</button>
  </div>
</div>
```

```css
/* 让卡片本身成为查询容器，这样它走到哪里都能自适应 */
.card {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.08);
}

.card-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 8px;
}

/* 容器宽度 ≥ 480px 时，切换为横向布局 */
@container (min-width: 480px) {
  .card {
    flex-direction: row;
    align-items: center;
  }
  .card-cover {
    width: 40%;
    aspect-ratio: 1 / 1;
  }
}
```

现在把这个卡片放到任何地方——全宽的页面主栏、350px 的侧边栏、甚至是另一个网格单元里——它都会自动选择正确的形态，无需为每个父容器重复写媒体查询。

## 三、命名容器：让查询更精准

当一个元素同时被多个容器包裹时，`@container` 默认匹配**最近的**查询容器。如果层级复杂，可以用 `container-name` 给容器命名，查询时指定名字：

```css
.main-content {
  container-name: main;
  container-type: inline-size;
}

.aside {
  container-name: aside;
  container-type: inline-size;
}

/* 只针对名为 aside 的容器查询 */
@container aside (max-width: 320px) {
  .toc { display: none; }
}
```

`container-name` 和 `container-type` 可以用 `container` 简写属性合并：

```css
.sidebar {
  container: aside / inline-size;
}
```

## 四、容器查询长度单位：cqw / cqi

除了条件查询，容器查询还带来了一组全新的长度单位，它们是**相对于容器尺寸**的：

| 单位 | 含义 |
|------|------|
| `cqw` | 容器宽度的 1% |
| `cqh` | 容器高度的 1% |
| `cqi` | 容器行内方向尺寸的 1% |
| `cqb` | 容器块级方向尺寸的 1% |
| `cqmin` / `cqmax` | 容器较小 / 较大一边的 1% |

（横向书写模式下，`cqi` 等于 `cqw`、`cqb` 等于 `cqh`；竖向书写模式下则互换。所以写国际化布局时优先用 `cqi`/`cqb` 更稳妥。）

一个经典用法是**让字号随容器缩放**，实现「真正的流式排版」——比媒体查询的字号阶梯更平滑：

```css
.article {
  container-type: inline-size;
}

.article h2 {
  /* 标题字号约为容器宽度的 6%，随容器连续缩放 */
  font-size: clamp(1.25rem, 6cqi, 2.5rem);
}
```

`clamp()` 保证字号被限制在 `1.25rem` 到 `2.5rem` 之间，中间的区间则由 `6cqi` 连续驱动。这和过去用 `clamp(…, 5vw, …)` 的差别在于：`vw` 跟的是视口，`cqi` 跟的是**文字所在的那一栏**——当你的文章栏只有视口的一半宽时，用 `vw` 字就会过大。

## 五、常见陷阱

1. **容器不能查询自己**：`@container` 规则不能作用在声明为容器的那一个元素本身上，只能作用在它的**后代**上。想查自身，需要把它再包一层。

2. **`container-type: size` 的高度塌陷**：前面提过，`size` 会让高度变成「由内容决定」的未知量，必须显式设置高度（如 `height: 100%` 或固定值）才能正常工作。

3. **不要给容器设 `inline-size` 属性**：给一个 `container-type: inline-size` 的元素同时设置 `width` 是可以的，但若设置的是 `inline-size`（逻辑属性）要格外小心——容器查询本身依赖 inline-size 的测量，自引用会导致行为不符合预期。日常避免在容器上混用即可。

4. **性能**：每个查询容器都会产生额外的布局测量开销。虽然现代浏览器已做了优化，但没必要把每个 `div` 都设成容器——只在真正需要自适应的组件根节点上声明即可。

5. **`style()` 查询**：除了尺寸，还可以用 `style()` 查询自定义属性值（例如 `@container style(--theme: dark) {}`）。它属于容器查询的进阶分支，浏览器支持相对较晚（Safari 较迟支持），用于主题切换时需做好降级。

## 六、兼容性与渐进增强

容器查询目前已是 **Baseline（2024 年 3 月起 widely available）**，主流浏览器全部支持：Chrome 105+、Edge 105+、Safari 16+、Firefox 110+。对于仍需照顾的老旧浏览器，可以用 `@supports` 做特性检测，提供回退：

```css
/* 回退：所有浏览器都读得到 */
.card { display: block; }

/* 只有支持容器查询的浏览器才启用自适应 */
@supports (container-type: inline-size) {
  .card {
    container-type: inline-size;
  }
  @container (min-width: 480px) {
    .card { display: flex; }
  }
}
```

## 结语

容器查询补上了响应式设计缺失已久的一块拼图：**把「响应什么」的控制权，从视口交还给组件自身**。它的到来并不意味着媒体查询退役——页面级的整体布局（栅格、导航折叠）依然适合用 `@media` 看视口，而**组件内部**的形态变化则交给 `@container` 看容器。二者分工，各司其职。

下次再遇到「组件复用在不同容器里布局错乱」的问题，试试给组件加一行 `container-type: inline-size`，你会感受到那种「组件真正可移植」的自由。

---

## 参考来源

- [MDN - CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
- [web.dev - Container queries land in stable browsers（Una Kravets）](https://web.dev/articles/cq-stable)
- [Can I use - CSS Container Queries](https://caniuse.com/css-container-queries)
- [MDN - Container query length units](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries#container_query_length_units)
