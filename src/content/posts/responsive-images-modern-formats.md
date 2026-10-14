---
title: 响应式图片与现代图片格式：AVIF、WebP 与 <picture>
published: 2026-09-22
description: '把图片优化拆成格式、尺寸、时机三个独立问题：AVIF/WebP/JPEG 如何分级回退，srcset 与 sizes 的选择算法怎么算，loading、fetchpriority、preload 什么时候用，以及构建期用 sharp 批量生成多尺寸多格式的完整代码。'
image: ''
tags: [图片优化, Web性能, 网站开发, AVIF, WebP, srcset, LCP]
category: '网站'
draft: false
lang: ''
---

## 一、图片为什么最容易成为性能黑洞

一个典型页面里，**图片往往是体积最大的一类资源**：HTML 十几 KB，CSS 几十 KB，JS 打包后上百 KB，而一张没处理过的手机照片随手就是 3–5 MB。

更麻烦的是，图片的体积问题会直接传导到 **LCP（Largest Contentful Paint）**——绝大多数页面的 LCP 元素就是一张图片。你辛苦做的代码分割和 CSS 精简，很可能被一张没压缩的 PNG 一次性抹平。

图片优化看起来很简单——「压一压就好了」——实际上它由三个**互相独立**的问题组成：

| 问题 | 一句话描述 | 对应手段 |
| --- | --- | --- |
| **格式** | 用哪种编码？同等画质下能小多少？ | AVIF / WebP / JPEG 分级回退 |
| **尺寸** | 要发给这台设备多大的像素？ | `srcset` + `sizes` |
| **时机** | 什么时候开始下载？优先级多高？ | `loading` / `fetchpriority` / `preload` |

三者必须分别解决。只做了格式转换，相当于给一台 4000px 宽的巨幅图换了个更省油的发动机——油是省了，车还是那么大。

:::note
还有第四个问题：**稳定性**。图片没有预留尺寸会导致布局跳动，这是 CLS 的问题而不是 LCP 的问题，放在第六节单独讲。
:::

## 二、格式：JPEG、WebP、AVIF 怎么选

先看一张对照表。这里的「支持」指各浏览器开始支持的版本，具体版本号可以随时在 caniuse 或 Web Platform Features Explorer 上复核：

| 格式 | 编码 | 透明 | 动画 | 典型场景 | 浏览器支持 |
| --- | --- | --- | --- | --- | --- |
| JPEG | 有损 DCT | ✗ | ✗ | 照片的兜底回退 | 全部 |
| PNG | 无损 DEFLATE | ✓ | ✗ | 要求像素精确的截图、线条图 | 全部 |
| **WebP** | VP8 / VP8L | ✓ | ✓ | 当下的通用现代默认 | Chrome 32+ / Firefox 65+ / Safari 14+ |
| **AVIF** | AV1 | ✓ | ✓ | 照片类内容的优先格式 | Chrome 85+ / Firefox 93+ / Safari 16.4+ |
| SVG | 矢量 | ✓ | ✓ | 图标、Logo、图表 | 全部 |

关于编码效率，业界常见的大致结论是：**同等主观画质下，WebP 通常比 JPEG 小 25%–35%，AVIF 又能在 WebP 基础上再小 20%–30%**。具体数字取决于图像内容，线条多、渐变色块的图差异会更明显，噪点多的照片差异会小一些。不要照搬任何百分比，用自己的图跑一遍对比才有意义。

### 什么时候不要用 AVIF

AVIF 有一个容易被忽略的代价：**编码慢**。AV1 的编码复杂度远高于 JPEG 甚至 WebP，同一张图用 sharp 转 AVIF 可能比转 WebP 慢一个数量级。

这带来的直接结论是：

- **必须在构建期（或上传时）编码一次并缓存**，绝不要在请求路径上实时转码——那会把 CPU 成本转成用户可感知的延迟；
- 构建时间敏感的项目要给编码器**调低 effort**（牺牲一点压缩率换速度），或者只对首屏图生成 AVIF。

所以正确的做法**不是「换成 AVIF」，而是「提供 AVIF，并保留回退」**。至今仍有一部分老设备（尤其是停留在旧版 iOS 的设备）不认 AVIF，`<picture>` 就是为这件事准备的（见第四节）。

### 格式选择的经验法则

- **照片**：AVIF 优先 → WebP → JPEG；
- **截图 / UI 图 / 线条图**：优先 PNG 或 WebP 无损，AVIF 在有损模式下容易把细线糊掉；
- **图标 / Logo / 图表**：直接用 SVG，别转成位图；
- **需要透明的小图**：WebP 有损 + alpha 通常是体积最优解。

:::tip
JPEG XL 的编码效率同样出色，但各浏览器厂商的态度长期不一致，2026 年仍不建议把它当作交付格式的唯一依赖。要用就当成 AVIF 之外的一个额外候选，而不是替代品。
:::

## 三、尺寸：`srcset` 与 `sizes` 的选择算法

格式确定了「怎么编」，接下来要解决「发多大」。

核心矛盾是：**服务端在发 HTML 的时候，并不知道客户端要拿多大的图**。屏幕宽度、DPR、以及这张图在布局里的实际宽度，都只有浏览器自己清楚。所以标准给出的解法不是「服务端猜」，而是**服务端提供一组候选，浏览器自己挑**。这就是 `srcset` + `sizes`。

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

这几行里，两个属性的分工是完全不同的：

- **`srcset` 用 `w` 描述符声明每个候选文件的真实像素宽度**——注意是「文件有多宽」，不是「它将被显示成多宽」；
- **`sizes` 声明这张图在布局中会占多宽**——它是一组媒体条件 + CSS 长度，描述的是**槽位（slot）**，跟具体文件无关。

浏览器的选择过程大致是三步：

1. 解析 `sizes`，得到当前视口下这张图的**槽位宽度**（CSS 像素）；
2. 槽位宽度 × 当前 `devicePixelRatio`，得到**需要的物理像素宽度**；
3. 在 `srcset` 里挑**第一个不小于该宽度的候选**；如果全都比它小，就选最大的那个。

举个具体的例子：视口 1440px，命中 `(min-width: 1024px) 720px`，槽位是 720px；设备 DPR = 2，于是需要 1440 物理像素，浏览器选中 `cover-1440.jpg`。同一台设备如果 DPR = 1，只需要 720px，就会选中 `cover-960.jpg`。

### 四个最常见的写法错误

| 写法 | 问题 | 后果 |
| --- | --- | --- |
| 只写 `srcset` 不写 `sizes` | `sizes` 的默认值是 `100vw` | 手机上按整屏宽计算，选中明显过大的图 |
| `sizes` 与真实 CSS 布局不符 | 声明 720px，实际只渲染 320px | 白白多下一倍以上字节 |
| 用 `x` 描述符的同时还写 `sizes` | `x` 描述符下 `sizes` 不参与计算 | 写了也不生效，容易误判 |
| 在同一个 `srcset` 里混用 `w` 和 `x` | 语法非法 | **整个 `srcset` 被丢弃**，只剩 `src` 生效 |

第二条最隐蔽：很多人写完 `sizes` 之后改了 CSS 的栅格宽度，却忘了同步 `sizes`。**`sizes` 是 CSS 布局的副本，两者一旦脱钩就是静默的性能损失**——页面看起来完全正常，只是多下了几百 KB。

### `sizes="auto"`：让浏览器自己量

手动维护 `sizes` 显然很脆弱。较新的浏览器提供了 `sizes="auto"`：浏览器在图片完成布局后，用**实测的渲染宽度**回填槽位，省掉人工同步。

```html
<img src="thumb.jpg" srcset="thumb-240.jpg 240w, thumb-480.jpg 480w"
     sizes="auto, 100vw" loading="lazy" alt="缩略图">
```

两个必须记住的限制：

- **必须搭配 `loading="lazy"`**，因为浏览器要先完成布局才能测量，即时加载的图没有这个时机；
- **兼容性还不完整**。目前 Chromium 系（Chrome/Edge 126+）已支持，Firefox 在 2026 年跟进，Safari 尚在技术预览版阶段。

因此推荐的写法是 `sizes="auto, 100vw"`——把 `auto` 放在前面，不认它的浏览器会忽略这一项、回退到 `100vw`，**不会比现在更差**。这就是纯粹的渐进增强。

## 四、`<picture>`：当「同图不同尺寸」不够用

`srcset` 只能做一件事：**同一张构图，不同分辨率**。但有两类需求它表达不了：

1. **艺术指导（art direction）**：窄屏上需要换一张**不同构图**的图——比如宽屏用 16:9 横幅，手机上换成居中的方形裁切。这不是缩放，是另一个文件；
2. **格式回退**：同一张图提供 AVIF / WebP / JPEG 三个版本，让浏览器按支持情况自己挑。

`<picture>` 把这两件事统一成了「一组候选源 + 一个兜底 `<img>`」：

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

选择规则很简单：**浏览器从上往下看，选中第一个 `media` 匹配且 `type` 支持的 `<source>`**，然后在这个 `<source>` 内部再跑一次第三节的 `srcset`/`sizes` 算法。一个都不匹配，就用最后的 `<img>`。

几个容易踩的点：

- **`<img>` 是必需的**，不是可选的装饰。它同时承担「最终回退」和「语义与可访问性」两个职责——`alt` 只能写在它上面；
- **`width`/`height` 也要写在 `<img>` 上**。写在 `<source>` 上无效，占位就白做了（见第六节）；
- **`sizes` 在每个 `<source>` 里是独立的**。上面的例子里，方形裁切和宽幅横幅的布局宽度不同，所以各自的 `sizes` 也不同；
- **别把 `media` 写反**。窄屏条件要放在前面，否则宽屏条件会先把所有视口都吃掉。

:::warning
`<picture>` 里**不要**给 `<img>` 加 `srcset`。这会让「哪个属性在起作用」变得难以推理；格式回退和尺寸选择都应该在 `<source>` 里表达，`<img>` 只留一个 `src` 兜底。
:::

## 五、时机：`loading`、`fetchpriority` 与 `preload`

格式和尺寸解决的是「下多少」，接下来解决「什么时候下」。

### `loading="lazy"`：默认开，但首屏图必须关掉

懒加载的价值是让视口外的图片不要抢占带宽。大多数情况下它是对的默认值，但有一条**必须记住的例外**：

> **不要给首屏的 LCP 图加 `loading="lazy"`。**

lazy 的判定依赖「元素与视口的距离」，而这个距离要在布局之后才能算出来。对 LCP 图来说，这相当于人为推迟了它的启动时间——LCP 指标会直接变差。首屏图应该保持默认的 `loading="eager"`。

实践中的分界线通常很清晰：**首屏 hero 图 / 文章封面用 eager，正文里和列表页下方的图一律 lazy**。

### `fetchpriority`：把带宽优先给关键图

同一时刻浏览器要下的资源很多，`fetchpriority` 允许你明确表态：

```html
<img src="/img/hero-1920.jpg" fetchpriority="high" alt="首页主视觉">
```

- `fetchpriority="high"` 用在 **LCP 图**上，效果通常比任何 JS 层面的调度都直接；
- `fetchpriority="low"` 可以用在明确不紧急的图上（比如页脚装饰图）；
- 支持情况：Chrome 102+、Safari 17.2+、Firefox 132+。**老浏览器直接忽略这个属性**，属于零成本渐进增强，不需要任何 polyfill。

有一个关键限制：**`fetchpriority` 只在 HTML 解析阶段被读取一次**。用 JS 在运行时补上、或者先插入 DOM 再设置属性，都不会生效。

### `preload`：把关键图提前到发现之前

如果 LCP 图是**由 CSS 背景或 JS 动态插入**的，浏览器的预加载扫描器（preload scanner）要等到很晚才能发现它。这时可以用 `preload` 抢时间：

```html
<link rel="preload" as="image"
      type="image/avif"
      imagesrcset="/img/hero-960.avif 960w, /img/hero-1920.avif 1920w"
      imagesizes="100vw"
      fetchpriority="high">
```

`imagesrcset` / `imagesizes` 让预加载也走响应式选择逻辑，而不是盲目下最大的那张。支持情况：Chrome 73+、Firefox 78+、Safari 17.2+，已经可以放心使用。

:::warning
预加载的两个属性必须和 `<img>` 上的**完全一致**。只要有一处对不上，浏览器就会认为是两个不同的候选，结果是**同一张图下载两次**——比不加 preload 更糟。上完线务必在 Network 面板里确认没有重复请求。
:::

## 六、稳定性：别让图片把页面顶来顶去

图片在加载完成前高度是 0，加载完成后突然撑开——如果它上面正好有内容，那些内容就会被顶下去。这就是 CLS（Cumulative Layout Shift）最常见的来源。

解法本身极其简单：**让浏览器在图片下载完成之前就知道它要占多大地方**。

```html
<img src="/img/cover.jpg" width="1440" height="960" alt="封面">
```

只要同时写上 `width` 和 `height`，浏览器就能算出宽高比，在图片还没到的时候先把空间预留出来。这两个值**不需要和实际显示尺寸一致**，它们只用来推导比例。

配套的 CSS 有一条容易漏掉的规则：

```css
img {
  max-width: 100%;
  height: auto;  /* 关键：否则 height 属性会胜出，图片被压扁 */
}
```

`height: auto` 是必须的。省略它的话，HTML 上的 `height="960"` 会硬性生效，图片在窄容器里就会被拉伸变形。

对于**固有尺寸未知**的图（用户上传、远程 URL），用 CSS 显式声明比例：

```css
.thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;      /* 按比例裁切，不拉伸 */
  background: #f3f4f6;    /* 占位底色，避免白块闪烁 */
}
```

`aspect-ratio` 配合 `object-fit: cover`，可以在不知道原图尺寸的前提下做出稳定的等比缩略图——这是列表页和卡片流的标配。

## 七、落地：构建期生成多尺寸多格式

以上的规则讲完了，但在实际项目里，**没有人会手写这些 `srcset`**。正确做法是让构建流程从原图自动生成变体，模板只负责输出。

用 sharp 写一个最小可用的生成器：

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

几个值得注意的实现细节：

- **`withoutEnlargement: true` 不能省**。原图只有 600px 宽时，把它"放大"到 1440px 只会得到一个更模糊、更大的文件；
- **`sourceWidth < width` 的显式跳过**与上一条是双保险。前者的收益是少生成一批废文件，后者保证即使 resize 被调用也不会放大；
- **AVIF 的 `effort` 是构建时间的最大变量**。默认值追求压缩率，在大批量图片上可能让构建慢到无法接受；先把它调低跑通，再按需提高；
- **产物文件名带内容哈希**，配合 `Cache-Control: public, max-age=31536000, immutable`，图片就能长期缓存在 CDN 和浏览器里，永远不会因为"图变了但 URL 没变"而出问题——这部分细节可以看[《HTTP 缓存策略完全指南》](/posts/http-caching-guide)。

生成完之后，把结果喂给模板。用 `astro:assets` 的话这一步是内置的——`<Image>` 和 `<Picture>` 组件会在构建期完成多尺寸生成（多格式只有 `<Picture>` 支持，见下面的坑），输出正确的 `srcset`，本站的图片就是这么处理的（实测数据见[《本站浏览器支持与多端适配报告》](/posts/browser-device-support-report)：横幅图提供 360–2560 共十一档，卡片封面按实际显示尺寸生成）。自己写构建脚本的意义在于：你清楚每一个字节是怎么来的，出了问题知道去哪里查。

### 一个坑：`<Image>` 没有 `formats` 这个 prop

`formats` 只属于 `<Picture>`；`<Image>` 只认单数的 `format`。给 `<Image formats={['avif','webp']}>` 传值不会报错，`getImage` 会把不认识的参数直接过滤掉，于是**构建产物里一个 `.avif` 都不会有**，而 HTML 上也不会留下任何痕迹——除非你去翻 `dist/_astro` 数文件个数。本站就踩过：全站只发 WebP，直到某次构建日志里发现 AVIF 文件数为 0。

### 另一个坑：AVIF 和 WebP 的质量数不是一把尺子

同一张图、同一裁剪区实测（700×700）：

| 编码 | 参数 | 大小 | 主观画质 |
| --- | --- | --- | --- |
| AVIF | `quality: 50` | 34.7 KB | 与 WebP 72 肉眼无差别 |
| WebP | `quality: 72` | 44.4 KB | 基准 |
| JPEG | `quality: 60` | 41.2 KB | 白色渐变处出现色块 |

AVIF 的质量数大致「比 WebP 高 20」，**用同一个 `quality` 喂两种格式，要么白花字节，要么画质下降**。实测在横幅图 1920px 档上，同用 `quality: 65` 时 AVIF 是 216 KB、WebP 只有 141 KB——AVIF 反而更胖。而 `<Picture>` 的 `formats` 是「同一套 props 跑 N 次 `getImage`」，无法给两种格式分别设质量。所以本站的 `ImageWrapper` 改成对每种格式单独调用 `getImage`，再手写 `<picture>`：

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

顺带记两个小坑：`srcSet.attribute` 在没有 `widths`/`densities` 时是空串，直接输出会得到一个 `srcset=""`（HTML 校验报错，浏览器行为也不确定），要过滤掉；另外 Astro 的图片缓存 key 不含 `quality`，**只改质量参数不删缓存，构建会直接复用旧产物**，记得清 `.astro` 缓存再构建。

## 八、上线前的图片检查清单

| # | 检查项 | 为什么 |
| --- | --- | --- |
| 1 | 首屏 LCP 图**没有** `loading="lazy"` | lazy 会推迟它的启动，直接伤害 LCP |
| 2 | LCP 图带 `fetchpriority="high"` | 明确告知浏览器优先级 |
| 3 | `srcset` 与 `sizes` 成对出现，且 `sizes` 与真实 CSS 一致 | 只写 `srcset` 时默认按 `100vw` 计算 |
| 4 | 提供 AVIF → WebP → JPEG 三级回退 | 老设备仍需 JPEG 兜底 |
| 5 | 每个 `<img>` 都有 `width`/`height` 或 CSS `aspect-ratio` | 消除 CLS |
| 6 | 每个 `<img>` 都有 `alt`（装饰图用 `alt=""`） | 可访问性，同时避免屏幕阅读器读出文件名 |
| 7 | `preload` 的 `imagesrcset` 与 `<img>` 完全一致 | 不一致会导致同一张图下载两次 |
| 8 | 构建产物中没有未被引用的图片 | 死资产会拖慢部署，也可能被误当成入口 |
| 9 | 用 DevTools 逐个 DPR 验证选中的候选 | 选中"当前源"（Current source）即可看到 |

第 9 条最值得养成习惯。它把前面所有"理论上应该选中某某"的推理，变成一次**可观测的验证**：打开 DevTools，选中 `<img>`，在元素面板旁的提示里查看当前实际使用的候选源；再切换设备模拟器的 DPR，看候选是否随之改变。如果 DPR 从 1 切到 2 而选中的文件没变，基本可以断定是 `sizes` 写错了。

## 参考资料

- [MDN：`<img>` 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img)
- [MDN：图像格式与浏览器支持](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types)
- [MDN：`<picture>` 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture)
- [MDN：fetchpriority 属性](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/fetchpriority)
- [Web Platform Features Explorer：AVIF](https://web-platform-dx.github.io/web-features-explorer/features/avif/)
- [Web Platform Features Explorer：fetch-priority](https://web-platform-dx.github.io/web-features-explorer/features/fetch-priority/)
- [sharp：输出选项与编码参数](https://sharp.pixelplumbing.com/api-output)
