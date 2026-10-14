---
title: 'Open Graph and Structured Data: Making Links Look Good in Chat Boxes and Search Results'
published: 2026-10-13
description: 'Break down "ugly link previews" into two separate vocabularies: Open Graph determines the card in a chat box, while JSON-LD determines what search engines understand. Explains the three silent failures of og:image, why the twitter:card attribute name is name, why Google says structured data has "no required properties," and provides a validation script that can measure the actual image dimensions yourself.'
image: ''
tags: [Open Graph, Structured Data, JSON-LD, SEO, Web Development, Social Sharing]
category: Web
draft: false
---
## 1. Two Consumers, Two Vocabularies

The moment you paste a link into WeChat, Slack, or Discord and it turns into a card with an image, and the moment Google understands it as "an article published by someone on some date," are **two completely unrelated things**.

They are driven by two different sets of tags, running in the hands of two different consumers:

| | Social Cards | Search Rich Results |
| --- | --- | --- |
| Reader | Crawlers from Slack / Discord / X / WeChat / iMessage | Search engines like Google |
| Vocabulary | Open Graph (`og:*`), Twitter Card (`twitter:*`) | schema.org (`JSON-LD`) |
| Location | `<meta>` inside `<head>` | `<script type="application/ld+json">` inside `<head>` |

Three things you must remember first:

1. **`og:*` does not feed into Google's rich results, and JSON-LD does not determine chat cards.** You need to write both; neither can replace the other;
2. **Crawlers do not execute JavaScript.** What they get is HTML that "hasn't run React." Any meta tag injected client-side via JS effectively does not exist for these consumers;
3. **Both sets of tags are a continuation of the same task**—letting machines correctly understand what this page is without you having to explain it.

:::note
Point 2 is the only thing `og:*` and `JSON-LD` have in common: they both require **server-side rendering**. This is also why client-side rendered (CSR) SPAs often appear as "a blank slate" on social platforms—it's not that the tags are wrong, it's that they haven't been created yet at crawl time.
:::

## 2. Open Graph: Four Required Properties, and a Bunch Mistaken for Required

The Open Graph protocol ([ogp.me](https://ogp.me/)) defines only **four required properties**:

```html
<meta property="og:title" content="文章标题" />
<meta property="og:type" content="article" />
<meta property="og:image" content="https://example.com/og/cover.jpg" />
<meta property="og:url" content="https://example.com/posts/foo" />
```

The rest—`og:description`, `og:site_name`, `og:locale`—are **recommended but not required**. Many people assume `og:description` is required—it isn't, but it determines those two lines of summary on the card, and in practice you can't afford to omit a single one.

`og:type` isn't just decoration; it determines semantics: use `website` for homepages and landing pages, `article` for articles. Choosing the wrong value won't throw an error—it will just cause consumers to process your page in the wrong form.

### Structured Sub-properties of `og:image`

`og:image` can be expanded into a set of sub-properties, the two most valuable being width and height:

```html
<meta property="og:image" content="https://example.com/og/cover.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="示例封面：一张带标题图的蓝色卡片" />
```

Declaring width and height serves to **save consumers from fetching the image again just to measure it**. This isn't a micro-optimization—card rendering typically has a timeout, and one fewer network round-trip could be the difference between an "image card" and a degraded "title + description only" form.

### Where Does 1200×630 Come From

This is a widely circulated misunderstanding. 1200×630 (ratio 1.91:1) **is the recommended size from Meta's sharing documentation, not a rule in the Open Graph specification**—the spec says nothing about image dimensions.

The real practical boundaries are roughly:

- **1200×630** — the de facto standard, works across Facebook / X / LinkedIn / Discord / Slack;
- **600×315** or above gets you a large card; **200×200** is the absolute floor on many platforms;
- **Size limit 8 MB**, but in practice you should compress to under 300 KB—nobody wants to wait three seconds for a thumbnail.

## 3. Three Silent Failures of `og:image`

This section deserves its own discussion, because when `og:image` goes wrong, **not a single error is thrown**—the card just quietly gets uglier.

### 1. Using Relative Paths

```html
<!-- 错：多数消费者直接丢掉这个标签 -->
<meta property="og:image" content="/og/cover.jpg" />

<!-- 对：必须是绝对 URL -->
<meta property="og:image" content="https://example.com/og/cover.jpg" />
```

Open Graph URLs must be absolute. Relative paths "seem to work" on some platforms because they make guesses; switch platforms and you get no image. **You will absolutely never catch this during local development**, because the local preview and the live crawl environment are completely different.

### 2. Declared Width/Height Doesn't Match the Image's Actual Dimensions

This is the most insidious one. When you declare `og:image:width="1200"`, you are actually making a **promise** to consumers: this image really is 1200 pixels wide.

The problem is that image dimensions easily drift out of sync with the declaration—you swap in a cover with a different aspect ratio, the image gets compressed and resized at build time, while the numbers in the meta tag are hardcoded. Consumers then reserve space at a 1200×630 ratio, only to fill it with an image of a completely different ratio. The card either gets cropped bizarrely, or the platform re-fetches and re-measures the image afterward (one extra round-trip).

This site is a ready-made example. The default social card image `public/og-image.jpg`—I measured it with sharp, and it's exactly **1200×630**. Of the 87 articles on the site, 86 use this fallback image, so the hardcoded width and height in the template are correct. But **1 article already has a custom cover set**—from that moment on, that hardcoded 1200×630 started lying.

The conclusion isn't "no hardcoding allowed," but rather: **once you allow per-article custom covers, width and height must be derived from the image itself, not written as constants.**

### 3. Providing SVG or Oversized Images

Open Graph consumes **raster images**. SVG is essentially unsupported, and WebP support is inconsistent—the safe choices are PNG (good for text/graphic cards) and JPEG (good for photos), kept within the size limit.

## 4. `twitter:card`: The Property Name Is `name`, Not `property`

Twitter Card tags look a lot like Open Graph, but there's one difference that's easy to overlook:

```html
<meta property="og:title" content="文章标题" />

<!-- 注意这里是 name，不是 property -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="文章标题" />
<meta name="twitter:description" content="一行摘要" />
<meta name="twitter:image" content="https://example.com/og/cover.jpg" />
```

Two behaviors worth remembering:

- **Falls back to `og:*` when missing.** So if you only write Open Graph, X often still shows a card—but `twitter:card` itself has no `og:*` equivalent, and without it you won't get a large card. That one line `summary_large_image` is the key to large cards;
- **Images smaller than 300×157 are silently downgraded to small cards.** Silent again—no warning, the card just gets smaller.

:::warning
X's official Card Validator was shut down in 2022. The most reliable way to verify cards now is to **actually send the link to yourself** (or to a private chat) and see how it renders, rather than relying on tools. Facebook's [Sharing Debugger](https://developers.facebook.com/tools/debug/) is still around, and it also refreshes WhatsApp's cache—because WhatsApp's preview cache lasts about 7 days, and you won't see changes after editing `og:image` without refreshing.
:::

## 5. Structured Data: Google Says "No Required Properties"

Open Google's [Article structured data documentation](https://developers.google.com/search/docs/appearance/structured-data/article), and the first thing you'll see is a counterintuitive statement: **no properties are required**. Google's wording is "add all applicable and recommended properties."

But "no required properties" doesn't mean "write whatever you want." What really determines whether you get into rich results is this set:

| Property | Description |
| --- | --- |
| `headline` | Title, keep it short—too long gets truncated |
| `image` | Representative image, must be crawlable, high resolution recommended (area ≥ 50000 pixels, 16:9 / 4:3 / 1:1) |
| `datePublished` | First published date, ISO 8601 format |
| `author` | Author, `Person` type, with `name` and `url` |
| `dateModified` | Last modified date, strongly recommended—it's also a "freshness" signal |

`@type` must be one of `Article`, `NewsArticle`, or `BlogPosting`. Use **JSON-LD** format (Google explicitly recommends it), placed inside `<script type="application/ld+json">`.

One point worth clarifying: `application/ld+json` has both `json` and `javascript` in its name, but it **is not an executable script**—it's just parsed data. So there's no "needs JS enabled" problem, and it shouldn't be treated as a script performance cost.

### Don't Count on FAQ and HowTo

FAQ rich results were significantly narrowed in scope by Google in 2023 (basically limited to authoritative government/medical sites). If you're writing structured data to get a few extra lines of FAQ in search results, that payoff is probably gone.

Is it still worth writing? Yes, but **the center of gravity of the payoff has shifted**: its value now lies mainly in letting "who you are, when it was written, who wrote it" be accurately recorded by machines—this is effective for basic search result display and for citations in various AI summaries, not just those flashy rich media cards.
## 6. Generating Two Sets of Tags from One Source of Truth

The most error-prone part of a real project is **hand-copying the same piece of information into two places**: `og:title` copies the title once, `headline` copies it again. Missing one spot won't throw an error—it just leaves two sets of consumers seeing inconsistent worlds.

The right approach is to have them derive from **the same data source**. Taking this site's Astro structure as an example, the article's frontmatter is the single source of truth:

```ts
// src/components/SeoHead.astro 的核心逻辑
const { title, description, published, tags, cover } = Astro.props
const site = Astro.site!          // astro.config.mjs 里的 site

// 关键：用 new URL 而不是字符串拼接，保证拿到绝对 URL
const abs = (path: string) => new URL(path, site).href

// 图片尺寸不硬编码，从构建期已知的元数据推导
const coverUrl = abs(cover.url)
```

The Open Graph part:

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

For the structured data part, use `@graph` to extract the author and define it only once, with articles referencing it via `@id`—rather than repeatedly embedding a `Person` inside every object:

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
`og:url` should equal this page's **canonical URL**, not "the URL the browser is currently on." The two diverge in cases of pagination, trailing slashes, and tracking parameters, and when they diverge the card points to a non-canonical URL. In this site's template there happen to be both a `Astro.url` and a separate `canonicalUrl` variable—if the former is being used here, it's worth switching to the latter: **make both fields point to the same place, and the possibility of conflict disappears.**
:::

### Card images aren't worth hand-drawing

Since every article needs a 1200×630 image, hand-drawing is clearly impractical. The common approach is **generating them with code**: Vercel's [satori](https://github.com/vercel/satori) renders a JSX/object tree into SVG, then `@resvg/resvg-js` rasterizes it into a PNG. The whole process runs at build time, with zero runtime cost.

Its limitations are worth knowing in advance: CSS only supports a subset (**no `z-index`, no `calc()`**; the default `display` is `flex` rather than block), and fonts only accept TTF / OTF / WOFF—**WOFF2 will simply fail**. Once you've stepped in the font-format pit, you usually won't step in it a second time.
## 7. Self-Check Before Going Live

The script below makes no assumptions. It **opens the real production page**, then fetches the images itself and measures their dimensions: it only passes if the measured width and height match what's declared in the meta.

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

Item 3 is the most valuable part of the entire script. It turns all the earlier "should be consistent in theory" assumptions into a **real measurement**—you don't have to trust anyone's memory (including your own) about image dimensions.

## Summary

- Social cards rely on `og:*` and `twitter:*`, search rich results rely on JSON-LD—**you need both, and neither replaces the other**;
- Open Graph has only four required properties; `og:image` must be an **absolute URL**, and `og:image:width/height` must match the **image's actual pixels**;
- The property name for `twitter:*` is `name`; images that are too small get **silently downgraded**;
- Structured data has "no required properties," but `headline / image / datePublished / author` effectively determines whether it's valid;
- All failures are silent—so **don't rely on your eyes**; use a script that can measure images itself to turn this into an observable check.

## References

- [The Open Graph protocol (ogp.me)](https://ogp.me/)
- [Google Search Central: Article (Article, NewsArticle, BlogPosting) structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google Search Central: Structured Data Markup Testing Tool](https://developers.google.com/search/docs/appearance/structured-data)
- [Vercel Satori: Convert HTML and CSS to SVG](https://github.com/vercel/satori)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)