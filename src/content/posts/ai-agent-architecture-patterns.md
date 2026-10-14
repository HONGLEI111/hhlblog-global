---
title: AI Agent 架构模式：ReAct、Plan-and-Execute 与反思循环
published: 2026-08-13
description: '拆解当前主流 AI Agent 的三种核心架构模式——ReAct、Plan-and-Execute 与反思循环，并给出可运行的最小代码实现。'
image: ''
tags: [AI Agent, ReAct, LLM, 架构, Python]
category: 'AI'
draft: false
lang: ''
---

## 引言

2026 年的开发者聊起 AI，已经很少只谈「让模型生成一段文本」，而是谈「让模型完成一件事」。这个转变背后是 **AI Agent（智能体）** 的兴起：LLM 不再只是回答问题，而是能规划、调用工具、观察结果、自我修正，最终交付一个可验证的成果。

但 Agent 不是「把 LLM 塞进一个 `while True` 循环」这么简单。过去两年，社区沉淀出了几种被反复验证的**架构模式**。理解这些模式，你就理解了 Claude Code、OpenHands、AutoGPT 等工具的内部骨架。

本文将拆解三种最核心的模式——**ReAct**、**Plan-and-Execute**、**反思循环（Reflexion）**，并给出可以直接跑起来的最小实现。

## 从一个朴素的想法说起

最朴素的 Agent 可以这样写：

```python
def naive_agent(task: str) -> str:
    for _ in range(10):
        response = llm(task)          # 问模型
        action = parse_action(response) # 解析出动作
        result = execute(action)        # 执行动作
        task += f"\n结果: {result}"     # 把结果塞回去
    return task
```

这段代码「能用」，但问题很快暴露：

1. **模型不知道自己在干什么**：它无法区分「思考」和「行动」，输出格式混乱，难以解析。
2. **没有显式的停止条件**：模型不知道该在什么时候收手。
3. **遇到错误只会原地打转**：没有反思机制，同样的错误会重复十次。

架构模式的出现，正是为了回答这些问题。

## 模式一：ReAct（Reasoning + Acting）

ReAct 是 2022 年由 Yao 等人提出的经典范式，思想一句话概括：**让模型交替输出「思考」（Thought）与「行动」（Action），并通过外部环境的「观察」（Observation）反馈来推进推理。**

它的核心贡献是给 Agent 规定了一套清晰的**输出协议**：

```
Thought: 我需要先搜索一下相关信息
Action: search[ReAct 论文]
Observation: 搜索结果：……
Thought: 搜索结果提到了「推理与行动交替」，我可以用这个来回答
Final Answer: ReAct 是一种……
```

这个协议看似简单，却解决了朴素实现的前两个问题：格式固定可解析、有明确的 `Final Answer` 停止信号。下面是一个最小可运行的实现：

```python
# react_agent.py —— 最小可运行的 ReAct 循环
import re

def llm(prompt: str) -> str:
    """LLM 抽象接口，替换为你使用的任何模型 API。"""
    raise NotImplementedError

TOOLS = {
    "search": lambda q: f"关于「{q}」的搜索结果：……",
    "calculator": lambda expr: str(eval(expr)),
}

SYSTEM = (
    "你是一个可以调用工具的 Agent，严格按以下格式输出：\n"
    "Thought: <你的推理>\n"
    "Action: <工具名>[<参数>]\n"
    "当你能给出最终答案时输出：\n"
    "Final Answer: <答案>"
)

def run_react(question: str, max_steps: int = 6) -> str:
    history = SYSTEM
    for _ in range(max_steps):
        history += f"\nQuestion: {question}\n"
        raw = llm(history)
        history += raw

        action = re.search(r"Action:\s*(\w+)\[([^\]]+)\]", raw)
        if action:
            tool, arg = action.group(1), action.group(2)
            history += f"\nObservation: {TOOLS[tool](arg)}"
            continue

        if "Final Answer:" in raw:
            return raw.split("Final Answer:", 1)[1].strip()

    return "达到最大步数仍未得出答案"
```

ReAct 的优点是**直观、可控、可解释**——每一步的 Thought 都留下了推理轨迹，方便调试。缺点也很明显：**每一步都要重新生成完整的上下文**，token 消耗大；而且它对长链条任务的规划能力较弱，容易「走一步看一步」而偏离目标。

## 模式二：Plan-and-Execute（先规划，后执行）

针对 ReAct「缺乏全局规划」的问题，Plan-and-Execute 把任务拆成两个阶段：**先用一个 Planner 生成完整计划，再由 Executor 逐步执行。**

```
任务 → [Planner 生成步骤列表] → [Executor 依次执行] → 汇总结果
```

核心代码如下：

```python
# plan_and_execute.py —— 先规划，再逐步执行
def plan_and_execute(task: str) -> str:
    # 阶段一：规划
    plan = llm(
        "请把下面的任务拆解为若干可执行的步骤，"
        "每一步以 '- [ ] 步骤描述' 列出：\n\n"
        f"任务：{task}"
    )
    steps = re.findall(r"- \[ \]\s*(.+)", plan)

    # 阶段二：逐条执行，每一步都能看到前面步骤的结果
    context = f"任务：{task}\n计划：\n{plan}\n\n"
    for i, step in enumerate(steps, 1):
        context += f"\n正在执行第 {i} 步：{step}\n执行结果："
        context += llm(context)
    return context
```

这种模式特别适合**步骤清晰、可预先分解**的任务，比如「调研某个主题并输出报告」「按清单部署一个服务」。它的成本也更可控——不必像 ReAct 那样每步都重新推理。

但它也有软肋：**现实任务往往不是线性的**。如果第 3 步执行时发现第 1 步的假设是错的，Plan-and-Execute 需要额外的「重规划」（Re-plan）机制来兜底。工程上，LangGraph 等项目把规划、执行、重规划抽象成了可编排的图节点。

## 模式三：反思循环（Reflexion）

ReAct 和 Plan-and-Execute 都假设「模型一次就能做好」。但真实场景里，第一次生成的答案经常是错的。Reflexion 引入了一个**外部评估器 + 口头反思**的闭环：执行 → 评估 → 反思 → 带着反思重试。

```python
# reflexion.py —— 反思循环：执行 → 评估 → 反思 → 重试
def reflexion(task: str, max_attempts: int = 3) -> str:
    reflection = ""
    for _ in range(max_attempts):
        result = run_react(task)  # 复用前文的 ReAct 执行器
        feedback = llm(
            f"任务：{task}\n本次结果：{result}\n"
            f"历史反思：{reflection or '无'}\n"
            "请评估该结果是否达成目标，并给出具体改进建议。"
        )
        if "达成" in feedback or "成功" in feedback:
            return result
        reflection = feedback  # 把反思写入下一次尝试的上下文
    return result
```

反思循环的关键洞察是：**失败本身是有价值的信息**。把上一次失败的原因以自然语言的形式「喂回」给模型，相当于一种轻量级的「verbal reinforcement learning」——不需要梯度下降，只靠语言就能让模型在下一次做得更好。

这套机制在代码生成场景尤其有效：让模型写代码 → 跑测试 → 把报错信息作为反思回填 → 再写一次，循环几次后往往能通过测试。这也是很多「AI 自动修 bug」工具的内核。

## 三种模式的对比与选型

| 维度 | ReAct | Plan-and-Execute | Reflexion |
| --- | --- | --- | --- |
| 核心思想 | 思考与行动交替 | 先规划后执行 | 执行后反思重试 |
| 规划能力 | 弱（走一步看一步） | 强（全局拆解） | 依赖底层执行器 |
| 容错能力 | 中 | 弱（需额外重规划） | 强（自带纠错闭环） |
| 可解释性 | 高（有推理轨迹） | 高（有计划清单） | 高（有反思记录） |
| 成本 | 高（上下文反复膨胀） | 中 | 高（多次重试） |

实际工程中，这些模式**并非互斥**。一个成熟的 Agent（比如代码助手）往往是它们的组合：用 Plan-and-Execute 做任务拆解，用 ReAct 完成每一步的工具调用，再叠加 Reflexion 做失败重试。这也是为什么越来越多团队选择用**图/状态机**来编排 Agent——因为真实的工作流是这些模式的叠加，而不是二选一。

## 结语

Agent 架构模式的本质，是把「模型的能力」和「流程的控制」解耦。ReAct 给了模型一套可解析的思考-行动协议，Plan-and-Execute 补上了全局规划，Reflexion 补上了自我纠错。理解了这三块积木，再去读 LangGraph、OpenHands 之类的源码，就不会被复杂的框架吓到——它们大多只是把这三块积木做得更健壮、更易编排而已。

对于想上手的读者，我的建议是：**先手动实现一遍本文的三个最小版本**。不到 100 行代码，就能对 Agent 的运作机理建立直观的体感，这比直接调用任何高级框架都更值。

---

**参考来源：**

1. Yao, S., et al. "ReAct: Synergizing Reasoning and Acting in Language Models." *arXiv 2022*. https://arxiv.org/abs/2210.03629
2. Shinn, N., et al. "Reflexion: Language Agents with Verbal Reinforcement Learning." *arXiv 2023*. https://arxiv.org/abs/2303.11366
3. Wang, L., et al. "Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models." *arXiv 2023*. https://arxiv.org/abs/2305.04091
4. LangGraph 官方文档（Agent 编排图）. https://langchain-ai.github.io/langgraph/
