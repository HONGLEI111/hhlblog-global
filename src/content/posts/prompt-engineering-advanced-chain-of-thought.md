---
title: 'Advanced Prompt Engineering: From Zero-Shot to Chain-of-Thought'
published: 2026-09-10
description: Zero-shot, few-shot, chain-of-thought, self-consistency, and ReAct — reframing "prompting tricks" into a reproducible four-level progression, with complete code.
image: ''
tags: [Prompt Engineering, CoT, LLM, Chain-of-Thought]
category: 'AI'
draft: false
---
Many people's impression of Prompt Engineering stops at "add a sentence saying 'please think step by step'." That sentence is indeed useful, but if it's the only trick you know, you're missing the real structure behind it: **tasks of different difficulty require reasoning scaffolds of different strength**. Use the wrong one, and at best you waste tokens; at worst, you make a simple task perform worse.

This article breaks the advanced path of prompting into four layers—zero-shot, few-shot, chain-of-thought, and self-consistency—then adds a fifth layer, ReAct, explaining what problem each layer solves, when to use it, and when it actually becomes negative optimization. All code is based on the Anthropic SDK and can be run directly.

## 1. Zero-shot

Zero-shot means providing no examples at all and simply throwing the task description at the model:

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
        content: `Determine whether the sentiment of the following comment is positive, negative, or neutral. Answer with only one word.\n\nComment: ${review}`,
      },
    ],
  });
  return msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
}
```

For tasks like classification, rewriting, and extraction—things the model has seen countless times during pretraining—zero-shot is often enough. Its advantages are saving tokens, fast responses, and no bias introduced by examples.

**But zero-shot has two hard boundaries**: first, **format is uncontrollable**—you ask it to output JSON, and it might give you JSON wrapped in markdown, plus a bonus sentence like "Sure, here's the result you asked for"; second, **complex reasoning collapses**—for multi-step math problems or logic problems that require combining multiple constraints, the model tends to "skip steps" midway and then give an answer that looks reasonable but is actually wrong. These two problems are solved by the second and third layers, respectively.

## 2. Few-shot—using examples to anchor the format

The essence of few-shot is not "teaching the model to do the task," but **using examples to define the output contract**. What the model learns from examples is often not knowledge, but: what the fields are called, how edge cases are handled, and whether the tone is formal or casual.

```typescript
const examples = [
  { input: "Screen is cracked, but customer service attitude was good", output: { sentiment: "mixed", reason: "Product issue but service compensation" } },
  { input: "Logistics was three days late", output: { sentiment: "negative", reason: "Delivery experience below expectations" } },
  { input: "Everything was normal, nothing much to say", output: { sentiment: "neutral", reason: "No clear preference" } },
];

function buildFewShotPrompt(review: string) {
  const shots = examples
    .map((e) => `Comment: ${e.input}\nResult: ${JSON.stringify(e.output)}`)
    .join("\n\n");
  return `${shots}\n\nComment: ${review}\nResult:`;
}
```

There are three details here that are easy to overlook:

- **Examples should be "diverse" rather than "similar."** If all three are negative examples, the model will tend to classify every input as negative. Ideally, examples should cover every category and typical edge cases.
- **Example order affects the result.** Research shows that models are more sensitive to the last example (recency) and the first example (primacy). If your example order is fixed but performance is unstable, try adjusting the order and running an A/B test.
- **The number of examples has diminishing returns.** Usually 3–5 is enough to define the format clearly; piling on up to 20 is both expensive and may introduce noise.

In one sentence: **few-shot governs "how to say it," not "how to think."**

## 3. Chain-of-Thought—let the model reason first, then answer

Chain-of-Thought (CoT) comes from the 2022 work by Wei et al.: in few-shot examples, you not only give the answer but also the **intermediate reasoning steps**, and the model imitates this "derive first, conclude later" pattern, greatly improving accuracy on arithmetic, commonsense, and symbolic reasoning tasks. The key conclusion is that **this ability only emerges in sufficiently large models**, and may actually be unhelpful for small models.

CoT has two forms. **Few-shot CoT** includes reasoning processes in the examples; **zero-shot CoT** simply adds "Let's think step by step" after the question, proposed by Kojima et al., absurdly simple yet effective.

```typescript
async function cotAnswer(question: string) {
  const msg = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content:
          `Analyze the following question step by step. First write out your reasoning, then give the final result on one line as "Answer: X".\n\n` +
          `Question: ${question}`,
      },
    ],
  });
  return msg.content[0].type === "text" ? msg.content[0].text : "";
}
```

Note the two design choices in the prompt: **require the reasoning process to be written out**, and **specify the format of the final answer**. The former triggers reasoning; the latter lets you stably extract the result with regex—this is exactly the format control that zero-shot cannot achieve.

**When not to use CoT**: for tasks like sentiment classification, information extraction, and format conversion—where "the answer can be obtained in one step"—forcing it to "think step by step" introduces two problems: first, higher cost (output tokens may multiply several times); second, **the model may "overthink" during reasoning** and talk itself into a wrong conclusion. This is also where "add a sentence saying please think step by step" gets overused.

## 4. Self-Consistency—sample multiple paths and take the majority

A single chain of thought can still go down the wrong path. The **self-consistency** idea proposed by Wang et al. is very simple: **sample multiple reasoning paths for the same question and take the answer that appears most often**. Its core assumption is that there may be many correct reasoning paths, but wrong answers tend to be scattered and hard to repeat.

```typescript
function extractAnswer(text: string): string {
  const m = text.match(/(?:答案|Answer)[:：]\s*(.+)/);
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

Two implementation points: **temperature must be greater than 0** (when `temperature` is 0, repeated sampling produces almost identical results and self-consistency fails), and **the number of samples should be odd** to avoid ties. The cost is multiplied by the number of samples, so it suits scenarios where "a wrong answer is costly and the answer set is enumerable," such as math problems or critical judgments, rather than everyday Q&A.

## 5. From CoT to ReAct—connecting reasoning to action

No matter how strong CoT is, it only happens "inside the model's head"—it cannot query a database or run code. ReAct (Yao et al., 2022) weaves reasoning and action into a loop: the model first `Thought` (reasoning), then `Action` (calls a tool), gets `Observation` (the result), then continues to the next round until it gives `Answer`.

```typescript
const system = `You may use the tools: search(q), calculator(expr).
Output strictly in the following format each turn, one turn at a time:
Thought: <Your reasoning>
Action: <Tool name>(<Parameters>)
When you have enough information, use:
Answer: <Final answer>`;
```

In real engineering, rather than hand-writing text parsing, it's better to directly use Function Calling as introduced in the previous article—it lets the model return call intentions as structured JSON, which is far more robust than string matching. The value of ReAct lies in the **paradigm**: reasoning is no longer a one-off "think it through, then answer," but "look things up while thinking, and think while looking things up."

## Implementation checklist

- **Start with a zero-shot baseline.** For 90% of tasks, it plus good wording is enough; don't pile on scaffolding right away.
- **Use few-shot for format problems**, keeping examples diverse, controlling the number, and paying attention to order sensitivity.
- **Use CoT for reasoning problems**, and require fixed-format output for easy parsing.
- **Use self-consistency for high-value enumerable problems**, with temperature > 0 and an odd number of samples.
- **Use ReAct / Function Calling when external information is needed**, instead of making the model fabricate an answer.
- **Every change needs evaluation.** Run before-and-after comparisons on the same test set, otherwise you can't distinguish "it got better" from "it got lucky."

## Conclusion

Advancing in Prompt Engineering is not about collecting more "magic spells," but about knowing how to match a task with the appropriate strength of reasoning scaffolding. Zero-shot defines the task, few-shot defines the format, CoT opens up reasoning, self-consistency improves robustness, and ReAct connects to the world—each layer solves the ceiling of the previous one, and each has its own cost. **Measure first, then stack**—that is how you turn prompting from mysticism into engineering.
## References

- Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models* (2022) — https://arxiv.org/abs/2201.11903
- Kojima et al., *Large Language Models are Zero-Shot Reasoners* (2022) — https://arxiv.org/abs/2205.11916
- Wang et al., *Self-Consistency Improves Chain of Thought Reasoning in Language Models* (2022) — https://arxiv.org/abs/2203.11171
- Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models* (2022) — https://arxiv.org/abs/2210.03629
- Anthropic, *Prompt Engineering Overview* — https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview