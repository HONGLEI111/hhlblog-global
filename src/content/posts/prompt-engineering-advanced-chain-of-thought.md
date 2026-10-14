---
title: Prompt Engineering 进阶：从零样本到思维链
published: 2026-09-10
description: '零样本、少样本、思维链、自洽性到 ReAct——把「提示词技巧」还原成可复现的四层递进方法，附完整代码'
image: ''
tags: [Prompt Engineering, CoT, LLM, 思维链]
category: 'AI'
draft: false
lang: ''
---

很多人对 Prompt Engineering 的印象停留在「加一句『请一步步思考』」。这句话确实有用，但如果你只会这一招，就错过了它背后真正的结构：**不同难度的任务，需要不同强度的推理脚手架**。用错了，轻则浪费 token，重则让简单任务反而变差。

这篇文章把 prompt 的进阶路径拆成四层——零样本、少样本、思维链、自洽性——再补上一层 ReAct，说明每一层解决什么问题、什么时候该用、什么时候反而是负优化。所有代码基于 Anthropic SDK，可直接运行。

## 第一层：零样本（Zero-shot）

零样本就是不提供任何示例，直接把任务描述丢给模型：

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function zeroShot(review: string) {
  const msg = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `判断下面这条评论的情感是正面、负面还是中性，只回答一个词。\n\n评论：${review}`,
      },
    ],
  });
  return msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
}
```

对分类、改写、抽取这类「模型在预训练中见过无数次」的任务，零样本往往就够了。它的优势是省 token、响应快、没有示例带来的偏见。

**但零样本有两个硬边界**：一是**格式不可控**——你让它输出 JSON，它可能给你一段 markdown 包着的 JSON，还附赠一句「好的，这是您要的结果」；二是**复杂推理会崩**——多步数学题、需要组合多个约束的逻辑题，模型容易在中途「跳步」然后给出看似合理其实错误的答案。这两点分别由第二层和第三层解决。

## 第二层：少样本（Few-shot）——用示例锚定格式

少样本的本质不是「教模型做事」，而是**用示例定义输出契约**。模型从示例里学到的往往不是知识，而是：字段叫什么、边界情况怎么处理、语气是正式还是随意。

```typescript
const examples = [
  { input: "屏幕碎了，但客服态度不错", output: { sentiment: "mixed", reason: "产品问题但服务补偿" } },
  { input: "物流慢了三天", output: { sentiment: "negative", reason: "交付体验低于预期" } },
  { input: "一切正常，没什么好说的", output: { sentiment: "neutral", reason: "无明确倾向" } },
];

function buildFewShotPrompt(review: string) {
  const shots = examples
    .map((e) => `评论：${e.input}\n结果：${JSON.stringify(e.output)}`)
    .join("\n\n");
  return `${shots}\n\n评论：${review}\n结果：`;
}
```

这里有三个容易被忽视的细节：

- **示例要「多样」而非「相似」**。三个都是负面示例，模型会倾向于把所有输入判成负面。理想情况下示例应覆盖每个类别和典型边界情况。
- **示例顺序会影响结果**。研究表明模型对最后一个示例（recency）和第一个示例（primacy）更敏感。如果你的示例顺序固定而效果不稳定，可以尝试调整顺序做一次 A/B。
- **示例数量存在收益递减**。通常 3–5 个就能定义清楚格式，继续堆到 20 个既贵又可能引入噪声。

一句话总结：**少样本管「怎么说」，不管「怎么想」**。

## 第三层：思维链（Chain-of-Thought）——让模型先推理再回答

思维链（CoT）来自 Wei 等人 2022 年的工作：在少样本示例里不仅给出答案，还给出**中间推理步骤**，模型就会模仿这种「先推导后结论」的模式，在算术、常识、符号推理任务上大幅提升准确率。关键结论是——**这种能力在足够大的模型上才涌现**，对小模型反而可能无益。

CoT 有两种形态。**少样本 CoT** 是示例里带推理过程；**零样本 CoT** 则只需在问题后加一句「Let's think step by step」，由 Kojima 等人提出，简单到离谱却有效。

```typescript
async function cotAnswer(question: string) {
  const msg = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content:
          `请逐步分析下面的问题，先写出推理过程，最后用一行「答案：X」给出最终结果。\n\n` +
          `问题：${question}`,
      },
    ],
  });
  return msg.content[0].type === "text" ? msg.content[0].text : "";
}
```

注意提示里的两个设计：**要求写出推理过程**，并**规定最终答案的格式**。前者触发推理，后者让你能用正则稳定地抽取结果——这正是零样本做不到的格式控制。

**什么时候不该用 CoT**：对于情感分类、信息抽取、格式转换这类「一步就能得到答案」的任务，强行让它「一步步思考」会引入两个问题——一是成本上升（输出 token 可能翻几倍），二是**模型可能在推理中「想多了」**，把自己绕进错误结论。这也是「加一句请一步步思考」被滥用的地方。

## 第四层：自洽性（Self-Consistency）——多路采样取多数

单条思维链仍然可能走错路。Wang 等人提出的**自洽性**思路很朴素：**同一个问题采样多条推理路径，取出现次数最多的答案**。它的核心假设是——正确的推理路径可能有很多条，但错误答案往往各自为政、难以重复。

```typescript
function extractAnswer(text: string): string {
  const m = text.match(/答案[:：]\s*(.+)/);
  return m ? m[1].trim() : text.trim();
}

async function selfConsistent(question: string, samples = 5) {
  const runs = await Promise.all(
    Array.from({ length: samples }, () => cotAnswer(question))
  );

  const tally = new Map<string, number>();
  for (const run of runs) {
    const ans = extractAnswer(run);
    tally.set(ans, (tally.get(ans) ?? 0) + 1);
  }

  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
```

两个实现要点：**必须让温度大于 0**（`temperature` 为 0 时多次采样结果几乎相同，自洽性失效），以及**样本数要取奇数**以避免平票。代价是成本乘以采样数，所以它适合「答错代价高、答案可枚举」的场景，比如数学题或关键判断，而不是日常问答。

## 第五层：从 CoT 到 ReAct——把推理接到行动上

CoT 再强，也只发生在模型的「脑内」——它无法查数据库、无法运行代码。ReAct（Yao 等人，2022）把推理和行动编织成一个循环：模型先 `Thought`（推理），再 `Action`（调用工具），拿到 `Observation`（结果），然后继续下一轮，直到给出 `Answer`。

```typescript
const system = `你可以使用工具：search(q)、calculator(expr)。
每轮严格按如下格式输出，一次只输出一轮：
Thought: <你的推理>
Action: <工具名>(<参数>)
当信息足够时，用：
Answer: <最终答案>`;
```

在实际工程里，与其手写文本解析，不如直接使用上一篇文章介绍过的 Function Calling——它让模型以结构化 JSON 返回调用意图，比字符串匹配鲁棒得多。ReAct 的价值在于**范式**：推理不再是一次性的「想完就答」，而是「边查边想、边想边查」。

## 落地清单

- **先做零样本基线**。90% 的任务用它加良好措辞就够了，别一上来就堆脚手架。
- **格式问题用少样本**，示例保持多样、控制数量、注意顺序敏感性。
- **推理问题用 CoT**，并要求固定格式输出以便解析。
- **高价值可枚举问题用自洽性**，温度>0、样本取奇数。
- **需要外部信息就用 ReAct / Function Calling**，而不是让模型硬编答案。
- **一切改动都要有评测**。同一批测试样本跑前后对比，否则你无法区分「变好了」和「运气好」。

## 结语

Prompt Engineering 的进阶不是收集更多「咒语」，而是懂得为任务匹配恰当的推理脚手架强度。零样本定义任务、少样本定义格式、CoT 打开推理、自洽性提升稳健、ReAct 连接世界——每一层都在解决上一层的天花板，也都有自己的代价。**先测量，再叠加**，才是把提示词从玄学变成工程的方法。

## 参考来源

- Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models* (2022) — https://arxiv.org/abs/2201.11903
- Kojima et al., *Large Language Models are Zero-Shot Reasoners* (2022) — https://arxiv.org/abs/2205.11916
- Wang et al., *Self-Consistency Improves Chain of Thought Reasoning in Language Models* (2022) — https://arxiv.org/abs/2203.11171
- Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models* (2022) — https://arxiv.org/abs/2210.03629
- Anthropic, *Prompt Engineering Overview* — https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview
