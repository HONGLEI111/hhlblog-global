---
title: 正则表达式笑话：Now You Have Two Problems
published: 2026-08-09
description: '为什么说"用正则表达式解决问题后，你就有了两个问题"——编程界最经典的自嘲之一'
image: ''
tags: [正则表达式, 编程笑话, 调试]
category: '前端'
draft: false
lang: ''
---

程序员圈子里流传着这样一句话：

> Some people, when confronted with a problem, think "I know, I'll use regular expressions." Now they have two problems.

翻译过来就是：**"有些人遇到问题时，心想'我知道，用正则表达式！'——现在他们有了两个问题。"**

这句话出自著名的开源黑客 Jamie Zawinski（jwz），最早于 1997 年 8 月在 Usenet 上发布。二十多年过去了，这句话依然是程序员之间引用频率最高的自黑名言之一。

## 为什么正则表达式这么"招黑"？

先来看一段真实的正则表达式——这是 RFC 5322 中用于验证电子邮件地址的官方正则：

```regex
(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])
```

看到这行代码的第一反应：这是不小心把猫放在了键盘上吗？

更讽刺的是，即使这么复杂的正则，**它也没法 100% 正确验证所有合法邮箱**。比如带注释的邮箱地址 `user@domain`（没错，域名也可以不带点）、或者包含特殊 Unicode 字符的邮箱，这个正则统统会拒绝。

## 经典翻车现场

### "我只需要匹配 HTML 标签"

几乎每个前端开发者都踩过这个坑。你只是想用正则提取 `<div>` 标签里的内容：

```javascript
const html = '<div>第一层 <div>嵌套内容</div></div>'
const match = html.match(/<div>(.*)<\/div>/)
console.log(match[1]) // "第一层 <div>嵌套内容"  —— 意料之外！
```

**正则表达式在默认情况下是贪婪匹配的。** 加上 `?` 改成非贪婪模式？还是不行——嵌套标签是上下文无关文法，正则表达式这种有限状态自动机在理论上就无法完美处理。

正确的答案早已被刻在 Stack Overflow 的神回复上（获得了超过 4000 个赞）：

> You can't parse [X]HTML with regex. Because HTML can't be parsed by regex. Regex is not a tool that can be used to correctly parse HTML.  
> —— Stack Overflow 用户 bobince

原帖回答长达数千字，措辞之激动宛如一位饱受折磨的程序员在深夜的呐喊。如果你没读过，它值得你花五分钟全文阅读。

### "验证日期格式很简单"

```javascript
// 你以为这样就够了
const dateRegex = /\d{4}-\d{2}-\d{2}/
dateRegex.test('2026-02-30') // true —— 2月30日？
dateRegex.test('2026-13-01') // true —— 13月？
dateRegex.test('0000-00-00') // true —— 混沌初开？
```

正则只判断格式，不判断语义。想用正则完整验证日期合法性？恭喜你，你需要处理闰年、大小月、以及 1582 年 10 月少了 10 天这种历史遗留问题。

### 正则求偶

Reddit 上还有个经典帖子：有人用正则表达式在 OkCupid 相亲网站上搜索匹配对象。他的搜索条件是：

```regex
(?:engineer|developer|programmer|coder|hacker) (?!.*(?:politics|religion|vegan|gluten))
```

翻译：找一个工程师/开发者/程序员，但不要整天谈政治、宗教、素食主义或无麸质饮食的。

效果如何？帖子没有后续更新，大概率——**他现在有三个问题了**。

## 正则不是坏工具，但它是危险工具

说到底，正则表达式是一门**"写起来爽，读起来火葬场"**的语言。它能用一行代码解决几百行解析逻辑，但两个月后连你自己都看不懂。

最佳实践很简单：**用正则做匹配和简单提取，用解析器做结构化解析。** 当你发现正则写到第二十个字符还停不下来时——停手，想想是不是该换工具了。

正则表达式，就像一个黑洞——你越靠近它，它就越容易把你吸进去。明智的程序员懂得保持安全距离。

---

**参考来源：**

- [Jamie Zawinski 原始 Usenet 帖子 (1997)](http://regex.info/blog/2006-09-15/247) — Jeffrey Friedl 的博客存档了这句名言
- [You Can't Parse HTML With Regex](https://stackoverflow.com/a/1732454) — Stack Overflow 传奇回答
- [Regular-Expressions.info](https://www.regular-expressions.info/) — 正则表达式权威学习资源
