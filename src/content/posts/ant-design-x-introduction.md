---
title: Ant Design X 2.7 发布：RICH 范式与 Hybrid UI 重塑 AI 界面开发
published: 2026-05-21
description: 'Ant Design X 是 Ant Design 生态面向 AI 驱动界面的 React 组件库，基于 RICH 交互范式与 Hybrid UI 理念，提供流式 Markdown 渲染、A2UI 动态卡片、AI SDK 等完整解决方案。'
image: ''
tags: [Ant Design X, React, AI, 组件库, RICH, Hybrid UI, Markdown, 前端]
category: '前端框架'
draft: false
lang: ''
---

## 1. 什么是 Ant Design X？

Ant Design X（`@ant-design/x`）是 Ant Design 团队推出的**面向 AI 驱动界面的 React 组件库**。它并不是 Ant Design 5 的替代品，而是在原有设计体系之上，专为构建 AI 聊天、智能助手、Agent 控制台等场景设计的一套新组件体系。

2026 年 4 月 30 日，Ant Design X 发布了 **v2.7.0** 版本，生态已涵盖 5 个核心包：

| 包名 | 用途 | 最新版本 |
|------|------|----------|
| `@ant-design/x` | 核心 AI 界面组件库 | 2.7.0 |
| `@ant-design/x-markdown` | 流式 Markdown 渲染器 | 2.7.0 |
| `@ant-design/x-sdk` | AI 数据流管理 SDK | 2.7.0 |
| `@ant-design/x-card` | A2UI 动态卡片渲染 | 2.7.0 |
| `@ant-design/x-skill` | AI 编码助手技能库 | 2.7.0 |

---

## 2. 设计哲学：RICH 交互范式

Ant Design X 的核心设计理念是 **RICH 范式**，它将 AI 交互拆解为四个阶段：

```
RICH 交互流程
├── R — Role（角色意图）
│   ├── Welcome 欢迎组件
│   └── Prompts 提示集
├── I — Intention（意图唤醒）
│   ├── Sender 输入框
│   ├── Attachment 附件
│   └── Suggestion 快捷建议
├── C — Conversation（会话沟通）
│   ├── Bubble 对话气泡
│   ├── Conversations 会话列表
│   └── Notification 通知
└── H — Hybrid UI（混合界面）
    ├── Think 思考过程
    ├── ThoughtChain 思维链
    ├── Actions 操作栏
    ├── FileCard 文件卡片
    ├── Sources 引用来源
    ├── Mermaid 图表渲染
    ├── Folder 文件树
    └── CodeHighlighter 代码高亮
```

RICH 不是线性流程，而是**可组合的交互单元**。你可以单独使用某个阶段的组件，也可以将它们组合成完整的 AI 应用。

---

## 3. Hybrid UI：融合 GUI 与自然语言

Ant Design X 提出的 **Hybrid UI (HUI)** 概念试图解决一个核心矛盾：传统 GUI 操作效率高但学习成本大，自然语言交互灵活但意图表达模糊。

HUI 将交互模式分为三种：

| 模式 | 特点 | 适用场景 |
|------|------|----------|
| **Do-heavy** | GUI 为主，AI 辅助 | 结构化表单、数据录入 |
| **Chat-heavy** | 自然语言为主 | 开放式问答、内容生成 |
| **HUI 混合** | GUI + Chat 自由切换 | 智能客服、Agent 控制台 |

这种设计让同一个界面既能通过传统表单精准操作，也能通过自然语言灵活表达，「鱼与熊掌兼得」。

---

## 4. 核心组件速览

### 4.1 Bubble — 对话气泡

`Bubble` 是展示对话内容的基础组件，支持多种角色和内容类型：

```tsx
import { Bubble } from '@ant-design/x';

<Bubble
  placement="start"
  avatar={{ icon: <RobotOutlined /> }}
  content="你好，我是 AI 助手"
/>
```

### 4.2 Sender — 输入框

`Sender` 是一个增强型输入组件，支持附件上传、语音输入和快捷建议：

```tsx
import { Sender } from '@ant-design/x';

<Sender
  onSubmit={(value) => console.log(value)}
  placeholder="输入你的问题..."
/>
```

### 4.3 ThoughtChain — 思维链

展示 AI Agent 的思考过程，让用户理解 AI 的推理路径：

```tsx
import { ThoughtChain } from '@ant-design/x';

<ThoughtChain
  items={[
    { title: '分析问题', description: '识别关键词...', status: 'success' },
    { title: '检索知识库', description: '匹配到 3 条相关文档', status: 'success' },
    { title: '生成回答', status: 'pending' },
  ]}
/>
```

### 4.4 Sources — 引用来源

展示 AI 回答的参考来源，增强可信度：

```tsx
import { Sources } from '@ant-design/x';

<Sources
  items={[
    { title: 'React 官方文档', url: 'https://react.dev' },
    { title: 'Ant Design X 文档', url: 'https://x.ant.design' },
  ]}
/>
```

---

## 5. XMarkdown：流式 Markdown 渲染

`@ant-design/x-markdown` 是一个专为 AI 流式输出优化的 Markdown 渲染引擎。它解决了传统 Markdown 渲染器在流式场景下的三个核心问题：

### 5.1 不完整语法容错

当 AI 流式输出 `$$E = mc^`（公式未闭合）时，XMarkdown 不会崩溃，而是优雅降级渲染：

```tsx
import { XMarkdown } from '@ant-design/x-markdown';

<XMarkdown
  content={streamingText}
  streaming={{ tail: '▋' }} // 流式光标指示器
/>
```

### 5.2 自定义流式尾部指示器

v2.6.0 新增的 `streaming.tail` 配置支持自定义闪烁光标：

```tsx
<XMarkdown
  content={streamingText}
  streaming={{
    tail: '▋',
    tailComponent: <BlinkingCursor />
  }}
/>
```

### 5.3 安全渲染

v2.3.0 新增 `escapeRawHtml` 属性，防止 XSS 攻击：

```tsx
<XMarkdown
  content={untrustedContent}
  escapeRawHtml={true}
/>
```

---

## 6. X SDK：AI 数据流管理

`@ant-design/x-sdk` 封装了与 AI 模型交互的完整数据流：

### 6.1 XRequest — 请求管理

```tsx
import { XRequest } from '@ant-design/x-sdk';

const request = XRequest({
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
});
```

v2.2.0 支持**断线重连**和**自定义流分隔符**：

```tsx
XRequest({
  baseURL: 'https://api.example.com',
  model: 'custom-model',
  streamSeparator: '\n',      // 流分隔符
  partSeparator: 'data: ',    // 部分分隔符
  kvSeparator: ': ',          // 键值分隔符
});
```

### 6.2 useXChat — 会话管理

```tsx
import { useXChat } from '@ant-design/x-sdk';

const { messages, onRequest } = useXChat({
  request,
  queueRequest: true, // v2.3.0 新增：支持请求队列
});
```

---

## 7. X Card：A2UI 动态卡片

v2.5.0 发布的 `@ant-design/x-card` 是整个生态最亮眼的新成员。它基于 **A2UI 协议**，允许 AI Agent 动态生成结构化 UI：

```tsx
import { XCard } from '@ant-design/x-card';

<XCard
  // AI 返回的 A2UI JSON 描述
  a2ui={agentResponse}
  dataModel={userData}
/>
```

A2UI 的核心价值在于：**AI 不只是返回文本，而是返回可交互的卡片**。例如，AI 可以返回一个包含表单、图表、按钮的完整交互界面，而不仅仅是文字描述。

---

## 8. 快速上手

### 8.1 安装

```bash
# 核心组件库
npm install @ant-design/x

# 流式 Markdown（可选）
npm install @ant-design/x-markdown

# AI SDK（可选）
npm install @ant-design/x-sdk
```

### 8.2 一个完整的 AI 聊天应用

```tsx
import {
  Bubble,
  Conversations,
  Sender,
  XProvider,
} from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import { useXChat, XRequest } from '@ant-design/x-sdk';

export default function ChatApp() {
  const request = XRequest({
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  });

  const { messages, onRequest } = useXChat({ request });

  return (
    <XProvider>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Conversations
          items={messages.map((msg) => ({
            key: msg.id,
            label: msg.content.slice(0, 30),
          }))}
        />
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {messages.map((msg) => (
            <Bubble
              key={msg.id}
              placement={msg.role === 'user' ? 'end' : 'start'}
              content={<XMarkdown content={msg.content} />}
            />
          ))}
        </div>
        <Sender onSubmit={onRequest} />
      </div>
    </XProvider>
  );
}
```

不到 40 行代码，就实现了一个带有流式 Markdown 渲染、会话管理、AI 对话的完整聊天应用。

---

## 9. 2026 年版本演进

Ant Design X 在 2026 年保持了**月度 minor 版本**的发布节奏：

| 版本 | 日期 | 关键更新 |
|------|------|----------|
| **v2.7.0** | 4 月 30 日 | XProvider `zeroRuntime`、XCard 路径引用解析 |
| **v2.6.0** | 4 月 17 日 | XMarkdown 尾部指示器组件、x-components/x-card skill |
| **v2.5.0** | 3 月 31 日 | 🔥 X Card 动态卡片模块发布 |
| **v2.4.0** | 3 月 13 日 | 🔥 Folder 文件树组件、x-markdown skill |
| **v2.3.0** | 2 月 26 日 | useXChat `queueRequest`、XMarkdown `escapeRawHtml` |
| **v2.2.0** | 1 月 | Mermaid 配置、XRequest 重连、XMarkdown 性能测试 |

可以看到，团队在持续探索 **AI 界面即代码** 的边界——从流式 Markdown 到动态卡片渲染，每一步都在降低 AI 应用的开发门槛。

---

## 10. 与竞品对比

| 维度 | Ant Design X | Vercel AI SDK | LangChain |
|------|-------------|--------------|-----------|
| 定位 | UI 组件库 + 数据流 | 数据流 + 轻量 UI | AI 编排框架 |
| UI 体系 | ✅ 完整组件库 | ⚠️ 基础组件 | ❌ 无 |
| 流式 Markdown | ✅ XMarkdown | ⚠️ 基础支持 | ❌ 无 |
| 混合界面 | ✅ Hybrid UI | ❌ | ❌ |
| 框架绑定 | React 专属 | React/Vue/Svelte | 跨平台 |

Ant Design X 的差异化优势在于**完整的 UI 组件体系 + 流式渲染引擎**，而不仅仅是数据流管理层。

---

## 11. 总结

Ant Design X 的定位非常清晰：**不是又一个 AI SDK，而是一套完整的 AI 界面解决方案**。它的核心价值在于：

1. **RICH 范式**提供了 AI 交互的标准化设计语言
2. **Hybrid UI**打破了 GUI 和 Chat 的界限
3. **XMarkdown**解决了流式渲染的核心痛点
4. **X Card**开启了 AI 动态生成 UI 的可能性
5. **开箱即用**：与 Ant Design 生态无缝集成，React 开发者零学习成本

如果你正在开发 AI 聊天产品、Agent 控制台或智能助手界面，Ant Design X 是目前 React 生态中最成熟、最完整的选择。

---

## 参考资料

- [Ant Design X 官网](https://x.ant.design)
- [Ant Design X GitHub](https://github.com/ant-design/x)
- [Ant Design X 更新日志](https://x.ant.design/changelog)
- [RICH 交互范式介绍](https://ant-design-x.antgroup.com/docs/spec/hybrid-ui-design)
- [npm @ant-design/x](https://www.npmjs.com/package/@ant-design/x)
