---
title: 'Responsive Images and Modern Image Formats: AVIF, WebP, and <picture>'
published: 2026-09-22
description: 'Break image optimization into three independent problems: format, size, and timing. Learn how to tier AVIF/WebP/JPEG fallbacks, how the srcset and sizes selection algorithm works, when to use loading, fetchpriority, and preload, and get complete code for batch-generating multi-size, multi-format images with sharp at build time.'
image: ''
tags: [Image Optimization, Web Performance, Web Development, AVIF, WebP, srcset, LCP]
category: Web
draft: false
---
## 1. Why Images Are Most Likely to Become a Performance Black Hole

On a typical page, **images are often the largest category of resources by size**: HTML is a dozen or so KB, CSS is a few dozen KB, JS is a few hundred KB after bundling, while an unprocessed phone photo is easily 3–5 MB.

What's worse, the size problem of images directly propagates to **LCP (Largest Contentful Paint)**—the LCP element on the vast majority of pages is an image. All the code splitting and CSS minification you painstakingly did can easily be wiped out by a single uncompressed PNG.

Image optimization looks simple—"just compress it"—but in reality it consists of three **mutually independent** problems:

| Problem | One-sentence description | Corresponding approach |
| --- | --- | --- |
| **Format** | Which encoding to use? How much smaller at equivalent quality? | AVIF / WebP / JPEG tiered fallback |
| **Size** | How many pixels should be sent to this device? | `srcset` + `sizes` |
| **Timing** | When does the download start? What priority? | `loading` / `fetchpriority` / `preload` |

All three must be solved separately. Doing only format conversion is like swapping a more fuel-efficient engine into a 4000px-wide giant image—you save fuel, but the car is still that big.

:::note
There's a fourth problem: **stability**. Images without reserved dimensions cause layout shifts—that's a CLS problem, not an LCP problem, and it's covered separately in section 6.
:::

## 2. Format: How to Choose Between JPEG, WebP, and AVIF

Let's start with a comparison table. "Support" here refers to the version in which each browser began supporting it; specific version numbers can be verified at any time on caniuse or Web Platform Features Explorer:

| Format | Encoding | Transparency | Animation | Typical use case | Browser support |
| --- | --- | --- | --- | --- | --- |
| JPEG | Lossy DCT | ✗ | ✗ | Fallback for photos | All |
| PNG | Lossless DEFLATE | ✓ | ✗ | Screenshots and line art requiring pixel precision | All |
| **WebP** | VP8 / VP8L | ✓ | ✓ | Today's general-purpose modern default | Chrome 32+ / Firefox 65+ / Safari 14+ |
| **AVIF** | AV1 | ✓ | ✓ | Preferred format for photo-like content | Chrome 85+ / Firefox 93+ / Safari 16.4+ |
| SVG | Vector | ✓ | ✓ | Icons, logos, charts | All |

Regarding encoding efficiency, the common industry conclusion is roughly: **at equivalent subjective quality, WebP is typically 25%–35% smaller than JPEG, and AVIF is another 20%–30% smaller than WebP**. The exact numbers depend on image content—images with many lines and gradient color blocks show more pronounced differences, while noisy photos show smaller differences. Don't copy any percentage blindly; running a comparison with your own images is the only meaningful approach.

### When Not to Use AVIF

AVIF has an easily overlooked cost: **slow encoding**. AV1's encoding complexity is far higher than JPEG or even WebP—converting the same image to AVIF with sharp can be an order of magnitude slower than converting to WebP.

The direct conclusions this leads to:

- **Must encode once at build time (or upload time) and cache**, never transcode in real time on the request path—that turns CPU cost into user-perceivable latency;
- Projects sensitive to build time should **lower the encoder's effort** (sacrificing a bit of compression ratio for speed), or only generate AVIF for above-the-fold images.

So the correct approach is **not "switch to AVIF" but "provide AVIF and keep a fallback"**. There are still some older devices (especially those stuck on older iOS versions) that don't recognize AVIF, and `<picture>` is designed exactly for this (see section 4).

### Rules of Thumb for Format Selection

- **Photos**: AVIF first → WebP → JPEG;
- **Screenshots / UI images / line art**: prefer PNG or lossless WebP; AVIF in lossy mode tends to blur fine lines;
- **Icons / Logos / Charts**: use SVG directly, don't convert to bitmaps;
- **Small images needing transparency**: lossy WebP + alpha is usually the size-optimal solution.

:::tip
JPEG XL has equally excellent encoding efficiency, but browser vendors' attitudes have long been inconsistent, and as of 2026 it's still not recommended as the sole reliance for a delivery format. If you want to use it, treat it as an additional candidate alongside AVIF, not a replacement.
:::

## 3. Size: The Selection Algorithm for `srcset` and `sizes`

Format determines "how to encode"; next we need to solve "how big to send."

The core contradiction is: **the server, when sending the HTML, doesn't know what size image the client needs**. Screen width, DPR, and the actual width of this image in the layout are all known only to the browser itself. So the standard's solution is not "the server guesses" but **the server provides a set of candidates, and the browser picks**. This is `srcset` + `sizes`.

```html
<img
  src="/img/cover-960.jpg"
  srcset="/img/cover-480.jpg   480w,
          /img/cover-960.jpg   960w,
          /img/cover-1440.jpg 1440w"
  sizes="(min-width: 1024px) 720px, 100vw"
  width="1440" height="960"
  alt="示例封面"
  loading="lazy"
  decoding="async"
>
```

In these few lines, the division of labor between the two attributes is completely different:

- **`srcset` uses the `w` descriptor to declare the true pixel width of each candidate file**—note it's "how wide the file is," not "how wide it will be displayed";
- **`sizes` declares how wide this image will occupy in the layout**—it's a set of media conditions + CSS lengths, describing the **slot**, independent of specific files.

The browser's selection process is roughly three steps:

1. Parse `sizes` to get the **slot width** (CSS pixels) of this image under the current viewport;
2. Slot width × current `devicePixelRatio` to get the **required physical pixel width**;
3. In `srcset`, pick the **first candidate not smaller than that width**; if all are smaller, pick the largest one.

A concrete example: viewport 1440px, matches `(min-width: 1024px) 720px`, slot is 720px; device DPR = 2, so 1440 physical pixels are needed, and the browser selects `cover-1440.jpg`. If the same device has DPR = 1, only 720px is needed, and it selects `cover-960.jpg`.

### The Four Most Common Authoring Mistakes

| Writing | Problem | Consequence |
| --- | --- | --- |
| Only writing `srcset` without `sizes` | `sizes`'s default value is `100vw` | Computed at full screen width on mobile, selecting an obviously oversized image |
| `sizes` doesn't match the real CSS layout | Declares 720px, actually renders only 320px | Downloads more than double the bytes for nothing |
| Using the `x` descriptor while also writing `sizes` | Under the `x` descriptor, `sizes` doesn't participate in computation | Writing it has no effect, easy to misjudge |
| Mixing `w` and `x` in the same `srcset` | Invalid syntax | **The entire `srcset` is discarded**, only `src` takes effect |

The second one is the most insidious: many people change the CSS grid width after writing `sizes` but forget to sync `sizes`. **`sizes` is a copy of the CSS layout; once the two decouple, it's a silent performance loss**—the page looks completely normal, it just downloads a few hundred KB more.

### `sizes="auto"`: Let the Browser Measure Itself

Manually maintaining `sizes` is obviously fragile. Newer browsers provide `sizes="auto"`: after the image completes layout, the browser backfills the slot with the **measured rendered width**, eliminating manual synchronization.

```html
<img src="thumb.jpg" srcset="thumb-240.jpg 240w, thumb-480.jpg 480w"
     sizes="auto, 100vw" loading="lazy" alt="缩略图">
```

Two limitations you must remember:

- **Must be paired with `loading="lazy"`**, because the browser needs to complete layout before it can measure, and eagerly loaded images don't have this timing;
- **Compatibility is still incomplete**. Currently Chromium-based browsers (Chrome/Edge 126+) support it, Firefox is following up in 2026, and Safari is still in the technology preview stage.

Therefore the recommended approach is `sizes="auto, 100vw"`—put `auto` first, and browsers that don't recognize it will ignore this item and fall back to `100vw`, **no worse than now**. This is pure progressive enhancement.
## 4. `<picture>`: When "same image, different sizes" isn't enough

`srcset` can only do one thing: **the same composition at different resolutions**. But there are two types of needs it can't express:

1. **Art direction**: on narrow screens you need to swap in an image with a **different composition**—for example, a 16:9 banner on wide screens, switched to a centered square crop on mobile. This isn't scaling, it's a different file;
2. **Format fallback**: provide AVIF / WebP / JPEG versions of the same image, and let the browser pick based on what it supports.

`<picture>` unifies these two things into "a set of candidate sources + one fallback `<img>`":

```html
<picture>
  <!-- 1. 窄屏艺术指导：方形裁切的 AVIF -->
  <source
    media="(max-width: 640px)"
    type="image/avif"
    srcset="/img/hero-square-480.avif 480w,
            /img/hero-square-960.avif 960w"
    sizes="100vw">

  <!-- 2. 宽屏 AVIF -->
  <source
    type="image/avif"
    srcset="/img/hero-wide-960.avif 960w,
            /img/hero-wide-1920.avif 1920w"
    sizes="100vw">

  <!-- 3. 宽屏 WebP 回退 -->
  <source
    type="image/webp"
    srcset="/img/hero-wide-960.webp 960w,
            /img/hero-wide-1920.webp 1920w"
    sizes="100vw">

  <!-- 4. 兜底：必填 -->
  <img
    src="/img/hero-wide-1920.jpg"
    width="1920" height="1080"
    alt="首页主视觉"
    fetchpriority="high"
    decoding="async">
</picture>
```

The selection rule is simple: **the browser scans from top to bottom, picks the first `media` that matches and whose `type` is supported `<source>`**, then runs the `srcset`/`sizes` algorithm from section 3 again inside that `<source>`. If none match, it uses the final `<img>`.

A few easy pitfalls:

- **`<img>` is required**, not optional decoration. It carries two responsibilities at once: "final fallback" and "semantics and accessibility"—`alt` can only be written on it;
- **`width`/`height` must also be written on `<img>`**. Writing them on `<source>` has no effect, and the placeholder is wasted (see section 6);
- **`sizes` is independent within each `<source>`**. In the example above, the square crop and the wide banner have different layout widths, so their `sizes` values differ too;
- **Don't write `media` backwards**. Narrow-screen conditions must come first, otherwise the wide-screen condition will swallow all viewports first.

:::warning
**Do not** add `srcset` to `<img>` inside `<picture>`. This makes "which attribute is actually in effect" hard to reason about; format fallback and size selection should both be expressed in `<source>`, leaving only one `src` in `<img>` as a fallback.
:::

## 5. Timing: `loading`, `fetchpriority`, and `preload`

Format and size solve "how much to download"; next we solve "when to download it."

### `loading="lazy"`: On by default, but the above-the-fold image must turn it off

The value of lazy loading is keeping off-screen images from hogging bandwidth. In most cases it's the right default, but there's one **exception you must remember**:

> **Don't add `loading="lazy"` to the above-the-fold LCP image.**

Lazy's determination depends on "the distance between the element and the viewport," and that distance can only be computed after layout. For the LCP image, this amounts to artificially delaying its start time—the LCP metric will directly get worse. The above-the-fold image should keep the default `loading="eager"`.

In practice the dividing line is usually clear: **use eager for the above-the-fold hero image / article cover, and lazy for everything in the body and below on list pages**.

### `fetchpriority`: Give bandwidth priority to critical images

At any given moment the browser has many resources to download, and `fetchpriority` lets you state your intent explicitly:

```html
<img src="/img/hero-1920.jpg" fetchpriority="high" alt="首页主视觉">
```

- `fetchpriority="high"` is used on the **LCP image**, and the effect is usually more direct than any JS-level scheduling;
- `fetchpriority="low"` can be used on images that are clearly not urgent (such as footer decorative images);
- Support: Chrome 102+, Safari 17.2+, Firefox 132+. **Older browsers simply ignore this attribute**, making it a zero-cost progressive enhancement that needs no polyfill.

There's one key limitation: **`fetchpriority` is only read once during HTML parsing**. Adding it at runtime with JS, or inserting into the DOM first and then setting the attribute, will not take effect.

### `preload`: Move critical images earlier, before discovery

If the LCP image is **inserted dynamically via a CSS background or JS**, the browser's preload scanner won't discover it until much later. In that case you can use `preload` to buy time:

```html
<link rel="preload" as="image"
      type="image/avif"
      imagesrcset="/img/hero-960.avif 960w, /img/hero-1920.avif 1920w"
      imagesizes="100vw"
      fetchpriority="high">
```

`imagesrcset` / `imagesizes` make preloading go through the responsive selection logic too, instead of blindly downloading the largest one. Support: Chrome 73+, Firefox 78+, Safari 17.2+, safe to use now.

:::warning
The two preload attributes must be **exactly identical** to those on `<img>`. If even one doesn't match, the browser will treat them as two different candidates, resulting in **the same image being downloaded twice**—worse than not adding preload at all. After shipping, be sure to confirm in the Network panel that there are no duplicate requests.
:::

## 6. Stability: Don't let images push the page around

An image has a height of 0 before it finishes loading, then suddenly expands once loaded—if there's content above it, that content gets pushed down. This is the most common source of CLS (Cumulative Layout Shift).

The solution itself is extremely simple: **let the browser know how much space the image will occupy before it finishes downloading**.

```html
<img src="/img/cover.jpg" width="1440" height="960" alt="封面">
```

As long as you write both `width` and `height`, the browser can compute the aspect ratio and reserve the space before the image arrives. These two values **don't need to match the actual display size**; they're only used to derive the ratio.

There's one easily missed companion CSS rule:

```css
img {
  max-width: 100%;
  height: auto;  /* 关键：否则 height 属性会胜出，图片被压扁 */
}
```

`height: auto` is required. Omit it, and the `height="960"` on the HTML will take effect rigidly, stretching and distorting the image inside a narrow container.

For images with **unknown intrinsic dimensions** (user uploads, remote URLs), declare the ratio explicitly with CSS:

```css
.thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;      /* 按比例裁切，不拉伸 */
  background: #f3f4f6;    /* 占位底色，避免白块闪烁 */
}
```

`aspect-ratio` combined with `object-fit: cover` lets you produce stable, proportional thumbnails without knowing the original image's dimensions—this is standard for list pages and card feeds.
## 7. Implementation: Generating Multiple Sizes and Formats at Build Time

Now that the rules above are covered, in a real project, **nobody hand-writes these `srcset`**. The right approach is to let the build pipeline automatically generate variants from the source image, with the template only responsible for output.

Write a minimal viable generator with sharp:

```js
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const WIDTHS = [480, 960, 1440, 1920]

// effort 越低编码越快、体积略大——构建时间敏感时优先调它
const FORMATS = {
  avif: { quality: 50, effort: 4 },
  webp: { quality: 72 },
  jpeg: { quality: 80, mozjpeg: true },
}

export async function buildVariants(input, outDir, basename) {
  const { width: sourceWidth } = await sharp(input).metadata()
  await mkdir(outDir, { recursive: true })

  const variants = {}

  for (const width of WIDTHS) {
    // 不放大：原图比目标窄就跳过，否则只是徒增体积
    if (sourceWidth < width) continue

    for (const [ext, options] of Object.entries(FORMATS)) {
      const file = `${outDir}/${basename}-${width}.${ext}`
      await sharp(input)
        .resize({ width, withoutEnlargement: true })
        [ext](options)          // avif() / webp() / jpeg()
        .toFile(file)
      ;(variants[ext] ??= []).push({ width, file })
    }
  }

  return variants
}
```

A few implementation details worth noting:

- **`withoutEnlargement: true` cannot be omitted**. When the source image is only 600px wide, "upscaling" it to 1440px only produces a blurrier, larger file;
- **The explicit skip of `sourceWidth < width`** is a double safeguard alongside the previous point. The former's benefit is generating fewer wasted files, while the latter ensures that even if resize is called, it won't upscale;
- **AVIF's `effort` is the biggest variable in build time**. The default value pursues maximum compression, which on large batches of images can make builds unbearably slow; lower it first to get things working, then raise it as needed;
- **Output filenames include a content hash**, and combined with `Cache-Control: public, max-age=31536000, immutable`, images can be cached long-term on CDNs and in browsers, never running into problems from "the image changed but the URL didn't" — for details on this, see [The Complete Guide to HTTP Caching Strategies: From Browser to CDN](/posts/http-caching-guide/).

After generation, feed the results to the template. With `astro:assets`, this step is built in — the `<Image>` and `<Picture>` components handle multi-size generation at build time (multi-format is only supported by `<Picture>`, see the pitfalls below), outputting the correct `srcset`. This site's images are handled exactly this way (see [Browser Support and Cross-Device Compatibility Report](/posts/browser-device-support-report/) for measured data: banner images provide eleven tiers from 360 to 2560, and card covers are generated based on actual display dimensions). The point of writing your own build script is: you know exactly where every byte comes from, and when something goes wrong, you know where to look.

### One Pitfall: `<Image>` Doesn't Have a `formats` Prop

`formats` only belongs to `<Picture>`; `<Image>` only recognizes the singular `format`. Passing a value to `<Image formats={['avif','webp']}>` won't throw an error — `getImage` will simply filter out unrecognized parameters, so **not a single `.avif` will appear in the build output**, and no trace will be left in the HTML either — unless you go through `dist/_astro` and count the files. This site has been burned by this: the entire site was only serving WebP, until one build log revealed that the AVIF file count was 0.

### Another Pitfall: AVIF and WebP Quality Numbers Are Not the Same Scale

Same image, same crop region, measured (700×700):

| Codec | Parameter | Size | Subjective Quality |
| --- | --- | --- | --- |
| AVIF | `quality: 50` | 34.7 KB | Visually indistinguishable from WebP 72 |
| WebP | `quality: 72` | 44.4 KB | Baseline |
| JPEG | `quality: 60` | 41.2 KB | Color banding appears in white gradients |

AVIF's quality number is roughly "20 higher than WebP's." **Feeding the same `quality` to both formats either wastes bytes or degrades quality**. Measured on the 1920px banner tier, when both use `quality: 65`, AVIF is 216 KB while WebP is only 141 KB — AVIF is actually fatter. And `<Picture>`'s `formats` means "run `getImage` N times with the same set of props," so you can't set quality separately for each format. Therefore, this site's `ImageWrapper` was changed to call `getImage` separately for each format, then hand-write the `<picture>`:

```astro
const avif = await getImage({ src, format: "avif", quality: 50, widths, sizes })
const webp = await getImage({ src, format: "webp", quality: 72, widths, sizes })
```

```html
<picture>
  <source srcset={avif.srcSet.attribute} type="image/avif" sizes={sizes} />
  <img src={webp.src} srcset={webp.srcSet.attribute} width={...} height={...} ... />
</picture>
```

Two more small pitfalls to note along the way: `srcSet.attribute` is an empty string when there's no `widths`/`densities`, and outputting it directly produces a `srcset=""` (HTML validation error, and browser behavior is also uncertain), so it needs to be filtered out; also, Astro's image cache key doesn't include `quality`, so **changing only the quality parameter without clearing the cache means the build will directly reuse old artifacts** — remember to clear the `.astro` cache before rebuilding.

## 8. Pre-Launch Image Checklist

| # | Check Item | Why |
| --- | --- | --- |
| 1 | Above-the-fold LCP image has **no** `loading="lazy"` | lazy will delay its start, directly hurting LCP |
| 2 | LCP image has `fetchpriority="high"` | Explicitly tells the browser the priority |
| 3 | `srcset` and `sizes` appear in pairs, and `sizes` matches the actual CSS | When only `srcset` is written, it defaults to calculating by `100vw` |
| 4 | Provide AVIF → WebP → JPEG three-tier fallback | Old devices still need JPEG as a fallback |
| 5 | Every `<img>` has `width`/`height` or CSS `aspect-ratio` | Eliminates CLS |
| 6 | Every `<img>` has `alt` (use `alt=""` for decorative images) | Accessibility, and also prevents screen readers from reading out filenames |
| 7 | `preload`'s `imagesrcset` exactly matches `<img>` | A mismatch causes the same image to be downloaded twice |
| 8 | No unreferenced images in build output | Dead assets slow down deployment and may be mistaken for entry points |
| 9 | Verify the selected candidate for each DPR using DevTools | Select "Current source" to see it |

Item 9 is the most worth building as a habit. It turns all the previous reasoning about "theoretically such-and-such should be selected" into an **observable verification**: open DevTools, select `<img>`, and check the currently used candidate source in the tooltip next to the Elements panel; then switch the device emulator's DPR and see whether the candidate changes accordingly. If DPR switches from 1 to 2 and the selected file doesn't change, you can basically conclude that `sizes` was written incorrectly.

## References

- [MDN: `<img>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img)
- [MDN: Image formats and browser support](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types)
- [MDN: `<picture>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture)
- [MDN: fetchpriority attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/fetchpriority)
- [Web Platform Features Explorer: AVIF](https://web-platform-dx.github.io/web-features-explorer/features/avif/)
- [Web Platform Features Explorer: fetch-priority](https://web-platform-dx.github.io/web-features-explorer/features/fetch-priority/)
- [sharp: Output options and encoding parameters](https://sharp.pixelplumbing.com/api-output)