---
title: 'The Classic Joke About Scope Creep: The Client Says "It''s Just a Small Change"'
published: 2026-09-26
description: '"It''s just a small change" and "Just start building it, and I''ll know what I want once it''s done" — these famous lines are funny because each time it really is just a small change, yet each time it doubles the timeline. Let''s break down the joke and see what a "small change" actually touches.'
image: ''
tags: [programmer humor, scope creep, project management, software engineering]
category: Other
draft: false
---
Here's a conversation almost everyone has lived through:

> **Client**: This page is pretty good, just one small change—add a column to the user list showing the last login time.
> **Me**: Sure, about half a day.
> **Three days later**: Still working on it.

This conversation is funny because everyone listening knows how it ends, and the person who said "sure" genuinely believed the half-day estimate the first time too.

The phrase "small change" has a kind of magic to it: it describes **the word count of the requirement description**, not **the amount of work involved**. In software, the correlation between these two things is low enough to be ignored.

## 1. The Museum of Requirement Change Jokes

### "Just one small change"

The mother of all requirement jokes; every other bit is a variation on it.

Its lethality comes from an asymmetry: **the person making the request can only see the interface, not what's behind it**. What they see is a table gaining a column; what they don't see is how many APIs read that table, how many jobs join it, whether there's caching, whether there's an export, whether someone is building reports on it.

So the judgment "small change" is **completely correct** within the information they have. What's wrong isn't their judgment—it's their visibility.

### "Just build one like Taobao"

The full version of this sentence is usually: "It doesn't need that many features, just build one like Taobao, start with something simple."

The problem isn't how much work "build one like Taobao" is—it's that "doesn't need that many features" is a statement that **cannot be used for acceptance**. The acceptance criteria live in the requester's head and only materialize when they're standing in front of the finished product. So the project marches precisely to that classic moment: the thing is done, and the requester says "this isn't what I wanted."

Translated into engineering language, this sentence actually means: "I don't have a requirements document, but I know you did it wrong."

### "You start building, and once it's done I'll know what I want"

This sounds like a cop-out, but it **describes the true shape of requirements**.

Requirements aren't a list sitting somewhere waiting to be collected; they're more like a physical quantity that can only be measured by observation—users don't know what they don't want until they see something. The entire theoretical basis of prototyping is this one sentence.

The real problem isn't this sentence—it's that after saying it, **there's no next step**: no walkthrough, no feedback checkpoint, no written agreement that "this version is not the final acceptance." That turns it into a gamble with no guardrails.

### "A rainbow of black"

A legendary moment in the design world, usually accompanied by "make the logo bigger and smaller at the same time" or "make this font look more premium."

Its relationship to programmers is this: **it's just another form of "add a field."** The requester is describing a feeling, while the implementer needs a set of parameters. Feelings can't be compiled directly, and when nobody claims the translation work in between, it becomes a back-and-forth tug of war.

### "This is simple, right? Just add a button"

Adding the button itself is indeed simple. What's not simple is everything that happens after the button is pressed—especially when **nothing should happen** after it's pressed (insufficient permissions, conditions not met). That part usually isn't written into the requirements, but someone has to write it.

### "The requirements haven't changed, I just added a clarification"

This is the most dangerous line in the entire collection.

The previous five just make the timeline longer; this one makes **the timeline impossible to commit to**. Because "clarification" means the boundary of the requirement is open: any verbal addition can be retroactively claimed as "that's what I meant all along."

It has an even more insidious form: the change doesn't disappear, it just moves from the meeting to a private chat. Three months later, looking back at `git log`, there's no record explaining why this feature ended up the way it did.

## 2. Taking "Small Change" Apart

Back to the opening example of "add a column for last login time." How many things does this column actually touch:

1. **Where does the data come from**—this field doesn't exist yet, the `users` table needs a new column.
2. **Who writes it**—updated on successful login. Looks harmless, but login is a **high-frequency write path**.
3. **Where to write it**—if every login does a `UPDATE users`, the primary database gains write traffic equal to the login QPS. To avoid that, you'd need async writes or a separate table.
4. **Null semantics**—historically imported users have never logged in. Show "never logged in" or leave it blank? These are **different business meanings** and can't be papered over with a single `NULL`.
5. **Time zones**—the database stores UTC, the UI shows local time. So which time zone defines the boundary for "logged in within the last 7 days"? The user is in Japan, the server is on the US East Coast, the database is in UTC—all three answers are correct, you can only pick one.
6. **Sorting**—"while you're at it, put the most recently logged-in users first" is the inevitable sequel to this sentence. So you need an index.
7. **Permissions**—login behavior is sensitive data. Can operations see it? Can users see their colleagues'? Should the external API return this field?
8. **Caching**—the user list API almost certainly has a cache. Is the cache key dimension sufficient? How stale is this data allowed to be?
9. **Export**—should the CSV export in the admin panel include it? If so, does that mean modifying the export job that runs at dawn?
10. **Downstream**—the BI team is syncing the `users` table. Will adding a column skew their wide table, will it cause some `SELECT *` to gain unexpected fields?
11. **Regression surface**—`users` is the most-joined table in the entire database.

Writing the code is maybe 10% of this. The other 90% is **confirming the ten points above**.

So the true cost of a change is never equal to the number of lines of code—it's roughly equal to its **blast radius**. The same "add a column":

| Scenario | Blast radius | True cost |
|---|---|---|
| A secondary table read by only one API | 1 call site | Half an hour |
| A core business table with caching, exports, and downstream wide tables | A dozen consumers | Several days |
| An already-published API contract | An unknown number of external callers | Requires versioning + migration period, measured in quarters |

This also explains that recurring confusion: **why the same requirement takes one day in this project and two weeks in the last one**. It's not that someone is slacking—it's that the blast radii of the two tables differ by an order of magnitude.

## 3. The Change Cost Curve, and Its Counterexample

The famous diagram from textbooks is called the "change cost curve": the later a change is discovered, the higher the cost.

The empirical numbers Barry Boehm gave in *Software Engineering Economics* are often paraphrased as magnitudes like "requirements phase 1, design phase 3–6, coding phase 10, post-launch 100." The exact multipliers vary widely across studies, but **the direction is consistent: correction cost grows by orders of magnitude across phases**, and the reason is plain—the further along you are, the more things are built on that wrong assumption.

But this story has an important counterexample worth including.

Practitioners of Extreme Programming (XP) proposed an opposing hypothesis: **the change cost curve can be flattened**. Their argument isn't that "changes don't matter"—it's that if testing, refactoring, and continuous integration are done well, code won't turn into a pile of mud nobody dares touch over time. The mud is what makes the curve steep, not time itself.

The two sides aren't actually contradictory, and the combined conclusion is more useful:

> **Change cost = cost of the modification itself × blast radius.**
> Good engineering practices compress the second part, not the first.

A field change that requires re-checking a dozen consumers has nothing to do with how beautifully you wrote your code. So "making changes cheaper" and "making fewer changes" are two things that must be done simultaneously.

## 4. Why Requirements Change

First, a Ford quote that's been cited countless times: "If I had asked people what they wanted, they would have said faster horses."

This line appears at an extremely high rate in communication textbooks, but **there's no evidence Ford ever actually said it**—it can't be found in his writings or interviews, and it reads more like a retroactively attached piece of chicken soup. Interestingly, it happens to echo this article's theme: a joke about "unreliable requirement expression" is itself an unreliable retelling.

Strip away the rhetoric and what remains is a real problem: **users describe solutions, not problems.** They want a faster horse; the real need is faster displacement. Follow their words literally, and you'll go optimize horseshoes; ask questions, and you might build a car.

So requirement changes aren't an accident—they're the norm. What really needs distinguishing is just two categories:

- **Valuable changes**—they come from a deeper understanding of the real problem, and the earlier they happen, the more money they save;
- **Unrecorded changes**—they come from verbal conversations, private chats, "I thought you understood"—their only product is that three months later nobody remembers why.

The latter is the protagonist of all the jokes.

## 5. Turning Jokes into Process

The jokes won't disappear, but you can make them non-fatal. Here are some practical measures.

### 1. The three blast-radius questions

Don't answer "how long" directly. Ask three questions first—at this point, "I don't know" is the professional answer:

- **Which piece of data is changing?** Find that table, that field, then see who reads it.
- **Whose behavior changes?** Just the internal admin panel, or can external users see it?
- **How do we verify it works?** A change with no acceptance method is a change with no finish line.

Make it a habit: **after every verbal change, go back and add a line to the ticket**. One sentence is enough, like "2026-09-26 addendum: list must be sorted by last login time descending." This isn't process ritual—it's the only archaeological evidence three months from now.

### 2. Making changes cheaper: expand-contract

"Renaming a field" is a death sentence in the traditional approach because it must be done all at once—change the code, change the database, deploy simultaneously. Expand-contract (also called parallel change) breaks it into three steps, each of which can be deployed and rolled back independently:

```sql
-- 第 1 步 expand：只加，不改，不删。旧代码依然能跑
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);  -- MySQL 8.0.12+ 可为 INSTANT

-- 应用层进入双写期：写 name 的同时也写 full_name，读仍然读 name
```

```sql
-- 第 2 步 migrate：分批回填历史数据
-- 关键是 LIMIT + 循环，别让一条 UPDATE 锁住整张表
UPDATE users SET full_name = name
WHERE full_name IS NULL
ORDER BY id
LIMIT 1000;
```

```sql
-- 第 3 步 contract：读切到 full_name，观察一到两个发布周期，确认没人在写旧列
-- 只有到这时才删
ALTER TABLE users DROP COLUMN name;
```

The value of the three steps isn't technical sophistication—it's that **it turns one "big bang" into three rollback-able small operations**. If anything goes wrong at any step, just revert; no need for "the whole team pulls an all-nighter + prays."

The same approach applies to APIs: add the new field first (expand), let all callers migrate (migrate), confirm the old field has no users, then remove it (contract). This is also why "adding fields is easy, removing fields is hard"—**adding happens in the expand phase, removing happens in the contract phase, with an entire migration period in between.**

### 3. Using flags to decouple "deploy" and "release"

A feature is half-written, and the requester says "let's ship half and see." Fight it with branches, and you'll end up with a `feature/new-list-v2` branch that's been alive for three months and an afternoon where every merge feels like defusing a bomb.

With a flag it's much simpler:

```js
if (flags.enabled('show-last-login', { userId })) {
  renderLastLogin(user);
}
```

The code can be merged into main first (deployed but not active), then rolled out by whitelist (canary), then fully—or turned off at any time. **"Deploy" and "release" become two independent actions**, which is one of the cheapest ways to make changes cheaper.

The cost is that flags accumulate. So every flag should have a deletion date, otherwise three years later you'll have an archaeological site of two hundred `if` that nobody dares touch.

### 4. Freeze windows, and "break big changes into small ones"

Not accepting new requirements the day before a release isn't bureaucracy—it's risk management. The cost of big changes isn't the average, it's the tail. If a change absolutely must go in before release, break it into several small changes and ship them separately.

The reverse also holds: **if a change can't be broken down, it's probably not a "small change."** That sentence itself is a great phrase for requirement reviews.

### 5. Replace documents with something that runs

The solution to requirement ambiguity isn't writing longer documents (nobody reads them)—it's giving something clickable as early as possible. An ugly prototype that runs can expose in ten minutes ambiguities that would take three months to surface in a document.

This is also compressing that change cost curve: **moving the moment of "discovering something needs to change" from the coding phase to the prototyping phase.**
## Final Thoughts

The reason change-request jokes circulate so widely is that they all point to the same thing:

> **The cost of software was never in "writing it" — it's in "changing it correctly."**

So the next time you hear "it's just a small change," don't rush to give a quote. Ask one question first: "Who else is reading this field?"

The other person will probably pause for a moment — and then you'll start talking about the real issue. That pause is the only genuinely useful thing this joke collection has to offer.

## References

- [Software Engineering Economics — Barry Boehm](https://en.wikipedia.org/wiki/Software_Engineering_Economics)
- [Extreme Programming: The debate over the cost-of-change curve](https://en.wikipedia.org/wiki/Extreme_programming)
- [ParallelChange (expand-contract pattern) — Martin Fowler](https://martinfowler.com/bliki/ParallelChange.html)
- [Feature Toggles (aka Feature Flags) — Pete Hodgson](https://martinfowler.com/articles/feature-toggles.html)
- [Online DDL Operations — MySQL 8.0 Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html)
- [Scope creep — Wikipedia](https://en.wikipedia.org/wiki/Scope_creep)

Further reading: this blog also has two articles about "how vague talk turns into technical problems" — [The Tech Jargon Dictionary](/posts/tech-jargon-dictionary) and [Classic Jokes About Programmers Estimating Time](/posts/estimating-time-jokes).