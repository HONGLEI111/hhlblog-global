---
title: Open Graph 与结构化数据：让链接在聊天框和搜索结果里都好看
published: 2026-10-13
description: '把「链接预览不好看」拆成两套互不相干的词汇表：Open Graph 决定聊天框里的卡片，JSON-LD 决定搜索引擎读懂了什么。逐条讲清 og:image 的三种静默失败、twitter:card 属性名为什么是 name、Google 为什么说结构化数据「没有必填属性」，并给出一段能自己量图片真实尺寸的校验脚本。'
image: ''
tags: [Open Graph, 结构化数据, JSON-LD, SEO, 网站开发, 社交分享]
category: '网站'
draft: false
lang: ''
---

## 一、两个消费者，两套词汇表

把一条链接粘进微信、Slack 或 Discord，它变成一张带图卡片的那个瞬间，和它在 Google 里被理解成「一篇由某某在某个日期发布的文章」，是**两件毫不相干的事**。

它们由两套不同的标签驱动，跑在两个不同的消费者手里：

| | 社交卡片 | 搜索富媒体结果 |
| --- | --- | --- |
| 读取方 | Slack / Discord / X / 微信 / iMessage 的抓取器 | Google 等搜索引擎 |
| 词汇表 | Open Graph（`og:*`）、Twitter Card（`twitter:*`） | schema.org（`JSON-LD`） |
| 位置 | `<head>` 里的 `<meta>` | `<head>` 里的 `<script type="application/ld+json">` |

三件必须先记住的事：

1. **`og:*` 不会进 Google 的富媒体结果，JSON-LD 也不决定聊天卡片。** 两套都要写，不能互相替代；
2. **抓取器不执行 JavaScript。** 它拿到的是一份「没有跑过 React 的」HTML。任何用 JS 在客户端注入的 meta 标签，对这些消费者等于不存在；
3. **两套标签做的是同一件事的延续**——让机器在没有你解释的情况下，正确理解这一页是什么。

:::note
第 2 条是 `og:*` 与 `JSON-LD` 唯一的共同点：它们都要求**服务端渲染**。这也是为什么客户端渲染（CSR）的 SPA 常常在社交平台上是「一片空白」——不是标签写错了，是抓取时它们还没被创建出来。
:::

## 二、Open Graph：四个必填属性，和一堆被误当成必填的

Open Graph 协议（[ogp.me](https://ogp.me/)）只定义了**四个必填属性**：

```html
<meta property="og:title" content="文章标题" />
<meta property="og:type" content="article" />
<meta property="og:image" content="https://example.com/og/cover.jpg" />
<meta property="og:url" content="https://example.com/posts/foo" />
```

其余的 `og:description`、`og:site_name`、`og:locale` 都是**推荐但非必填**。很多人以为 `og:description` 是必填的——它不是，但它决定了卡片上那两行摘要，实际上一行都不能少。

`og:type` 不只是装饰，它决定语义：首页和落地页用 `website`，文章用 `article`。这个值选错不会报错，只会让消费者用错误的形态处理你的页面。

### `og:image` 的结构化子属性

`og:image` 可以展开成一组子属性，其中最有价值的两个是宽高：

```html
<meta property="og:image" content="https://example.com/og/cover.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="示例封面：一张带标题图的蓝色卡片" />
```

声明宽高的作用是**让消费者不必再抓一次图片来测量**。这不是微优化——卡片渲染通常有超时，少一次网络往返就可能把「有图卡片」变成「只有标题+描述」的降级形态。

### 1200×630 是从哪来的

这是一个流传极广的误会。1200×630（比例 1.91:1）**是 Meta 分享文档给出的建议尺寸，不是 Open Graph 规范的规定**——规范里对图片尺寸只字未提。

真正的实践边界大致是：

- **1200×630** — 事实标准，Facebook / X / LinkedIn / Discord / Slack 通用；
- **600×315** 以上才有大卡片，**200×200** 是很多平台的绝对下限；
- **体积上限 8 MB**，但实际应压到 300 KB 以内——没人愿意为了一张缩略图等三秒。

## 三、`og:image` 的三种静默失败

这一节值得单独讲，因为 `og:image` 出问题时**一个报错都不会有**，卡片只是悄悄变丑了。

### 1. 用了相对路径

```html
<!-- 错：多数消费者直接丢掉这个标签 -->
<meta property="og:image" content="/og/cover.jpg" />

<!-- 对：必须是绝对 URL -->
<meta property="og:image" content="https://example.com/og/cover.jpg" />
```

Open Graph 的 URL 必须绝对。相对路径在某些平台上「看起来能用」，是因为它们做了猜测；换个平台就变成没有图。**这在本地开发时绝对发现不了**，因为本地预览和线上抓取的环境完全不同。

### 2. 声明的宽高和图片真实的宽高不一致

这是最隐蔽的一种。声明 `og:image:width="1200"` 时，你其实是在向消费者**承诺**：这张图确实有 1200 像素宽。

问题在于，图片尺寸很容易和声明脱钩——换了一张不同比例的封面、图片在构建期被压缩改尺寸，而 meta 里的数字是硬编码的。这时消费者会按 1200×630 的比例预留位置，然后填进来一张比例完全不同的图，卡片要么被裁得莫名其妙，要么平台事后重新抓图测量（多一次往返）。

本站就是一个现成的例子。默认的社交卡片图 `public/og-image.jpg`，我用 sharp 量过，实测正好是 **1200×630**；整站 87 篇文章里有 86 篇走这张后备图，所以模板里硬编码的宽高是对的。但**已经有 1 篇设置了自定义封面**——从那一刻起，那个硬编码的 1200×630 就开始说谎了。

结论不是「不许硬编码」，而是：**一旦允许每篇文章自定义封面，宽高就必须从图片本身推导，而不是写死。**

### 3. 提供了 SVG 或超限图片

Open Graph 消费的是**位图**。SVG 基本无人支持，WebP 的支持度也参差不齐——安全的选择是 PNG（适合文字/图形卡片）和 JPEG（适合照片），并且控制在体积上限内。

## 四、`twitter:card`：属性名是 `name`，不是 `property`

Twitter Card 的标签长得很像 Open Graph，但有一个容易看走眼的区别：

```html
<meta property="og:title" content="文章标题" />

<!-- 注意这里是 name，不是 property -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="文章标题" />
<meta name="twitter:description" content="一行摘要" />
<meta name="twitter:image" content="https://example.com/og/cover.jpg" />
```

两个值得记住的行为：

- **缺失时会回退到 `og:*`。** 所以只写 Open Graph，X 上也常有卡片——但 `twitter:card` 本身没有 `og:*` 的对应项，不写它就拿不到大卡片。大卡片的关键就是这一行 `summary_large_image`；
- **图片小于 300×157 时会被静默降级成小卡片。** 又是静默——没有警告，卡片只是变小了。

:::warning
X 的官方 Card Validator 已经在 2022 年下线。现在验证卡片最可靠的办法是**真的把链接发给自己**（或发到私聊），看它渲染成什么样，而不是指望工具。Facebook 的 [Sharing Debugger](https://developers.facebook.com/tools/debug/) 仍在，它同时会刷新 WhatsApp 的缓存——因为 WhatsApp 的预览缓存约 7 天，改完 `og:image` 之后不刷新是看不到变化的。
:::

## 五、结构化数据：Google 说「没有必填属性」

打开 Google 的[文章结构化数据文档](https://developers.google.com/search/docs/appearance/structured-data/article)，会先看到一句和直觉相反的话：**没有任何属性是必填的**。Google 的措辞是「添加所有适用且推荐你添加的属性」。

但「没有必填」不等于「随便写」。真正决定能否进入富媒体结果的，是这一组：

| 属性 | 说明 |
| --- | --- |
| `headline` | 标题，保持简短——太长会被截断 |
| `image` | 代表图，需可抓取，建议高分辨率（面积 ≥ 50000 像素，16:9 / 4:3 / 1:1） |
| `datePublished` | 首次发布时间，ISO 8601 格式 |
| `author` | 作者，`Person` 类型，带 `name` 与 `url` |
| `dateModified` | 最后修改时间，强烈建议——它同时是一个「新鲜度」信号 |

`@type` 必须是 `Article`、`NewsArticle` 或 `BlogPosting` 之一。格式用 **JSON-LD**（Google 明确推荐），放在 `<script type="application/ld+json">` 里。

这里有个值得澄清的点：`application/ld+json` 这个名字里有 `json` 也有 `javascript`，但它**不是可执行脚本**，只是被解析的数据。所以它不存在「开 JS 才有」的问题，也不该被当成脚本性能开销。

### 别指望 FAQ 和 HowTo

FAQ 富结果在 2023 年被 Google 大幅收窄适用范围（基本限于权威的政府/医疗类站点）。如果你写结构化数据是为了在搜索结果里多长出几行 FAQ，那个收益大概率已经不在了。

那还值不值得写？值得，但**收益的重心变了**：它现在的价值主要在于让「你是谁、什么时候写的、谁写的」被机器准确记录——这对搜索结果的基础展示、以及各类 AI 摘要的引用都有效，而不只是那些花哨的富媒体卡片。

## 六、从一个真源生成两套标签

实际项目里最容易出错的地方，是**把同一份信息手抄到两个地方**：`og:title` 抄一遍标题，`headline` 再抄一遍。抄漏一处不会报错，只会让两套消费者看到不一致的世界。

正确的做法是让它们从**同一个数据源**派生。以本站的 Astro 结构为例，文章的 frontmatter 就是唯一真源：

```ts
// src/components/SeoHead.astro 的核心逻辑
const { title, description, published, tags, cover } = Astro.props
const site = Astro.site!          // astro.config.mjs 里的 site

// 关键：用 new URL 而不是字符串拼接，保证拿到绝对 URL
const abs = (path: string) => new URL(path, site).href

// 图片尺寸不硬编码，从构建期已知的元数据推导
const coverUrl = abs(cover.url)
```

Open Graph 部分：

```astro
<meta property="og:type" content="article" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonicalUrl} />
<meta property="og:image" content={coverUrl} />
<meta property="og:image:width" content={String(cover.width)} />
<meta property="og:image:height" content={String(cover.height)} />
<meta property="og:image:alt" content={cover.alt} />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content={coverUrl} />
```

结构化数据部分，用 `@graph` 把作者抽出来只定义一次，文章通过 `@id` 引用它——而不是在每个对象里重复嵌入一个 `Person`：

```ts
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': `${site}#author`,
      name: authorName,
      url: site.href,
    },
    {
      '@type': 'BlogPosting',
      headline: title,
      description,
      image: [coverUrl],
      keywords: tags,
      author: { '@id': `${site}#author` },
      datePublished: published,        // 已经是 ISO 8601
      dateModified: updated ?? published,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
      inLanguage: 'zh-CN',
    },
  ],
}
```

```astro
<script is:inline type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
```

:::warning
`og:url` 应该等于这一页的**规范地址**（canonical），而不是「浏览器当前所在的地址」。两者在分页、尾斜杠、带跟踪参数的情况下会分叉，分叉时卡片就指向了一个非规范 URL。本站模板里恰好同时存在 `Astro.url` 和一个单独的 `canonicalUrl` 变量——如果这里用的是前者，值得改成后者：**让两个字段指向同一处，冲突的可能性就消失了。**
:::

### 卡片图不值得手绘

既然每篇文章都要一张 1200×630 的图，手绘显然不现实。通行做法是**用代码生成**：Vercel 的 [satori](https://github.com/vercel/satori) 把一份 JSX/对象树渲染成 SVG，再用 `@resvg/resvg-js` 光栅化成 PNG，整个过程跑在构建期，运行时零成本。

它的限制要提前知道：CSS 只支持一个子集（**没有 `z-index`，没有 `calc()`**，默认 `display` 是 `flex` 而不是 block），字体只认 TTF / OTF / WOFF——**WOFF2 会直接失败**。踩过一次字体格式的坑，通常就不会再踩第二次。

## 七、上线前的自查

下面这段脚本不做任何假设，它**打开真实的线上页面**，然后自己把图片抓下来量尺寸：只有测到的宽高和 meta 里声明的一致，才算通过。

```js
// node scripts/check-og.mjs https://www.example.com/posts/foo
import { Buffer } from 'node:buffer'

const url = process.argv[2]
if (!url) {
  console.error('用法: node scripts/check-og.mjs <页面 URL>')
  process.exit(2)
}

const html = await (await fetch(url)).text()

function parseMeta(head) {
  const tags = new Map()
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = {}
    for (const [, key, , dq, sq] of tag.matchAll(
      /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
    )) {
      attrs[key.toLowerCase()] = dq ?? sq ?? ''
    }
    const name = attrs.property || attrs.name
    if (name) tags.set(name, attrs.content ?? '')
  }
  return tags
}

// 只解析头部字节：PNG 读 IHDR，JPEG 扫 SOF 段
async function measure(src) {
  const buf = Buffer.from(await (await fetch(src)).arrayBuffer())
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (buf.subarray(0, 8).equals(PNG)) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  }
  let i = 2
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue }
    const marker = buf[i + 1]
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) }
    }
    i += 2 + buf.readUInt16BE(i + 2)
  }
  throw new Error('不是 PNG 或 JPEG')
}

const meta = parseMeta(html.slice(0, html.indexOf('</head>')))
const fails = []
const check = (ok, msg) => { if (!ok) fails.push(msg) }

// 1. 四个必填属性
for (const key of ['og:title', 'og:type', 'og:image', 'og:url']) {
  check(meta.has(key), `缺少必填属性 ${key}`)
}

// 2. 图片和页面地址必须是绝对 URL
for (const key of ['og:image', 'og:url']) {
  const value = meta.get(key)
  if (value) check(/^https?:\/\//.test(value), `${key} 不是绝对 URL: ${value}`)
}

// 3. 声明的宽高必须等于图片真实的宽高
const src = meta.get('og:image')
if (src && /^https?:/.test(src)) {
  const real = await measure(src)
  const w = meta.get('og:image:width')
  const h = meta.get('og:image:height')
  if (w) check(Number(w) === real.width, `声明宽 ${w}，实测 ${real.width}`)
  if (h) check(Number(h) === real.height, `声明高 ${h}，实测 ${real.height}`)
  console.log(`og:image 实测 ${real.width}×${real.height}（声明 ${w ?? '—'}×${h ?? '—'}）`)
}

// 4. JSON-LD 必须能解析且字段齐全
const ld = html.match(
  /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i,
)?.[1]
if (!ld) {
  fails.push('页面里没有 JSON-LD')
} else {
  try {
    const data = JSON.parse(ld)
    const nodes = data['@graph'] ?? [data]
    const post = nodes.find((n) => /Article|BlogPosting/.test(n['@type'] ?? ''))
    check(!!post, 'JSON-LD 里没有 Article/BlogPosting')
    for (const key of ['headline', 'datePublished', 'author', 'image']) {
      check(post && post[key], `JSON-LD 缺少 ${key}`)
    }
  } catch (err) {
    fails.push(`JSON-LD 不是合法 JSON：${err.message}`)
  }
}

if (fails.length) {
  for (const f of fails) console.error(`✗ ${f}`)
  process.exit(1)
}
console.log('✓ Open Graph 与结构化数据检查通过')
```

第 3 条是整段脚本里最值钱的部分。它把前面所有「按理说应该一致」的假设，变成一次**真实的测量**——你不必相信任何人（包括自己）关于图片尺寸的记忆。

## 小结

- 社交卡片看 `og:*` 和 `twitter:*`，搜索富媒体看 JSON-LD，**两套都要写，谁也不替代谁**；
- Open Graph 只有四个必填属性；`og:image` 必须是**绝对 URL**，`og:image:width/height` 必须和**图片真实像素一致**；
- `twitter:*` 的属性名是 `name`；图片太小会被**静默降级**；
- 结构化数据「没有必填属性」，但 `headline / image / datePublished / author` 实际决定了它是否有效；
- 所有失败都是静默的——所以**别靠肉眼**，用一段能自己量图的脚本把它变成可观测的检查。

## 参考来源

- [The Open Graph protocol（ogp.me）](https://ogp.me/)
- [Google Search Central：Article（Article、NewsArticle、BlogPosting）结构化数据](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google Search Central：结构化数据标记测试工具](https://developers.google.com/search/docs/appearance/structured-data)
- [Vercel Satori：把 HTML 与 CSS 转成 SVG](https://github.com/vercel/satori)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
