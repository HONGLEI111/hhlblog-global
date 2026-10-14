---
title: 'Claude Code Creator Boris Cherny: I Haven''t Hand-Written a Line of Code in Six Months'
published: 2026-05-08
description: Boris Cherny, the father of Claude Code, has generated 100% of his code with AI since November 2024, shipping 150 PRs a day and orchestrating hundreds of agents from his iPhone. This article covers his workflow, design philosophy, and predictions for the future of programming.
image: ''
tags: [Claude Code, AI programming]
category: 'AI'
draft: false
---
## 1. Who He Is

**Boris Cherny**, 34 years old, is the founder and head of Claude Code at Anthropic, and the product's first engineer.

His background isn't exactly "orthodox":
- Self-taught programmer, dropped out of UC San Diego where he studied economics
- Author of the book *Programming TypeScript*
- Worked at Meta for nearly 7 years, responsible for company-wide code quality
- Joined Anthropic in September 2024 and started hacking on the Claude Code prototype

An interesting anecdote: in July 2025 he briefly jumped ship to competitor Cursor (as chief architect), but returned to Anthropic in less than two weeks, citing the reason as "100% because I missed the mission."

---

## 2. Has Programming Been "Solved"?

At the 2026 Sequoia AI Ascent conference, Boris threw out a bold assertion:

> Programming has been solved. At least at the TypeScript / React stack level.

Since **November 2024, he hasn't handwritten a single line of code**—100% is AI-generated. He believes that roughly **50% of programming across the industry has already been solved**, with the remainder constrained by ultra-large-scale legacy systems, low-resource language ecosystems, and the like.

But he stresses that this doesn't mean programmers will be eliminated—rather, **the barrier to programming is disappearing**, and the role is shifting from "person who writes code" to "person who decides what problem to solve."

---

## 3. How He Uses Claude Code

### 3.1 Extreme Parallelism: Phone + Hundreds of Agents

Boris's way of working is staggering:

- **His primary work device is an iPhone**, orchestrating everything through the iOS Claude app
- Launches **10–150 PRs** per day, with a single-day record of 150
- Runs **hundreds of AI Agents** in parallel simultaneously, with thousands executing deep tasks each night
- Opens **5 tabs** in the local terminal at once, plus **5–10 sessions** on the web, taking turns launching Claude Code across environments

His Ansible and Nginx configs are all Claude-generated. "Since last year, I can't understand any of this anymore."

### 3.2 Loop Mode: His Favorite Feature

Loop is a cron-based scheduled agent orchestration mechanism. Boris has deployed dozens of long-running Loop instances:

- **PR babysitting**: automatically fixes CI conflicts, automatically rebases
- **CI health maintenance**: automatically fixes flaky tests
- **Social listening**: scrapes Twitter feedback every 30 minutes and automatically clusters and organizes it

```bash
# 每 30 分钟检查一次 CI 状态并修复失败的测试
/loop 30m 检查最近的 CI 运行结果，如果存在 flaky test，自动修复并提 PR
```

### 3.3 Plan First, Then Execute

80% of Boris's sessions start with **Plan Mode** (enter by quickly pressing Shift+Tab twice):

1. Communicate requirements back and forth with Claude until a satisfactory plan is generated
2. Switch to auto-execute mode and let Claude make all the code changes
3. Review the results and iterate if necessary

However, he also mentions that as model capabilities improve, "a month from now he won't need plan mode anymore"—the model will plan on its own during its thinking process.

### 3.4 Multi-Agent Collaborative Communication

The most mind-bending point: his Claude will **message colleagues directly via Slack**.

For example, if it sees that someone in `git blame` recently modified related code, Claude will automatically send a Slack message asking clarifying questions. Agents can autonomously team up, claim tasks, and divide labor. Boris believes this is the core capability of the next generation of programming tools—"letting multiple AIs work like a team."

### 3.5 Shared Memory: CLAUDE.md

The team maintains a shared `CLAUDE.md` in the Git repository, recording development commands, code style preferences, project architecture conventions, and so on.

The key mechanism is: **whenever Claude is found to have made a mistake, @Claude in the PR comment and have it automatically update CLAUDE.md**. This way, a mistake is only made once, and knowledge continuously accumulates within the team.

### 3.6 Routines: They Run Even Offline

Routines are server-side persistent routines that can keep running even when the device is offline. This means that even when Boris is asleep or on a plane, his Agents are still working—when he wakes up in the morning, the PRs are already waiting for review.

---

## 4. Claude Code's Development Timeline

| Time | Milestone |
|------|--------|
| September 2024 | Boris joins Anthropic and starts hacking on the prototype |
| February 2025 | Claude Code officially launches, with a usability rate of only about 10% |
| May 2025 | **Opus 4** is released, code generation usability jumps to 30%, and the product enters exponential growth |
| July 2025 | Boris briefly jumps to Cursor, returns two weeks later |
| November 2025 | **Opus 4.5** is released, AI reaches human level in software engineering; Boris stops handwriting code from then on |
| 2026 | Claude Code reaches **$30 billion** in annualized revenue, driving Anthropic's revenue past OpenAI |

---

## 5. His Design Philosophy

### 5.1 Build Products for the Model Six Months From Now

> We don't build products for today's model, we build products for the model six months from now.

This is Boris's most core product philosophy. He refuses to patch current model deficiencies—"patches directly become negative assets once the new model comes out." Rather than spending time fixing the current model's limitations, it's better to focus on a product framework that remains competitive once model capabilities overflow.

### 5.2 Model vs Orchestration Layer

The weighting between the model and product design is about **50/50**, but in the long run, improvements in the model's own capabilities will reduce the necessity of the orchestration layer.

He even predicts that Claude Code may be **only 100 lines of code** a year from now—because the model will increasingly autonomously do the right thing, without needing complex external logic to guide it.

---

## 6. Judgment on the Industry's Future

### Two Types of Weakened Moats

1. **Switching costs**: cross-platform migration will be automated, and lock-in effects will weaken
2. **Process advantages**: AI can reproduce and optimize complex business processes, and once-"proprietary operations" are no longer scarce

### Disruption in the Next Decade

- The number of disruptive software companies in the next decade will be **10 times** that of the past decade
- Small teams, with the help of AI, can go head-to-head with big companies
- The title "software engineer" may disappear, replaced by **Builder**: defining system goals, reviewing output, and deciding what problem to solve

### A Fundamental Shift in the Programming Paradigm

From "humans write code, AI assists" to **"AI writes code, humans make decisions."** A developer's core ability is no longer syntax proficiency, but problem-definition ability, system design taste, and judgment.

---

## 7. Takeaways

Boris Cherny's way of working isn't science fiction—it's a reality that is happening right now. He has proven with his own product that when an engineer truly trusts AI and builds an efficient human-machine collaboration system, the ceiling of productivity is far higher than imagined.

A few practices you can borrow immediately:

1. **Create a CLAUDE.md for your project**, so AI works with the correct context every time
2. **Every time you find AI making a mistake, write it into CLAUDE.md**—a mistake is only made once
3. **Try Loop mode** to automate repetitive tasks
4. **Start complex tasks from Plan Mode** to reduce rework
5. **Accept the role shift**: from "person who writes code" to "person who defines problems and reviews output"

> The barrier to programming is disappearing, but the ability to define problems is more important than ever.