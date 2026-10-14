---
title: 程序员估算时间的经典笑话：总比预期慢一倍
published: 2026-08-30
description: '从 Hofstadter 定律到 90/90 法则，聊聊程序员为何永远估不准工期，以及那些流传几十年的估算段子。'
image: ''
tags: [程序员笑话, 时间估算, 项目管理, 软件工程]
category: '其他'
draft: false
lang: ''
---

「这个功能很简单，一天就能搞定。」——这大概是软件行业里被说过最多次、也错得最彻底的一句话。

程序员的时间估算，几乎是一个注定失败的任务。Douglas Hofstadter 在《哥德尔、艾舍尔、巴赫》里就提出过一条著名的定律：

> Hofstadter's Law: It always takes longer than you expect, even when you take into account Hofstadter's Law.

翻译过来就是：**「事情总是比你预期的花更长时间，即便你已经把这条定律考虑进去了。」** 这条递归式的自嘲，精准概括了所有程序员的宿命——你以为你算到了，其实你还是低估了。

## 经典段子

老板问：「这个功能要多久？」程序员心里想的是两天，嘴上却说「一周」。老板追问：「那这个更简单的呢？」程序员答「三天」。结果第一个花了三周，第二个拖了一个月——因为「简单」两个字出现在需求文档里，往往意味着「还没想清楚」。

还有一个流传已久的 **90/90 法则**，出自贝尔实验室的 Tom Cargill：

> The first 90 percent of the code accounts for the first 90 percent of the development time. The remaining 10 percent of the code accounts for the other 90 percent of the development time.

前 90% 的代码花掉 90% 的时间，剩下 10% 的代码再花掉另一个 90% 的时间——加起来 180%，多出来的 80% 就是留给「最后那点小问题」的。

## 估算公式

有人据此总结出了一套「经验公式」：

```javascript
// 程序员时间估算的朴素实现
function estimate(optimisticDays) {
  // 霍夫斯塔德定律：事情总比预期更久，即便你已经考虑到了这一点
  const hofstadter = (n) => n * 2 + 1;
  return hofstadter(hofstadter(optimisticDays));
}

console.log(estimate(1)); // 7 —— 一个「一天」的活，层层套娃后变成一周
```

`estimate(1)` 的输出是 `((1 * 2 + 1) * 2 + 1) = 7` 天。一个「一天」的活，翻倍再翻倍之后变成了一周——这大概就是为什么资深程序员的估算总是「乘二再加一」：不是他们悲观，而是他们已经被坑够了。

## 结语

时间估不准，不是能力问题，而是结构性的：软件的本质是「造一件从未存在过的东西」，没人能提前预知会踩进哪些坑。所以成熟的团队并不追求「估得准」，而是追求「早点暴露偏差」——把大任务拆小、频繁交付、随时修正。

下次你脱口而出「这个很简单」之前，记得先给 Hofstadter 定律留一份余地。毕竟，连考虑到了它的你，也还是低估了。

---

**参考来源**

- [Hofstadter's law - Wikipedia](https://en.wikipedia.org/wiki/Hofstadter%27s_law) — 递归自嘲定律的出处
- [Ninety-ninety rule - Wikipedia](https://en.wikipedia.org/wiki/Ninety-ninety_rule) — 90/90 法则的由来
- [Parkinson's law - Wikipedia](https://en.wikipedia.org/wiki/Parkinson%27s_law) — 「工作会膨胀到填满所有可用时间」
