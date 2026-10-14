---
title: 'CSS Container Queries in Practice: Making Components Responsive to Their Own Size'
published: 2026-08-31
description: Move beyond viewport-only media queries—use container-type and @container to let cards, sidebars, and other components adapt to their own container width, with complete code examples and common pitfalls.
image: ''
tags: [CSS, Container Queries, Responsive Design, Frontend]
category: Frontend
draft: false
---
## Introduction: A Long-Standing Problem with Media Queries

For over a decade since the birth of responsive design, `@media` has been our only weapon. But it has a structural limitation: **media queries can only perceive the viewport, not the size of the container in which a component itself resides**.

Imagine a typical scenario: you've written a "product card" component that should stack vertically at 300px width and lay out horizontally at 600px. You wrote it with media queries:

```css
@media (min-width: 768px) {
  .card { flex-direction: row; }
}
```

This works fine when the full page spreads out on a small screen. But once this card is placed inside a 300px-wide sidebar—even if the viewport is 1200px wide—it will still "mistakenly believe" it should be in a horizontal layout, squeezing the image and text into a mess.

The essence of the problem is: **a component's layout depends on its own width, not the width of the entire screen**. CSS Container Queries were created precisely to solve this problem.

## 1. Core Concept: Changing the "Query Target" from the Viewport to a Container

Using container queries involves two steps: first declare which element is the "query container," then write query rules targeting it.

**Step 1: Declare a query container with `container-type`**

```css
.sidebar {
  /* inline-size: establish a query container based on the inline-size dimension (i.e. width in horizontal writing mode) */
  container-type: inline-size;
}
```

**Step 2: Write rules targeting the container with `@container`**

```css
@container (min-width: 400px) {
  .sidebar .card {
    display: flex;
    flex-direction: row;
  }
}
```

This rule reads: "When the container `.sidebar` is ≥ 400px wide, change the card inside it to a horizontal layout." Note that what's being evaluated here is the **container width**—how wide the viewport is no longer matters.

`container-type` has three main values:

| Value | Meaning | Use Case |
|----|------|---------|
| `inline-size` | Only tracks the inline direction (width), **does not break the element's own height calculation** | Most scenarios, preferred choice |
| `size` | Tracks both width and height | When `@container (min-height: …)` is needed |
| `normal` | Does not establish a size query container, but can participate in style queries | When only `style()` queries are needed |

Among these, `size` has an easy pitfall: **when you declare `container-type: size`, the browser treats the container's height as "unknown" unless you explicitly specify a height**. Otherwise, you fall into a circular dependency: "height depends on content → content depends on query → query depends on height." So for everyday use, default to `inline-size`; only use `size` when you genuinely need to query height, and remember to give the container a definite height.

## 2. Complete Example: An Adaptive Card

The following example uses no media queries at all, yet lets the card "stack vertically in narrow containers and lay out horizontally in wide containers."

```html
<div class="card">
  <img class="card-cover" src="cover.jpg" alt="" />
  <div class="card-body">
    <h3>CSS container queries</h3>
    <p>Components adapt their layout to their own width, independent of the viewport.</p>
    <button>Learn more</button>
  </div>
</div>
```

```css
/* Make the card itself a query container, so it adapts wherever it goes */
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

/* When the container width is ≥ 480px, switch to a horizontal layout */
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

Now place this card anywhere—a full-width main column, a 350px sidebar, or even another grid cell—and it will automatically choose the correct form, with no need to write media queries repeatedly for each parent container.

## 3. Named Containers: Making Queries More Precise

When an element is wrapped by multiple containers simultaneously, `@container` by default matches the **nearest** query container. If the hierarchy is complex, you can name containers with `container-name` and specify the name when querying:

```css
.main-content {
  container-name: main;
  container-type: inline-size;
}

.aside {
  container-name: aside;
  container-type: inline-size;
}

/* Query only the container named aside */
@container aside (max-width: 320px) {
  .toc { display: none; }
}
```

`container-name` and `container-type` can be combined using the `container` shorthand property:

```css
.sidebar {
  container: aside / inline-size;
}
```

## 4. Container Query Length Units: cqw / cqi

Beyond conditional queries, container queries also introduce a whole new set of length units that are **relative to the container's size**:

| Unit | Meaning |
|------|------|
| `cqw` | 1% of the container's width |
| `cqh` | 1% of the container's height |
| `cqi` | 1% of the container's inline-direction size |
| `cqb` | 1% of the container's block-direction size |
| `cqmin` / `cqmax` | 1% of the container's smaller / larger side |

(In horizontal writing mode, `cqi` equals `cqw` and `cqb` equals `cqh`; in vertical writing mode, they swap. So when writing internationalized layouts, it's safer to prefer `cqi`/`cqb`.)

A classic use is **letting font size scale with the container**, achieving "truly fluid typography"—smoother than media query font-size steps:

```css
.article {
  container-type: inline-size;
}

.article h2 {
  /* The heading font size is about 6% of the container width, scaling continuously with the container */
  font-size: clamp(1.25rem, 6cqi, 2.5rem);
}
```

`clamp()` ensures the font size is clamped between `1.25rem` and `2.5rem`, while the middle range is continuously driven by `6cqi`. The difference from using `clamp(…, 5vw, …)` in the past is: `vw` follows the viewport, while `cqi` follows **the column where the text actually lives**—when your article column is only half the viewport width, using `vw` would make the text too large.

## 5. Common Pitfalls

1. **A container cannot query itself**: `@container` rules cannot apply to the very element declared as the container—only to its **descendants**. To query itself, you need to wrap it in another layer.

2. **Height collapse with `container-type: size`**: As mentioned earlier, `size` makes height an unknown quantity "determined by content," and you must explicitly set a height (such as `height: 100%` or a fixed value) for it to work properly.

3. **Don't set the `inline-size` property on a container**: Setting `width` on an element that is `container-type: inline-size` is fine, but if you're setting `inline-size` (a logical property), be extra careful—container queries themselves rely on inline-size measurement, and self-reference leads to unexpected behavior. Just avoid mixing them on containers in everyday use.

4. **Performance**: Each query container incurs additional layout measurement overhead. Although modern browsers have optimized this, there's no need to make every `div` a container—only declare it on the root node of components that genuinely need to adapt.

5. **`style()` queries**: Beyond size, you can also use `style()` to query custom property values (e.g., `@container style(--theme: dark) {}`). This is an advanced branch of container queries, with relatively late browser support (Safari was slow to support it), so be sure to provide fallbacks when using it for theme switching.

## 6. Compatibility and Progressive Enhancement

Container queries are now **Baseline (widely available since March 2024)**, supported by all major browsers: Chrome 105+, Edge 105+, Safari 16+, Firefox 110+. For older browsers that still need accommodating, you can use `@supports` for feature detection and provide a fallback:

```css
/* Fallback: readable by all browsers */
.card { display: block; }

/* Enable adaptive layout only in browsers that support container queries */
@supports (container-type: inline-size) {
  .card {
    container-type: inline-size;
  }
  @container (min-width: 480px) {
    .card { display: flex; }
  }
}
```

## Conclusion

Container queries fill in a long-missing piece of the responsive design puzzle: **returning control over "what to respond to" from the viewport back to the component itself**. Their arrival doesn't mean media queries are retiring—page-level overall layout (grids, navigation collapsing) is still best handled with `@media` looking at the viewport, while **intra-component** form changes are left to `@container` looking at the container. The two divide the work, each playing its role.

Next time you run into the problem of "a component's layout breaking when reused in different containers," try adding a line of `container-type: inline-size` to the component—you'll feel that freedom of "components being truly portable."

---
## References

- [MDN - CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
- [web.dev - Container queries land in stable browsers (Una Kravets)](https://web.dev/articles/cq-stable)
- [Can I use - CSS Container Queries](https://caniuse.com/css-container-queries)
- [MDN - Container query length units](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries#container_query_length_units)