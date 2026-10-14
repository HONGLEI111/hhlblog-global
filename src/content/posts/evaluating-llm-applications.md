---
title: 如何科学评测一个 LLM 应用：基准、A/B 与人工评估
published: 2026-10-08
description: '把「感觉这次好多了」换成可复现的数字：从公共基准的局限、自建评测集与 LLM-as-a-Judge 的偏差，到配对显著性检验与线上 A/B，附一个带位置交换和置信区间的 TypeScript 判官。'
image: ''
tags: [LLM, 评测, Evals, LLM-as-a-Judge, A/B 测试, 统计, AI]
category: 'AI'
draft: false
lang: ''
---

你改了一版系统提示词，随手跑了五六个问题，答案确实更顺眼了，于是合并上线。两周后客服开始转来投诉邮件——模型在新版本里学会了把「我不确定」说得更像「我很确定」。

问题不在于这一改动是错的，而在于**你从头到尾没有测量**。「看起来更好」是人类在五条样本上的直觉，不是证据。这篇文章想讲清楚：要把一次 LLM 应用的改动判断成「变好」还是「没变」，需要在哪几个层次上留下数字。

## 一、公共基准：能证明什么，不能证明什么

先说结论：MMLU、MT-Bench、HumanEval 这类公共基准，**几乎不能用来判断你的应用变好了没有**。

它们回答的是「这个模型在通用能力上的水位大概在哪」，作用是在选型阶段帮你划掉一批明显不行的候选。一旦进入「A 提示词 vs B 提示词」「加检索 vs 不加检索」的阶段，它们就失效了——你的场景是特定的：固定的几类问题、特定的回复格式、特定的拒答边界，没有任何通用基准覆盖得到。

更麻烦的是**数据污染**：题目早就躺在训练语料里了，模型可能只是见过答案。再加上 Goodhart 定律——当分数成为目标，刷分手段（选择题猜答、格式套话）就会盖过真实能力。所以公共基准的分只适合**粗筛**，不适合**验收**。能验收的评测集，必须自己建。

真正能验收的评测集，必须自己建。

## 二、自建评测集：从「我觉得」到「我测过」

自建评测集不需要几百条。一个能生效的最小评测集，通常 50～200 条就够，关键是**每条都来自真实场景**。最好的样本来源是线上日志——把用户真实问过、真实卡住的地方捞出来脱敏入集；其次是手工构造的边界案例，那些「模型一定会答错」的刁钻输入，价值远高于随手编的常规问题。

每条样本 = 一个输入 + 一个判定标准。判定标准有两种粒度：

- **通过/不通过**（pass/fail）：答案里是否包含金额、是否拒绝了这次越权请求、JSON 是否可解析。二值判定方差最小，能直接做统计检验。
- **打分**（1～5 分）：适合「有用性」这类没有唯一答案的维度，但它引入了评分者噪声，必须配合第三节的一致性检查。

还有一条容易被忘的规矩：**留出集**。如果你在评测集上反复调提示词，评测集本身就开始被过拟合。把样本分成两堆——**开发集**用于迭代，**留出集**只在准备合并前跑一次。这和机器学习里 train/test 的分法是同一个道理，只是很多人忘了它在提示词工程里同样成立。

## 三、LLM-as-a-Judge：便宜，但有系统性偏差

50 条样本乘以十次迭代，人工评测很快就变成了不可能完成的任务。用强模型来当判官，是目前最实用的放大手段。

《Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena》这篇论文验证了这个做法的可行性：**GPT-4 级别的判官与人类偏好的一致率超过 80%，已经和人类评审之间的一致率相当**。论文把判官用法分成三类：

1. **成对比较**（pairwise）：给两个回答，选更好的那个。
2. **单答案打分**（single-answer grading）：给一个回答打绝对分。
3. **参考答案辅助**（reference-guided）：同时给出标准答案，在数学、推理类任务上尤其必要。

但论文同样点名了三种**系统性偏差**，你必须主动对付：

- **位置偏差**：判官倾向于选第一个（或第二个）。缓解办法是**交换顺序各判一次**，两次结论不一致就记为平局。
- **冗长偏差**：更长的回答更容易被认为更好。对推理类问题尤其致命——模型可以靠废话刷分。
- **自我偏好**：判官倾向于自己的输出。用与被测模型不同的判官可以在一定程度上缓解。

还有一条实践原则：**你的判官必须自己先被评测过**。做法是抽 30～50 条人工标过的高质量样本，跑一遍判官，看它和人工的一致率。如果一致率低于 75%，那么判官给出的所有结论都是噪声——先修判官，再谈结论。

## 四、别把噪声当成提升

这是最容易被忽视、也最容易让人得出错误结论的一环。

一次评测得到的分数，本质上是从「所有可能的问题」这个看不见的总体里抽了一个样本。样本均值天然带着**标准误**（SEM），而标准误随样本量下降得比直觉慢得多——把问题数从 50 增加到 200（翻四倍），标准误才减半。

Anthropic 基于 Evan Miller 的论文《Adding Error Bars to Evals》总结的做法值得直接照搬：

- **报告标准误，而不只是均值**。95% 置信区间就是「均值 ± 1.96 × 标准误」。如果 A 是 71%、B 是 73%，但置信区间大面积重叠，那就**什么都没证明**。
- **聚类标准误**。很多评测集里若干问题围绕同一段材料（同一篇文章、同一份文档），它们不独立，朴素公式会低估标准误——论文指出某些基准上聚类标准误会是朴素值的**三倍以上**。
- **做配对差分析**。两个模型跑的是同一批题目，比较「逐题的得分差」比比较「两个总均值」更能消掉题目难度带来的波动。前沿模型之间的题目得分相关系数大致在 **0.3～0.7**，配对是近乎免费的降噪。
- **先做功效分析**。先说出你想验证的效应量（比如「A 比 B 高 3 个百分点」），再反推需要多少题目，而不是先跑完再看结果。

## 五、线上 A/B：离线好 ≠ 线上好

离线评测集再全，也预测不了真实用户怎么用你。线上 A/B 是不可省的最后一关。指标要选**能反映价值的**，而不是最容易测的：

- 采纳率 / 复制率：用户是否真的用了它给的答案
- 追问率与重试率：答得不好，用户会换个说法再问
- 任务完成率：如果是 Agent，就是端到端成功率
- 成本与延迟：P95 延迟、每次会话的 token 花费

还有一条铁律：**别中途偷看**。反复查看 A/B 结果、看到「显著」就停，是典型的**偷看偏差**（peeking），会把假阳性率放大到远超 5%。要么事先算好样本量跑满，要么改用序贯检验这类专为此设计的统计方法。

## 六、人工评估：什么时候不能省

LLM 判官再便宜，也有它答不了的题：**安全边界、品牌语气、微妙的冒犯**。这类「只能意会」的维度必须留给人。

人工评估要过的关是**标注一致性**。两个标注员对同一批样本的判定如果差异很大，问题出在评分标准上，不在模型上。用 **Cohen's kappa** 这类一致性系数衡量：低于 0.6 就回去把 rubric 写细，讲清楚「什么算违规」，而不是继续加标注员。

## 一个可运行的最小实现

下面这个脚本实现了成对评测里最要紧的两件事：**位置交换**（消除位置偏差）和**置信区间**（别把噪声当提升）。用 TypeScript 写，判官模型部分用一个可替换的 `judge` 函数抽象掉。

```ts
type Pair = { id: string; input: string; a: string; b: string };

/** 判官接口：返回 "A" | "B" | "tie" */
type Judge = (input: string, first: string, second: string) => Promise<"FIRST" | "SECOND" | "TIE">;

/** 把判官的「第几个」翻译成「哪个候选」，注意两次调用的参数顺序是反的 */
const toWinner = (vote: "FIRST" | "SECOND" | "TIE", first: "A" | "B"): "A" | "B" | "tie" => {
  if (vote === "TIE") return "tie";
  if (vote === "FIRST") return first;
  return first === "A" ? "B" : "A";
};

/** 单次成对判定：交换位置各判一次，结论不一致即记为平局 */
export async function compareOnce(judge: Judge, p: Pair): Promise<"A" | "B" | "tie"> {
  const [fwd, rev] = await Promise.all([
    judge(p.input, p.a, p.b), // A 在前 → FIRST 代表 A
    judge(p.input, p.b, p.a), // B 在前 → FIRST 代表 B
  ]);
  const w1 = toWinner(fwd, "A");
  const w2 = toWinner(rev, "B");
  // 换个顺序结论就翻转，说明判官靠的是位置而不是内容，这一条不可信
  return w1 === w2 ? w1 : "tie";
}

/** Wilson 区间：小样本下比正态近似更稳，且不会越界到 [0,1] 之外 */
export function wilson(successes: number, n: number, z = 1.96) {
  if (n === 0) return { lo: 0, hi: 0 };
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { lo: Math.max(0, center - margin), hi: Math.min(1, center + margin) };
}

/** 跑完整个评测集，胜率 = 胜 / (胜 + 负)，平局剔除 */
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
    // 区间完全落在 0.5 同侧才算显著；decided 为 0 时区间退化，不能算数
    significant: decided > 0 && (ci.lo > 0.5 || ci.hi < 0.5),
  };
}
```

用法和解读：

```ts
const result = await runEval(myJudge, pairs);
console.log(`A 胜率 ${(result.winRate * 100).toFixed(1)}%  ` +
  `95% CI [${(result.ci95[0] * 100).toFixed(1)}, ${(result.ci95[1] * 100).toFixed(1)}]`);
// 区间完全在 0.5 以上，才敢说 A 真的更好；否则继续加样本。
```

注意最后那个 `significant` 判据：**只有当整个置信区间都落在 0.5 的同侧时，才能宣称有提升**。这是把「我看到了 55% 的胜率」和「我证明了 A 更好」区分开的唯一一行代码。

## 五个反复踩的坑

1. **只报均值，不报区间**：71% 和 73% 的差别，在 50 条样本上通常是纯噪声。
2. **拿开发集当验收集**：调了十轮提示词的评测集，已经不能用来证明任何东西了。
3. **判官没校准就用**：判官自身和人工的一致率不达标时，它输出的所有数字都不可信。
4. **指标之间打架时只看一个**：准确率涨了但拒答率崩了，是典型的「赢了指标输了业务」。
5. **泄露测试集**：把留出集的样本贴进提示词当 few-shot 示例，等于亲手废掉唯一的验收标准。

## 结语

评测不是写完代码之后补的一道流程，它其实是**产品决策的证据链**。公共基准负责粗筛，自建评测集负责离线验收，LLM 判官负责放大样本量，显著性检验负责区分信号与噪声，A/B 负责最后的真实世界验证，人工评估负责兜住那些只能意会的边界。

这套东西加起来并不复杂，难的是承认一件事：**在你测过之前，「感觉更好了」和「什么都没变」是无法区分的**。

## 参考来源

- Zheng et al. · [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685)（arXiv:2306.05685，判官与人类一致率、三类用法与三种偏差的原始出处）
- Evan Miller · [Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations](https://arxiv.org/abs/2411.00640)（arXiv:2411.00640，标准误、聚类标准误与配对差分析）
- Anthropic · [A statistical approach to model evaluations](https://www.anthropic.com/research/statistical-approach-to-model-evals)（对上述论文五条建议的工程化总结）
- OpenAI · [Graders 官方指南](https://developers.openai.com/api/docs/guides/graders)（`string_check` / `text_similarity` / `python` / `label_model` / `score_model` 等判官类型，以及 grader hacking 的检测思路）
