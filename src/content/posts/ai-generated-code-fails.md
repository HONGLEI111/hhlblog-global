---
title: AI 生成代码的翻车现场：从「自信胡说」到「幻觉依赖」
published: 2026-09-07
description: '当 AI 编码助手一本正经地推荐根本不存在的函数和依赖包，我们该如何笑着把安全漏洞挡在门外。'
image: ''
tags: [AI, 编程, 程序员笑话, 安全]
category: 'AI'
draft: false
lang: ''
---

AI 编码助手最迷人的地方，是它**永远用最自信的语气给出答案**——哪怕答案是错的。于是程序员的日常就多了一种新的喜剧：看 AI 一本正经地胡说八道。

## 那些让人哭笑不得的「自信错误」

它会在你问「怎么去重」时，给出一个 pandas 里根本不存在的函数：

```python
import pandas as pd

df = pd.read_csv("data.csv")
df.verbose_dropna(inplace=True)   # 顺带把日志都打印了，体贴吧？
# 现实：pandas 没有 verbose_dropna，AI 只是把两个词硬拼在了一起
```

你反驳它，它会道歉、再给一个**同样不存在**的新函数。这份「屡败屡战」的执着，像极了刚入职又不好意思说自己不会的实习生。

## 更危险的翻车：幻觉出来的依赖包

如果只是函数名错，编译器会立刻打脸。真正让人后背发凉的是**幻觉依赖包（slopsquatting）**。

AI 有时候会推荐一个「特别好用」的第三方库，比如：

```bash
npm install react-codeshift   # 实际并不存在的包
```

问题来了：AI 推荐的假包名往往**稳定且可复现**——同一批模型会反复吐出同一个名字。于是安全研究员真的去把 `react-codeshift` 注册了下来做实验，结果它「流窜」进了 **237 个 GitHub 仓库**，还被不少 AI 编程 Agent 自主下载安装。一项研究对 16 个大模型做了 57.6 万次代码生成测试，发现商业模型约 5.2%、开源模型约 21.7% 的概率会编造出不存在的包名，累计产出 20 多万个假名字。

换句话说：AI 不是在「查」包，是在**给包起名字**，而坏人只需要抢先注册，就能把恶意代码送进你的 `node_modules`。

## 保命小贴士

别让「信任 AI」变成「信任一个不存在的供应商」。安装前花两秒验明正身：

```bash
npm view react-codeshift   # 报 404 就说明这个包是 AI 编的
pip index versions react-codeshift
```

## 结语

AI 生成代码就像一位语速飞快、永远微笑的助手：它帮你省下大量时间，但你得偶尔抓住它的肩膀，认真问一句——**「这个函数，真的存在吗？」**

---

**参考来源**

- [Top AIs invent same fake PyPl and npm package names](https://www.csoonline.com/article/4201164/top-ais-invent-same-fake-pypl-and-npm-package-names-2.html) — CSO Online 报道，多个顶级大模型编出相同的虚假包名
- [Slopsquatting: How AI Agents Are Hallucinating Dependencies Into Real Supply-Chain Attacks](https://lyrie.ai/research/research/2026-05-06-slopsquatting-hallucinated-npm-agents) — 幻觉依赖如何演变成真实的供应链攻击
- [npm Slopsquatting: Hallucinated Package Risk Explained](https://safeguard.sh/resources/blog/npm-slopsquat-hallucinated-package-risk-2026) — 幻觉包风险的防御思路
