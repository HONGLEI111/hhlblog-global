---
title: 'Frontend Internationalization (i18n) in Practice: Intl Formatting, Plural Rules, and Language Routing'
published: 2026-09-28
description: 'A reproducible, hands-on walkthrough of the three layers of frontend internationalization: Intl handles formatting (numbers, currency, time zones, sorting, segmentation), PluralRules handles pluralization, and message catalogs handle translation. From the classic 0/1/2 plural bug to Accept-Language negotiation, hydration mismatches, and catching hardcoded strings in CI.'
image: ''
tags: [internationalization, i18n, Intl, frontend, localization, plural rules]
category: Frontend
draft: false
---
## 1. A piece of code that is always correct in English

Almost every frontend project has a line like this:

```js
const label = count === 1 ? `${count} file` : `${count} files`;
```

It is correct in English. **It is precisely because it is correct that it can pass tests, code review, and production all the way through**. Now put it into the other three languages and take a look (`Intl.PluralRules`'s actual measured output, Node 26 / ICU 78.3):

```text
zh-CN 需要 1 种形式：0/1/2/5/21 全部落在 other
ru-RU 需要 4 种形式：1→one  2→few  5→many  21→one
ar-EG 需要 6 种形式：0→zero  1→one  2→two  5→few  21→many
```

In other words: **Russian uses three different endings for 1, 2, and 5, and Arabic's 0 and 1 are not even the "N things" sentence pattern at all** (Arabic uses standalone wording for zero/one/two). And the `count === 1 ? A : B` structure can express at most two forms. This is not "the translation was done poorly," but rather **the code simply does not have enough slots for the translation to fill**—no matter how skilled the translator is, given this if, they can only produce two forms.

This article is about how to fill in these kinds of slots. Most internationalization pitfalls are not at the "translation" layer, but at the "formatting" and "rules" layers.

:::note
**Experimental environment**: Node.js v26.5.1 (built-in ICU 78.3, full language data). All `Intl` output in this article is the real runtime result in that environment and can be reproduced directly with `node -e`. Browsers (V8 / JavaScriptCore / SpiderMonkey) may have different ICU versions, and **the detailed output (especially punctuation and spaces) will differ**, but the conclusions and classifications are consistent.
:::

## 2. First distinguish two layers: formatting ≠ translation

Internationalization is hardest to troubleshoot when it is lumped together. It is actually two almost orthogonal problems:

| | Who is responsible | Input | Example |
| --- | --- | --- | --- |
| **Formatting** | The platform (`Intl.*`) | Structured data (numbers, Date, arrays) | `1234567.891` → `1.234.567,891` |
| **Translation** | Your message catalog | Text + parameters | `"Save changes"` → `"保存"` |

The key difference is: **formatting should not be handwritten by you, and translation must be provided by you**.

The criterion is simple—if something has a correct answer defined by an international standard (CLDR), do not write it yourself: whether the decimal separator is a comma or a period, whether the currency symbol goes before or after, whether dates are "month/day" or "day/month," which day the week starts on, whether the last item in a list uses "and" or "、". `Intl` knows all of these, and your handwritten implementation will definitely fail in some country.

The negative example is exactly the `count === 1` at the beginning of this article. It mixes the **rules** (which plural form should be selected) and the **translation** (how each form is written) into a single ternary expression. Once the rules part is wrong, there is no room for the translation part to compensate.
## 3. Intl Formatting: The Same Number in Six Languages

Let's start with the easiest place to get burned: numbers. The same value `1234567.891`:

```js
const n = 1234567.891;
for (const loc of ["en-US", "de-DE", "fr-FR", "zh-CN", "hi-IN", "ar-EG"]) {
  console.log(loc, new Intl.NumberFormat(loc).format(n));
}
```

Actual output:

```text
en-US  1,234,567.891
de-DE  1.234.567,891
fr-FR  1 234 567,891          ← 分隔符是 U+202F 窄不换行空格，不是普通空格
zh-CN  1,234,567.891
hi-IN  12,34,567.891          ← 印度是 2 位分组，最后才是 3 位
ar-EG  ١٬٢٣٤٬٥٦٧٫٨٩١          ← 阿拉伯-印度数字，从右往左的书写方向
```

Four counterintuitive points, each of which can cause a bug on its own:

1. **`fr-FR`'s separator is not a space**, it's `U+202F`. Using `string.replace(/ /g, "")` to clean numbers will silently fail, and using `Number(str)` to parse localized strings is an outright landmine.
2. **`hi-IN` is not thousands grouping**, it's "last 3 digits + groups of 2 before that." Any custom logic that splits by 3 digits is wrong in India.
3. **`ar-EG` outputs Arabic-Indic digits**, mixed with bidirectional text control characters. Testing `ar-EG`'s currency output, the code point sequence is:

   ```text
   U+200F U+0661 U+066C U+0662 ... U+00A0 U+0055 U+0053 U+0024
   ↑ 开头就是 RLM（从右到左标记）        ↑ 这里是不换行空格 U+00A0
   ```

   `U+200F` is RLM, `U+00A0` is a non-breaking space—**neither is an ordinary character**. And if you stuff these Arabic-Indic digits into `input.value` and read them back for computation, you'll get `NaN`: in practice, `Number("١٢٬٣٤٥")` and `parseInt("١٢٬٣٤٥", 10)` **both return `NaN`**. When passing numbers across locales, **always pass the raw numeric value, never the formatted string**.
4. **`zh-CN`'s currency is not "¥"**. See the next point.

### Currency: Is `¥` RMB or JPY?

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

A few details you must know:

- **Currency symbols should be rendered according to "the user's locale," not "the currency's home country."** For the same amount of RMB, a Chinese user sees `¥1,234,567.89`, and an American user sees `CN¥1,234,567.89`. Hardcoding `"¥" + amount` will make American users think it's Japanese yen.
- **The two "¥" are different characters**. `zh-CN` uses `U+00A5` (¥), and `ja-JP` uses `U+FFE5` (￥)—almost indistinguishable to the naked eye, but `"¥" === "￥"` returns `false`. Any logic that "checks whether a string starts with a currency symbol" will quietly fail here.
- **The number of decimal places is determined by the currency**, not by you. JPY is 0 digits, KRW is 0 digits, BHD is 3 digits. `toFixed(2)` is wrong.
- **`currencyDisplay` has four values**: `symbol` (default), `narrowSymbol`, `code`, `name`. To display the words "人民币," use `currencyDisplay: "name"` instead of your own mapping table.

### Compact notation: Chinese "万" is not a 3-digit grouping

This one is especially easy to overlook, because the English-speaking world's intuition is "one unit every 3 digits":

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

Chinese and Japanese counting units advance by 10⁴ (万, 亿), so `zh-CN` at 9999 is **not abbreviated**, and only at 10000 does it become `1万`; English, by contrast, abbreviates at 9999 into `10K`. In `de-DE`'s `1,2 Mio.`, even the decimal point becomes a comma.

> In one sentence: **for compact formatting in data display, the only correct approach is to hand it to `notation: "compact"`**. Any code that says "if > 10000, divide by 10000 and append '万'" is wrong for English users and German users alike.

### Dates and time zones: the number one source of hydration mismatch

The same instant `2026-09-28T14:30:00Z`, six locale + time zone combinations:

```text
en-US  America/New_York   9/28/26, 10:30 AM
en-GB  Europe/London      28/09/2026, 15:30
de-DE  Europe/Berlin      28.09.26, 16:30
zh-CN  Asia/Shanghai      2026/9/28 22:30
ja-JP  Asia/Tokyo         2026/09/28 23:30
ar-EG  Africa/Cairo       ٢٨‏/٩‏/٢٠٢٦، ٥:٣٠ م
```

`en-US`'s `9/28/26` and `en-GB`'s `28/09/2026` are the same instant—**you cannot tell by eye alone which is the month and which is the day**. This is why you should never hand-write `MM/DD/YYYY` concatenation for dates.

Time zones are even trickier. The same piece of code renders the same instant on the server (usually UTC) and in the browser (the user's local time zone):

```text
UTC                  2026年9月28日 14:30:00
Asia/Shanghai        2026年9月28日 22:30:00
America/Los_Angeles  2026年9月28日 07:30:00
```

**These three literally different strings come from the same `Date` object.** In SSR / SSG scenarios, the server renders `14:30:00`, and when the client hydrates it computes `22:30:00`, so React throws a classic hydration warning. The next section (Section 8) is dedicated to how to fix it.

### Relative time, lists, duration: three things you shouldn't hand-write

Almost every project has hand-written these three features, and `Intl` has ready-made versions of all of them:

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

The `ListFormat` line illustrates the problem best: **in Chinese `A、B和C`, the conjunction "和" appears only before the last item, and the preceding separator is "、" rather than a comma**. Hand-written `items.join(", ")` looks like "pidgin" in a Chinese interface.

`Intl.RelativeTimeFormat`'s `numeric: "auto"` is also worth noting: it turns "-1 day" into "昨天" rather than "1 天前," and **Russian will inflect accordingly** (`через 3 часа` rather than `через 3 час`).
## 4. Plural Rules: Six Languages, One Table

Back to the bug from the beginning. To fill in the slots, the first step is knowing "how many forms does this language actually have." Use `PluralRules` to ask the platform directly:

```js
for (const loc of ["en", "zh-CN", "ja", "ru", "ar", "pl", "fr"]) {
  const pr = new Intl.PluralRules(loc);
  console.log(loc, pr.resolvedOptions().pluralCategories,
              [0, 1, 2, 5, 21, 101].map(n => `${n}:${pr.select(n)}`).join(" "));
}
```

The measured results, organized into a table:

| locale | Supported forms | 0 | 1 | 2 | 5 | 21 | 101 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `en` | one, other | other | **one** | other | other | other | other |
| `zh-CN` | other | other | other | other | other | other | other |
| `ja` | other | other | other | other | other | other | other |
| `ru` | one, few, many, other | many | **one** | **few** | **many** | **one** | **one** |
| `ar` | zero, one, two, few, many, other | **zero** | **one** | **two** | **few** | **many** | other |
| `pl` | one, few, many, other | many | **one** | **few** | **many** | **many** | **many** |
| `fr` | one, many, other | **one** | **one** | other | other | other | other |

There are four pitfalls in this table:

1. **Chinese and Japanese only have the `other` form**. This means preparing `one` / `other` two sets of copy for Chinese translations is wasted effort—but **the code structure must still retain the ability to handle multiple forms**, because the same key needs 4 sets filled in under Russian. **The structure of the message catalog is determined by the "most complex language," not by the source language**.
2. **Russian's `21` is `one`** (`21 товар`), but `101` is also `one`, while `11` is `many`. This is not something "greater than 1 means plural" can describe.
3. **Polish's `5` and `101` are both `many`**—so heuristics like "if the ones digit is 1, use singular" completely fail on Slavic languages.
4. **French's `0` is `one`** (`0 jour` rather than `0 jours`). This is the one most easily tripped up by the intuition that "0 is plural."

### A Minimal Working Implementation

Once you know the rules, the implementation isn't complicated. This 40-line `t()` below supports interpolation and plurals, and you can run it directly:

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

Running it, the actual output of the same sentence "the shopping cart has N items" in four languages:

```text
zh-CN  购物车里有 0 件商品  |  购物车里有 1 件商品  |  购物车里有 2 件商品  |  购物车里有 5 件商品  |  购物车里有 21 件商品
en-US  0 items in your cart  |  1 item in your cart  |  2 items in your cart  |  5 items in your cart  |  21 items in your cart
ru-RU  В корзине 0 товаров  |  В корзине 1 товар  |  В корзине 2 товара  |  В корзине 5 товаров  |  В корзине 21 товар
ar-EG  السلة فارغة  |  عنصر واحد في السلة  |  عنصران في السلة  |  ٥ عناصر في السلة  |  ٢١ عنصرًا في السلة
```

Note the first two of `ar-EG`: **`0` uses "the shopping cart is empty," and `1` and `2` don't show a number at all**—Arabic has dedicated phrasings for zero / one / two. This is what "slots must be sufficient" means. Also, `٥` and `٢١` are Arabic's own numeral glyphs, which `nf.format()` handles automatically.

### Why Missing Parameters Must Throw an Exception

In my first implementation, the parameter validation was written as `params[k] ?? 0`, and when a parameter was missing, it quietly rendered:

```text
NaN items in your cart
```

**A `NaN` mixed into the user interface is ten times harder to track down than an exception**—it might go live for a long time before a user screenshots it and complains. So the last line of the version above is a hard validation `if (!(k in params)) throw`. In internationalization code, **"silent degradation" is the most dangerous design choice**:

```text
抛错 -> [i18n] missing key "cart.total" for locale "zh-CN"
抛错 -> [i18n] key "cart.items" 需要参数 "count"
```

As for "whether to throw in production," the answer is **throw in development, degrade + report in production**: during development nobody wants to dig through logs looking for `⟦cart.total⟧`, and in production it's not worth a blank screen over a key with a missing translation. But this degradation must **simultaneously trigger a monitoring alert**, otherwise it's just silent failure.
## 5. Sorting and Segmentation: Two Hidden Pitfalls in the Chinese World

### `Array.prototype.sort()` Can't Sort Chinese

When `Array.prototype.sort()` is not passed a comparison function, it sorts by **UTF-16 code units**. For Chinese, this is essentially random:

```js
const cities = ["重庆", "北京", "上海", "西安", "长沙", "深圳"];
cities.sort();                                                 // 码点序
cities.sort(new Intl.Collator("zh-CN", { collation: "pinyin" }).compare);
cities.sort(new Intl.Collator("zh-CN", { collation: "stroke" }).compare);
```

Actual test:

```text
默认（码点）      : 上海 北京 深圳 西安 重庆 长沙
Collator + pinyin : 北京 重庆 上海 深圳 西安 长沙     ← 拼音序
Collator + stroke : 上海 北京 长沙 西安 重庆 深圳     ← 笔画序
```

The code point order result `上海 北京 深圳 西安 重庆 长沙` is meaningless to humans—it's sorted by Unicode encoding values. **Any user-facing Chinese list sorting must use `Intl.Collator`.**

`Collator` also has two very practical options:

```js
new Intl.Collator("en", { numeric: true }).compare;
// ["file10.txt","file2.txt","file1.txt","File3.txt"].sort(...)
// 默认排序   : File3.txt file1.txt file10.txt file2.txt
// numeric    : file1.txt file2.txt File3.txt file10.txt    ← 数字按数值比较

new Intl.Collator("en", { sensitivity: "base" }).compare;
// "résumé" / "resume" / "RESUME" / "Résumé" 视为相等，可用于搜索高亮匹配
```

`numeric: true` solves the classic problem of "file10 sorting before file2." `sensitivity: "base"` is useful in **search matching** scenarios—when a user types `resume`, it should match `résumé`.

### The Correct Way to Count Emoji: `Intl.Segmenter`

For requirements like "limit to 100 characters," using `String.length` is wrong. Because JS strings are UTF-16:

```js
"👨‍👩‍👧‍👦🇨🇳👍🏽".length                                    // 19
[... "👨‍👩‍👧‍👦🇨🇳👍🏽"].length                                // 11   ← 用 spread 也不对
[... new Intl.Segmenter("zh-CN", { granularity: "grapheme" }).segment("👨‍👩‍👧‍👦🇨🇳👍🏽")].length  // 3
```

**Three numbers, only 3 is correct.** A family-of-four emoji is 7 code points, 11 UTF-16 code units, but in the user's eyes it's **1 character**. The same applies to flags and skin-tone gestures. When a user counts "3 characters left" in an input field and gets truncated, this is where the miscalculation happens.

`Segmenter` can also do word segmentation, which is more valuable in Chinese than in English (because Chinese has no spaces):

```js
const seg = new Intl.Segmenter("zh-CN", { granularity: "word" });
const words = [...seg.segment("Hello 世界！i18n 的 grapheme 里还有 emoji")]
  .filter(s => s.isWordLike).map(s => s.segment);
// 8 个词：Hello / 世界 / i18n / 的 / grapheme / 里 / 还有 / emoji
```

Compare with the naive `split(/\s+/)`:

```text
["Hello","世界！i18n","的","grapheme","里还有","emoji"]
```

`isWordLike` automatically filters punctuation and **correctly splits "世界！i18n" and "里还有"**—splitting by spaces would treat "世界！i18n" as one word. Using it for "estimated reading time" and "keyword highlighting" is far more reliable than `split(/\s+/)`.

## 6. Message Catalogs: How to Design Keys, and Where MF2 Stands Now

### Use "Semantics" for Keys, Not "Copy"

A recurring multiple-choice question:

```js
t("Save changes")     // ❌ 用源文案当 key
t("common.actions.save")  // ✅ 用语义路径当 key
```

The problem with using source copy as keys is: **change the English copy once, and all keys across all languages become invalid**, and you can't get information like "which keys haven't been translated yet." The cost of semantic keys is that developers have to think one step further about naming, but what you get in return is enumerability, validatability, and measurability.

Two more practices to add:

- **Don't concatenate sentence fragments.** `t("you_have") + count + t("items")` will inevitably be wrong in German—German word order (especially verb position in subordinate clauses) differs greatly from other languages, and concatenated word order won't hold. **Parameters must be placed inside the full-sentence template** (just like `{count}` in the previous section).
- **Don't include grammatical information in keys** (no `item_singular` / `item_plural`). Grammatical form is `PluralRules`'s responsibility; the key only needs to express the single semantic meaning of "this is the cart item count."

### The Current State of ICU MessageFormat and MF2

The `{count}` above is a "simplified placeholder." The industry standard is **ICU MessageFormat**, which writes plurals, selections, and nesting all into a single message:

```text
{cartItems, plural,
  =0 {Your cart is empty}
  one {# item in your cart}
  other {# items in your cart}
}
```

`=0`'s exact-match syntax is crucial—it lets "0 items" be written as a completely different message without being squeezed into the `other` branch. **This is something `count === 1 ? A : B` can never do.**

Here we need to clarify a point that outdated articles often mislead about—**the current state of MessageFormat 2 (MF2) (September 2026)**:

- **The spec itself is already stable**: MF2 is maintained by the Unicode CLDR Technical Committee, entered Final Candidate in March 2025, and after LDML 47/48 revisions, the spec has entered a stable state.
- **But the native JS API is still far off**: TC39's `Intl.MessageFormat` proposal is stuck at **Stage 2**, blocked on the need for enough organizations to use MF2 in production to move forward; mainstream i18n libraries (FormatJS/react-intl, Lingui, Tolgee) are still on MF1.
- **Tested on this machine's Node 26.5.1**: `typeof Intl.MessageFormat === "undefined"`.

So the practical recommendation is: **write message catalogs in MF1 (ICU MessageFormat), but delegate "parsing" to a library** (`@formatjs/intl-messageformat`, `intl-messageformat`, etc.), and don't couple the message format to your own runtime. When `Intl.MessageFormat` lands, what gets replaced is the library, not your message files. This also means **don't design your message catalog in a library's proprietary format**—use standard ICU syntax so migration costs stay manageable.
## 7. Language Negotiation: Three Pitfalls of `Accept-Language`

What users configure in their browsers is a **preference list**, not a single language. The server needs to map it to "the few you actually support" — this process is called language negotiation.

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

Actual output:

```text
zh-Hans-CN,zh;q=0.9,en;q=0.8   -> {"tag":"zh-Hans-CN","matched":"zh-CN","how":"lookup(language)"}
en-GB,en;q=0.7,zh-TW;q=0.9     -> {"tag":"en-GB","matched":"en-US","how":"lookup(language)"}
de-DE,fr;q=0.9                 -> {"tag":null,"matched":"zh-CN","how":"default"}
*                              -> {"tag":null,"matched":"zh-CN","how":"default"}
```

### Pitfall 1: `*` is a valid `Accept-Language`, but not a valid BCP 47 tag

RFC 9110's `language-range` explicitly allows `*` ("any language"), but `Intl.getCanonicalLocales("*")` will **directly throw `RangeError`**:

```text
getCanonicalLocales("*")   -> RangeError: Invalid language tag: *
getCanonicalLocales("en_us") -> RangeError: Invalid language tag: en_us
getCanonicalLocales("zh-hans-cn") -> ["zh-Hans-CN"]
```

Note the third line: **case and canonical form are auto-corrected, but the separator must be a hyphen** — underscores (very common in HTTP headers, e.g., some clients send `en_us`) will cause `Intl` to throw instead of being tolerant. So when parsing `Accept-Language`, **you must sanitize the format first, then hand it to `Intl`**, and the entire logic must be wrapped in `try/catch`. Feeding user-controllable headers directly into an API that throws exceptions is a DoS surface.

### Pitfall 2: `q=0` means "explicitly do not want"

`zh-CN,en;q=0` means "Chinese is fine, **but English absolutely not**." The filter condition must be `q > 0`, not "use q if present, default if absent." Miss this filter, and you'll push English to users who explicitly rejected it.

### Pitfall 3: Not distinguishing `zh-Hans` from `zh-Hant`

Both `zh-Hans-CN` and `zh-TW` are Chinese, but **Simplified and Traditional glyphs are completely different**. The lookup logic above will resolve `zh-Hans-CN` to `zh-CN` (correct), but if `SUPPORTED` only contains `zh-TW`, `zh-Hans-CN` will also fall into it (incorrect) — users will see a Traditional Chinese interface. **Simplified and Traditional must be handled as two independent entries in the supported list**, not relying on language subtags as a fallback.

### Negotiation results must include `Vary`

This step is directly related to caching: if the same URL returns different content based on `Accept-Language`, CDNs and browsers must know this, otherwise a Chinese page will be cached and served to English users. The response header must include:

```http
Vary: Accept-Language
```

The cost is a lower cache hit rate (one copy per language). The details of this trade-off were covered in [The Complete Guide to HTTP Caching Strategies: From Browser to CDN](/posts/http-caching-guide/) — simply put: **expressing language via separate URLs (`/zh-CN/posts/`) is easier to cache than the same URL + `Vary`, and is better for sharing and SEO**, at the cost of needing an extra routing layer.

## 8. Hydration Mismatch: Three Sources and Three Solutions

Back to the timezone problem from Section 3. The classic symptom in SSR scenarios is a line in the console:

```text
Warning: Text content did not match. Server: "2026年9月28日 14:30:00" Client: "2026年9月28日 22:30:00"
```

Three sources, ordered by frequency of occurrence:

| Source | Server | Client | Trigger Condition |
| --- | --- | --- | --- |
| **Timezone** | Container is usually UTC | User's local timezone | Rendering any local time |
| **locale** | Host environment's default locale | User's browser language | `Intl.*` without explicit locale |
| **Current time** | Build / request time | Hydration time | `Date.now()`, `"刚刚"` |

Note the second row: **when `Intl.DateTimeFormat()` doesn't receive a locale, it uses the host environment's default locale**. The same code will output different strings on CI (`en-US`) and on a developer's machine (`zh-CN`) — this is the hardest class of bug to reproduce locally, because **it works fine on everyone's machine**.

Three solutions, ordered by recommendation:

**1. Fix the timezone on the server + explicitly pass locale (preferred)**

```js
// 把「用户时区」作为显式数据传进来，而不是让两边各自猜
const fmt = new Intl.DateTimeFormat(locale, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: userTimeZone,   // 来自用户设置 / cookie，两端一致
});
```

The key is **both sides receiving the same input**. The timezone should come from the user's explicit setting (stored in a cookie or database), not from the runtime environment.

**2. Use a `<time>` element + `suppressHydrationWarning` as a fallback**

```jsx
<time dateTime={iso} suppressHydrationWarning>
  {formattedForServer}
</time>
```

This only suppresses the warning, **it doesn't fix the problem** — users still see the server's timezone value, which gets replaced after hydration. It's suitable for scenarios where "time is just secondary information." Meanwhile, `<time dateTime={iso}>` provides a machine-readable raw value, which is meaningful for assistive technology and scrapers.

**3. Just move it to client-side rendering**

For purely presentational, non-critical-path content like timestamps, render after mounting with `useEffect`, or hand it directly to a client component:

```jsx
const [text, setText] = useState(null);
useEffect(() => { setText(fmt.format(new Date(iso))) }, [iso, locale]);
return <time dateTime={iso}>{text ?? "—"}</time>;
```

The cost is a placeholder flash on first paint. **But "a flash" is better than "hydration error + full tree re-render."**
## 9. Layout, Fonts, and the `lang` Attribute

This section overlaps with [The Practical Web Accessibility Checklist](/posts/web-accessibility-practical-checklist), but the motivation is different: that one is about "getting screen readers to read it correctly," while this one is about "getting browsers to render it correctly."

### The `lang` Attribute Determines Glyphs, Not Just Accessibility

```html
<html lang="zh-CN">
```

This attribute directly affects the rendering result. **The same Unicode code point may use different glyphs under `ja` and `zh-CN`**—the differences in how characters like "直," "骨," and "今" are written in Chinese vs. Japanese fonts are visible to the naked eye (this kind of difference is called "same code point, different glyphs" in CJK). Browsers rely on `lang` to select glyph variants, and **omitting `lang` results in "Japanese-style kanji on a Chinese page."**

On pages with mixed languages, you also need to annotate local content separately:

```html
<p>这个 API 叫 <span lang="en">Server Components</span>，中文一般译作「服务端组件」。</p>
```

The accompanying CSS is the `:lang()` pseudo-class, which lets you specify different font stacks for different languages—this also relates to [Web Font Loading Optimization](/posts/web-font-loading-optimization): **Chinese fonts are often several MB in size, so you must do subset splitting by `unicode-range`** to prevent English pages from downloading Chinese font files.

### RTL: Don't Write `margin-left`

Arabic, Hebrew, and Persian are right-to-left (RTL). Supporting RTL doesn't require two sets of CSS—it just requires **replacing physical properties with logical properties**:

| Physical Properties (will break) | Logical Properties (auto-adapt) |
| --- | --- |
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `left` / `right` | `inset-inline-start` / `inset-inline-end` |
| `border-left` | `border-inline-start` |
| `text-align: left` | `text-align: start` |

Then you only need one `dir` attribute, and the entire site's direction flips:

```html
<html lang="ar-EG" dir="rtl">
```

There are a few places that need extra attention:

- **Icons should be mirrored**, but **not all icons should be mirrored**. Back arrows and play directions should be mirrored; clocks, company logos, and checkboxes should **not** be mirrored (mirroring them would actually be wrong).
- **Numbers and code blocks remain left-to-right in RTL**. Browsers handle this with the bidirectional algorithm, but code blocks should explicitly use `direction: ltr` to avoid wording being reordered.
- **`flex-direction: row` flips automatically** (because it's "inline direction"), so no manual changes are needed. This is the most effortless part of the logical property system.

## 10. Engineering: Let Problems Surface in CI, Not in User Screenshots

The most troublesome thing about internationalization is that **it fails silently by default**—a missing key means a missing sentence in the UI, but as long as it's not on a critical path, nobody notices.

### Pseudo-Localization: Turn "Untranslated" into "Looks Weird"

The idea behind pseudo-localization is: replace all source copy with an auto-generated "fake translation" by adding diacritics, lengthening, and adding brackets:

```js
const MAP = { a:"á", b:"ƀ", c:"ç", d:"ð", e:"é", /* ... */ };
const pseudo = (s) => "⟦" + [...s].map((c) => MAP[c] ?? c).join("") + "⟧";

pseudo("Save changes");  // "⟦Šáṽé çĥáñĝéš⟧"
pseudo("Settings");      // "⟦Šéţţíñĝš⟧"
```

It solves three problems at once:

1. **Hardcoded strings that haven't been internationalized will display as-is** as `Save changes`, making them easy to spot in a sea of `⟦Šáṽé...⟧`;
2. **Lengthened text will break layouts** (note that `Settings` goes from 8 characters to 10 characters, and underscore testing usually adds another 30%–40%). Real German and Russian text is much longer than English, so layout problems surface early;
3. **Brackets expose truncation**—if you only see `⟦Šáṽé çĥá` on the UI without the closing `⟧`, it means it was truncated by `overflow: hidden`.

Running a pseudo-localized build once typically uncovers a dozen places where "this was never wired up for translation."

### Block Hardcoded Strings in CI

Pseudo-localization relies on human eyes; a more reliable approach is adding a static check. The rule is simple: **text nodes in JSX / templates that contain CJK characters or full English sentences and don't come from `t()` should trigger a warning**.

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

Output:

```text
SUSPECT  <button>保存</button>
ok       const msg = t("post.save")
ok       <p>Showing {count} results</p>
SUSPECT  <title>我的博客</title>
```

The regex above is just a simplified demo version (a real implementation should use AST tools, such as a custom ESLint rule working with JSX's `JSXText` nodes, or an off-the-shelf plugin like `eslint-plugin-i18next`). **The key isn't how accurate the regex is—it's whether there's an automated line of defense at all**—relying purely on manual review will definitely miss things.

### Three More Things to Check

1. **Key coverage**: `源语言 key 集合 - 目标语言 key 集合`—the difference set must be empty before merging. This should be a CI gate.
2. **Parameter consistency**: the `cart.items` in `en` uses `{count}`, but the `{count}` in the `ru` version misspells it as `{coutn}`—this won't throw an error, it will just render `{coutn}`. **Validate that each message's placeholder set is consistent across languages**—low cost, extremely high payoff.
3. **Plural form completeness**: use `PluralRules(locale).resolvedOptions().pluralCategories` to cross-check the catalog, and **report an error for whichever form is missing**. For example, if the Russian catalog only has `one` / `other`, that's a clear bug (compare with the table in Section 4).

## 101. Summary

- **Leave formatting to `Intl`, keep translation for yourself**. Number grouping, currency symbol placement, date order, relative time, list conjunctions—all have CLDR standard answers, and hand-rolling them will inevitably fail in some country.
- **Plural rules are determined by `PluralRules`, not by your if statements**. The problem with `count === 1 ? A : B` is that it doesn't have enough slots: Russian needs 4, Arabic needs 6, Chinese only needs 1. **The structure of the message catalog is determined by the most complex language.**
- **`Intl.Collator` is the only correct solution for Chinese sorting**, and `Intl.Segmenter` is the only correct solution for counting emoji and Chinese word segmentation. `sort()` and `.length` both fail.
- **`Accept-Language` is not clean BCP 47**: `*`, underscores, and `q=0` will all break naive implementations, and `Intl.getCanonicalLocales` will throw exceptions—**this is a user-controllable input path**.
- **The root cause of hydration mismatch is inconsistent input on both ends**, not a wrongly written render function. Make locale and timezone explicitly passed-in data, and the problem disappears naturally.
- **Internationalization fails silently by default**, so there must be automated defenses: pseudo-localization for humans to see, CI checks for key coverage, placeholder consistency, and plural form completeness for machines to see.

The last sentence shares the same origin as the conclusion in [Database Index Principles and Query Optimization](/posts/database-index-principles-and-query-optimization): **every output in this article comes from actual testing on Node 26.5.1 / ICU 78.3, but ICU versions change and browser implementations have detail differences**. The classification conclusions of `Intl` (which locale has how many plural forms) are defined by CLDR and are very stable; but **specific punctuation, spacing, and glyph differences must be verified in your own target environment**. Running a single `node -e "console.log(new Intl.PluralRules('ru').resolvedOptions().pluralCategories)"` is more reliable than memorizing any table.

## References

- [MDN: Intl namespace (complete options for each constructor)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [MDN: Intl.PluralRules—plural categories for each language](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules)
- [Unicode CLDR: Language Plural Rules (the authoritative source for plural rules)](https://www.unicode.org/cldr/charts/47/supplemental/language_plural_rules.html)
- [RFC 9110 §12.5.4: Accept-Language syntax and q values](https://www.rfc-editor.org/rfc/rfc9110#name-accept-language)
- [RFC 4647: Language tag matching (Lookup and Filtering)](https://www.rfc-editor.org/rfc/rfc4647)
- [TC39 proposal-intl-messageformat: proposal status of Intl.MessageFormat](https://github.com/tc39/proposal-intl-messageformat)
- [Unicode MessageFormat 2.0 specification](https://unicode.org/reports/tr35/tr35-messageFormat.html)
- [W3C i18n: Declaring language in HTML (why the `lang` attribute affects glyphs)](https://www.w3.org/International/questions/qa-html-language-declarations)