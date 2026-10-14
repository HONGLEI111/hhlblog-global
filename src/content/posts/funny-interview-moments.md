---
title: 'Funny Moments in Programmer Interviews: The Many Faces Before the Whiteboard'
published: 2026-09-19
description: From the Homebrew author being turned away by Google to FizzBuzz filtering out half the applicants—the absurd yet real moments that happen in interview rooms.
image: ''
tags: [programmer humor, interviews, career development, software engineering]
category: Other
draft: false
---
Interviews are probably the occasion where programmers put on the densest performance: people who normally rely on IDE autocomplete after typing three characters now have to write out a red-black tree from memory on a whiteboard; people who normally look up documentation at lightning speed now have to pretend they've memorized every API.

## The Most Famous "Flop"

In 2015, Max Howell, the author of Homebrew, was rejected in a Google interview, and then posted a tweet that has been passed down to this day:

> Google: 90% of our engineers use the software you wrote (Homebrew), but you can't invert a binary tree on a whiteboard so fuck off.

"Ninety percent of our engineers use the software you wrote every day, but you can't invert a binary tree on a whiteboard, so goodbye." The reason this line is a classic is that it precisely hits the absurdity of technical interviews—what we test and the work we actually do are often separated by an entire galaxy.

## The Brutal Experiment of FizzBuzz

In 2007, recruiter Imran Ghory proposed an extremely simple interview question: print 1 to 100, output `Fizz` for multiples of 3, output `Buzz` for multiples of 5, and output `FizzBuzz` for multiples of both.

```javascript
for (let i = 1; i <= 100; i++) {
  let out = '';
  if (i % 3 === 0) out += 'Fizz';
  if (i % 5 === 0) out += 'Buzz';
  console.log(out || i);
}
```

Just seven lines of code, and he said it could filter out a considerable proportion of applicants, including people whose resumes said "proficient in Java, C++"—some couldn't write a loop, and some treated `%` as a percentage operator.

## Classic Scenes in the Interview Room

- "Why do you want to join us?"—"Because you're hiring."
- "What's your weakness?"—"I'm too much of a perfectionist." (The interviewer hears this answer for the 800th time this year.)
- "Why are manhole covers round?"—Microsoft's signature question. The standard answer is "a round cover won't fall into the manhole," but what it really tests is whether you can still keep smiling after being stumped.
- The interviewer says, "Let's look at a simple algorithm problem"—at this point you know that for the next forty-five minutes, you'll be staring blankly at a LeetCode Hard problem.

## Conclusion

The absurdity of interviews lies in trying to use one hour of improvisational performance to predict a person's daily work over the next few years. Inverting a binary tree really doesn't have much to do with writing CRUD—but precisely because of that, these stories are memorable.

Next time you get stuck in front of a whiteboard, think of Max Howell: writing code and building software are two different things, and failing an interview proves nothing. After all, even the author of Homebrew was rejected.

---

**References**

- [Max Howell's tweet about the Google interview](https://twitter.com/mxcl/status/608682016205344768) — the Homebrew author's famous rant
- [Using FizzBuzz to Find Developers who Grok Coding - Imran Ghory](https://imranontech.com/2007/01/24/using-fizzbuzz-to-find-developers-who-grok-coding/) — the original source of the FizzBuzz interview question
- [Manhole cover - Wikipedia](https://en.wikipedia.org/wiki/Manhole_cover) — the background of Microsoft's classic interview question