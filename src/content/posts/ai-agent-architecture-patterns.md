---
title: 'AI Agent Architecture Patterns: ReAct, Plan-and-Execute, and Reflection Loops'
published: 2026-08-13
description: A breakdown of three core architecture patterns used in modern AI agents—ReAct, Plan-and-Execute, and reflection loops—with minimal runnable code implementations.
image: ''
tags: [AI Agent, ReAct, LLM, Architecture, Python]
category: 'AI'
draft: false
---
## Introduction

When developers talk about AI in 2026, they rarely talk only about "getting a model to generate a piece of text"—they talk about "getting a model to accomplish a task." Behind this shift is the rise of **AI Agents**: LLMs are no longer just answering questions; they can plan, call tools, observe results, self-correct, and ultimately deliver a verifiable outcome.

But an Agent isn't as simple as "stuffing an LLM into a `while True` loop." Over the past two years, the community has distilled several repeatedly validated **architectural patterns**. Once you understand these patterns, you understand the internal skeleton of tools like Claude Code, OpenHands, and AutoGPT.

This article breaks down the three most core patterns—**ReAct**, **Plan-and-Execute**, and the **Reflection loop (Reflexion)**—and provides minimal implementations you can run directly.

## Starting from a naive idea

The most naive Agent can be written like this:

```python
def naive_agent(task: str) -> str:
    for _ in range(10):
        response = llm(task)          #Ask the model
        action = parse_action(response) #Parse out the action
        result = execute(action)        #Execute the action
        task += f"\nResult: {result}"     #Feed the result back in
    return task
```

This code "works," but the problems quickly surface:

1. **The model doesn't know what it's doing**: it can't distinguish between "thinking" and "acting," the output format is chaotic, and it's hard to parse.
2. **There's no explicit stopping condition**: the model doesn't know when to stop.
3. **When it hits an error, it just spins in place**: without a reflection mechanism, the same mistake gets repeated ten times.

Architectural patterns emerged precisely to answer these questions.

## Pattern 1: ReAct (Reasoning + Acting)

ReAct is a classic paradigm proposed by Yao et al. in 2022. Its idea can be summed up in one sentence: **have the model alternately output "Thought" and "Action," and use "Observation" feedback from the external environment to drive the reasoning forward.**

Its core contribution is defining a clear **output protocol** for the Agent:

```
Thought: I need to search for relevant information first
Action: search[ReAct paper]
Observation: Search results: ...
Thought: The search results mention "alternating reasoning and acting," which I can use to answer
Final Answer: ReAct is a ...
```

This protocol looks simple, but it solves the first two problems of the naive implementation: the format is fixed and parseable, and there's a clear `Final Answer` stop signal. Below is a minimal runnable implementation:

```python
#react_agent.py — a minimal runnable ReAct loop
import re

def llm(prompt: str) -> str:
    """LLM abstraction interface, replace with any model API you use."""
    raise NotImplementedError

TOOLS = {
    "search": lambda q: f"Search results for “{q}”: …",
    "calculator": lambda expr: str(eval(expr)),
}

SYSTEM = (
    "You are an Agent that can call tools. Strictly output in the following format:\n"
    "Thought: <your reasoning>\n"
    "Action: <tool name>[<parameters>]\n"
    "When you can give the final answer, output:\n"
    "Final Answer: <answer>"
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

    return "Reached the maximum number of steps without arriving at an answer"
```

ReAct's advantages are that it's **intuitive, controllable, and interpretable**—the Thought at each step leaves behind a reasoning trace, making debugging easy. Its drawbacks are also obvious: **each step requires regenerating the full context**, so token consumption is high; and its planning ability for long-chain tasks is weak, making it prone to "taking one step and seeing what happens next" and drifting away from the goal.

## Pattern 2: Plan-and-Execute (plan first, execute later)

To address ReAct's "lack of global planning," Plan-and-Execute splits the task into two phases: **first use a Planner to generate a complete plan, then have an Executor carry it out step by step.**

```
Task → [Planner generates step list] → [Executor executes in sequence] → aggregate results
```

The core code is as follows:

```python
#plan_and_execute.py — plan first, then execute step by step
def plan_and_execute(task: str) -> str:
    #Phase one: planning
    plan = llm(
        "Please break down the following task into several executable steps,"
        "List each step as '- [ ] step description':\n\n"
        f"Task: {task}"
    )
    steps = re.findall(r"- \[ \]\s*(.+)", plan)

    #Phase two: execute one by one, each step can see the results of previous steps
    context = f"Task: {task}\nPlan:\n{plan}\n\n"
    for i, step in enumerate(steps, 1):
        context += f"\nExecuting step {i}: {step}\nExecution result:"
        context += llm(context)
    return context
```

This pattern is especially suited to tasks that are **clearly stepped and can be decomposed in advance**, such as "research a topic and produce a report" or "deploy a service according to a checklist." Its cost is also more controllable—there's no need to re-reason at every step like ReAct.

But it has a soft spot too: **real-world tasks are often not linear**. If, while executing step 3, you discover that the assumption in step 1 was wrong, Plan-and-Execute needs an additional "re-planning" mechanism as a fallback. In engineering practice, projects like LangGraph abstract planning, execution, and re-planning into orchestration-ready graph nodes.

## Pattern 3: Reflection loop (Reflexion)

Both ReAct and Plan-and-Execute assume "the model can get it right in one shot." But in real scenarios, the first generated answer is often wrong. Reflexion introduces a closed loop of **external evaluator + verbal reflection**: execute → evaluate → reflect → retry with the reflection.

```python
#reflexion.py — reflection loop: execute → evaluate → reflect → retry
def reflexion(task: str, max_attempts: int = 3) -> str:
    reflection = ""
    for _ in range(max_attempts):
        result = run_react(task)  #Reuse the ReAct executor from earlier
        feedback = llm(
            f"Task: {task}\nCurrent result: {result}\n"
            f"History reflection: {reflection or 'None'}\n"
            "Please evaluate whether the result achieves the goal and provide specific suggestions for improvement."
        )
        if "Achieved" in feedback or "Success" in feedback:
            return result
        reflection = feedback  #Write the reflection into the context of the next attempt
    return result
```

The key insight of the reflection loop is: **failure itself is valuable information**. Feeding the reason for the previous failure back to the model in natural language is essentially a lightweight form of "verbal reinforcement learning"—no gradient descent needed; language alone can make the model do better the next time.

This mechanism is especially effective in code generation scenarios: have the model write code → run the tests → feed the error message back as a reflection → write it again. After a few cycles, it often passes the tests. This is also the core of many "AI automatically fixes bugs" tools.

## Comparison and selection of the three patterns

| Dimension | ReAct | Plan-and-Execute | Reflexion |
| --- | --- | --- | --- |
| Core idea | Alternate thinking and acting | Plan first, then execute | Reflect after execution and retry |
| Planning ability | Weak (take one step and see) | Strong (global decomposition) | Depends on the underlying executor |
| Fault tolerance | Medium | Weak (requires extra re-planning) | Strong (built-in error-correction loop) |
| Interpretability | High (has reasoning traces) | High (has a plan checklist) | High (has reflection records) |
| Cost | High (context repeatedly inflates) | Medium | High (multiple retries) |

In real engineering, these patterns are **not mutually exclusive**. A mature Agent (such as a coding assistant) is often a combination of them: use Plan-and-Execute for task decomposition, use ReAct to complete the tool calls at each step, and layer Reflexion on top for failure retries. This is also why more and more teams choose to use **graphs/state machines** to orchestrate Agents—because real workflows are a superposition of these patterns, not a choice between one or the other.
## Conclusion

The essence of the Agent architecture pattern is to decouple "the model's capabilities" from "the control of the flow." ReAct gave the model a parseable thought-action protocol, Plan-and-Execute filled in global planning, and Reflexion filled in self-correction. Once you understand these three building blocks, reading source code like LangGraph or OpenHands won't intimidate you with their complexity—most of them simply make these three building blocks more robust and easier to orchestrate.

For readers who want to get hands-on, my suggestion is: **first manually implement the three minimal versions from this article**. In under 100 lines of code, you can build an intuitive feel for how an Agent operates, which is more worthwhile than directly calling any high-level framework.

---

**References:**

1. Yao, S., et al. "ReAct: Synergizing Reasoning and Acting in Language Models." *arXiv 2022*. https://arxiv.org/abs/2210.03629
2. Shinn, N., et al. "Reflexion: Language Agents with Verbal Reinforcement Learning." *arXiv 2023*. https://arxiv.org/abs/2303.11366
3. Wang, L., et al. "Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models." *arXiv 2023*. https://arxiv.org/abs/2305.04091
4. LangGraph official documentation (Agent orchestration graph). https://langchain-ai.github.io/langgraph/