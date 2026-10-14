---
title: 'What Is the JEV Model: A ''Silent'' AI That Only Outputs Decisions With Probabilities'
published: 2026-10-09
description: JEV is a 'decision model' from TypeSafe AI, founded by RLHF co-inventor Diogo Almeida. It doesn't generate text; it maps unstructured input into typed judgments with probabilities. This article breaks down its three output primitives, its RLCD training method, its performance and price, and how it relates to large language models.
image: ''
tags: [JEV, TypeSafe AI, decision model, LLM, AI agent]
category: 'AI'
draft: false
---
## Introduction: Why did a model that "can't talk" become popular?

On September 15, 2026, San Francisco startup **TypeSafe AI** released its first model, **JEV** (officially written mostly as "Jev").

Its most counterintuitive aspect is this: **it doesn't generate any text**. You can't use it to write articles, write code, chat, or even ask it "why" — it won't answer. You give it a piece of material, then list a set of questions (along with candidate answers), and the only thing it does is — **make judgments**: which one to pick, what score to give, how confident it is.

It's this "untalkative" model that, the day after its release, was integrated into Vercel's AI Gateway, covering nearly 13% of its paid teams' call volume within 24 hours; subsequently, Netlify, LangChain, Cloudflare Workers AI, and Langfuse also followed with integrations. Silicon Valley briefly discussed it as a "new AI track."

But what really made it go viral was its author: **Diogo Almeida** — formerly of Google Brain, who deeply participated in the R&D of **InstructGPT, ChatGPT, and GPT-4** at OpenAI, and is also **one of the co-inventors of RLHF (Reinforcement Learning from Human Feedback)**. A person who personally turned "making models talk well" into a paradigm has now, in turn, launched a model that "refuses to talk" — this fact alone is worth reading about.

## Two puns in the name

To understand JEV's positioning, first look at its two names:

- **Jev** is taken from the **Jevons Paradox**: an improvement in the efficiency of a technology actually causes its total demand to increase. Applied here, the implication is that "judging is so expensive and slow that people dare not ask too many questions; once it becomes cheaper and faster, judgment will be used far more than it is now."
- **System One Model** is taken from the **"System 1"** in Kahneman's *Thinking, Fast and Slow* — intuitive, fast, almost unconscious judgment. TypeSafe's official positioning for JEV is exactly this: **a model built for "fast thinking."**

The official definition of it is just one sentence, but very precise:

> **A frontier-intelligence function call: unstructured state in, typed probabilistic decisions out.**

In other words, it packages "intelligence" as a **function** with a clear signature, rather than a dialog box.

## Three output primitives: Choice, Score, Noul

JEV's API is extremely minimal — in an entire request, you can only ask three types of questions, which the official documentation calls **output primitives**:

| Primitive | What you're asking | What it returns |
|------|-----------|-----------|
| **Choice** | Pick one from a set of options (up to 255) | A probability distribution over each option + the final choice |
| **Score** | Score on some ordered scale or numeric range | A continuous value + confidence |
| **Noul** | A preset yes/no question | A probability between 0 and 1 |

The word "Noul" itself is a small detail: it's a blend of **N**umber + boo**l**ean, emphasizing "not a hard 0/1, but a calibrated probability."

Take a customer service scenario as an example — throw in a piece of user complaint and ask all three types of questions at once:

```python
from jev import Jev

client = Jev(api_key="...")

decision = client.decide(
    state=ticket_text,
    questions={
        "urgency":     {"type": "score",  "scale": [0, 4]},
        "category":    {"type": "choice", "options": ["账单", "故障", "咨询", "投诉"]},
        "need_human":  {"type": "noul"},
    },
)
```

The returned result looks roughly like this:

```json
{
  "urgency":    { "value": 3.0, "confidence": 0.91 },
  "category":   { "choice": "故障", "distribution": { "账单": 0.02, "故障": 0.88, "咨询": 0.07, "投诉": 0.03 }, "confidence": 0.88 },
  "need_human": { "probability": 0.62, "confidence": 0.79 },
  "latency_ms": 118,
  "model": "jev-1.13.0"
}
```

A few things to note:

1. **The output is "typed."** `category` can only be one of the 4 options you provided, and `urgency` must fall between 0 and 4. This is also the technical meaning behind the official claim of "no hallucinations" — see the later analysis of this statement.
2. **Every judgment comes with a probability/confidence**, and the caller's code can set thresholds accordingly: for example, `need_human > 0.5` routes to a human agent.
3. **All questions in a single request are computed in parallel at once** (elaborated in the next section), so asking a few more questions barely adds latency.

## Technical principles: Why is it faster by not generating token by token

Traditional large models are **autoregressive**: they spit out one token at a time, and the longer the output, the slower it gets. JEV takes a completely different path:

- **The output space is predefined.** Your question already provides all possible answers (option set, scoring range, yes/no), so the model doesn't need to "construct sentences token by token," but can **sample all answers to all questions in parallel within a single forward pass**. This is why "adding more questions barely slows it down."
- **The training method is called RLCD** — **Reinforcement Learning for Calibrated Decisions**, explicitly positioned against RLHF and RLVR.
  - **RLHF rewards "humans think this answer is good"**;
  - **RLCD rewards "the probabilities you state match the actual hit rates."**

The second point is JEV's most core and most easily overlooked claim: it optimizes for **calibration**, not likability. In the official words — **if it says 70% or 95%, then the event should occur at exactly a 70% or 95% frequency**. For decisions that need to be written into `if` statements, an honestly calibrated probability is far more useful than a beautifully worded natural language explanation.

## Performance and pricing: Official numbers vs. "real gains"

| Metric | Official data |
|------|---------|
| End-to-end latency | **70 – 500 ms** |
| Input price | **$0.042 / million tokens** |
| Output price | **Free** |
| Context window | 32,000 tokens |
| Compared to frontier large models | Claims to be **193.6× faster and 444.6× cheaper** |

Here we must add a footnote that even TypeSafe itself acknowledges: **193.6× / 444.6× is a "theoretical upper bound," and the benchmark is also an internal self-evaluation**. More conservative conclusions from third-party testing are roughly: **about 2–3.6× faster and about 4.7–7.5× cheaper**.

Even so, the fact that "output is free" is itself very informative — it amounts to changing the pricing model from "billing by generation volume" to "billing by judgment requests," because **the token cost of judgment inherently shouldn't scale with output length**.

In terms of accuracy, in TypeSafe's own evaluation JEV scores about **67.8%** — on par with GPT-5.6 Terra, but behind GPT-5.6 Sol and Claude Opus 5. What it wins on is not accuracy, but **accuracy per unit of cost and latency**.

## Is JEV a replacement for or a complement to large models?

The conclusion is clear: **complementary, not a replacement**. They correspond to two different kinds of work:

| Dimension | Generative large models | JEV |
|------|------------|-----|
| Output | Natural language / code, variable length | Typed judgments (choice / score / probability) |
| Typical tasks | Writing, planning, reasoning, generating code | Classification, routing, scoring, approval, action determination |
| Latency | Seconds | Milliseconds |
| Interpretability | Can provide reasoning process | **Only gives numbers, no reasons** |
| Cost sensitivity | High | Extremely low |

A reasonable division of labor is: **large models are responsible for "figuring out what to ask," and JEV is responsible for "completing a large number of judgments at high frequency and low cost."** Typical scenarios include:

- Content moderation / spam detection (Choice: multi-class classification)
- Ticket routing and prioritization (Score + Choice)
- Action determination in agents (in an Agent, "which tool should be called at this step" — essentially Choice)
- User churn risk, sentiment intensity scoring (Score)
- A series of yes/no gates in risk control (Noul)

## Controversies and things to watch out for

Beyond the hype, several criticisms deserve serious consideration:

1. **"Zero hallucinations" is a word game**. Its real meaning is only that "JEV cannot spit out a **type** outside the options," but it **can absolutely confidently select a wrong but legal option**. Type safety ≠ correct judgment.
2. **No interpretability**. It only gives numbers, not reasons. For decision chains that need auditing and need to be explained to people, this is a hard flaw — you can't review why it chose this way the way you'd read a CoT.
3. **Calibration must be validated separately per workflow**. RLCD guarantees calibration "on the training distribution," but your business data distribution may not be in the training distribution. Before launch, you should regress its confidence on real samples yourself.
4. **It has its own "jagged edges."** TypeSafe's documentation explicitly acknowledges that the model is unreliable at **counting, arithmetic, and date comparison**, and recommends: **keep math operations in code, don't hand them to the model**.
5. **Lock the version**. The official recommendation is to hardcode the version number (e.g., `jev-1.13.0`), because probability outputs drift with versions, and once probabilities drift, your threshold logic drifts along with them.
## Conclusion

What's truly interesting about JEV isn't that it's "stronger" than large models—by accuracy, it doesn't win. What's interesting is that **it redefines "intelligence" once again**: not the ability to talk, but the ability to **compress an uncertain world into a calibrated probability that can be written into code**.

Over the past two years, we've gotten used to treating LLMs as an all-powerful chat box, then going to great lengths to wrap guardrails around them, do parsing, and write retries. JEV flips the question around: **in so many real-world scenarios, what we actually want was never a piece of text, but simply a judgment of "choose A or choose B, and how confident are we."** Extracting this kind of judgment on its own and turning it into a fast, cheap function call that comes with probabilities—this idea is more worth remembering than its current report card.

As for whether it's ultimately a "new paradigm" or an "advanced classifier," the answer may be neither: it's more like the kind of **infrastructure** I mentioned—you won't talk about it every day, but once you start using it, you'll begin stuffing it into every classification task that previously relied on brute-forcing with large models.

---

**References:**

1. InfoQ. "TypeSafe AI Releases Jev: a Decision-Only Model That Returns Typed Probabilities Instead of Text." 2026-10. https://www.infoq.com/news/2026/10/typesafe-ai-jev-released/
2. Machine Heart / Tencent News. "An early ChatGPT researcher built an AI that 'can't talk.' Is Jev really a new paradigm?" 2026-09-18. https://news.qq.com/rain/a/20260918A058BW00
3. Alibaba Cloud Developer Community. "Latest discussion on the JEV model: only making judgments, not talking; low latency is the undervalued variable." https://developer.aliyun.com/article/1765496
4. Qiniu Cloud News. "What is the viral Jev: a 'non-talking' model made by a former OpenAI researcher that only outputs structured decisions with probabilities." https://news.qiniu.com/archives/1789895633449
5. OntiCards Blog. "Why Jev Refuses to Chat: Inside System One Models." https://www.step2.com.cn/en/blog/jev-system-one-decision-models