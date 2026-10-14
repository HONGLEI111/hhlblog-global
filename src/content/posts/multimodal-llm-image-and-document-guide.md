---
title: 'Multimodal Models in Practice: Getting LLMs to Understand Images and Documents'
published: 2026-10-01
description: 'Breaking "getting a model to see images" into three controllable engineering problems: how images become tokens, why the same image has two different prices, and why PDFs can skip OCR. Includes complete TypeScript code and a list of pitfalls.'
image: ''
tags: [Multimodal, Vision, Claude API, PDF, LLM]
category: 'AI'
draft: false
---
Adding an image to a model sounds like just stuffing an attachment into `messages`. But when you actually write it, problems pop up one after another: why does the same 4K screenshot cost 1560 tokens for some models and 4784 for others? Why can a 50-page PDF eat up half a book's worth of context? Why does production suddenly throw a "image too large" error out of nowhere?

This article breaks "multimodality" down into three problems that can be controlled through engineering: **how images become tokens**, **where the cost curve bends**, and **why documents can skip OCR**.

## 1. An image isn't an "attachment" — it's a string of 28×28 patches

Multimodal models don't look at an image as a whole; they slice it into a grid of **visual patches**: each 28×28-pixel square counts as one token. So the token count of an image is a clean multiplication:

```
tokens = ⌈宽 / 28⌉ × ⌈高 / 28⌉
```

A 200×200 icon is ⌈200/28⌉² = 64 tokens, practically free; a 1000×1000 image is 36×36 = 1296 tokens; and a 1920×1080 screenshot first gets proportionally scaled so its long edge is within 1568 (1456×819), then sliced into 52×30 = 1560 tokens.

The key point is **"scale first, then slice"**: every image has a long-edge cap, and anything beyond it isn't an error — it's silently scaled down. This explains a very counterintuitive phenomenon — **compressing an image from 2000px to 1568px doesn't change the token count**, because both images land on the same size after scaling. To save money, you have to compress below the cap for it to work; compressing just a little is pure wasted effort.

## 2. The same image, two cost curves

Different model tiers have different long-edge caps, which directly forms the second curve:

| Image size | Standard tier (long edge 1568px) | High-resolution tier (long edge 2576px) |
| --- | --- | --- |
| 200×200 | 64 | 64 |
| 1000×1000 | 1296 | 1296 |
| 1920×1080 | 1560 | 2691 |
| 3840×2160 | 1560 | 4784 |

Under the standard tier, **a 4K screenshot and a 1080p screenshot cost exactly the same** — both 1560 tokens. This isn't a bug but a design choice: small text, dense tables, and code screenshots are already a blurry mess at this precision, and whether the model can read them has nothing to do with size.

The high-resolution tier (supported by Claude 4.7 and later models, enabled automatically, no beta header needed) raises the long-edge cap to 2576px and the visual token cap to 4784. The cost is very real: for the same 4K screenshot, tokens jump from 1560 to 4784, 3× the standard tier. At Claude Opus 5.5's $4 / 百万输入 token 计算，单张约 **$0.019**; under the standard tier the same image costs only **$0.006**.

**The decision rule is simple**: if the information in the image is "just get the gist" (objects, scenes, emotions) → compress to 1568px, use the standard tier; if the information is hidden in the pixels (table numbers, error stacks, UI details) → don't compress, let it use the full 2576px. Paying 3× the price for the former is wasteful, and forcing the latter through the standard tier is basically asking the model to guess.

## 3. Three ways to send images and their costs

| Method | Use case | Notes |
| --- | --- | --- |
| `source.type: "url"` | Image already has a public URL | Saves base64 encoding and transfer overhead |
| `source.type: "base64"` | Local files, private images needing review | Claude API single-image limit 10MB (Bedrock / Vertex 5MB) |
| Files API (`file_id`) | The same image reused across multiple turns/requests | Upload once, then send only the ID — no need to resend base64 every turn |

Image formats supported: JPEG / PNG / GIF / WebP, single image up to 8000×8000. **Animated images only take the first frame** — for video understanding, you have to extract frames yourself.

An easily overlooked pitfall: **images don't count toward the "file count" but do count toward context, and in multi-turn conversations they're re-billed every turn**. In a 20-turn Agent conversation, if every turn carries the same 4K screenshot, you're paying for 20 × 4784 tokens. Chat-style scenarios usually hit the context window, not the image count limit; the real fix is to add `cache_control` to the image block, or simply turn what you understood into text in the first turn — **if you can describe it clearly in text, don't pass it along as an image**.

## 4. In practice: turning a dashboard screenshot into structured data

The most typical multimodal task is "screenshot → JSON". This TypeScript snippet first does the accounting, then the extraction:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

const imageData = fs.readFileSync("dashboard.png").toString("base64");

const imageBlock = {
  type: "image" as const,
  source: { type: "base64" as const, media_type: "image/png" as const, data: imageData },
  // 同一张图会被多轮引用时就加上这行，避免每轮重复按全价计费
  cache_control: { type: "ephemeral" as const },
};

// ① 先算账再发请求：图片按 base64 字节数当文本估算，会严重高估
const count = await client.messages.countTokens({
  model: MODEL,
  messages: [{ role: "user", content: [imageBlock, { type: "text", text: "读取仪表盘" }] }],
});
console.log(`${count.input_tokens} tokens ≈ $${((count.input_tokens / 1e6) * 4).toFixed(4)}`);

// ② 抽取：把「禁止编造」写进系统提示，比在用户提示里强调有效得多
const response = await client.messages.create({
  model: MODEL,
  max_tokens: 16000,
  system: `你是把监控截图转成结构化数据的解析器。只输出一个 JSON 对象，不要任何解释、不要 markdown 代码块。
字段：title(string)、errors(number)、alerts(数组，元素为 {metric: string, value: string})。
截图里看不清或未出现的字段填 null，禁止根据常识推断或编造数值。`,
  messages: [{ role: "user", content: [imageBlock, { type: "text", text: "解析这张仪表盘截图。" }] }],
});

const text = response.content
  .filter((b) => b.type === "text")
  .map((b) => (b.type === "text" ? b.text : ""))
  .join("");

const data = JSON.parse(text);
console.log(data.errors, data.alerts.length);
```

Three details are worth emphasizing. **First**, `countTokens` is the only accurate estimation method — images aren't billed as text by base64 character count, and counting bytes directly overestimates by an order of magnitude. **Second**, extraction tasks must explicitly say "if unclear, fill in null, no fabrication": the default behavior of multimodal models when small text is blurry isn't to error out but to **fill in a plausible-looking number from context**, which in monitoring-data scenarios is more dangerous than crashing. **Third**, don't use `JSON.parse` raw in production — wrap it in a schema validation layer (zod / ajv) and bring the trust boundary for model output down to the same level as user input.

## 5. Documents (PDF): the cost and reward of skipping OCR

PDFs go through the `document` content block, not `image`. The model's internal handling is: **each page is converted to an image, while the page's text layer is extracted**, and both are sent to the model together. This means charts, stamps, handwritten annotations, and body text are all visible at once — you don't need to run OCR first, and you won't lose table structure due to layout-recognition misalignment.

```typescript
const pdfData = fs.readFileSync("annual-report.pdf").toString("base64");

const res = await client.messages.create({
  model: MODEL,
  max_tokens: 16000,
  messages: [{
    role: "user",
    content: [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: pdfData },
        title: "2026 半年报",
        citations: { enabled: true }, // 开启后返回可定位的引用
      },
      { type: "text", text: "Q3 营收同比增速是多少？给出来源页码。" },
    ],
  }],
});

for (const block of res.content) {
  if (block.type !== "text") continue;
  console.log(block.text);
  for (const c of block.citations ?? []) {
    if (c.type === "page_location") {
      console.log(`→ 第 ${c.start_page_number}-${c.end_page_number} 页`);
    }
  }
}
```

There are three costs. **One is tokens**: PDFs have no separate pricing — they use the standard input price — but each page typically costs 1500–3000 tokens, so a 50-page report is about 100k tokens — at Opus 5.5's $4/百万算约 **$0.4**, and in multi-turn follow-ups this cost is paid again every turn. **Two is limits**: 32MB and 600 pages per request, and models with 200k context are capped at 100 pages; **encrypted or password-protected PDFs are rejected outright**, with no room for negotiation. **Three is chunking**: beyond the limit you can only split, and once split, cross-page tables and "as mentioned above" break — the split points are best placed along chapters.

`citations` is currently one of the most underrated switches: PDF citations return **`page_location` (page number, starting from 1)**, plain text returns `char_location` (character index, starting from 0), and custom content returns `content_block_location`. For scenarios that need "traceable answers" — finance, legal, medical — this is the lowest-cost way to bring multimodal output into a compliance workflow. Note that it's mutually exclusive with structured output (`output_config.format`); using both at once returns a 400.
## 6. Six Pitfalls I Kept Falling Into

1. **Image before text**. Placing `image` / `document` before `text` in the content array noticeably improves the model's localization accuracy—this isn't superstition, it's the order officially recommended.
2. **Over 20 images, and the rules get stricter**. When a request contains more than 20 image/document blocks, each one gets subjected to a stricter per-image limit (2000px on the long edge), and 4K images that previously worked suddenly get rejected.
3. **Document blocks count too**. On Bedrock and Google Cloud, PDF blocks also consume that quota of 20.
4. **Files API block types must match the MIME**. Putting an image file into a `document` block returns a 400, and vice versa.
5. **Compression doesn't equal savings**. Compressing down to within the long-edge limit is meaningful; compressing beyond the limit just needlessly loses clarity.
6. **Don't use multimodal as OCR**. For pure text extraction scenarios, the combination of OCR + a text model is usually more cost-effective and stable; the real value of multimodal lies in situations where **layout matters as much as the text**—charts, seals, complex forms.

## Conclusion

The engineering challenge of multimodal was never "can it be called," but whether three accounts can be settled clearly: **how many tokens this image is worth, in which round it gets billed repeatedly, and whether the information it provides can be turned into text earlier**. Once these three accounts are settled, what remains is just ordinary API calls.

| Dimension | API Base | Content Block | Key Parameters |
| --- | --- | --- | --- |
| Image | Claude API | `image` | `source` / `cache_control` |
| Document | Claude API | `document` | `media_type` / `citations` |
| Reuse | Files API | Matched by MIME | `file_id` |

## References

- [Vision — Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/vision): image formats, size limits, the 28×28 patch billing formula, and resolution tiers
- [PDF support — Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/pdf-support): `document` blocks, 32MB / 600 page limits, per-page token magnitude
- [Citations — Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/citations): value ranges and mutual exclusion constraints for `page_location` / `char_location`
- [Files API — Claude Platform Docs](https://platform.claude.com/docs/zh-CN/build-with-claude/files): upload once, reuse across requests by `file_id`
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript): type definitions for `@anthropic-ai/sdk` image and document content blocks