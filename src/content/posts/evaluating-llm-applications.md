---
title: 'How to Scientifically Evaluate an LLM Application: Benchmarks, A/B, and Human Evaluation'
published: 2026-10-08
description: 'Replace "this feels much better" with reproducible numbers: from the limitations of public benchmarks, custom eval sets, and biases in LLM-as-a-Judge, to paired significance testing and online A/B, plus a TypeScript judge with position swapping and confidence intervals.'
image: ''
tags: [LLM, Evaluation, Evals, LLM-as-a-Judge, A/B Testing, Statistics, AI]
category: 'AI'
draft: false
---
You changed a version of the system prompt, ran five or six questions off the cuff, and the answers did look better, so you merged and shipped it. Two weeks later, customer support starts forwarding complaint emails—the model has learned, in the new version, to make "I'm not sure" sound more like "I'm very sure."

The problem isn't that this change was wrong, it's that **you never measured anything from start to finish**. "Looks better" is a human intuition based on five samples, not evidence. This article aims to make clear: to judge whether a change to an LLM application counts as "better" or "no change," you need to leave numbers behind at several levels.

## 1. Public benchmarks: what they can prove, what they can't

Let's start with the conclusion: public benchmarks like MMLU, MT-Bench, and HumanEval **can almost never be used to judge whether your application has gotten better**.

What they answer is "roughly where does this model's general capability water level sit," and their role is to help you cross off a batch of obviously hopeless candidates during the model selection stage. Once you enter the stage of "prompt A vs. prompt B" or "with retrieval vs. without retrieval," they stop being useful—your scenario is specific: a fixed set of question types, a specific response format, specific refusal boundaries, and no general benchmark covers any of that.

What's more troublesome is **data contamination**: the questions have long been sitting in the training corpus, and the model may have simply seen the answers. Add to that Goodhart's Law—when the score becomes the target, score-gaming tactics (guessing on multiple choice, boilerplate formatting) will overshadow real capability. So public benchmark scores are only suitable for **coarse screening**, not for **acceptance**. An evaluation set that can actually serve for acceptance must be built by yourself.

An evaluation set that can truly serve for acceptance must be built by yourself.

## 2. Building your own evaluation set: from "I think" to "I measured"

A self-built evaluation set doesn't need hundreds of items. A minimal evaluation set that actually works is usually enough with 50–200 items, and the key is that **every item comes from a real scenario**. The best source of samples is online logs—fish out the places users actually asked about and actually got stuck, de-identify them, and add them to the set; the next best is manually constructed edge cases, those tricky inputs where "the model is bound to answer wrong," which are far more valuable than ordinary questions casually made up.

Each sample = one input + one judgment criterion. There are two granularities of judgment criteria:

- **Pass/fail**: whether the answer contains the amount, whether it refused this unauthorized request, whether the JSON is parseable. Binary judgments have the smallest variance and can directly undergo statistical testing.
- **Scoring** (1–5 points): suitable for dimensions like "usefulness" where there is no unique answer, but it introduces rater noise and must be paired with the consistency check in Section 3.

There's also a rule that's easy to forget: **the holdout set**. If you repeatedly tune prompts on the evaluation set, the evaluation set itself starts to become overfit. Split the samples into two piles—the **development set** for iteration, and the **holdout set** run only once before you're ready to merge. This is the same principle as the train/test split in machine learning, it's just that many people forget it applies equally in prompt engineering.

## 3. LLM-as-a-Judge: cheap, but with systematic bias

Fifty samples times ten iterations, and human evaluation quickly becomes an impossible task. Using a strong model as the judge is currently the most practical way to scale this up.

The paper "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena" validated the feasibility of this approach: **a GPT-4-level judge agrees with human preferences at over 80%, already comparable to the agreement rate among human reviewers**. The paper divides judge usage into three categories:

1. **Pairwise comparison**: give two answers and choose the better one.
2. **Single-answer grading**: give one answer an absolute score.
3. **Reference-guided**: also provide the standard answer, especially necessary for math and reasoning tasks.

But the paper also names three **systematic biases** that you must actively counter:

- **Position bias**: the judge tends to choose the first (or second) one. The mitigation is to **swap the order and judge once each**, and if the two conclusions disagree, record it as a tie.
- **Verbosity bias**: longer answers are more likely to be considered better. This is especially fatal for reasoning questions—the model can game the score with waffle.
- **Self-preference**: the judge tends to favor its own outputs. Using a judge different from the model under test can mitigate this to some extent.

There's also a practical principle: **your judge must first be evaluated itself**. The method is to sample 30–50 high-quality human-labeled examples, run the judge once, and see its agreement rate with humans. If the agreement rate is below 75%, then all conclusions the judge gives are noise—fix the judge first, then talk about conclusions.

## 4. Don't mistake noise for improvement

This is the link most easily overlooked and most likely to lead people to wrong conclusions.

A score from one evaluation is essentially a sample drawn from the invisible population of "all possible questions." The sample mean naturally carries a **standard error** (SEM), and the standard error decreases with sample size much more slowly than intuition suggests—increasing the number of questions from 50 to 200 (a fourfold increase) only halves the standard error.

The approach summarized by Anthropic based on Evan Miller's paper "Adding Error Bars to Evals" is worth copying directly:

- **Report the standard error, not just the mean**. The 95% confidence interval is "mean ± 1.96 × standard error." If A is 71% and B is 73%, but the confidence intervals overlap substantially, then **nothing has been proven**.
- **Clustered standard errors**. In many evaluation sets, several questions revolve around the same piece of material (the same article, the same document); they are not independent, and the naive formula will underestimate the standard error—the paper points out that on some benchmarks the clustered standard error is **more than three times** the naive value.
- **Do paired difference analysis**. The two models run the same batch of questions; comparing "the per-question score difference" is better than comparing "the two overall means" at canceling out fluctuations caused by question difficulty. The correlation coefficient of question scores between frontier models is roughly **0.3–0.7**, and pairing is nearly free noise reduction.
- **Do a power analysis first**. First state the effect size you want to verify (for example, "A is 3 percentage points higher than B"), then work backward to how many questions you need, rather than running it first and then looking at the results.

## 5. Online A/B: good offline ≠ good online

No matter how comprehensive the offline evaluation set is, it cannot predict how real users will use you. Online A/B is the final gate that cannot be skipped. Metrics should be chosen that **reflect value**, not the ones easiest to measure:

- Adoption rate / copy rate: whether users actually used the answer it gave
- Follow-up rate and retry rate: if the answer is bad, users will rephrase and ask again
- Task completion rate: if it's an Agent, this is the end-to-end success rate
- Cost and latency: P95 latency, token cost per session

There's also an iron rule: **don't peek midway**. Repeatedly checking A/B results and stopping as soon as you see "significant" is the classic **peeking** problem, and it inflates the false positive rate far beyond 5%. Either calculate the sample size in advance and run to completion, or switch to statistical methods designed for this, such as sequential testing.

## 6. Human evaluation: when it can't be skipped

No matter how cheap the LLM judge is, there are questions it cannot answer: **safety boundaries, brand tone, subtle offense**. These "only understandable by feel" dimensions must be left to humans.

What human evaluation must pass is **annotation consistency**. If two annotators' judgments on the same batch of samples differ greatly, the problem lies in the scoring criteria, not the model. Use a consistency coefficient like **Cohen's kappa** to measure it: if it's below 0.6, go back and write the rubric in more detail, making clear "what counts as a violation," rather than continuing to add annotators.
## A Minimal Working Implementation

The script below implements the two most important things in pairwise evaluation: **position swapping** (eliminating position bias) and **confidence intervals** (don't mistake noise for improvement). Written in TypeScript, with the judge model portion abstracted away behind a replaceable `judge` function.

```ts
type Pair = { id: string; input: string; a: string; b: string };

/** Judge interface: returns "A" | "B" | "tie" */
type Judge = (input: string, first: string, second: string) => Promise<"FIRST" | "SECOND" | "TIE">;

/** Translate the judge's "which one" into "which candidate", note that the argument order is reversed between the two calls */
const toWinner = (vote: "FIRST" | "SECOND" | "TIE", first: "A" | "B"): "A" | "B" | "tie" => {
  if (vote === "TIE") return "tie";
  if (vote === "FIRST") return first;
  return first === "A" ? "B" : "A";
};

/** Single pairwise judgment: judge once for each swapped position; if the conclusions disagree, record it as a tie */
export async function compareOnce(judge: Judge, p: Pair): Promise<"A" | "B" | "tie"> {
  const [fwd, rev] = await Promise.all([
    judge(p.input, p.a, p.b), // A first → FIRST represents A
    judge(p.input, p.b, p.a), // B first → FIRST represents B
  ]);
  const w1 = toWinner(fwd, "A");
  const w2 = toWinner(rev, "B");
  // Swap the order and the conclusion flips, which means the judge relies on position rather than content; this one is unreliable
  return w1 === w2 ? w1 : "tie";
}

/** Wilson interval: more stable than the normal approximation for small samples, and won't go out of bounds beyond [0,1] */
export function wilson(successes: number, n: number, z = 1.96) {
  if (n === 0) return { lo: 0, hi: 0 };
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { lo: Math.max(0, center - margin), hi: Math.min(1, center + margin) };
}

/** Run the entire evaluation set, win rate = wins / (wins + losses), ties excluded */
export async function runEval(judge: Judge, pairs: Pair[]) {
  const tally = { A: 0, B: 0, tie: 0 };
  for (const p of pairs) tally[await compareOnce(judge, p)]++;

  const decided = tally.A + tally.B;
  const winRate = decided === 0 ? 0.5 : tally.A / decided;
  const ci = wilson(tally.A, decided);

  return {
    tally,
    winRate,
    ci95: [ci.lo, ci.hi] as const,
    // The interval must fall entirely on the same side of 0.5 to be significant; when decided is 0 the interval degenerates and can't be counted
    significant: decided > 0 && (ci.lo > 0.5 || ci.hi < 0.5),
  };
}
```

Usage and interpretation:

```ts
const result = await runEval(myJudge, pairs);
console.log(`A win rate ${(result.winRate * 100).toFixed(1)}%  ` +
  `95% CI [${(result.ci95[0] * 100).toFixed(1)}, ${(result.ci95[1] * 100).toFixed(1)}]`);
// Only when the interval lies entirely above 0.5 can we claim A is truly better; otherwise keep adding samples.
```

Note the final `significant` criterion: **only when the entire confidence interval falls on the same side of 0.5 can you claim an improvement**. This is the one line of code that separates "I saw a 55% win rate" from "I proved A is better."

## Five Pitfalls You'll Keep Stepping Into

1. **Reporting only the mean, not the interval**: The difference between 71% and 73% is usually pure noise on 50 samples.
2. **Using the dev set as the validation set**: An eval set you've tuned prompts against for ten rounds can no longer prove anything.
3. **Using an uncalibrated judge**: When the judge's own agreement rate with humans falls short, every number it outputs is untrustworthy.
4. **Looking at only one metric when metrics conflict**: Accuracy went up but the refusal rate collapsed — a classic case of "winning the metric, losing the business."
5. **Leaking the test set**: Pasting holdout samples into the prompt as few-shot examples is equivalent to single-handedly destroying your only acceptance criterion.

## Conclusion

Evaluation isn't a process you tack on after writing the code — it's actually the **evidence chain for product decisions**. Public benchmarks handle coarse screening, custom eval sets handle offline acceptance, LLM judges handle scaling up sample size, significance testing handles distinguishing signal from noise, A/B handles the final real-world validation, and human evaluation handles catching all those boundaries that can only be grasped intuitively.

Put together, this whole thing isn't complicated. What's hard is admitting one thing: **before you've tested it, "it feels better" and "nothing changed" are indistinguishable**.

## References

- Zheng et al. · [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685) (arXiv:2306.05685, the original source for judge-human agreement rates, three usage patterns, and three types of bias)
- Evan Miller · [Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations](https://arxiv.org/abs/2411.00640) (arXiv:2411.00640, standard errors, clustered standard errors, and paired difference analysis)
- Anthropic · [A statistical approach to model evaluations](https://www.anthropic.com/research/statistical-approach-to-model-evals) (an engineering-oriented summary of the five recommendations from the above paper)
- OpenAI · [Graders Official Guide](https://developers.openai.com/api/docs/guides/graders) (judge types such as `string_check` / `text_similarity` / `python` / `label_model` / `score_model`, and approaches for detecting grader hacking)