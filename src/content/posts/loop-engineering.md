---
title: 'Loop Engineering: When AI Agents Can Work on Their Own, What Should Human Developers Do'
published: 2026-06-16
description: Loop Engineering is the hottest new paradigm in AI development in 2026. This article takes a deep dive into its six major components, four-stage evolution, typical workflow design, and three pitfalls you must watch out for—including key insights from Claude Code lead Boris Cherny and Google Cloud AI director Addy Osmani.
image: ''
tags: [AI, Agent, Loop Engineering, Claude Code, Development Paradigm]
category: 'AI'
draft: false
---
## 1. Introduction

In June 2026, the AI development community was flooded by one term: **Loop Engineering**.

The tipping point was a series of voices from key industry figures. **Peter Steinberger** (founder of OpenClaw) posted a single line on X that garnered over **8 million views**:

> "You shouldn't be writing prompts for your coding agent anymore. You should be designing Loops that write them for you."

**Boris Cherny** (head of Anthropic Claude Code) followed up:

> "I don't write prompts for Claude anymore. I have Loops running, and they decide what to do on their own. My job is writing Loops."

He revealed that by 2026, he had **stopped writing a single line of code by hand**.

Then **Addy Osmani** (Director of Google Cloud AI, former head of Chrome engineering) published a long-form article systematically laying out the complete framework of Loop Engineering. Silicon Valley's AI circle has since gained another keyword with the "Engineering" suffix.

This article explains Loop Engineering clearly across four dimensions: conceptual origins, core components, practical patterns, and risk warnings.

---

## 2. The Evolution of Four Engineerings

To understand why Loop Engineering is "the next stop," you first need to see the evolutionary path of AI development paradigms:

| Stage | Time | Core Question | Core Capability | Analogy |
|------|------|---------|---------|------|
| **Prompt Engineering** | 2023 | How to ask AI | Language expression, task decomposition | Learning to ask questions |
| **Context Engineering** | 2024 | What to show AI | Information filtering, context organization | Learning to prepare lessons |
| **Harness Engineering** | 2025 | Where to run safely | System design, rule-making | Learning to build the stage |
| **Loop Engineering** | 2026 | How to keep it spinning | Goal definition, process design | Learning to manage |

This evolution has a clear throughline: **the human role keeps moving upward**.

- In the Prompt Engineering era, humans **manually operated** every step
- In the Context Engineering era, humans began thinking about **information architecture**
- In the Harness Engineering era, humans began designing **constraint systems**
- In the Loop Engineering era, humans only define **goals and rules**, and the system runs itself

Boris Cherny's words capture the essence: **"My job is writing Loops" doesn't mean there's less work — it means the leverage point for creating value has shifted.**

An analogy: early factory owners operated machines themselves, then designed assembly lines, then designed automated management systems. Loop Engineering is the AI era's "designing assembly lines" — you're not tightening screws, you're designing the entire assembly line.

---

## 3. The Six Components of Loop Engineering

Addy Osmani breaks Loop Engineering into six core modules. All six are indispensable, each solving a distinct class of problems.

### 3.1 Automations — The "Heartbeat" of the Loop

Automations are responsible for making the Loop **start itself**, rather than waiting for someone to call it. It includes two types of triggers:

| Trigger Type | Example | Claude Code Equivalent |
|----------|------|-----------------|
| **Scheduled trigger** | Scan Open Issues every morning at 9 AM | `/loop`, `cron` |
| **Event trigger** | CI failure automatically starts a diagnostic Loop | Git hooks, GitHub Actions |
| **Goal-driven** | Set a big goal, the Loop automatically decomposes subtasks | `/goal` |

Key design principle: **Don't let "a human remembering to start it" become a precondition of the system.** A good Loop should be self-driving.

### 3.2 Worktrees — Isolated Runtime Environments

When multiple Agents work in parallel, they can't share the same file system — they'd overwrite each other's changes.

Git's Worktree mechanism solves this problem:

```bash
# 每个子任务在独立的 Worktree 中运行
git worktree add ../fix-auth-bug main
cd ../fix-auth-bug
# Agent 在此环境中工作，互不干扰
```

The three major values of Worktrees:
- **Parallel safety**: 10 Agents fixing bugs simultaneously won't conflict
- **Rollback capability**: If an Agent breaks something, just delete the Worktree without affecting the main branch
- **Reviewability**: One branch per Worktree, changes isolated and independently reviewable

### 3.3 Skills — Persistent Project Knowledge

If Context Engineering solves "what to show the Agent in a single session," Skills solve **"how to accumulate knowledge across sessions."**

Skills are Markdown files stored in the project that the Agent automatically loads each round. They contain:

```
.claude/
├── SKILL.md          # 总体项目规范
├── agents/
│   ├── reviewer.md   # 代码审查 Agent 的行为定义
│   └── fixer.md      # Bug 修复 Agent 的行为定义
└── skills/
    ├── coding-style.md   # 代码风格约定
    ├── architecture.md   # 系统架构约定
    └── pitfalls.md       # 踩过的坑
```

Every pitfall you've stepped into and every convention you've summarized settles into a Skill, becoming the "muscle memory" of all subsequent Agents. **The quality of Skills determines the quality of the Loop's output.**

### 3.4 Connectors — Letting Agents Access the Real World

Based on **MCP (Model Context Protocol)**, Agents can connect to external tools:

```
Agent ←→ MCP Server ←→ 外部系统
                           ├── GitHub API（读 Issue、开 PR）
                           ├── Slack（发通知、接收指令）
                           ├── 数据库（查询数据、验证结果）
                           ├── CI/CD（触发构建、读取日志）
                           └── Linear / Jira（更新工单状态）
```

Without Connectors, an Agent is just "talking to itself in a sandbox." With Connectors, it can truly affect the outside world — opening PRs, updating tickets, notifying the team.

### 3.5 Sub-agents — Maker/Checker Separation

This is the most easily underestimated yet most important design pattern in Loop Engineering: **Don't let the same Agent both write code and review code.**

```javascript
// 错误设计：一个 Agent 自产自审
const result = await agent("修复这个 Bug，然后审查自己的修复");

// 正确设计：Maker 和 Checker 分离
const fix = await agent("修复这个 Bug", { role: "maker" });
const review = await agent(`审查这个修复：${fix.diff}`, { role: "checker" });
```

Why separate them?

| Same Agent Self-reviewing | Maker/Checker Separation |
|----------------|-------------------|
| Tends to "go easy on itself" | Independent perspective, finds blind spots |
| Easily overlooks security issues | Checker is explicitly told "your job is to find problems" |
| Lacks adversarial verification | Can be designed as "reject by default unless proven correct" |

**The Checker should be prompted with "default to distrust unless proven correct," not "default to pass unless there's an obvious problem."** This tiny difference in the prompt determines the effectiveness of verification.

### 3.6 Memory / State — Beyond the Context Window

An Agent's context window is limited, but a continuously running Loop needs to **remember what has been done and what remains to be done**.

The Memory layer can be implemented very simply:

```markdown
# state.md
## 当前状态
- 最后运行: 2026-06-16 09:00 UTC
- 进行中: fix-login-timeout（PR #42 等待 Review）

## 已完成
- [x] 修复 API 超时重试逻辑 — #41 已合并
- [x] 更新依赖版本 — #40 已合并

## 待处理
- [ ] 排查 CI 偶发失败 — 已分配 Worktree ci-flaky-test
- [ ] 升级 Node.js 到 v26 — 等待 LTS
```

Osmani emphasizes: **"Behind every successful Loop, there's a set of quietly working state files."** State files are the Loop's "short-term memory," and Skills are the Loop's "long-term memory."

---

## 4. Complete Loop Example: A Real Workflow

Stringing the six components together, a typical CI auto-fix Loop looks like this:

```
08:00  定时任务自动触发
08:01  分诊 Agent 扫描：
         - 昨夜 CI 有 3 个失败
         - GitHub 上有 2 个新 Open Issue
         - 昨日合并的 PR 有 1 个回归
08:05  写入状态文件 state.md
08:06  对每个值得处理的问题开独立 Worktree
08:07  Worktree A — Maker Agent 起草修复方案
       Worktree B — Maker Agent 起草修复方案
       Worktree C — Maker Agent 起草修复方案
08:15  三个修复方案均提交到各自分支
08:16  Checker Agent 对照 SKILL.md 规范审查三个方案
08:25  方案 A 通过 → 自动开 PR
       方案 B 被驳回 → 退回 Maker Agent 重写
       方案 C 通过 → 自动开 PR，更新对应 Issue
08:30  处理不了的标记为 need-human-triage
08:31  更新状态文件，记录进度
08:32  发送 Slack 摘要通知团队

第二天从状态文件继续。
```

**The developer doesn't type a single character throughout.** Your job is to:
1. Ensure the rules of this Loop are reasonable
2. Review PRs that the Checker Agent approved but you find suspicious
3. Continuously refine the project conventions in Skills

---
## 5. Loop Maturity Model

In his article, Osmani proposed a six-level maturity model to help teams assess what stage they are at:

| Level | Name | Characteristics | Human Involvement |
|------|------|------|-----------|
| **L0** | Manual turn-by-turn prompting | Manually paste Prompt each time | 100% |
| **L1** | Scripted retries | Use scripts to batch-call Agent | 90% |
| **L2** | Scheduled Loop | Runs on a schedule, only reports without automatic modifications | 70% |
| **L3** | Stateful Loop | Progress persists across sessions | 40% |
| **L4** | Self-verifying Loop | Has deterministic checks, Agent can judge whether it did things correctly | 25% |
| **L5** | Multi-Agent collaboration | Maker/Checker separation, specialized Agent division of labor | 15% |
| **L6** | Production-grade supervision | Has safety guardrails, automatic rollback, exception escalation mechanisms | 10% |

Most teams are currently at the **L1-L2** stage. Loops above L4 already have the capability to replace junior-to-mid-level developers—which is also why JetBrains' 2026 Q2 survey shows that **global demand for junior developer positions plummeted 40% year-over-year**.

---

## 6. Three Deep Pitfalls You Must Watch Out For

Loop Engineering is not a silver bullet. Both Osmani and Cherny explicitly warned about three core risks.

### 6.1 Verification Is Still a Human Responsibility

A Loop can automatically complete "declaring done," but it **cannot automatically complete "proving correct."**

> "Done" is a declaration. "Did it right" is a fact. A declaration is not a fact. —Addy Osmani

A Checker Agent can reduce omissions, but it cannot replace human judgment. Security changes, architectural decisions, user experience issues—these require human confirmation.

**Principle**: A Loop can automatically handle problems you **fully understand**; for problems you do not understand, a Loop only helps you make the problem clearer, and the decision is still yours.

### 6.2 Comprehension Debt

This is a key concept proposed by Osmani, more hidden and more dangerous than technical debt.

```
Loop 生成代码的速度
         >
你理解代码的速度
         =
理解债务在累积
```

When a Loop produces tens of thousands of lines of code every day, while your comprehension speed is constant, **comprehension debt will grow exponentially**. One day, you will face a system whose workings you have no idea about.

**Mitigation strategies**:
- Set an "output rate cap" for the Loop—do not let it run as fast as possible
- Periodically stop and manually review all recent automatic changes
- Forbid the Loop from automatically modifying core modules; allow only manual operations

### 6.3 Cognitive Surrender

This is the most profound risk—**when the system can run on its own, people instinctively stop thinking**.

Cherny's exact words: *"The most comfortable posture is precisely the most dangerous one. When you no longer understand what the Loop is doing but the Pipeline can still run, you have already handed over the core capability of an engineer."*

**Counter-strategies**:
- **Regular "offline days"**: One day a week without using Agents, purely handwriting, to keep your skills sharp
- **Self-questioning test**: If this Loop disappeared tomorrow, could you still do what it does on your own?
- **Keep building Loops "as an engineer"**: You are designing a system, not pressing the "start button"

---

## 7. One-Sentence Summary of How Different Roles Should Face Loop Engineering

| Role | What You Should Do |
|------|------------|
| **Junior developer** | Learn to read the Loop's output, focus on understanding rather than piling up code |
| **Mid-level developer** | Distill your experience into Skills, become the Loop's "coach" |
| **Senior / Architect** | Design the Loop's constraint boundaries and verification rules, define the standard for "done" |
| **Technical manager** | Rethink team structure and performance measurement; lines of code are no longer a good metric |

Addy Osmani's final paragraph is the best closing:

> **"Build your Loop, but build it as someone who plans to remain an engineer—don't be the person who only knows how to press the 'start button.'"**

---

## 8. References

- [Loop Engineering — Addy Osmani Blog](https://addyosmani.com/blog/loop-engineering/)
- [The Rise of Loop Engineering: When AI Agents Can Work on Their Own, a Google Engineer Points Out Three Major Human Responsibilities](https://techorange.com/2026/06/10/loop-engineering-ai-agent/)
- [Understanding Loop Engineering in One Article: 6 Major Sections and Three Big Pitfalls](https://www.163.com/dy/article/KVG2KFMB051180F7.html)
- [cobusgreyling/loop-engineering — GitHub Practical References and Patterns](https://github.com/cobusgreyling/loop-engineering)
- [ChaoYue0307/awesome-loop-engineering — Curated Resource Collection](https://github.com/ChaoYue0307/awesome-loop-engineering)
- [The 4 Engineering Keywords of AI Agents: Prompt, Context, Loop, Harness](https://developer.aliyun.com/article/1740864)
- [After Harness, the Silicon Valley AI Circle Has a New Buzzword: Loop Engineering](https://hub.baai.ac.cn/view/55505)