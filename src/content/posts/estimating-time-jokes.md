---
title: 'The Classic Programmer Time Estimation Joke: Always Twice as Slow as Expected'
published: 2026-08-30
description: From Hofstadter's Law to the 90/90 rule, a look at why programmers can never estimate schedules accurately, and the estimation jokes that have circulated for decades.
image: ''
tags: [programmer jokes, time estimation, project management, software engineering]
category: Other
draft: false
---
"This feature is simple, I can get it done in a day." — This is probably the most frequently spoken and most thoroughly wrong sentence in the software industry.

Programmers' time estimates are almost a doomed task. Douglas Hofstadter proposed a famous law in *Gödel, Escher, Bach*:

> Hofstadter's Law: It always takes longer than you expect, even when you take into account Hofstadter's Law.

Translated, it means: **"Things always take longer than you expect, even when you've already taken this law into account."** This recursive self-mockery precisely summarizes the fate of all programmers — you think you've accounted for it, but you've still underestimated it.

## Classic Jokes

The boss asks: "How long will this feature take?" The programmer is thinking two days but says "a week." The boss presses: "What about this simpler one?" The programmer answers "three days." In the end, the first took three weeks and the second dragged on for a month — because the word "simple" appearing in a requirements document often means "haven't thought it through yet."

There's also a long-circulated **90/90 rule**, from Tom Cargill of Bell Labs:

> The first 90 percent of the code accounts for the first 90 percent of the development time. The remaining 10 percent of the code accounts for the other 90 percent of the development time.

The first 90% of the code takes 90% of the time, and the remaining 10% of the code takes another 90% of the time — that adds up to 180%, and the extra 80% is reserved for "those last few small issues."

## Estimation Formula

Someone summarized an "empirical formula" based on this:

```javascript
// 程序员时间估算的朴素实现
function estimate(optimisticDays) {
  // 霍夫斯塔德定律：事情总比预期更久，即便你已经考虑到了这一点
  const hofstadter = (n) => n * 2 + 1;
  return hofstadter(hofstadter(optimisticDays));
}

console.log(estimate(1)); // 7 —— 一个「一天」的活，层层套娃后变成一周
```

The output of `estimate(1)` is `((1 * 2 + 1) * 2 + 1) = 7` days. A "one-day" job, after doubling and doubling again, becomes a week — this is probably why senior programmers always "multiply by two and add one" when estimating: not because they're pessimistic, but because they've been burned enough times.

## Conclusion

Inaccurate time estimates aren't a matter of ability — they're structural: the essence of software is "building something that has never existed before," and no one can predict in advance what pitfalls they'll fall into. So mature teams don't pursue "accurate estimates" — they pursue "exposing deviations early" — breaking large tasks into small ones, delivering frequently, and correcting at any time.

Next time before you blurt out "this is simple," remember to leave some room for Hofstadter's Law. After all, even you who took it into account still underestimated it.

---

**References**

- [Hofstadter's law - Wikipedia](https://en.wikipedia.org/wiki/Hofstadter%27s_law) — The origin of the recursive self-mockery law
- [Ninety-ninety rule - Wikipedia](https://en.wikipedia.org/wiki/Ninety-ninety_rule) — The origin of the 90/90 rule
- [Parkinson's law - Wikipedia](https://en.wikipedia.org/wiki/Parkinson%27s_law) — "Work expands to fill all the time available"