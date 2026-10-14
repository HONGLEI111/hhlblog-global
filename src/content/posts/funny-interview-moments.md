---
title: 程序员面试中的搞笑瞬间：白板前的众生相
published: 2026-09-19
description: '从 Homebrew 作者被 Google 拒之门外，到 FizzBuzz 筛掉一半应聘者——面试间里那些荒诞又真实的瞬间。'
image: ''
tags: [程序员笑话, 面试, 职业发展, 软件工程]
category: '其他'
draft: false
lang: ''
---

面试大概是程序员表演密度最高的场合：平时敲三个字符就靠 IDE 补全的人，此刻要在白板上默写红黑树；平时文档查得飞起的人，此刻要假装自己背下了所有 API。

## 最著名的一次「翻车」

2015 年，Homebrew 的作者 Max Howell 去 Google 面试被拒，随后发了一条流传至今的推文：

> Google: 90% of our engineers use the software you wrote (Homebrew), but you can't invert a binary tree on a whiteboard so fuck off.

「我们九成的工程师每天在用你写的软件，但你没法在白板上翻转二叉树，所以再见。」这句话之所以经典，是因为它精准戳中了技术面试的荒诞——我们考的东西和真正做的工作，往往隔着一整个银河系。

## FizzBuzz 的残酷实验

2007 年，招聘者 Imran Ghory 提出了一个极简的面试题：打印 1 到 100，3 的倍数输出 `Fizz`，5 的倍数输出 `Buzz`，同时是两者倍数则输出 `FizzBuzz`。

```javascript
for (let i = 1; i <= 100; i++) {
  let out = '';
  if (i % 3 === 0) out += 'Fizz';
  if (i % 5 === 0) out += 'Buzz';
  console.log(out || i);
}
```

就这么七行代码，他说能筛掉相当比例的应聘者，其中不乏简历上写着「精通 Java、C++」的人——有人写不出循环，有人把 `%` 当成了百分比运算符。

## 面试间里的经典名场面

- 「你为什么想加入我们？」——「因为你们在招人。」
- 「你的缺点是什么？」——「太追求完美。」（面试官今年第 800 次听到这个答案）
- 「井盖为什么是圆的？」——微软的招牌题，标准答案是「圆盖子不会掉进井里」，但它真正考察的是你被问懵后还能不能保持微笑。
- 面试官说「我们来看一道简单的算法题」——此时你知道，接下来四十五分钟，你将和一道 LeetCode Hard 面面相觑。

## 结语

面试的荒诞在于，它试图用一小时的即兴表演，去预测一个人未来几年的日常工作。翻转二叉树和写 CRUD 确实没多大关系——但正因如此，这些故事才让人记得住。

下次在白板前卡住时，不妨想想 Max Howell：写代码和造软件是两件事，面试挂掉证明不了什么。毕竟，连 Homebrew 的作者都被拒了。

---

**参考来源**

- [Max Howell 关于 Google 面试的推文](https://twitter.com/mxcl/status/608682016205344768) — Homebrew 作者的著名吐槽
- [Using FizzBuzz to Find Developers who Grok Coding - Imran Ghory](https://imranontech.com/2007/01/24/using-fizzbuzz-to-find-developers-who-grok-coding/) — FizzBuzz 面试题的原始出处
- [Manhole cover - Wikipedia](https://en.wikipedia.org/wiki/Manhole_cover) — 微软经典面试题的来龙去脉
