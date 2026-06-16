---
title: Loop Engineering：当 AI Agent 能自己干活，人类开发者该做什么
published: 2026-06-16
description: 'Loop Engineering 是 2026 年 AI 开发领域最火的新范式。本文深入解析其六大组件、四级演进脉络、典型工作流设计，以及三个你必须警惕的深坑——包括 Claude Code 负责人 Boris Cherny 和 Google Cloud AI 总监 Addy Osmani 的核心观点。'
image: ''
tags: [AI, Agent, Loop Engineering, Claude Code, 开发范式]
category: 'AI'
draft: false
lang: ''
---

## 1. 引言

2026 年 6 月，AI 开发圈被一个词刷屏了：**Loop Engineering**（循环工程）。

引爆点是一连串来自行业核心人物的声音。**Peter Steinberger**（OpenClaw 创始人）在 X 上发了一句话，获得超过 **800 万次浏览**：

> "你不该再亲自给编程 Agent 写提示词了。你应该设计 Loop，让 Loop 替你去写。"

**Boris Cherny**（Anthropic Claude Code 负责人）紧接着表示：

> "我已经不给 Claude 写提示词了。我有 Loop 在跑，它们自己决定该干什么。我的工作是写 Loop。"

他透露到 2026 年，自己已经**不再手写一行代码**。

随后，**Addy Osmani**（Google Cloud AI 总监、前 Chrome 工程负责人）发表长文，系统性地阐述了 Loop Engineering 的完整框架。硅谷 AI 圈从此又多了一个带 "Engineering" 后缀的关键词。

本文从概念起源、核心组件、实践模式、风险警示四个维度，把 Loop Engineering 讲清楚。

---

## 2. 四个 Engineering 的演进脉络

要理解 Loop Engineering 为什么是"下一站"，需要先看清 AI 开发范式的演进路径：

| 阶段 | 时间 | 核心问题 | 核心能力 | 类比 |
|------|------|---------|---------|------|
| **Prompt Engineering** | 2023 | 怎么问 AI | 语言表达、任务拆解 | 学会提问 |
| **Context Engineering** | 2024 | 给 AI 看什么 | 信息筛选、上下文组织 | 学会备课 |
| **Harness Engineering** | 2025 | 在哪里安全运行 | 系统设计、规则制定 | 学会搭台 |
| **Loop Engineering** | 2026 | 怎么让它持续转 | 目标定义、流程设计 | 学会管理 |

这个演进有一个清晰的主线：**人的角色在持续向上移动**。

- Prompt Engineering 时代，人在**手动操控**每一个步骤
- Context Engineering 时代，人开始思考**信息架构**
- Harness Engineering 时代，人开始设计**约束系统**
- Loop Engineering 时代，人只定义**目标和规则**，系统自己跑

Boris Cherny 的原话点出了本质：**"我的工作是写 Loop"不是说工作变少了，而是说创造价值的杠杆点移动了。**

用一个类比：早期工厂老板亲自操作机器，后来设计流水线，再后来设计自动化管理系统。Loop Engineering 就是 AI 时代的"设计流水线"——你不是在拧螺丝，你在设计整条流水线。

---

## 3. Loop Engineering 的六大组件

Addy Osmani 将 Loop Engineering 拆解为六个核心模块。这六个模块缺一不可，各自解决一类问题。

### 3.1 自动化调度（Automations）—— Loop 的"心跳"

Automations 负责让 Loop **自己启动**，而不是等人来喊。它包括两类触发方式：

| 触发类型 | 示例 | Claude Code 对应 |
|----------|------|-----------------|
| **定时触发** | 每天早上 9 点扫描 Open Issues | `/loop`、`cron` |
| **事件触发** | CI 失败自动启动诊断 Loop | Git hooks、GitHub Actions |
| **目标驱动** | 设定大目标，Loop 自动拆分子任务 | `/goal` |

关键设计原则：**不要让"人记得启动"成为系统的前提。**一个好的 Loop 应该是自驱动的。

### 3.2 工作树（Worktrees）—— 隔离运行环境

当多个 Agent 并行工作时，它们不能共享同一个文件系统——会互相覆盖对方的修改。

基于 Git 的 Worktree 机制解决了这个问题：

```bash
# 每个子任务在独立的 Worktree 中运行
git worktree add ../fix-auth-bug main
cd ../fix-auth-bug
# Agent 在此环境中工作，互不干扰
```

Worktree 的三大价值：
- **并行安全**：10 个 Agent 同时修 Bug 不会冲突
- **可回滚**：Agent 改坏了直接删 Worktree，不影响主干
- **可审查**：每个 Worktree 一个分支，改动隔离、可独立 Review

### 3.3 技能（Skills）—— 持久化项目知识

如果说 Context Engineering 解决的是"单次会话给 Agent 看什么"，Skills 解决的是**"跨会话如何积累知识"**。

Skills 是存放在项目中的 Markdown 文件，Agent 每轮自动加载。它们包含：

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

你踩过的每一个坑、总结的每一条规范，都会沉淀为 Skill，成为后续所有 Agent 的"肌肉记忆"。**Skill 的质量决定了 Loop 产出的质量。**

### 3.4 连接器（Connectors）—— 让 Agent 接入真实世界

基于 **MCP（Model Context Protocol）**，Agent 可以连接外部工具：

```
Agent ←→ MCP Server ←→ 外部系统
                           ├── GitHub API（读 Issue、开 PR）
                           ├── Slack（发通知、接收指令）
                           ├── 数据库（查询数据、验证结果）
                           ├── CI/CD（触发构建、读取日志）
                           └── Linear / Jira（更新工单状态）
```

没有 Connectors，Agent 只是在"沙箱里自言自语"。有了 Connectors，它才能真正影响外部世界——开 PR、更新工单、通知团队。

### 3.5 子 Agent（Sub-agents）—— Maker/Checker 分离

这是 Loop Engineering 中最容易被低估但最重要的设计模式：**不要让同一个 Agent 既写代码又审查代码。**

```javascript
// 错误设计：一个 Agent 自产自审
const result = await agent("修复这个 Bug，然后审查自己的修复");

// 正确设计：Maker 和 Checker 分离
const fix = await agent("修复这个 Bug", { role: "maker" });
const review = await agent(`审查这个修复：${fix.diff}`, { role: "checker" });
```

为什么要分离？

| 同一 Agent 自审 | Maker/Checker 分离 |
|----------------|-------------------|
| 倾向于"放自己一马" | 独立视角，找出盲区 |
| 容易忽略安全问题 | Checker 被明确告知"你的任务是找问题" |
| 缺乏对抗性验证 | 可以设计为"默认驳回，除非证明正确" |

**Checker 应该被提示为"默认不信任，除非证明正确"，而不是"默认通过，除非明显有问题"。** 这个提示词的微小差别，决定了验证的有效性。

### 3.6 记忆 / 状态（Memory）—— 超越上下文窗口

Agent 的上下文窗口（Context Window）是有限的，但一个持续运行的 Loop 需要**记住已经做了什么、还剩什么没做**。

Memory 层的实现可以很简单：

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

Osmani 强调：**"每个成功的 Loop 背后，都有一套默默工作的状态文件。"** 状态文件是 Loop 的"短期记忆"，Skills 是 Loop 的"长期记忆"。

---

## 4. 完整 Loop 示例：一条真实的工作流

把六个组件串起来，一条典型的 CI 自动修复 Loop 长这样：

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

**全程开发者一个字都没有敲。** 你的工作是：
1. 确保这条 Loop 的规则是合理的
2. 审查 Checker Agent 通过但你觉得可疑的 PR
3. 不断优化 Skills 中的项目规范

---

## 5. Loop 成熟度模型

Osmani 在文章中提出了一个六级成熟度模型，帮助团队评估自己处于什么阶段：

| 等级 | 名称 | 特征 | 人的参与度 |
|------|------|------|-----------|
| **L0** | 人工逐轮提示 | 每次手动粘贴 Prompt | 100% |
| **L1** | 脚本化重试 | 用脚本批量调用 Agent | 90% |
| **L2** | 定时 Loop | 定时运行，只报告不自动修改 | 70% |
| **L3** | 有状态 Loop | 进度跨会话持久化 | 40% |
| **L4** | 自验证 Loop | 有确定性检查，Agent 能判断自己是否做对了 | 25% |
| **L5** | 多 Agent 协作 | Maker/Checker 分离，专门化 Agent 分工 | 15% |
| **L6** | 生产级监督 | 有安全护栏、自动回滚、异常升级机制 | 10% |

大多数团队目前处于 **L1-L2** 阶段。L4 以上的 Loop 已经具备了替代初-中级开发者的能力——这也是为什么 JetBrains 2026 Q2 调研显示**全球初级开发岗位需求同比暴跌 40%**。

---

## 6. 三个你必须警惕的深坑

Loop Engineering 不是银弹。Osmani 和 Cherny 都明确警示了三个核心风险。

### 6.1 验证仍是人的责任

Loop 可以自动完成"声明完成"，但**不能自动完成"证明正确"**。

> "完成了"是一份声明。"做对了"是一个事实。声明不等于事实。——Addy Osmani

Checker Agent 可以减少遗漏，但不能替代人的判断。安全变更、架构决策、用户体验问题——这些需要人的确认。

**原则**：Loop 可以自动处理你**充分理解**的问题；面对你不理解的问题，Loop 只是帮你把问题变得更清晰，决策仍然在你。

### 6.2 理解债务（Comprehension Debt）

这是 Osmani 提出的一个关键概念，比技术债务更隐蔽也更危险。

```
Loop 生成代码的速度
         >
你理解代码的速度
         =
理解债务在累积
```

当 Loop 每天产出数万行代码，而你的理解速度是恒定的，**理解债务会以指数级增长**。总有一天，你会面对一个自己完全不知道如何运作的系统。

**缓解策略**：
- 设置 Loop 的"产出速率上限"——不是让它跑得越快越好
- 定期停下来，人工 Review 近期所有自动变更
- 对核心模块禁止 Loop 自动修改，只允许人工操作

### 6.3 认知投降（Cognitive Surrender）

这是最深刻的风险——**当系统能自己运转，人会本能地停止思考**。

Cherny 的原话：*"最舒服的姿势恰恰是最危险的。当你不再理解 Loop 在做什么但 Pipeline 还能跑的时候，你已经把工程师的核心能力交出去了。"*

**对抗策略**：
- **定期"离线日"**：每周有一天不用 Agent，纯手写，保持手感
- **自问测试**：如果这个 Loop 明天消失了，你还能不能自己做完它做的事？
- **保持"以工程师的身份"搭建 Loop**：你是在设计系统，不是在按"开始键"

---

## 7. 一句话总结不同角色如何面对 Loop Engineering

| 角色 | 你应该做什么 |
|------|------------|
| **初级开发者** | 学会读懂 Loop 的产出，专注于理解而非堆砌代码 |
| **中级开发者** | 把你的经验沉淀为 Skills，成为 Loop 的"教练" |
| **高级 / 架构师** | 设计 Loop 的约束边界和验证规则，定义"完成"的标准 |
| **技术管理者** | 重新思考团队结构和绩效衡量方式，代码量不再是好指标 |

Addy Osmani 的最后一段话是最好的收尾：

> **"搭好你的 Loop，但要以一个打算继续当工程师的人去搭建它——不要做只会点'开始键'的人。"**

---

## 8. 参考资料

- [Loop Engineering — Addy Osmani Blog](https://addyosmani.com/blog/loop-engineering/)
- [Loop Engineering 崛起：当 AI Agent 能自己工作，Google 工程师点人类三大职责](https://techorange.com/2026/06/10/loop-engineering-ai-agent/)
- [一文读懂 Loop Engineering：6 大板块和三个大坑](https://www.163.com/dy/article/KVG2KFMB051180F7.html)
- [cobusgreyling/loop-engineering — GitHub 实用参考和模式](https://github.com/cobusgreyling/loop-engineering)
- [ChaoYue0307/awesome-loop-engineering — 精选资源合集](https://github.com/ChaoYue0307/awesome-loop-engineering)
- [AI Agent 的 4 个工程关键词：Prompt、Context、Loop、Harness](https://developer.aliyun.com/article/1740864)
- [Harness 之后，硅谷 AI 圈又来新词了：Loop Engineering](https://hub.baai.ac.cn/view/55505)
