---
title: 'Naming Things Is Hard: The Programmer''s Biggest Headache'
published: 2026-08-22
description: Cache invalidation, naming things, and off-by-one errors — why coming up with good variable names is one of the hardest problems in programming.
image: ''
tags: [naming, coding practices, programmer humor]
category: Other
draft: false
---
There's a widely circulated saying in the programming world:

> There are only two hard things in Computer Science: cache invalidation and naming things.

Translated, it means: **"There are only two hard things in Computer Science: cache invalidation and naming things."** This quote comes from Netscape engineer Phil Karlton, and was included by Martin Fowler in his article "TwoHardThings," becoming a tacit self-deprecating joke among programmers ever since.

The funny thing is, this quote was later spun into countless sequel versions by netizens. The most classic one is: **"There are only two hard things in Computer Science: cache invalidation, naming things, and off-by-one errors."** — Count them: that's exactly three, and the extra one is the off-by-one error. This dry humor is itself a perfect off-by-one demonstration.

## Names We've Come Up With Over the Years

Flip through your own old code, and almost everyone can find a naming disaster scene. Can you get through this "guess what" code below:

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

What is `d`? What is `a`? And what state does `flag === 1` represent? — Every variable is screaming "guess!" And its author, seeing this code again three months later, will most likely join the guessing game too.

Change the names, and the world instantly becomes clear:

```javascript
function getActiveUsernames(users) {
  return users
    .filter((user) => user.isActive)
    .map((user) => user.username);
}
```

The real readers of variable names are not the compiler, but **your future self** and the colleagues who take over your code. The compiler doesn't care whether you call it `x` or `activeUserCount`, but when you're troubleshooting a production issue at 3 AM, a clear name can save you half an hour of `console.log`.

## The Three Major Schools of Naming

Bad names in reality roughly fall into three camps:

- **The Slacker School**: `data`, `info`, `tmp`, `foo`, `bar`, `a1`, `x2`. When there are more variables, `data2`, `data3` — forming an entire army.
- **The Universal School**: `manager`, `handler`, `utils`, `helper`, `processor`. A single project can have eight `Manager`, and nobody knows who's in charge of what.
- **The Padding School**: `theData`, `dataValue`, `userObject`, `getData()`. Adding a word is as good as not adding it — purely to pad the word count.

## Conclusion

Naming is indeed hard, but its difficulty lies in "needing to precisely summarize a concept in just a few short words." This isn't a word game — it's the ultimate test of your understanding of the code. **People who can come up with good names usually truly understand the problem itself.**

So next time you're staring at the cursor stuck for ten minutes, don't be discouraged: you're not agonizing over a name, you're engaging in one of humanity's hardest intellectual activities. If all else fails, just write a `TODO: rename this` and move on — after all, cache invalidation hasn't been solved yet either.

---

**References**

- [Martin Fowler: TwoHardThings](https://martinfowler.com/bliki/TwoHardThings.html) — Source verification for the quote "cache invalidation and naming"
- [Robert C. Martin, *Clean Code*, Chapter 2 "Meaningful Names"](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) — A classic chapter on the value of naming