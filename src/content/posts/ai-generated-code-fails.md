---
title: 'AI-Generated Code Fails: From Confident Nonsense to Hallucination Dependency'
published: 2026-09-07
description: When AI coding assistants confidently recommend functions and dependencies that don't exist, how do we laugh it off while keeping security holes at bay?
image: ''
tags: [AI, Programming, Programmer Humor, Security]
category: 'AI'
draft: false
---
The most fascinating thing about AI coding assistants is that they **always answer in the most confident tone**—even when the answer is wrong. So programmers' daily lives have gained a new kind of comedy: watching AI spout nonsense with a straight face.

## Those "confident errors" that leave you not knowing whether to laugh or cry

When you ask "how do I deduplicate," it will give you a function that doesn't exist in pandas at all:

```python
import pandas as pd

df = pd.read_csv("data.csv")
df.verbose_dropna(inplace=True)   # 顺带把日志都打印了，体贴吧？
# 现实：pandas 没有 verbose_dropna，AI 只是把两个词硬拼在了一起
```

You push back, and it apologizes, then gives you another **equally nonexistent** new function. This "keep fighting despite repeated failures" persistence is just like an intern who just joined the company and is too embarrassed to admit they don't know how to do something.

## The more dangerous crash: hallucinated dependency packages

If it's just a wrong function name, the compiler will immediately slap it down. What really sends a chill down your spine is **hallucinated dependency packages (slopsquatting)**.

Sometimes AI will recommend a "particularly useful" third-party library, for example:

```bash
npm install react-codeshift   # 实际并不存在的包
```

Here's the problem: the fake package names AI recommends are often **stable and reproducible**—the same batch of models will repeatedly spit out the same name. So security researchers actually went and registered `react-codeshift` to run an experiment, and as a result it "wandered" into **237 GitHub repositories**, and was even autonomously downloaded and installed by quite a few AI coding agents. One study ran 576,000 code generation tests across 16 large models and found that commercial models had about a 5.2% probability and open-source models about a 21.7% probability of fabricating nonexistent package names, producing more than 200,000 fake names in total.

In other words: AI isn't "looking up" packages, it's **making up names for packages**, and bad actors only need to register them first to send malicious code into your `node_modules`.

## Life-saving tips

Don't let "trusting AI" become "trusting a supplier that doesn't exist." Spend two seconds verifying identity before installing:

```bash
npm view react-codeshift   # 报 404 就说明这个包是 AI 编的
pip index versions react-codeshift
```

## Conclusion

AI-generated code is like an assistant who speaks very fast and never stops smiling: it saves you a lot of time, but you have to occasionally grab it by the shoulders and seriously ask—**"Does this function actually exist?"**

---

**References**

- [Top AIs invent same fake PyPl and npm package names](https://www.csoonline.com/article/4201164/top-ais-invent-same-fake-pypl-and-npm-package-names-2.html) — CSO Online report, multiple top large models invent the same fake package names
- [Slopsquatting: How AI Agents Are Hallucinating Dependencies Into Real Supply-Chain Attacks](https://lyrie.ai/research/research/2026-05-06-slopsquatting-hallucinated-npm-agents) — how hallucinated dependencies evolve into real supply-chain attacks
- [npm Slopsquatting: Hallucinated Package Risk Explained](https://safeguard.sh/resources/blog/npm-slopsquat-hallucinated-package-risk-2026) — defense approaches for hallucinated package risk