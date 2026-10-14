---
title: 'Regex Joke: Now You Have Two Problems'
published: 2026-08-09
description: Why does solving a problem with regular expressions leave you with two problems? One of programming's most classic self-deprecating jokes.
image: ''
tags: [regex, programming jokes, debugging]
category: Frontend
draft: false
---
There's a saying that circulates in programmer circles:

> Some people, when confronted with a problem, think "I know, I'll use regular expressions." Now they have two problems.

This quote comes from the famous open-source hacker Jamie Zawinski (jwz), first posted on Usenet in August 1997. More than twenty years later, this quote remains one of the most frequently cited self-deprecating sayings among programmers.

## Why do regular expressions attract so much hate?

Let's look at a real regular expression first — this is the official regex from RFC 5322 for validating email addresses:

```regex
(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])
```

Your first reaction upon seeing this line of code: did someone accidentally leave their cat on the keyboard?

What's more ironic is that even with all this complexity, **it still can't 100% correctly validate all legitimate email addresses**. For example, email addresses with comments `user@domain` (yes, domains don't have to have dots), or emails containing special Unicode characters — this regex will reject them all.

## Classic failure moments

### "I just need to match HTML tags"

Almost every front-end developer has fallen into this trap. You just want to use regex to extract the content inside `<div>` tags:

```javascript
const html = '<div>第一层 <div>嵌套内容</div></div>'
const match = html.match(/<div>(.*)<\/div>/)
console.log(match[1]) // "First layer <div> nested content" — unexpected!
```

**Regular expressions are greedy by default.** Add `?` to switch to non-greedy mode? Still doesn't work — nested tags are a context-free grammar, and regex, being a finite state automaton, theoretically cannot handle them perfectly.

The correct answer has long been enshrined in a legendary Stack Overflow response (which received over 4,000 upvotes):

> You can't parse [X]HTML with regex. Because HTML can't be parsed by regex. Regex is not a tool that can be used to correctly parse HTML.  
> —— Stack Overflow user bobince

The original answer is thousands of words long, with a tone so impassioned it reads like the late-night cry of a tormented programmer. If you haven't read it, it's worth five minutes of your time.

### "Validating date formats is simple"

```javascript
// You thought that was enough
const dateRegex = /\d{4}-\d{2}-\d{2}/
dateRegex.test('2026-02-30') // true — February 30th?
dateRegex.test('2026-13-01') // true — the 13th month?
dateRegex.test('0000-00-00') // true — the dawn of chaos?
```

Regex only checks format, not semantics. Want to fully validate date legitimacy with regex? Congratulations, you'll need to handle leap years, months with different lengths, and the historical quirk of October 1582 missing 10 days.

### Regex matchmaking

There's also a classic Reddit post: someone used a regular expression to search for matches on the OkCupid dating site. His search criteria were:

```regex
(?:engineer|developer|programmer|coder|hacker) (?!.*(?:politics|religion|vegan|gluten))
```

Translation: find an engineer/developer/programmer, but not one who talks about politics, religion, vegetarianism, or gluten-free diets all day.

How did it work out? The post was never updated, so most likely — **now he has three problems**.

## Regex isn't a bad tool, but it's a dangerous one

At the end of the day, regular expressions are a language that's **"fun to write, a nightmare to read."** It can replace hundreds of lines of parsing logic with a single line, but two months later even you can't understand it.

The best practice is simple: **use regex for matching and simple extraction, use parsers for structured parsing.** When you find yourself writing a regex and can't stop after the twentieth character — stop, and think about whether it's time to switch tools.

Regular expressions are like a black hole — the closer you get to it, the more easily it sucks you in. Wise programmers know to keep a safe distance.

---

**References:**

- [Jamie Zawinski's original Usenet post (1997)](http://regex.info/blog/2006-09-15/247) — Jeffrey Friedl's blog archived this famous quote
- [You Can't Parse HTML With Regex](https://stackoverflow.com/a/1732454) — The legendary Stack Overflow answer
- [Regular-Expressions.info](https://www.regular-expressions.info/) — The authoritative learning resource for regular expressions