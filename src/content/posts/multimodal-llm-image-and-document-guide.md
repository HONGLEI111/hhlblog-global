---
title: 多模态模型实战：让 LLM 看懂图片与文档
published: 2026-10-01
description: '把「让模型看图」拆成三个可控的工程问题：图片怎么变成 token、同一张图为什么有两套价格、以及 PDF 为什么敢不用 OCR。附完整的 TypeScript 代码与踩坑清单。'
image: ''
tags: [多模态, Vision, Claude API, PDF, LLM]
category: 'AI'
draft: false
lang: ''
---

给模型加一张图，听起来只是往 `messages` 里塞个附件。真写起来，问题会一个接一个冒出来：为什么同一张 4K 截图，有的模型收 1560 个 token，有的收 4784？为什么一个 50 页的 PDF 能顶掉半本书的上下文？为什么线上跑着跑着突然报「图片太大」？

这篇把「多模态」拆成三个能被工程化控制的问题：**图片如何变成 token**、**成本曲线在哪拐弯**、**文档为什么可以不用 OCR**。

## 1. 图片不是「附件」，而是一串 28×28 的补丁

多模态模型不把图当成一个整体来看，而是切成网格状的**视觉补丁（patch）**：每个 28×28 像素的小方块算作一个 token。于是图片的 token 数是一个干净的乘式：

```
tokens = ⌈宽 / 28⌉ × ⌈高 / 28⌉
```

一张 200×200 的图标是 ⌈200/28⌉² = 64 个 token，几乎不要钱；一张 1000×1000 的图是 36×36 = 1296 个 token；而 1920×1080 的截图会先被等比缩放到长边 1568 以内（1456×819），再切成 52×30 = 1560 个 token。

关键点在于**「先缩放，再切块」**：模型的每张图都有一个长边上限，超出的部分不是报错，而是被静默缩放。这解释了一个很反直觉的现象——**把图从 2000px 压到 1568px，token 数不会变**，因为两张图在缩放后落到同一个尺寸。想省钱，得压到上限以内才有效；只压一点点，纯属白费功夫。

## 2. 同一张图，两条成本曲线

不同模型档位的长边上限不一样，这直接构成了第二条曲线：

| 图片尺寸 | 标准档（长边 1568px） | 高分辨率档（长边 2576px） |
| --- | --- | --- |
| 200×200 | 64 | 64 |
| 1000×1000 | 1296 | 1296 |
| 1920×1080 | 1560 | 2691 |
| 3840×2160 | 1560 | 4784 |

在标准档下，**4K 截图和 1080p 截图的价格完全一样**——都是 1560 token。这不是 bug，而是设计选择：小字、密集表格、代码截图在这种精度下本来就糊成一团，模型看不看得清与尺寸无关。

高分辨率档（Claude 4.7 及之后的模型支持，自动生效，无需 beta 头）把长边上限提到 2576px、视觉 token 上限提到 4784。代价是实打实的：同样一张 4K 截图，token 从 1560 涨到 4784，是标准档的 3 倍。以 Claude Opus 5.5 的 $4 / 百万输入 token 计算，单张约 **$0.019**；而在标准档下同样一张图只要 **$0.006**。

**决策规则很简单**：图片里的信息是「看个大概」（物体、场景、情绪）→ 压到 1568px，走标准档；信息藏在像素里（表格数字、报错堆栈、UI 细节）→ 别压，让它吃满 2576px。为前者付 3 倍价格是浪费，让后者走标准档则等于让模型猜。

## 3. 三种传图方式与它们的代价

| 方式 | 适用场景 | 注意 |
| --- | --- | --- |
| `source.type: "url"` | 图片已有公网地址 | 省掉 base64 编码与传输开销 |
| `source.type: "base64"` | 本地文件、需审核的私有图 | Claude API 单图上限 10MB（Bedrock / Vertex 为 5MB） |
| Files API（`file_id`） | 同一张图要在多轮/多次请求里复用 | 上传一次，之后只传 ID，不必每轮重发 base64 |

图片格式支持 JPEG / PNG / GIF / WebP，单图最大 8000×8000。**动图只取第一帧**——想要视频理解，得自己抽帧。

一个容易被忽略的坑：**图片不计入「文件数」，但计入上下文，而且在多轮对话里每轮都会重新计费**。一个持续 20 轮的 Agent 对话，如果每轮都带着同一张 4K 截图，你付的是 20 次 4784 token。聊天类场景通常撞的是上下文窗口，而不是图片数量上限；真正的解法是给图片块加 `cache_control`，或者干脆在首轮就把你看懂的内容落成文字——**能用文字描述清楚的，就别用图片传下去**。

## 4. 实战：把一张仪表盘截图变成结构化数据

最典型的多模态任务是「截图 → JSON」。下面这段 TypeScript 先算账、再抽取：

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

三个细节值得强调。**第一**，`countTokens` 是唯一准确的预估手段——图片不是按 base64 的字符数当文本计费的，直接数字节会高估一个数量级。**第二**，抽取类任务一定要显式写「看不清就填 null、禁止编造」：多模态模型在小字模糊时的默认行为不是报错，而是**用上下文补全一个看起来合理的数字**，这在监控数据场景里比崩掉更危险。**第三**，生产环境别裸用 `JSON.parse`，套一层 schema 校验（zod / ajv），把模型输出的信任边界收到和用户输入同一档。

## 5. 文档（PDF）：不用 OCR 的代价与回报

PDF 走的是 `document` 内容块，而不是 `image`。模型内部的处理方式是：**每一页转成图片，同时把该页的文字层抽出来**，两者一起送进模型。这意味着图表、印章、手写批注和正文同时可见——你不需要先跑一遍 OCR，也不会因为版面识别错位而丢掉表格结构。

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

代价有三个。**一是 token**：PDF 没有独立计价，走的就是标准输入价，但每页通常要 1500～3000 个 token，一份 50 页的报告约 10 万 token——按 Opus 5.5 的 $4/百万算约 **$0.4**，多轮追问时这笔钱每轮都要再付一次。**二是上限**：单请求 32MB、600 页，200k 上下文的模型压到 100 页；**加密或带密码的 PDF 直接被拒**，没有回旋余地。**三是分块**：超过上限只能切分，而一旦切分，跨页的表格和「如上所述」就会断掉，切分点最好沿章节走。

`citations` 是目前最被低估的一个开关：PDF 的引用会返回 **`page_location`（页码，从 1 开始计）**，纯文本返回 `char_location`（字符下标，从 0 开始），自定义内容返回 `content_block_location`。对需要「答案可追溯」的场景——财务、法务、医疗——这是把多模态输出纳入合规流程的最低成本方案。注意它和结构化输出（`output_config.format`）互斥，同时用会直接返回 400。

## 6. 六个反复踩的坑

1. **先图后文**。内容数组里把 `image` / `document` 放在 `text` 前面，模型的定位精度明显更好——这不是玄学，是官方明确建议的顺序。
2. **超过 20 张图，规则会变严**。请求里超过 20 个图片/文档块时，每一张都会被套上更严格的单图限制（长边 2000px），之前跑通的 4K 图片会突然被拒。
3. **文档块也计数**。在 Bedrock 和 Google Cloud 上，PDF 块同样占用那 20 张的配额。
4. **Files API 的块类型必须和 MIME 对得上**。图片文件塞进 `document` 块会返回 400，反之亦然。
5. **压缩不等于省钱**。压到长边上限以内才有意义，压到上限之外只是白白损失清晰度。
6. **别把多模态当 OCR 用**。纯文字提取场景，OCR + 文本模型的组合在成本和稳定性上通常更划算；多模态真正的价值在于**版面和文字同样重要**的场合——图表、印章、复杂的表单。

## 结语

多模态的工程难点从来不是「能不能调用」，而是三笔账算不算得清：**这张图值多少 token、它在第几轮会被重复计费、以及它给的信息能不能更早地落成文字**。把这三笔账算清楚，剩下的就是普通的 API 调用。

| 维度 | API 底座 | 内容块 | 关键参数 |
| --- | --- | --- | --- |
| 图片 | Claude API | `image` | `source` / `cache_control` |
| 文档 | Claude API | `document` | `media_type` / `citations` |
| 复用 | Files API | 按 MIME 匹配 | `file_id` |

## 参考来源

- [Vision — Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/vision)：图片格式、尺寸上限、28×28 补丁计费公式与分辨率分档
- [PDF support — Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/pdf-support)：`document` 块、32MB / 600 页限制、每页 token 量级
- [Citations — Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/citations)：`page_location` / `char_location` 的取值与互斥约束
- [Files API — Claude Platform Docs](https://platform.claude.com/docs/zh-CN/build-with-claude/files)：上传一次、按 `file_id` 跨请求复用
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript)：`@anthropic-ai/sdk` 的图片与文档内容块类型定义
