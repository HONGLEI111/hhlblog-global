---
title: 'Ant Design X 2.7 Released: RICH Paradigm and Hybrid UI Reshape AI Interface Development'
published: 2026-05-21
description: Ant Design X is a React component library in the Ant Design ecosystem for AI-driven interfaces. Built on the RICH interaction paradigm and Hybrid UI concept, it offers streaming Markdown rendering, A2UI dynamic cards, AI SDK, and other complete solutions.
image: ''
tags: [Ant Design X, React, AI, Frontend]
category: Frontend
draft: false
---
## 1. What Is Ant Design X?

Ant Design X (`@ant-design/x`) is a **React component library for AI-driven interfaces** launched by the Ant Design team. It is not a replacement for Ant Design 5, but rather a new component system built on top of the existing design system, specifically designed for scenarios such as AI chat, intelligent assistants, and Agent consoles.

On April 30, 2026, Ant Design X released version **v2.7.0**, and its ecosystem now encompasses 5 core packages:

| Package Name | Purpose | Latest Version |
|------|------|----------|
| `@ant-design/x` | Core AI interface component library | 2.7.0 |
| `@ant-design/x-markdown` | Streaming Markdown renderer | 2.7.0 |
| `@ant-design/x-sdk` | AI data stream management SDK | 2.7.0 |
| `@ant-design/x-card` | A2UI dynamic card rendering | 2.7.0 |
| `@ant-design/x-skill` | AI coding assistant skill library | 2.7.0 |

---

## 2. Design Philosophy: The RICH Interaction Paradigm

The core design philosophy of Ant Design X is the **RICH paradigm**, which breaks down AI interaction into four stages:

```
RICH interaction flow
├── R — Role (role intent)
│   ├── Welcome welcome component
│   └── Prompts prompt set
├── I — Intention (intent awakening)
│   ├── Sender input box
│   ├── Attachment attachment
│   └── Suggestion quick suggestion
├── C — Conversation (conversation communication)
│   ├── Bubble conversation bubble
│   ├── Conversations conversation list
│   └── Notification notification
└── H — Hybrid UI (hybrid interface)
    ├── Think thinking process
    ├── ThoughtChain thought chain
    ├── Actions action bar
    ├── FileCard file card
    ├── Sources cited sources
    ├── Mermaid diagram rendering
    ├── Folder file tree
    └── CodeHighlighter code highlighting
```

RICH is not a linear process, but rather **composable interaction units**. You can use components from a single stage independently, or combine them into a complete AI application.

---

## 3. Hybrid UI: Merging GUI with Natural Language

The **Hybrid UI (HUI)** concept proposed by Ant Design X attempts to resolve a core contradiction: traditional GUI operations are efficient but have a high learning curve, while natural language interaction is flexible but expresses intent ambiguously.

HUI divides interaction modes into three types:

| Mode | Characteristics | Use Cases |
|------|----------|----------|
| **Do-heavy** | GUI-dominant, AI-assisted | Structured forms, data entry |
| **Chat-heavy** | Natural language-dominant | Open-ended Q&A, content generation |
| **HUI Hybrid** | Free switching between GUI + Chat | Intelligent customer service, Agent consoles |

This design allows the same interface to perform precise operations through traditional forms while also expressing flexibly through natural language — "having your cake and eating it too."

---

## 4. Core Components at a Glance

### 4.1 Bubble — Conversation Bubble

`Bubble` is the foundational component for displaying conversation content, supporting multiple roles and content types:

```tsx
import { Bubble } from '@ant-design/x';

<Bubble
  placement="start"
  avatar={{ icon: <RobotOutlined /> }}
  content="Hello, I'm an AI assistant"
/>
```

### 4.2 Sender — Input Box

`Sender` is an enhanced input component that supports file attachments, voice input, and quick suggestions:

```tsx
import { Sender } from '@ant-design/x';

<Sender
  onSubmit={(value) => console.log(value)}
  placeholder="Type your question..."
/>
```

### 4.3 ThoughtChain — Chain of Thought

Displays the thinking process of an AI Agent, allowing users to understand the AI's reasoning path:

```tsx
import { ThoughtChain } from '@ant-design/x';

<ThoughtChain
  items={[
    { title: 'Analyze the question', description: 'Identify keywords...', status: 'success' },
    { title: 'Search the knowledge base', description: 'Matched 3 related documents', status: 'success' },
    { title: 'Generate answer', status: 'pending' },
  ]}
/>
```

### 4.4 Sources — Cited Sources

Displays the reference sources for AI responses, enhancing credibility:

```tsx
import { Sources } from '@ant-design/x';

<Sources
  items={[
    { title: 'React official documentation', url: 'https://react.dev' },
    { title: 'Ant Design X documentation', url: 'https://x.ant.design' },
  ]}
/>
```

---

## 5. XMarkdown: Streaming Markdown Rendering

`@ant-design/x-markdown` is a Markdown rendering engine optimized specifically for AI streaming output. It solves three core problems that traditional Markdown renderers face in streaming scenarios:

### 5.1 Incomplete Syntax Fault Tolerance

When AI streams output `$$E = mc^` (unclosed formula), XMarkdown does not crash, but instead gracefully degrades the rendering:

```tsx
import { XMarkdown } from '@ant-design/x-markdown';

<XMarkdown
  content={streamingText}
  streaming={{ tail: '▋' }} //Streaming cursor indicator
/>
```

### 5.2 Custom Streaming Tail Indicator

The `streaming.tail` configuration added in v2.6.0 supports a custom blinking cursor:

```tsx
<XMarkdown
  content={streamingText}
  streaming={{
    tail: '▋',
    tailComponent: <BlinkingCursor />
  }}
/>
```

### 5.3 Safe Rendering

The `escapeRawHtml` property added in v2.3.0 prevents XSS attacks:

```tsx
<XMarkdown
  content={untrustedContent}
  escapeRawHtml={true}
/>
```

---

## 6. X SDK: AI Data Stream Management

`@ant-design/x-sdk` encapsulates the complete data flow for interacting with AI models:

### 6.1 XRequest — Request Management

```tsx
import { XRequest } from '@ant-design/x-sdk';

const request = XRequest({
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
});
```

v2.2.0 supports **reconnection** and **custom stream delimiters**:

```tsx
XRequest({
  baseURL: 'https://api.example.com',
  model: 'custom-model',
  streamSeparator: '\n',      //Stream delimiter
  partSeparator: 'data: ',    //Part delimiter
  kvSeparator: ': ',          //Key-value delimiter
});
```

### 6.2 useXChat — Conversation Management

```tsx
import { useXChat } from '@ant-design/x-sdk';

const { messages, onRequest } = useXChat({
  request,
  queueRequest: true, //New in v2.3.0: request queue support
});
```

---

## 7. X Card: A2UI Dynamic Cards

The `@ant-design/x-card` released in v2.5.0 is the most eye-catching new member of the entire ecosystem. It is based on the **A2UI protocol**, allowing AI Agents to dynamically generate structured UI:

```tsx
import { XCard } from '@ant-design/x-card';

<XCard
  //A2UI JSON description returned by AI
  a2ui={agentResponse}
  dataModel={userData}
/>
```

The core value of A2UI lies in this: **AI doesn't just return text — it returns interactive cards**. For example, AI can return a complete interactive interface containing forms, charts, and buttons, rather than just a text description.

---
## 8. Quick Start

### 8.1 Installation

```bash
#Core component library
npm install @ant-design/x

#Streaming Markdown (optional)
npm install @ant-design/x-markdown

#AI SDK (optional)
npm install @ant-design/x-sdk
```

### 8.2 A Complete AI Chat Application

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

In under 40 lines of code, a complete chat application with streaming Markdown rendering, session management, and AI conversation is implemented.

---

## 9. 2026 Version Evolution

Ant Design X maintained a **monthly minor version** release cadence in 2026:

| Version | Date | Key Updates |
|------|------|----------|
| **v2.7.0** | April 30 | XProvider `zeroRuntime`, XCard path reference resolution |
| **v2.6.0** | April 17 | XMarkdown tail indicator component, x-components/x-card skill |
| **v2.5.0** | March 31 | 🔥 X Card dynamic card module released |
| **v2.4.0** | March 13 | 🔥 Folder file tree component, x-markdown skill |
| **v2.3.0** | February 26 | useXChat `queueRequest`, XMarkdown `escapeRawHtml` |
| **v2.2.0** | January | Mermaid configuration, XRequest reconnection, XMarkdown performance testing |

As can be seen, the team continues to explore the boundaries of **AI interface as code**—from streaming Markdown to dynamic card rendering, every step is lowering the barrier to AI application development.

---

## 10. Comparison with Competitors

| Dimension | Ant Design X | Vercel AI SDK | LangChain |
|------|-------------|--------------|-----------|
| Positioning | UI component library + data flow | Data flow + lightweight UI | AI orchestration framework |
| UI system | ✅ Complete component library | ⚠️ Basic components | ❌ None |
| Streaming Markdown | ✅ XMarkdown | ⚠️ Basic support | ❌ None |
| Hybrid UI | ✅ Hybrid UI | ❌ | ❌ |
| Framework binding | React-exclusive | React/Vue/Svelte | Cross-platform |

Ant Design X's differentiated advantage lies in its **complete UI component system + streaming rendering engine**, not just data flow management.

---

## 11. Summary

Ant Design X's positioning is very clear: **it is not yet another AI SDK, but a complete AI interface solution**. Its core value lies in:

1. The **RICH paradigm** provides a standardized design language for AI interaction
2. **Hybrid UI** breaks down the boundary between GUI and Chat
3. **XMarkdown** solves the core pain points of streaming rendering
4. **X Card** opens up the possibility of AI dynamically generating UI
5. **Out-of-the-box**: seamless integration with the Ant Design ecosystem, zero learning curve for React developers

If you are developing an AI chat product, Agent console, or intelligent assistant interface, Ant Design X is currently the most mature and complete choice in the React ecosystem.

---

## References

- [Ant Design X Official Website](https://x.ant.design)
- [Ant Design X GitHub](https://github.com/ant-design/x)
- [Ant Design X Changelog](https://x.ant.design/changelog)
- [RICH Interaction Paradigm Introduction](https://ant-design-x.antgroup.com/docs/spec/hybrid-ui-design)
- [npm @ant-design/x](https://www.npmjs.com/package/@ant-design/x)