---
title: Function Calling 实战：让 LLM 调用你的 API
published: 2026-09-03
description: '从工具 Schema 定义到多轮 tool_use 循环，动手实现一个会调用真实 API 的智能助手'
image: ''
tags: [Function Calling, LLM, 工具调用]
category: 'AI'
draft: false
lang: ''
---

大语言模型（LLM）最常被诟病的一点是：它只能「说话」，不能「做事」。你问它「北京现在几度」，它要么凭训练数据里过期的记忆瞎猜，要么坦白「我不知道」。Function Calling（函数调用，也叫 Tool Use / 工具调用）就是为解决这个问题而生的——它让模型在需要时，把「要调用哪个函数、传什么参数」以结构化 JSON 的形式交还给你，由你的代码去执行真实逻辑，再把结果喂回给模型，最终生成准确回答。

## 一个来回的完整生命周期

Function Calling 的本质是「模型出题，代码答题」。一轮完整的调用大致分四步：

1. 你把工具（函数）的定义——名字、用途、参数 schema——随请求一起发给模型。
2. 模型判断：这个问题需不需要调工具？需要的话，返回一个 `tool_use` 块，里面包含函数名和参数。
3. 你的代码解析参数、执行真实函数（查数据库、调第三方 API、改文件……）。
4. 把执行结果作为 `tool_result` 返回给模型，模型据此生成面向用户的最终回答。

注意：模型本身**不会**执行你的函数，它只负责「生成调用意图」。执行权永远在你手里，这也是 Function Calling 相对安全的根本原因。

## 实战：构建一个天气查询助手

下面用 TypeScript + Anthropic SDK 写一个最小可用示例。先定义工具 Schema：

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const tools = [
  {
    name: "get_weather",
    description: "查询指定城市的实时天气",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "城市名，如“北京”或“Shanghai”" },
        unit: { type: "string", enum: ["celsius", "fahrenheit"], description: "温度单位" },
      },
      required: ["city"],
    },
  },
];
```

`input_schema` 是一份 JSON Schema，它既告诉模型「这个函数吃什么参数」，也约束了参数的类型和取值范围。写清楚 `description` 非常关键——模型的判断质量直接取决于你描述得多明白。

接下来是核心的循环逻辑：

```typescript
async function chat(userMessage: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  while (true) {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      tools,
      messages,
    });

    // 模型想调工具了
    if (response.stop_reason === "tool_use") {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await executeTool(block.name, block.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }
      // 关键：把 assistant 的 tool_use 和对应的 tool_result 一起追加回去
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // 拿到最终文本回答
    return response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
  }
}
```

`executeTool` 是你自己的业务逻辑：

```typescript
async function executeTool(name: string, input: any) {
  if (name === "get_weather") {
    const { city, unit = "celsius" } = input;
    const data = await fetchWeatherApi(city, unit); // 调用真实天气服务
    return data;
  }
  throw new Error(`未知工具: ${name}`);
}
```

运行 `chat("北京今天多少度？")`，模型会返回一个 `tool_use` 块，参数是 `{"city": "北京"}`；你的代码查到真实温度后把结果喂回去，模型最后回复「北京今天 28°C，晴」。整个过程用户完全无感。

## 几个必须避开的坑

**1. 参数是对象还是字符串？各家不一样。** Anthropic SDK 里 `block.input` 已经是解析好的对象，直接用即可；但 OpenAI 的 function calling 返回的 `arguments` 是一段 JSON 字符串，必须 `JSON.parse()`。写多 provider 适配层时，这里是最容易踩雷的地方。

**2. 并行调用要一次性回传。** 一次响应里可能同时出现多个 `tool_use` 块（比如「查北京和上海的天气」）。可以并发执行，但**所有** `tool_result` 必须放进**同一个** user 消息里返回。拆成多条消息分开传，会让模型学坏——以为不该并行调工具。

**3. 工具执行失败要说清楚。** 如果函数抛错，别默默吞掉。返回一个带 `is_error: true` 的 `tool_result`，让模型知道失败原因，它通常会换个参数重试或向用户解释。

**4. 永远不要盲信模型传的参数。** 模型输出本质上是不可信输入。如果工具是「执行 SQL 查询」，模型给的 `city` 可能拼进 SQL 里造成注入。务必做参数校验、白名单过滤，把 Function Calling 当外部 API 一样设防。

**5. 想要更稳的参数，开 strict。** 在工具定义上加 `strict: true`（schema 需包含 `additionalProperties: false` 与 `required`），API 会在模型侧强制参数符合 schema，杜绝「漏传必填字段」这类低级错误。

## 与结构化输出的区别

很多人分不清 Function Calling 和结构化输出（Structured Outputs）。一句话：Function Calling 让模型**触发动作**，结构化输出让模型**返回固定格式的数据**。如果你的需求只是「把一段话抽成 JSON」，用结构化输出更合适、更省 token；当模型需要**调用你的函数**时，才轮到 Function Calling。

## 结语

Function Calling 是把 LLM 从「聊天机器人」升级为「能干活的智能体」的关键一跃。理解了「模型出题、代码答题、结果回填」这三步，你就掌握了 Agent 开发的地基——几乎所有 Agent 框架（ReAct、Plan-and-Execute）都是在这套循环上叠加了更多控制流而已。下次想让 LLM 帮你查数据、发请求、改文件时，别再让它「说」，让它「调」吧。

## 参考来源

- Anthropic 官方文档 · Tool use（工具调用）：https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- OpenAI 官方文档 · Function calling：https://platform.openai.com/docs/guides/function-calling
