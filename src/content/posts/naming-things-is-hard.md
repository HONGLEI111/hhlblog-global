---
title: 命名困难症：程序员最头疼的事
published: 2026-08-22
description: '缓存失效、命名、以及 off-by-one 错误——为什么给变量起个好名字是程序员最头疼的事。'
image: ''
tags: [命名, 编程习惯, 程序员笑话]
category: '其他'
draft: false
lang: ''
---

编程界有一句流传极广的名言：

> There are only two hard things in Computer Science: cache invalidation and naming things.

翻译过来就是：**「计算机科学里只有两件难事：缓存失效和命名。」** 这句话出自 Netscape 工程师 Phil Karlton 之口，被 Martin Fowler 收录进文章《TwoHardThings》，从此成为程序员之间心照不宣的自嘲。

好笑的是，这句话后来被网友玩出了无数个续集版本。最经典的一个是：**「计算机科学里只有两件难事：缓存失效、命名，以及 off-by-one 错误。」**——数一数，正好三件，多出来的那一件就是 off-by-one 错误。这个冷幽默本身就是一个完美的 off-by-one 演示。

## 那些年我们起过的名字

翻一翻自己的旧代码，几乎每个人都能找到一段命名车祸现场。下面这段「猜猜看」你能读得下去吗：

```javascript
function handleData(d) {
  let x = d.a;
  let tmp = [];
  for (let i = 0; i < x.length; i++) {
    if (x[i].flag === 1) {
      tmp.push(x[i].v);
    }
  }
  return tmp;
}
```

`d` 是什么？`a` 是什么？`flag === 1` 又代表什么状态？——每个变量都在大喊「你猜啊」。而它的作者，三个月后再看到这段代码时，大概率也会加入猜谜的队伍。

改个名字，世界瞬间清晰：

```javascript
function getActiveUsernames(users) {
  return users
    .filter((user) => user.isActive)
    .map((user) => user.username);
}
```

变量名真正的读者不是编译器，而是**未来的自己**和接手你代码的同事。编译器才不在乎你叫它 `x` 还是 `activeUserCount`，但凌晨三点排查线上问题时，一个清晰的命名能省下半小时的 `console.log`。

## 命名的三大流派

现实中的烂名字大致分为三派：

- **摆烂派**：`data`、`info`、`tmp`、`foo`、`bar`、`a1`、`x2`。变量多了就 `data2`、`data3`，生生排出一支军队。
- **万能派**：`manager`、`handler`、`utils`、`helper`、`processor`。一个项目里可以有八个 `Manager`，谁也不清楚谁管谁。
- **废话派**：`theData`、`dataValue`、`userObject`、`getData()`。加了个词等于没加，纯粹为了凑字数。

## 结语

命名确实很难，但它难在「需要用简短的几个词，精准概括一个概念」。这不是文字游戏，而是对代码理解的最终考验——**能起出好名字的人，通常也真正理解了问题本身。**

所以下次你盯着光标卡了十分钟时，别沮丧：你不是在纠结一个名字，而是在进行人类最难的智力活动之一。实在不行，就先写个 `TODO: rename this`，然后继续——反正缓存失效也还没解决呢。

---

**参考来源**

- [Martin Fowler: TwoHardThings](https://martinfowler.com/bliki/TwoHardThings.html) — 「缓存失效与命名」这句名言的出处考证
- [Robert C. Martin《Clean Code》第 2 章「Meaningful Names」](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) — 关于命名价值的经典章节
