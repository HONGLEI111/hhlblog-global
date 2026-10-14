---
title: 'The Many Faces of Code Review: The Truth Behind LGTM'
published: 2026-10-11
description: '"LGTM 👍" — a 1,400-line PR approved 40 seconds later. Those three letters can be the highest form of trust or the most expensive brush-off. We break down the jargon of the review room one by one, then look at what the research data says code review actually catches — and what it misses.'
image: ''
tags: [Programmer Humor, Code Review, Team Collaboration, Software Engineering]
category: Other
draft: false
---
17:48 PR submitted, 1400-line diff.

17:49 One comment: **LGTM 👍**

1400 lines read in 40 seconds, averaging 35 lines per second. That speed isn't called review—it's called signing off.

What's interesting about LGTM is that it's **binary and unfalsifiable**: "I looked carefully, the logic is fine" uses it, and "I want to leave early today" also uses it. Literally identical.

This field guide below tries to decompress each one, to see what's underneath. And—research data says, here's how this should actually be done.

## 1. Review Scene Field Guide

### The "LGTM 👍" Type

See above.

An imprecise but very useful observation: **the frequency of LGTM correlates positively with diff size.** A 40-line PR often has seven or eight discussion threads below it; a 1400-line PR often has just one 👍. This isn't coincidence—Section 3 will explain why.

### The "nit:" Type

Among 1400 lines of changes, the only comment landed on indentation:

> nit: suggest using 2 spaces here

`nit` is short for nitpick, originally meaning "I'm being pedantic, I know this doesn't matter." But in practice, it often becomes the receipt a reviewer uses to prove they actually opened the page.

### The "bikeshed" Type

In 1957, C. Northcote Parkinson told a fictional story about a committee: reviewing a nuclear reactor, passed in 3 minutes; reviewing what building materials to use for a bike shed, argued for 45 minutes.

The reason is simple—nobody really understands reactors, but everyone understands bike sheds. **When something exceeds everyone's judgment capacity, people automatically retreat to the small patch where they're qualified to have an opinion.**

In code it's identical: a 40-line concurrency refactor gets no comments, while whether a variable is called `data2` or `result` gets 40 replies.

### The "This Function Is Too Long" Type

No threshold, no alternative, no pointing to which part is redundant. The author can only guess after receiving it; the most common response is to mechanically split the function into two—the original problem hasn't changed at all.

### The "Big PR Phobia" Type

The reviewer opens a 3000-line diff, scrolls two screens, thinks "such a big change, the author must have tested it themselves," and hits LGTM.

### The "AI reviewer" Type (New in 2026)

Throw the diff at a model, hit enter, paste:

> There may be a null pointer risk here, suggest adding error handling.

Structurally complete, professionally toned, vaguely located—where is "here"? Which input triggers it?

### The "Comments Section More Exciting Than the Code" Type

A rename PR, 6 lines of code changed, 60 comments. Finally everyone reaches consensus: next time open a separate PR just for the rename.

(And there was no next time.)

## 2. Taking "LGTM" Apart: What It's Actually Saying

The same LGTM compresses at least three different meanings:

| Possible Semantics | What It's Saying | Cost |
| --- | --- | --- |
| Trust proxy | "The author knows this area better than me, I trust them" | Trust gets ossified into process |
| Social lubrication | "I don't want to be the one blocking the PR" | The interception function silently fails |
| Disclaimer | "I clicked approve, don't come after me if something breaks" | Responsibility gets formally transferred |

The method to distinguish them is surprisingly simple: **see if it's accompanied by a sentence like "I focused on X."**

A reviewer who actually read almost always says what they looked at and what they skipped. This heuristic is more accurate in practice than any process document—because "having looked" can't be disguised as silence.

## 3. What the Research Says: What Review Actually Catches

### Origins: From "Formal Inspection" to "Modern Review"

In 1976, Michael Fagan at IBM published the process for design review and code inspection, defining review as a **quality gate with roles, checklists, and metrics**: moderator, reader, recorder, author, going through line by line. This was the first time review was institutionalized.

In 2008, Google built Gerrit for the Android project, and review became tooled into an **asynchronous, lightweight step attached to every commit**. Review went from "a meeting" to "a page"—this is what we now call modern code review.

The tools changed, and so did the implicit assumptions: formal inspection assumed review was a high-cost ritual, so it should be thick; modern review assumes it's a low-cost daily action, so it should be thin. **The problem lies in between: the process got thin, but expectations stayed at the thick end.**

### Microsoft's Research: Finding Bugs Isn't #1

Bacchelli and Bird's ICSE 2013 paper "Expectations, Outcomes, and Challenges of Modern Code Review," based on interviews, field observations, and comment classification at Microsoft, reached a fairly counterintuitive conclusion:

- Developers' **self-reported top motivation** is indeed finding defects;
- But in the actual classification of 200 reviews and 570 comments, **"code improvement" accounted for 29%, while "defect finding" was only 14%**;
- And most defects found were small-grained: edge cases, operator precedence, wrong config values—not architecture issues, not security issues;
- The real benefits actually landed on **knowledge transfer, team awareness, and alternative solution discussions**.

In translation: you expect review to catch production incidents, but the data says it's better at letting everyone know what each other is doing. This isn't bad, provided you don't hold the wrong expectations of it.

### Google's Research: Review Is Light, and Must Be Light

Sadowski et al.'s 2018 paper "Modern Code Review: A Case Study at Google" looked at about 9 million changes:

- **75% of changes had only one reviewer**;
- The **median change size was 24 lines**, with 35% touching only one file;
- Over 80% of reviews **finished in one round**, and 70% of changes were merged within 24 hours.

Google's own engineering practices documentation advice is also plain to the point of being boring: a typical CL of about 100 lines is reasonable; 1000 lines is basically too large.

Note the direction here: it's not "Google employees are more disciplined so diffs are small," but rather **in Google's process, a 1400-line CL simply can't make it to the merge stage**—it gets asked to be split at the review entrance.

### Cisco's Experiment: Beyond 400 Lines, Review Starts to Fail

The Cisco case compiled by SmartBear (2500 reviews, 50 programmers, 3.2 million lines of code, tracking the MeetingPlace team for 10 months) gives quantitative boundaries:

- **200–400 lines** per review session is the effective range;
- After inspection speed exceeds **500 lines/hour**, defect detection density drops significantly; recommended to stay at **300–500 lines/hour**;
- A single review session exceeding **60 minutes** starts to show clear decay;
- Some compiled grouping data is more intuitive: 1–200 lines has a detection rate of about 87%, dropping below 30% beyond 1000 lines.

### Putting These Together

Four independent sets of evidence, pointing to the same conclusion:

> **Code review is not a "quality gate," but an "attention channel."** Its throughput has an upper limit—200–400 lines, 60 minutes, 500 lines/hour. If you treat it as a gate, you have to accept the width of that gate; if you push 3000 lines at the door at once, what you get isn't stricter review, but faster approval.

This also directly answers the observation from Section 1: **why LGTM appears more frequently on big PRs.**

## 4. Four Mechanisms That Make Review Fail

1. **Attention is linear, comprehension cost is not.**
   Reading line 1 and reading line 900, the context in your head is different. The larger the diff, the lower the marginal review quality of the latter half. This is the technical basis for the 200–400 line threshold, not some neat convention.

2. **Social pressure replaces technical judgment.**
   The author is waiting, reviews are queuing, and the least effortful action is to approve. This isn't a character issue, it's the default output of a queuing system—as long as "approve" is cheaper than "ask a question," the system will produce approvals.

3. **An unactionable judgment equals no judgment.**
   "This function is too long" has zero information content. The actionable version is: "The three branches in lines 40–70 exist only to handle null values; suggest normalizing at the entry point, then this section isn't needed." Giving an alternative implementation, or giving a clear threshold—that counts as feedback.

4. **The benefits of review are silent.**
   A bug that gets intercepted won't appear on any dashboard, but the output of writing code will. As said in [Explaining Your Job to Your Parents: Why Your Mum Still Thinks You Fix Computers](/posts/how-to-explain-your-job-to-parents/): **the work of intermediate steps is hard to get recognized because its most successful form is "nothing happened."**

## 5. Six Levers You Can Use Today

1. **Make PRs smaller.** Ideally under 200 lines, hard cap at 400. Purely mechanical changes (renames, formatting, file moves) should be a separate PR—it should be generated by tools and approved by tools.

2. **Write the "why" first in the PR description.** The reviewer's first minute should be spent understanding intent, not reverse-engineering intent from the diff. Write three things clearly: what the behavior was before, what the behavior is after, and why it must change.

3. **Grade your comments.** The simplest three tiers: `nit:` (optional), `suggestion:` (suggested but non-blocking), `blocking:` (must fix, with clear criteria). With grading, the author knows what to fix, and the reviewer dares to write out small things—**when small things can be written out, people won't accumulate opinions into one explosion.**

4. **Give all mechanical checks to machines.** Formatting, lint, types, unit tests, dependency vulnerability scanning—these all have definite answers, let CI say them. Human attention should only be spent on questions machines can't answer: is the design reasonable, does the naming express intent, is the boundary semantics clear.

5. **Set an SLA for review—fix the queue first, then fix the review.** In the DORA metrics, the bulk of change lead time is often not in writing code, but in **waiting**. First response within 24 hours is a pragmatic target. There's a self-reinforcing loop here: **the slower the response, the bigger the diff; the bigger the diff, the worse the review; the worse the review, the slower the response.**

6. **The author should self-review first.** Before submitting, read through the diff yourself from start to finish. This step can remove a fair number of "even I can see it's wrong" issues, and also lets you write a navigation note for the reviewer: "Focus on `auth/session.ts`, everything else is mechanical changes."

## 6. New Problems in the AI Era

In 2026, review is being squeezed from both ends.

**One end is supply.** AI makes writing code faster; the same person's daily diff output might be several times what it used to be, and problems like those in [AI-Generated Code Fails: From Confident Nonsense to Hallucination Dependency](/posts/ai-generated-code-fails/) are more easily produced along with everything else. But the width of the review channel hasn't changed—the channel that used to handle 200–400 lines per session now has to handle more lines every day. **This isn't reviewers getting lazy; it's the process being over-supplied.**

**The other end is the reviewer.** AI reviewers are very good at consistency checks: naming style, code patterns, known vulnerability databases. In this part, it's genuinely better than humans, and cheaper too. But it's not good at two questions—"is this requirement itself correct" and "will anyone dare to touch this code three months from now." It can give many "there may be X risk" statements, but rarely can it say "if this happens, three places in the design will collapse simultaneously."

So the reasonable division of labor is roughly:

- **Machines handle consistency**: formatting, patterns, known defects, test coverage;
- **Humans handle intent**: is this change the right way to solve the problem, is this new abstraction worth its maintenance cost.

The last thing to watch out for is **comment inflation**: when the cost of a "suggest adding error handling" comment approaches zero, the number of comments will rise, and the average judgment per comment will drop. Quantity isn't quality—this is the same logic as in [Identifying and Managing Technical Debt: Stop Using "Bad Code" as an Excuse](/posts/technical-debt-identification-and-management/): **anything that can be automatically produced cannot be directly counted as output.**

## Final Thoughts

The truth behind LGTM usually isn't "the reviewer is irresponsible."

When a person is stuffed with six 800-line PRs in a day, each requiring them to bear joint liability for an incident, the optimal solution they give is to click approve as fast as possible. **This is the result of process design, not the result of moral character.**

The reverse also holds: when you compress diffs to 200 lines, hand mechanical checks to CI, and write the "why" clearly in the description first, LGTM will turn back into a true statement on its own—because at that point it really is only worth 40 seconds.
## References

- [Expectations, Outcomes, and Challenges of Modern Code Review (Bacchelli & Bird, ICSE 2013)](https://dl.acm.org/doi/10.5555/2486788.2486882)
- [Modern Code Review: A Case Study at Google (Sadowski et al., ICSE-SEIP 2018)](https://dl.acm.org/doi/10.1145/3183519.3183525)
- [Best Practices for Peer Code Review — SmartBear (Cisco case study)](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/)
- [Design and code inspections to reduce errors in program development (Fagan, 1976)](https://ieeexplore.ieee.org/document/5388087)
- [Google Engineering Practices: Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)
- [The Law of Triviality (Parkinson, 1957)](https://en.wikipedia.org/wiki/Law_of_triviality)
- [DORA: Software Delivery Performance Metrics](https://dora.dev/guides/dora-metrics-four-keys/)

Further reading: this blog also has two articles on "the other half beyond review" — [Git Workflow Best Practices: From rebase to squash](/posts/git-workflow-best-practices) and [Code Readability: Writing Code Others Can Understand](/posts/code-readability).