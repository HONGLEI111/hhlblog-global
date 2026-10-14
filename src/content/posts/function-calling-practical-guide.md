---
title: 'Function Calling in Practice: Getting LLMs to Call Your API'
published: 2026-09-03
description: From defining tool schemas to running multi-turn tool_use loops, build a hands-on assistant that calls real APIs.
image: ''
tags: [Function Calling, LLM, Tool Use]
category: 'AI'
draft: false
---
The most commonly criticized aspect of large language models (LLMs) is this: they can only "talk," not "do things." When you ask it "What's the temperature in Beijing right now," it either makes a wild guess based on outdated memories in its training data, or frankly admits "I don't know." Function Calling (also called Tool Use) was created to solve this problem—it lets the model, when needed, hand back "which function to call and what parameters to pass" in the form of structured JSON to you, and your code executes the real logic, then feeds the result back to the model, which ultimately generates an accurate answer.

## The Complete Lifecycle of One Round Trip

The essence of Function Calling is "the model sets the question, the code answers it." A complete round of calling roughly consists of four steps:

1. You send the tool (function) definition—name, purpose, parameter schema—to the model along with the request.
2. The model determines: does this question require calling a tool? If so, it returns a `tool_use` block containing the function name and parameters.
3. Your code parses the parameters, executes the real function (querying a database, calling a third-party API, modifying files...).
4. Return the execution result as `tool_result` to the model, and the model generates the final user-facing answer based on it.

Note: the model itself does **not** execute your functions—it is only responsible for "generating the call intent." The execution power is always in your hands, which is also the fundamental reason why Function Calling is relatively safe.

## Hands-On: Building a Weather Query Assistant

Below is a minimal working example written in TypeScript + Anthropic SDK. First, define the tool schema:

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

`input_schema` is a JSON Schema that both tells the model "what parameters this function takes" and constrains the types and value ranges of the parameters. Writing `description` clearly is crucial—the quality of the model's judgment depends directly on how clearly you describe it.

Next is the core loop logic:

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

    //The model wants to call a tool
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
      //Key: append the assistant's tool_use together with the corresponding tool_result
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    //Get the final text answer
    return response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
  }
}
```

`executeTool` is your own business logic:

```typescript
async function executeTool(name: string, input: any) {
  if (name === "get_weather") {
    const { city, unit = "celsius" } = input;
    const data = await fetchWeatherApi(city, unit); //Call the real weather service
    return data;
  }
  throw new Error(`未知工具: ${name}`);
}
```

Run `chat("北京今天多少度？")`, and the model will return a `tool_use` block with the parameter `{"city": "北京"}`; after your code looks up the real temperature and feeds the result back, the model finally replies "Beijing is 28°C and sunny today." The user is completely unaware of the entire process.

## Several Pitfalls You Must Avoid

**1. Are the parameters an object or a string? It varies by provider.** In the Anthropic SDK, `block.input` is already a parsed object, so you can use it directly; but the `arguments` returned by OpenAI's function calling is a JSON string that must be `JSON.parse()`. When writing a multi-provider adapter layer, this is the most error-prone spot.

**2. Parallel calls must be returned all at once.** A single response may contain multiple `tool_use` blocks simultaneously (for example, "check the weather in Beijing and Shanghai"). You can execute them concurrently, but **all** `tool_result` must be returned in **the same** user message. Splitting them into multiple messages and sending them separately will teach the model bad habits—making it think it shouldn't call tools in parallel.

**3. If tool execution fails, say so clearly.** If a function throws an error, don't silently swallow it. Return a `tool_result` with `is_error: true`, letting the model know the reason for the failure; it will usually retry with different parameters or explain to the user.

**4. Never blindly trust the parameters passed by the model.** Model output is essentially untrusted input. If the tool is "execute an SQL query," the `city` given by the model might be concatenated into SQL and cause injection. Be sure to do parameter validation and whitelist filtering, treating Function Calling like an external API and defending against it accordingly.

**5. For more stable parameters, enable strict.** Add `strict: true` to the tool definition (the schema needs to include `additionalProperties: false` and `required`), and the API will enforce on the model side that parameters conform to the schema, eliminating low-level errors like "missing a required field."

## The Difference from Structured Outputs

Many people can't distinguish Function Calling from Structured Outputs. In one sentence: Function Calling lets the model **trigger actions**, while Structured Outputs lets the model **return data in a fixed format**. If your need is only "extract a passage into JSON," Structured Outputs is more suitable and saves more tokens; only when the model needs to **call your functions** does Function Calling come into play.

## Conclusion

Function Calling is the key leap that upgrades LLMs from "chatbots" to "agents that can get work done." Once you understand the three steps of "the model sets the question, the code answers it, and the result is fed back," you have mastered the foundation of Agent development—almost all Agent frameworks (ReAct, Plan-and-Execute) are just layering more control flow on top of this loop. Next time you want an LLM to help you query data, send requests, or modify files, don't let it "say" it—let it "call" it.

## References

- Anthropic Official Documentation · Tool use: https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- OpenAI Official Documentation · Function calling: https://platform.openai.com/docs/guides/function-calling