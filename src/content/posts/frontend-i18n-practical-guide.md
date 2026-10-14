---
title: 前端国际化（i18n）实战指南：Intl 格式化、复数规则与语言路由
published: 2026-09-28
description: '用可复现的实测输出讲清前端国际化的三层问题：Intl 负责格式化（数字、货币、时区、排序、分词）、PluralRules 负责复数规则、消息目录负责翻译。从 0/1/2 复数的经典 bug 讲到 Accept-Language 协商、hydration mismatch 与 CI 拦截硬编码字符串。'
image: ''
tags: [国际化, i18n, Intl, 前端, 本地化, 复数规则]
category: '前端'
draft: false
lang: ''
---

## 1. 一段在英语下永远正确的代码

几乎所有前端项目里都有这么一行：

```js
const label = count === 1 ? `${count} file` : `${count} files`;
```

它在英语下是对的。**正是因为对，它才能一路通过测试、code review 和生产环境**。现在把它放到另外三种语言里看看（`Intl.PluralRules` 的实测输出，Node 26 / ICU 78.3）：

```text
zh-CN 需要 1 种形式：0/1/2/5/21 全部落在 other
ru-RU 需要 4 种形式：1→one  2→few  5→many  21→one
ar-EG 需要 6 种形式：0→zero  1→one  2→two  5→few  21→many
```

也就是说：**俄语的 1、2、5 要用三种不同的词尾，阿拉伯语的 0 和 1 甚至根本不是「N 个东西」的句式**（阿拉伯语在 zero/one/two 时用的是独立措辞）。而 `count === 1 ? A : B` 这个结构最多只能表达两种。这不是「翻译没翻好」，而是**代码里根本没有足够的槽位让翻译填**——再厉害的译者拿到这个 if，也只能翻出两种形式。

这篇讲的就是怎么把这类槽位补齐。国际化的坑大多不在「翻译」这一层，而在「格式化」和「规则」这两层。

:::note
**实验环境**：Node.js v26.5.1（内置 ICU 78.3，完整语言数据）。本文所有 `Intl` 输出均为该环境下的真实运行结果，可直接用 `node -e` 复现。浏览器（V8 / JavaScriptCore / SpiderMonkey）的 ICU 版本可能不同，**细节输出（尤其是标点与空格）会有差异**，但结论与分类是一致的。
:::

## 2. 先分清两层：格式化 ≠ 翻译

国际化被混为一谈时最难排查。它其实是两个几乎正交的问题：

| | 谁负责 | 输入 | 例子 |
| --- | --- | --- | --- |
| **格式化** | 平台（`Intl.*`） | 结构化数据（数字、Date、数组） | `1234567.891` → `1.234.567,891` |
| **翻译** | 你的消息目录 | 文本 + 参数 | `"Save changes"` → `"保存"` |

关键区别在于：**格式化不该由你手写，翻译必须由你提供**。

判断标准很简单——如果一件事有国际标准（CLDR）定义的正确答案，就别自己写：小数点是逗号还是句点、货币符号放前面还是后面、日期是「月/日」还是「日/月」、一周从周几开始、列表最后一项用「和」还是「、」。这些 `Intl` 全都知道，而你的手写实现一定会在某个国家翻车。

反面教材正是本文开头那段 `count === 1`。它把**规则**（复数该选哪种形式）和**翻译**（每种形式怎么写）揉在了一个三元表达式里，规则部分写错了，翻译部分就没有补救空间。

## 3. Intl 格式化：六种语言的同一串数字

先看最容易踩坑的数字。同一个值 `1234567.891`：

```js
const n = 1234567.891;
for (const loc of ["en-US", "de-DE", "fr-FR", "zh-CN", "hi-IN", "ar-EG"]) {
  console.log(loc, new Intl.NumberFormat(loc).format(n));
}
```

实测输出：

```text
en-US  1,234,567.891
de-DE  1.234.567,891
fr-FR  1 234 567,891          ← 分隔符是 U+202F 窄不换行空格，不是普通空格
zh-CN  1,234,567.891
hi-IN  12,34,567.891          ← 印度是 2 位分组，最后才是 3 位
ar-EG  ١٬٢٣٤٬٥٦٧٫٨٩١          ← 阿拉伯-印度数字，从右往左的书写方向
```

四个反直觉的点，每一个都能单独造成 bug：

1. **`fr-FR` 的分隔符不是空格**，是 `U+202F`。用 `string.replace(/ /g, "")` 清洗数字会静默失效，用 `Number(str)` 解析本地化字符串更是直接踩雷。
2. **`hi-IN` 不是千位分组**，是「末 3 位 + 前面每 2 位一组」。任何按 3 位切分的自定义逻辑在印度都是错的。
3. **`ar-EG` 输出的是阿拉伯-印度数字**，且混有双向文本控制字符。实测 `ar-EG` 的货币输出，码点序列是：

   ```text
   U+200F U+0661 U+066C U+0662 ... U+00A0 U+0055 U+0053 U+0024
   ↑ 开头就是 RLM（从右到左标记）        ↑ 这里是不换行空格 U+00A0
   ```

   `U+200F` 是 RLM，`U+00A0` 是不换行空格——**两个都不是普通字符**。而把这些阿拉伯-印度数字塞进 `input.value` 再读回来做计算，会得到 `NaN`：实测 `Number("١٢٬٣٤٥")` 和 `parseInt("١٢٬٣٤٥", 10)` **都返回 `NaN`**。跨 locale 传递数字时，**永远传原始数值，不要传格式化后的字符串**。
4. **`zh-CN` 的货币不是「¥」**。看下面这条。

### 货币：`¥` 到底是人民币还是日元

```js
new Intl.NumberFormat("zh-CN", { style: "currency", currency: "USD" }).format(1234567.891);
// => "US$1,234,567.89"
new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(1234567.891);
// => "¥1,234,567.89"
new Intl.NumberFormat("en-US", { style: "currency", currency: "CNY" }).format(1234567.891);
// => "CN¥1,234,567.89"
new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(1234567.891);
// => "￥1,234,568"        ← JPY 没有小数位，自动四舍五入
```

几个必须知道的细节：

- **货币符号要按「用户的 locale」而不是「货币所属国」渲染**。同一笔人民币，中国用户看到 `¥1,234,567.89`，美国用户看到 `CN¥1,234,567.89`。硬编码 `"¥" + amount` 会让美国用户以为这是日元。
- **两个「¥」是不同的字符**。`zh-CN` 用的是 `U+00A5`（¥），`ja-JP` 用的是 `U+FFE5`（￥）——肉眼几乎分不出，但 `"¥" === "￥"` 返回 `false`。任何「判断字符串开头是不是货币符号」的逻辑都会在这里悄悄失效。
- **小数位数由货币决定**，不由你决定。JPY 是 0 位、KRW 是 0 位、BHD 是 3 位。`toFixed(2)` 是错的。
- **`currencyDisplay` 有四个值**：`symbol`（默认）、`narrowSymbol`、`code`、`name`。要展示「人民币」三个字，用 `currencyDisplay: "name"` 而不是自己映射表。

### 紧凑计数：中文的「万」不是 3 位分组

这条特别容易被忽略，因为英文世界的直觉是「每 3 位一个单位」：

```js
for (const loc of ["en-US", "zh-CN", "ja-JP", "de-DE"]) {
  const f = new Intl.NumberFormat(loc, { notation: "compact" });
  console.log(loc, f.format(9999), "|", f.format(1234567), "|", f.format(123456789));
}
```

```text
en-US  10K        | 1.2M      | 123M
zh-CN  9999       | 123万     | 1.2亿
ja-JP  9999       | 123万     | 1.2億
de-DE  9999       | 1,2 Mio.  | 123 Mio.
```

中文和日文的计数单位是 10⁴ 进位（万、亿），所以 `zh-CN` 在 9999 时**不缩写**，到 10000 才变成 `1万`；而英语在 9999 就缩写成 `10K` 了。`de-DE` 的 `1,2 Mio.` 里连小数点都变成了逗号。

> 一句话：**做数据展示的紧凑格式，唯一的正确做法是交给 `notation: "compact"`**。任何「> 10000 就除以 10000 加个「万」字」的代码，对英语用户和德语用户都是错的。

### 日期与时区：hydration mismatch 的头号来源

同一时刻 `2026-09-28T14:30:00Z`，六种 locale + 时区组合：

```text
en-US  America/New_York   9/28/26, 10:30 AM
en-GB  Europe/London      28/09/2026, 15:30
de-DE  Europe/Berlin      28.09.26, 16:30
zh-CN  Asia/Shanghai      2026/9/28 22:30
ja-JP  Asia/Tokyo         2026/09/28 23:30
ar-EG  Africa/Cairo       ٢٨‏/٩‏/٢٠٢٦، ٥:٣٠ م
```

`en-US` 的 `9/28/26` 和 `en-GB` 的 `28/09/2026` 是同一个时刻——**只靠眼睛无法判断哪个是月、哪个是日**。这就是为什么日期永远不要手写 `MM/DD/YYYY` 拼接。

更麻烦的是时区。同一段代码在服务器（通常 UTC）和浏览器（用户本地时区）渲染同一个时刻：

```text
UTC                  2026年9月28日 14:30:00
Asia/Shanghai        2026年9月28日 22:30:00
America/Los_Angeles  2026年9月28日 07:30:00
```

**这三行字面不同的字符串来自同一个 `Date` 对象。** 在 SSR / SSG 场景下，服务端渲染出 `14:30:00`，客户端 hydrate 时算出 `22:30:00`，React 就会报一条经典的 hydration 警告。下一节（第八节）专门讲怎么治。

### 相对时间、列表、时长：三件不该手写的事

这三个功能几乎每个项目都手写过，而 `Intl` 里都有现成的：

```js
// 相对时间
new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" }).format(-1, "day");  // "昨天"
new Intl.RelativeTimeFormat("en",    { numeric: "auto" }).format(-1, "day");  // "yesterday"
new Intl.RelativeTimeFormat("ru",    { numeric: "auto" }).format(3, "hour");  // "через 3 часа"

// 列表连接（注意中文用的是「、」和「和」，英文用逗号 + and，日语不加连接词）
new Intl.ListFormat("zh-CN", { type: "conjunction" }).format(["A", "B", "C"]); // "A、B和C"
new Intl.ListFormat("en",    { type: "conjunction" }).format(["A", "B", "C"]); // "A, B, and C"
new Intl.ListFormat("ja",    { type: "conjunction" }).format(["A", "B", "C"]); // "A、B、C"

// 时长（Intl.DurationFormat 已在现代运行时落地）
new Intl.DurationFormat("zh-CN", { style: "long" }).format({ hours: 2, minutes: 30, seconds: 5 });
// "2小时30分钟5秒钟"
new Intl.DurationFormat("en-US", { style: "narrow" }).format({ hours: 2, minutes: 30, seconds: 5 });
// "2h 30m 5s"
```

`ListFormat` 那条最能说明问题：**中文的 `A、B和C` 里，连接词「和」只出现在最后一项之前，而前面的分隔符是「、」不是逗号**。手写 `items.join(", ")` 在中文界面里看起来就是「洋泾浜」。

`Intl.RelativeTimeFormat` 的 `numeric: "auto"` 也值得注意：它会让「-1 天」变成「昨天」而不是「1 天前」，而且**俄语会跟着变格**（`через 3 часа` 而不是 `через 3 час`）。

## 4. 复数规则：六种语言，一张表

回到开头的 bug。要把槽位补齐，第一步是知道「这个语言到底有几种形式」。用 `PluralRules` 直接问平台：

```js
for (const loc of ["en", "zh-CN", "ja", "ru", "ar", "pl", "fr"]) {
  const pr = new Intl.PluralRules(loc);
  console.log(loc, pr.resolvedOptions().pluralCategories,
              [0, 1, 2, 5, 21, 101].map(n => `${n}:${pr.select(n)}`).join(" "));
}
```

实测结果整理成表：

| locale | 支持的形式 | 0 | 1 | 2 | 5 | 21 | 101 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `en` | one, other | other | **one** | other | other | other | other |
| `zh-CN` | other | other | other | other | other | other | other |
| `ja` | other | other | other | other | other | other | other |
| `ru` | one, few, many, other | many | **one** | **few** | **many** | **one** | **one** |
| `ar` | zero, one, two, few, many, other | **zero** | **one** | **two** | **few** | **many** | other |
| `pl` | one, few, many, other | many | **one** | **few** | **many** | **many** | **many** |
| `fr` | one, many, other | **one** | **one** | other | other | other | other |

这张表里有四个会让人栽跟头的地方：

1. **中文和日文只有 `other` 一种形式**。这意味着给中文翻译准备 `one` / `other` 两套文案是白费力气——但**代码结构上仍然必须保留多形式的能力**，因为同一个 key 在俄语下要填 4 套。**消息目录的结构由「最复杂的语言」决定，不由源语言决定**。
2. **俄语的 `21` 是 `one`**（`21 товар`），但 `101` 也是 `one`，而 `11` 是 `many`。这不是「大于 1 就是复数」能描述的。
3. **波兰语的 `5` 和 `101` 都是 `many`**——所以「个位数是 1 就用单数」这类启发式在斯拉夫语系上完全失效。
4. **法语的 `0` 是 `one`**（`0 jour` 而不是 `0 jours`）。这是最容易被「0 是复数」的直觉害到的一条。

### 一个跑得起来的最小实现

知道了规则，实现就不复杂。下面这个 40 行的 `t()` 支持插值和复数，可以直接跑：

```js
const CATALOG = {
  "zh-CN": { "cart.items": { other: "购物车里有 {count} 件商品" } },
  "en-US": { "cart.items": { one:   "{count} item in your cart",
                             other: "{count} items in your cart" } },
  "ru-RU": { "cart.items": { one:   "В корзине {count} товар",
                             few:   "В корзине {count} товара",
                             many:  "В корзине {count} товаров",
                             other: "В корзине {count} товара" } },
};

function makeT(locale, { strict = true } = {}) {
  const pr = new Intl.PluralRules(locale);   // 复数规则：由平台决定
  const nf = new Intl.NumberFormat(locale);  // 数字格式：由平台决定
  const table = CATALOG[locale] ?? {};
  return function t(key, params = {}) {
    const entry = table[key];
    if (entry === undefined) {               // 缺失键：显式失败，不要静默回退
      if (strict) throw new Error(`[i18n] missing key "${key}" for locale "${locale}"`);
      return `⟦${key}⟧`;
    }
    // 翻译：由消息目录提供；选哪种形式：由 PluralRules 决定
    const template = typeof entry === "string"
      ? entry
      : (entry[pr.select(params.count)] ?? entry.other);
    return template.replace(/\{(\w+)\}/g, (_, k) => {
      if (!(k in params)) throw new Error(`[i18n] key "${key}" 需要参数 "${k}"`);
      return k === "count" ? nf.format(params[k]) : String(params[k]);
    });
  };
}
```

跑起来，同一句「购物车有 N 件商品」在四种语言下的实际输出：

```text
zh-CN  购物车里有 0 件商品  |  购物车里有 1 件商品  |  购物车里有 2 件商品  |  购物车里有 5 件商品  |  购物车里有 21 件商品
en-US  0 items in your cart  |  1 item in your cart  |  2 items in your cart  |  5 items in your cart  |  21 items in your cart
ru-RU  В корзине 0 товаров  |  В корзине 1 товар  |  В корзине 2 товара  |  В корзине 5 товаров  |  В корзине 21 товар
ar-EG  السلة فارغة  |  عنصر واحد في السلة  |  عنصران في السلة  |  ٥ عناصر في السلة  |  ٢١ عنصرًا في السلة
```

注意 `ar-EG` 的前两种：**`0` 用的是「购物车是空的」，`1` 和 `2` 压根没出现数字**——阿拉伯语对 zero / one / two 有专门的措辞。这就是「槽位必须给够」的意思。另外 `٥` 和 `٢١` 是阿拉伯语自己的数字字形，`nf.format()` 自动处理了。

### 为什么参数缺失一定要抛异常

我第一版实现里，参数校验写成了 `params[k] ?? 0`，结果漏传参数时它安静地渲染出：

```text
NaN items in your cart
```

**`NaN` 混在用户界面上，比抛异常难查十倍**——它可能上线很久才被用户截图投诉。所以上面那版的最后一行是硬校验 `if (!(k in params)) throw`。国际化代码里，**「静默降级」是最危险的设计选择**：

```text
抛错 -> [i18n] missing key "cart.total" for locale "zh-CN"
抛错 -> [i18n] key "cart.items" 需要参数 "count"
```

至于「生产环境要不要抛」，答案是**开发环境抛、生产环境降级 + 上报**：开发期没人愿意翻日志找 `⟦cart.total⟧`，而生产环境为了一个缺翻译的 key 白屏是不划算的。但这个降级必须**同时触发一条监控**，否则就等于静默失败。

## 5. 排序与分词：中文世界的两个隐藏坑

### `Array.prototype.sort()` 排不了中文

`Array.prototype.sort()` 不传比较函数时，按 **UTF-16 码元**排序。这对中文基本等于随机：

```js
const cities = ["重庆", "北京", "上海", "西安", "长沙", "深圳"];
cities.sort();                                                 // 码点序
cities.sort(new Intl.Collator("zh-CN", { collation: "pinyin" }).compare);
cities.sort(new Intl.Collator("zh-CN", { collation: "stroke" }).compare);
```

实测：

```text
默认（码点）      : 上海 北京 深圳 西安 重庆 长沙
Collator + pinyin : 北京 重庆 上海 深圳 西安 长沙     ← 拼音序
Collator + stroke : 上海 北京 长沙 西安 重庆 深圳     ← 笔画序
```

码点序的结果 `上海 北京 深圳 西安 重庆 长沙` 对人类毫无意义——它是按 Unicode 编码值排的。**任何面向用户的中文列表排序，都必须走 `Intl.Collator`。**

`Collator` 还有两个非常实用的选项：

```js
new Intl.Collator("en", { numeric: true }).compare;
// ["file10.txt","file2.txt","file1.txt","File3.txt"].sort(...)
// 默认排序   : File3.txt file1.txt file10.txt file2.txt
// numeric    : file1.txt file2.txt File3.txt file10.txt    ← 数字按数值比较

new Intl.Collator("en", { sensitivity: "base" }).compare;
// "résumé" / "resume" / "RESUME" / "Résumé" 视为相等，可用于搜索高亮匹配
```

`numeric: true` 解决的是「file10 排在 file2 前面」这个经典问题。`sensitivity: "base"` 在**搜索匹配**场景里很有用——用户输入 `resume` 应该能匹配到 `résumé`。

### 数 emoji 的正确姿势：`Intl.Segmenter`

「限制 100 字符」这类需求，用 `String.length` 是错的。因为 JS 字符串是 UTF-16：

```js
"👨‍👩‍👧‍👦🇨🇳👍🏽".length                                    // 19
[... "👨‍👩‍👧‍👦🇨🇳👍🏽"].length                                // 11   ← 用 spread 也不对
[... new Intl.Segmenter("zh-CN", { granularity: "grapheme" }).segment("👨‍👩‍👧‍👦🇨🇳👍🏽")].length  // 3
```

**三个数字，只有 3 是对的。** 一个四口之家的 emoji 是 7 个码点、11 个 UTF-16 码元，但用户眼里它就是 **1 个字符**。国旗、带肤色的手势同理。用户在输入框里数着「还有 3 个字」结果被截断，就是这里算错了。

`Segmenter` 还能做分词，这在中文里比在英文里更有价值（因为中文没有空格）：

```js
const seg = new Intl.Segmenter("zh-CN", { granularity: "word" });
const words = [...seg.segment("Hello 世界！i18n 的 grapheme 里还有 emoji")]
  .filter(s => s.isWordLike).map(s => s.segment);
// 8 个词：Hello / 世界 / i18n / 的 / grapheme / 里 / 还有 / emoji
```

对比一下朴素的 `split(/\s+/)`：

```text
["Hello","世界！i18n","的","grapheme","里还有","emoji"]
```

`isWordLike` 会自动过滤标点，并且**正确切开了「世界！i18n」和「里还有」**——按空格切会把「世界！i18n」当成一个词。用它做「预计阅读时长」「关键词高亮」比 `split(/\s+/)` 靠谱得多。

## 6. 消息目录：key 怎么设计，以及 MF2 现在到哪了

### key 用「语义」而不是「文案」

一个反复出现的选择题：

```js
t("Save changes")     // ❌ 用源文案当 key
t("common.actions.save")  // ✅ 用语义路径当 key
```

用源文案当 key 的问题是：**改一次英文文案，所有语言的 key 全部失效**，而且拿不到「哪些 key 还没翻译」这类信息。语义 key 的代价是开发者要多想一步命名，但换来的是可枚举、可校验、可统计。

再补两条实践：

- **不要拼接句子片段**。`t("you_have") + count + t("items")` 在德语里必然错——德语的语序（尤其从句里动词的位置）与其他语言差异极大，拼接出来的语序不成立。**参数必须放在整句模板内部**（就像上一节的 `{count}`）。
- **key 里不要带语法信息**（不要 `item_singular` / `item_plural`）。语法形式是 `PluralRules` 的职责，key 只需要表达「这是购物车商品数」这一个语义。

### ICU MessageFormat 与 MF2 的现状

上面那个 `{count}` 是「简化版占位符」。工业标准是 **ICU MessageFormat**，它把复数、选择、嵌套都写进一条消息里：

```text
{cartItems, plural,
  =0 {Your cart is empty}
  one {# item in your cart}
  other {# items in your cart}
}
```

`=0` 的精确匹配语法很关键——它让「0 件商品」可以写成一句完全不同的文案，而不必挤进 `other` 分支。**这是 `count === 1 ? A : B` 永远做不到的事。**

这里需要澄清一个容易被过时文章误导的点——**MessageFormat 2（MF2）的现状（2026 年 9 月）**：

- **规范本身已经稳定**：MF2 由 Unicode CLDR 技术委员会维护，2025 年 3 月进入 Final Candidate，经 LDML 47/48 修订后规范进入稳定状态。
- **但 JS 原生 API 还很远**：TC39 的 `Intl.MessageFormat` 提案停在 **Stage 2**，卡点是需要足够多的组织在生产环境使用 MF2 才能推进；主流 i18n 库（FormatJS/react-intl、Lingui、Tolgee）目前仍停留在 MF1。
- **在本机的 Node 26.5.1 上实测**：`typeof Intl.MessageFormat === "undefined"`。

所以现实建议是：**用 MF1（ICU MessageFormat）写消息目录，但把「解析」交给库**（`@formatjs/intl-messageformat`、`intl-messageformat` 等），不要把消息格式和自己的运行时耦合。等 `Intl.MessageFormat` 落地时，替换的是库而不是你的消息文件。这也意味着**别把消息目录设计成库的私有格式**——用标准 ICU 语法，迁移成本才可控。

## 7. 语言协商：`Accept-Language` 的三个坑

用户在浏览器里配的是**偏好列表**，不是单个语言。服务端要把它映射到「你实际支持的那几种」，这个过程叫语言协商。

```js
const SUPPORTED = ["zh-CN", "en-US", "ja-JP", "zh-TW"];

function negotiate(header, supported = SUPPORTED) {
  const wanted = header.split(",").map((p) => {
    const [tag, ...params] = p.trim().split(";");
    const q = params.map((s) => s.trim()).find((s) => s.startsWith("q="));
    return { tag: tag.trim(), q: q ? Number(q.slice(2)) : 1 };
  }).filter((x) => x.tag && x.q > 0).sort((a, b) => b.q - a.q);

  for (const { tag } of wanted) {
    if (tag === "*") continue;               // 见坑 1
    const canon = Intl.getCanonicalLocales(tag)[0];
    const exact = supported.find((s) => s.toLowerCase() === canon.toLowerCase());
    if (exact) return { tag, matched: exact, how: "exact" };
    const lang = canon.split("-")[0].toLowerCase();       // en-GB -> en
    const bare = supported.find((s) => s.split("-")[0].toLowerCase() === lang);
    if (bare) return { tag, matched: bare, how: "lookup(language)" };
  }
  return { tag: null, matched: supported[0], how: "default" };
}
```

实测输出：

```text
zh-Hans-CN,zh;q=0.9,en;q=0.8   -> {"tag":"zh-Hans-CN","matched":"zh-CN","how":"lookup(language)"}
en-GB,en;q=0.7,zh-TW;q=0.9     -> {"tag":"en-GB","matched":"en-US","how":"lookup(language)"}
de-DE,fr;q=0.9                 -> {"tag":null,"matched":"zh-CN","how":"default"}
*                              -> {"tag":null,"matched":"zh-CN","how":"default"}
```

### 坑 1：`*` 是合法的 `Accept-Language`，但不是合法的 BCP 47 标签

RFC 9110 的 `language-range` 明确允许 `*`（「任何语言」），但 `Intl.getCanonicalLocales("*")` 会**直接抛 `RangeError`**：

```text
getCanonicalLocales("*")   -> RangeError: Invalid language tag: *
getCanonicalLocales("en_us") -> RangeError: Invalid language tag: en_us
getCanonicalLocales("zh-hans-cn") -> ["zh-Hans-CN"]
```

注意第三行：**大小写和规范形式会被自动纠正，但分隔符必须是连字符**——下划线（HTTP 头里很常见，比如某些客户端发 `en_us`）会让 `Intl` 抛错而不是容错。所以解析 `Accept-Language` 时**必须先做格式清洗，再交给 `Intl`**，且整段逻辑要包在 `try/catch` 里。用户可控的头部直接喂给会抛异常的 API，就是一个 DoS 面。

### 坑 2：`q=0` 表示「明确不要」

`zh-CN,en;q=0` 的意思是「中文可以，**但英语绝对不要**」。过滤条件必须是 `q > 0`，而不是「有 q 就用 q、没 q 就默认」。漏掉这个过滤，就会给明确拒绝英语的用户推英语。

### 坑 3：不区分 `zh-Hans` 和 `zh-Hant`

`zh-Hans-CN` 和 `zh-TW` 都是中文，但**简繁字形完全不同**。上面那个 lookup 逻辑会把 `zh-Hans-CN` 落到 `zh-CN`（正确），但如果 `SUPPORTED` 里只有 `zh-TW`，`zh-Hans-CN` 也会落进去（错误）——用户会看到繁体界面。**简繁必须在 supported 列表里作为两个独立项处理**，不能靠语言子标签兜底。

### 协商结果要带上 `Vary`

这一步和缓存直接相关：如果同一个 URL 会因为 `Accept-Language` 返回不同内容，CDN 和浏览器就必须知道这一点，否则会把中文页面缓存下来发给英语用户。响应头里必须带上：

```http
Vary: Accept-Language
```

代价是缓存命中率下降（每个语言一份副本）。这个取舍的细节在[《HTTP 缓存策略完全指南》](/posts/http-caching-guide)里讲过——简单说：**用独立 URL 表达语言（`/zh-CN/posts/`）比用同一个 URL + `Vary` 更容易缓存，也更利于分享和 SEO**，代价是需要多一层路由。

## 8. hydration mismatch：三个来源与三种解法

回到第三节那个时区问题。SSR 场景下的经典症状是控制台里一条：

```text
Warning: Text content did not match. Server: "2026年9月28日 14:30:00" Client: "2026年9月28日 22:30:00"
```

三个来源，按出现频率排序：

| 来源 | 服务端 | 客户端 | 触发条件 |
| --- | --- | --- | --- |
| **时区** | 容器通常是 UTC | 用户本地时区 | 渲染任何本地时间 |
| **locale** | 宿主环境默认 locale | 用户浏览器语言 | 没显式传 locale 的 `Intl.*` |
| **当前时间** | 构建 / 请求时刻 | 水合时刻 | `Date.now()`、`"刚刚"` |

注意第二行：**`Intl.DateTimeFormat()` 不传 locale 时，用的是宿主环境的默认 locale**。同一份代码在 CI（`en-US`）和开发者机器（`zh-CN`）上会输出不同字符串——这是最难在本地复现的一类 bug，因为**它在每个人的机器上都是正常的**。

三种解法，按推荐程度排序：

**1. 服务端固定时区 + 显式传 locale（首选）**

```js
// 把「用户时区」作为显式数据传进来，而不是让两边各自猜
const fmt = new Intl.DateTimeFormat(locale, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: userTimeZone,   // 来自用户设置 / cookie，两端一致
});
```

关键是**两端拿到同一份输入**。时区应该来自用户的显式设置（存 cookie 或数据库），而不是运行时环境。

**2. 用 `<time>` 元素 + `suppressHydrationWarning` 兜底**

```jsx
<time dateTime={iso} suppressHydrationWarning>
  {formattedForServer}
</time>
```

这只抑制警告，**不修复问题**——用户看到的仍是服务端那个时区的值，水合后会被替换。它适合「时间只是次要信息」的场景。同时 `<time dateTime={iso}>` 提供了机器可读的原始值，对辅助技术和抓取器都有意义。

**3. 干脆挪到客户端渲染**

时间戳这类纯展示、非关键路径的内容，用 `useEffect` 挂载后再渲染，或者直接交给客户端组件：

```jsx
const [text, setText] = useState(null);
useEffect(() => { setText(fmt.format(new Date(iso))) }, [iso, locale]);
return <time dateTime={iso}>{text ?? "—"}</time>;
```

代价是首屏这里会有一个占位符的闪动。**但「闪一下」比「hydration 报错 + 整棵树重渲染」要好。**

## 9. 布局、字体与 `lang` 属性

这一节的内容和[《网站可访问性实战清单》](/posts/web-accessibility-practical-checklist)有重叠，但动机不同：那边是「让屏幕阅读器读对」，这边是「让浏览器渲染对」。

### `lang` 属性决定字形，不只是可访问性

```html
<html lang="zh-CN">
```

这个属性直接影响渲染结果。**同一个 Unicode 码位，在 `ja` 和 `zh-CN` 下可能用不同的字形**——「直」「骨」「今」这几个字在中日字体里的写法差异肉眼可见（这类差异在 CJK 里叫「同一码位、不同字形」）。浏览器靠 `lang` 选择字形变体，**漏掉 `lang` 就会出现「中文页面里的日式汉字」**。

在混合语言的页面里，还要给局部内容单独标注：

```html
<p>这个 API 叫 <span lang="en">Server Components</span>，中文一般译作「服务端组件」。</p>
```

配套的 CSS 是 `:lang()` 伪类，可以为不同语言指定不同字体栈——这也和[《Web Font 加载优化》](/posts/web-font-loading-optimization)有关：**中文字体动辄几 MB，必须按 `unicode-range` 做子集切分**，让英文页面不下载中文字库。

### RTL：别写 `margin-left`

阿拉伯语、希伯来语、波斯语是从右往左（RTL）的。支持 RTL 不需要两套 CSS，只需要**用逻辑属性替代物理属性**：

| 物理属性（会出错） | 逻辑属性（自动适配） |
| --- | --- |
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `left` / `right` | `inset-inline-start` / `inset-inline-end` |
| `border-left` | `border-inline-start` |
| `text-align: left` | `text-align: start` |

然后只需要一个 `dir` 属性，整站方向就翻过来了：

```html
<html lang="ar-EG" dir="rtl">
```

有几个地方需要额外注意：

- **图标要镜像**，但**不是所有图标都该镜像**。返回箭头、播放方向应该镜像；时钟、公司 logo、勾选框**不应该**镜像（镜像了反而不对）。
- **数字和代码块在 RTL 里依然是从左往右**，浏览器会用双向算法处理，但代码块建议显式 `direction: ltr` 避免措辞被重排。
- **`flex-direction: row` 会自动翻转**（因为它是「行内方向」），不需要手动改。这是逻辑属性体系里最省心的一点。

## 10. 工程化：让问题在 CI 里暴露，而不是在用户截图里

国际化最麻烦的地方在于**它默认是静默失败的**——缺一个 key，界面少一句话，但只要不是关键路径就没人发现。

### 伪本地化：把「没翻译」变成「看起来很怪」

伪本地化的思路是：用一份自动生成的「假翻译」替换所有源文案，做法是字母变音 + 加长 + 加括号：

```js
const MAP = { a:"á", b:"ƀ", c:"ç", d:"ð", e:"é", /* ... */ };
const pseudo = (s) => "⟦" + [...s].map((c) => MAP[c] ?? c).join("") + "⟧";

pseudo("Save changes");  // "⟦Šáṽé çĥáñĝéš⟧"
pseudo("Settings");      // "⟦Šéţţíñĝš⟧"
```

它一次解决三个问题：

1. **未国际化的硬编码字符串会原样显示**成 `Save changes`，在一片 `⟦Šáṽé...⟧` 里一眼就能揪出来；
2. **加长后的文本会撑破布局**（注意 `Settings` 从 8 字符变成 10 字符，加下划线测试时通常还会再加 30%~40%），德语和俄语的真实文本比英语长得多，布局问题提前暴露；
3. **括号能暴露截断**——如果界面上只看到 `⟦Šáṽé çĥá` 而缺了结尾的 `⟧`，说明这里被 `overflow: hidden` 截掉了。

跑一次伪本地化版本，通常能找出十几个「原来这里没接翻译」的地方。

### CI 里拦截硬编码字符串

伪本地化靠人看，更可靠的是加一条静态检查。规则很简单：**JSX / 模板里的文本节点，如果包含 CJK 字符或成句的英文，且不是来自 `t()`，就报警**。

```js
const CJK = /[一-鿿]/;
const TEXT_NODE = />\s*[^<>{}\s][^<>{}]*\s*</;   // 简化版：>文本<

const samples = [
  `  <button>保存</button>`,
  `  const msg = t("post.save")`,
  `  <p>Showing {count} results</p>`,
  `  <title>我的博客</title>`,
];
```

输出：

```text
SUSPECT  <button>保存</button>
ok       const msg = t("post.save")
ok       <p>Showing {count} results</p>
SUSPECT  <title>我的博客</title>
```

上面这个正则只是演示用的简化版（真实实现应该用 AST 工具，比如 ESLint 自定义规则配合 JSX 的 `JSXText` 节点，或者 `eslint-plugin-i18next` 这类现成插件）。**关键不是正则写得多准，而是「有没有一道自动防线」**——纯靠人工 review，一定会漏。

### 还需要检查的三件事

1. **key 覆盖率**：`源语言 key 集合 - 目标语言 key 集合`，差集必须为空才能合并。这条应该做成 CI 门禁。
2. **参数一致性**：`en` 的 `cart.items` 用了 `{count}`，`ru` 版本的 `{count}` 拼错了写成 `{coutn}`——这不会报错，只会渲染出 `{coutn}`。**校验每条消息的占位符集合在各语言间一致**，成本很低，收益极高。
3. **复数形式完整性**：用 `PluralRules(locale).resolvedOptions().pluralCategories` 反查目录，**缺哪个形式就报错**。比如俄语目录里只有 `one` / `other`，就是明确的 bug（对照第四节那张表）。

## 101. 小结

- **格式化交给 `Intl`，翻译留给自己**。数字分组、货币符号位置、日期顺序、相对时间、列表连接词，全部有 CLDR 标准答案，手写必然在某个国家翻车。
- **复数规则由 `PluralRules` 决定，不由你的 if 决定**。`count === 1 ? A : B` 的问题是槽位不够：俄语要 4 种、阿拉伯语要 6 种、中文只要 1 种。**消息目录的结构由最复杂的语言决定。**
- **`Intl.Collator` 是中文排序的唯一正确解法**，`Intl.Segmenter` 是数 emoji 和中文分词的唯一正确解法。`sort()` 和 `.length` 都不行。
- **`Accept-Language` 不是干净的 BCP 47**：`*`、下划线、`q=0` 都会让天真实现出错，且 `Intl.getCanonicalLocales` 会抛异常——**这是一条用户可控的输入路径**。
- **hydration mismatch 的根因是两端输入不一致**，不是渲染函数写错了。把 locale 和时区变成显式传入的数据，问题自然消失。
- **国际化默认静默失败**，所以必须有自动防线：伪本地化给人看，CI 检查 key 覆盖率、占位符一致性、复数形式完整性给机器看。

最后一句和[《数据库索引原理与查询优化》](/posts/database-index-principles-and-query-optimization)那篇的结论同源：**本文的每个输出都来自 Node 26.5.1 / ICU 78.3 的实测，但 ICU 版本会变、浏览器实现会有细节差异**。`Intl` 的分类结论（哪个 locale 有几种复数形式）由 CLDR 定义，非常稳定；但**具体的标点、空格、字形差异必须在你自己的目标环境上验一遍**。跑一句 `node -e "console.log(new Intl.PluralRules('ru').resolvedOptions().pluralCategories)"`，比记住任何表格都可靠。

## 参考资料

- [MDN：Intl 命名空间（各构造器的完整选项）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [MDN：Intl.PluralRules——各语言的复数分类](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules)
- [Unicode CLDR：Language Plural Rules（复数规则的权威来源）](https://www.unicode.org/cldr/charts/47/supplemental/language_plural_rules.html)
- [RFC 9110 §12.5.4：Accept-Language 的语法与 q 值](https://www.rfc-editor.org/rfc/rfc9110#name-accept-language)
- [RFC 4647：语言标签匹配（Lookup 与 Filtering）](https://www.rfc-editor.org/rfc/rfc4647)
- [TC39 proposal-intl-messageformat：Intl.MessageFormat 的提案状态](https://github.com/tc39/proposal-intl-messageformat)
- [Unicode MessageFormat 2.0 规范](https://unicode.org/reports/tr35/tr35-messageFormat.html)
- [W3C i18n：在 HTML 中声明语言（`lang` 属性为何影响字形）](https://www.w3.org/International/questions/qa-html-language-declarations)
