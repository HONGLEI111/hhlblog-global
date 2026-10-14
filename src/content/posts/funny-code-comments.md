---
title: 'Code Comments We''ve Written Over the Years: A Hilarious Collection'
published: 2026-08-10
description: A roundup of the laugh-out-loud comments programmers have left in their code, from blame-shifting to self-deprecation—you've probably written one of each.
image: ''
tags: [code comments, programmer humor, programming anecdotes]
category: Other
draft: false
---
The original intent of code comments is simple: to explain what a piece of code is doing. But in reality, comments often become programmers' emotional outlets, disclaimers, or even performance art. Open any project that has existed for more than two years, and chances are you'll find content in the comments that's more entertaining than the code itself.

## 1. The Blame-Shifting Type: "This Is Not My Problem"

The core demand of this type of comment is—if something goes wrong, don't come looking for me.

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

A more refined version: "_If you remove this line, the program will crash. Don't ask me why._"

## 2. The Self-Deprecating Type: "I Know I Suck"

Self-deprecation is a traditional virtue among programmers. This type of comment often carries three parts resignation and seven parts sincerity.

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

Another classic:

```rust
// TODO: 重构这段代码
// 但我已经对着它看了三个小时了，
// 现在只想回家躺平。
// —— 2024年3月15日
```

And the date corresponding to this TODO is often earlier than the project's first commit.

## 3. The Honest Type: "You Might Not Believe It If I Told You"

Sometimes, the truth is just that plain and unadorned.

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

And this kind too:

```
// 我承认这一段是从 Stack Overflow 复制的
// 链接：https://stackoverflow.com/questions/xxxxx
// 我现在看不懂，但能跑就行
```

So honest it's hard to blame them.

## 4. The Overly Defensive Type: "I've Predicted Your Prediction"

```
// ======================================================
// WARNING: DO NOT MODIFY THE CODE BELOW
// 如果你觉得你能优化它，相信我，你不能。
// 我们试过了。三次。每次都以回滚告终。
// 请尊重前人的血泪教训。
// ======================================================
```

Some defensive comments are even longer than the code they're protecting.

## Conclusion

Code comments are like a programmer's business card—some use them for self-deprecation, some for blame-shifting, and some quietly leave a "pitfall here" warning. Whichever style, they all add a bit of warmth to cold code. Of course, the best comment is actually **code that doesn't need comments**. But until then, at least let's write them in a more interesting way.

> What interesting comments are hidden in your project? Feel free to share.

---

**References**

- [The Funniest Code Comments on GitHub](https://github.com/nickmilo/funny-comments) — A collection of funny comments on GitHub
- [What is the funniest comment you've encountered in source code?](https://stackoverflow.com/questions/184618/what-is-the-best-comment-in-source-code-you-have-ever-encountered) — A classic Stack Overflow discussion