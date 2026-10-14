---
title: 那些年我们写过的「注释」——代码注释奇葩大赏
published: 2026-08-10
description: '盘点程序员在代码中留下的那些令人啼笑皆非的注释，从甩锅到自嘲，每一种你都可能写过。'
image: ''
tags: [代码注释, 程序员笑话, 编程趣闻]
category: '其他'
draft: false
lang: ''
---

代码注释的初衷很简单：解释这段代码在干什么。但现实中，注释往往成了程序员的情绪出口、免责声明，甚至是行为艺术。打开任何一个存在超过两年的项目，你大概率能在注释里找到比代码本身更精彩的内容。

## 甩锅型：「这不是我的问题」

这类注释的核心诉求是——如果出了问题，别找我。

```javascript
// 这段代码是我凌晨三点写的，我当时不知道为什么这样写，
// 但现在它能跑，所以我也不敢动它。
// 如果你改了它导致任何问题，请不要在 git blame 里找到我。
const magicNumber = 42;
```

```python
// 此处逻辑来源于产品经理的"小需求"
// 如有疑问，请联系 PM（已离职）
apply_discount_logic()
```

更精炼的版本：「_If you remove this line, the program will crash. Don't ask me why._」

## 自嘲型：「我知道我很菜」

自嘲是程序员的传统美德。这类注释往往带着三分无奈、七分真诚。

```java
// 以下代码使用了「暴力枚举法」
// 时间复杂度 O(n³)，但 n 目前最大只有 3，所以理论上没问题
// —— 当然，这只是我的借口
for (int i = 0; i < list.size(); i++) {
  for (int j = 0; j < list.size(); j++) {
    for (int k = 0; k < list.size(); k++) {
      // ...
    }
  }
}
```

另一个经典：

```rust
// TODO: 重构这段代码
// 但我已经对着它看了三个小时了，
// 现在只想回家躺平。
// —— 2024年3月15日
```

而这个 TODO 对应的日期，往往比项目的第一个 commit 还早。

## 诚实型：「说出来你可能不信」

有时候，真相就是这么朴实无华。

```css
/* 
 * 这个 z-index 的值之所以是 99999，
 * 是因为 modal 被 navbar 挡住了（z-index: 1000），
 * navbar 被 dropdown 挡住了（z-index: 5000），
 * dropdown 被 tooltip 挡住了（z-index: 10000），
 * 我不想重构整个 z-index 体系，所以……
 */
.modal { z-index: 99999; }
```

还有这种：

```
// 我承认这一段是从 Stack Overflow 复制的
// 链接：https://stackoverflow.com/questions/xxxxx
// 我现在看不懂，但能跑就行
```

诚实得让人不忍责备。

## 过度防御型：「我预判了你的预判」

```
// ======================================================
// WARNING: DO NOT MODIFY THE CODE BELOW
// 如果你觉得你能优化它，相信我，你不能。
// 我们试过了。三次。每次都以回滚告终。
// 请尊重前人的血泪教训。
// ======================================================
```

有些防御型注释甚至比被它保护的代码还长。

## 结语

代码注释就像程序员的名片——有人用来自嘲，有人用来甩锅，有人默默留下"此处有坑"的警示。无论哪种风格，它们都让冰冷的代码多了一点温度。当然，最好的注释，其实是**不需要注释的代码**。但在那之前，至少让我们写得有趣一点。

> 你的项目中藏着哪些有趣的注释？欢迎分享。

---

**参考来源**

- [The Funniest Code Comments on GitHub](https://github.com/nickmilo/funny-comments) — GitHub 趣味注释收集
- [What is the funniest comment you've encountered in source code?](https://stackoverflow.com/questions/184618/what-is-the-best-comment-in-source-code-you-have-ever-encountered) — Stack Overflow 经典讨论
