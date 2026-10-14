---
title: 前端状态管理 2026：Signal 时代的到来
published: 2026-08-11
description: '深入解读 Signal（信号）这一新型响应式原语如何重塑前端状态管理格局，涵盖 Solid.js、Svelte 5 Runes、Angular Signals、Preact Signals 的核心用法与 TC39 标准化进展'
image: ''
tags: [前端, 状态管理, Signal, JavaScript, React]
category: '前端'
draft: false
lang: ''
---

## 从 Store 到 Signal：一次范式转移

前端状态管理在过去十年经历了数次范式转移：从 jQuery 时代的 DOM 直接操作，到 Backbone 的事件模型，再到 Redux 的单一 Store + 不可变数据流。每一种模式都在解决前一种模式的痛点，但同时也引入了新的复杂度。

2026 年，**Signal（信号）** 已经成为前端状态管理的主流范式。它并非一夜之间出现——2010 年 Knockout.js 就有了"可观察对象"的概念，但直到 Solid.js 在 2021 年将其推向极致性能，以及随后 Svelte 5、Angular、Preact、Qwik 等框架纷纷内建支持，Signal 才真正"出圈"了。

那么，Signal 到底是什么？它为什么能让状态管理变得更简单、更高效？

## Signal 的核心思想

Signal 本质上是一个**自动追踪依赖的响应式值容器**。它由三个部分组成：

1. **Signal（信号）**：持有值的响应式容器
2. **Derived（派生）**：基于其他 Signal 计算得出的只读值
3. **Effect（副作用）**：当依赖的 Signal 变化时自动执行的函数

用最简单的伪代码表示：

```js
const count = signal(0)           // 创建信号
const doubled = derived(() => count.value * 2)  // 派生值
effect(() => console.log(doubled.value))         // 自动追踪依赖

count.value = 1  // 输出: 2
count.value = 2  // 输出: 4
```

与传统方案（如 React 的 `useState` + `useEffect`）的关键区别在于：**Signal 不需要声明依赖数组**。框架在运行时自动追踪哪些 Signal 被读取，从而建立精准的依赖关系图，实现**细粒度更新**——只有真正依赖变化数据的 DOM 节点才会重新渲染，而不是整个组件树。

## 主流框架的 Signal 实现

### Solid.js：Signal 的原生家园

Solid.js 是第一个将 Signal 作为一等公民的现代前端框架。它没有虚拟 DOM，编译后的 JSX 直接操作真实 DOM，Signal 的变化只会触发最细粒度的 DOM 更新。

```jsx
import { createSignal, createMemo, createEffect } from 'solid-js'

function Counter() {
  const [count, setCount] = createSignal(0)
  const doubled = createMemo(() => count() * 2)

  createEffect(() => {
    console.log(`count 变为 ${count()}, doubled 变为 ${doubled()}`)
  })

  return (
    <div>
      <p>Count: {count()}</p>
      <p>Doubled: {doubled()}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </div>
  )
}
```

注意：Signal 的读取是通过**函数调用** `count()` 完成的，这是 Solid 实现自动追踪的关键——函数调用会被 Proxy 拦截，从而记录依赖关系。

### Svelte 5：Runes 的魔力

Svelte 5 引入了 **Runes** 语法，用 `$state`、`$derived`、`$effect` 来替代此前的 `let` + 编译器魔法。在 `.svelte.js` 文件中，Runes 甚至可以脱离组件单独使用，实现框架无关的响应式逻辑。

```svelte
<script>
  let count = $state(0)
  let doubled = $derived(count * 2)

  $effect(() => {
    console.log(`count: ${count}, doubled: ${doubled}`)
  })
</script>

<button onclick={() => count++}>
  count: {count}, doubled: {doubled}
</button>
```

Svelte 5 的 Runes 在设计上吸收了 Solid 的细粒度更新理念，但保留了 Svelte 的编译时优化传统。`$state` 声明的变量会被编译器转换为 Signal，使得重新赋值也能触发响应式更新——这在 Svelte 4 中是无法做到的（只有 `let` + 赋值触发，函数参数传递则丢失响应性）。

一个重要的变化是 Runes 让响应式逻辑**可提取、可复用**：

```js
// counter.svelte.js
export function createCounter(initial = 0) {
  let count = $state(initial)
  let doubled = $derived(count * 2)

  function increment() {
    count++
  }

  return {
    get count() { return count },
    get doubled() { return doubled },
    increment
  }
}
```

### Preact Signals：跨框架的最小侵入方案

Preact 团队开发了 `@preact/signals-core`，一个**与框架无关**的 Signal 库，然后通过 `@preact/signals-react` 桥接到 React，让 React 开发者无需离开熟悉的 JSX 就能享受 Signal 的细粒度更新：

```jsx
import { signal, computed } from '@preact/signals-react'

const count = signal(0)
const doubled = computed(() => count.value * 2)

function Counter() {
  return (
    <div>
      <p>Count: {count.value}</p>
      <p>Doubled: {doubled.value}</p>
      <button onClick={() => count.value++}>+1</button>
    </div>
  )
}
```

这里的关键是：`count` 和 `doubled` 是**组件外部**创建的 Signal，但 React 组件仍然能正确响应其变化。`@preact/signals-react` 通过 Babel 插件在 JSX 中注入 `.value` 读取的拦截逻辑，绕过了 React 的"不可变数据"限制。更妙的是，Signal 的变化**不会触发整个组件重新渲染**——只有读取了该 Signal 的具体 DOM 节点会更新。

### Angular Signals：企业级 Signal 方案

Angular 在 v16 中引入了 Signal（开发者预览），到 v19 时已经稳定，标志着这个"重装框架"全面拥抱细粒度响应式：

```typescript
import { Component, signal, computed, effect } from '@angular/core'

@Component({
  selector: 'app-counter',
  template: `
    <p>Count: {{ count() }}</p>
    <p>Doubled: {{ doubled() }}</p>
    <button (click)="increment()">+1</button>
  `
})
export class CounterComponent {
  count = signal(0)
  doubled = computed(() => this.count() * 2)

  constructor() {
    effect(() => {
      console.log(`count: ${this.count()}, doubled: ${this.doubled()}`)
    })
  }

  increment() {
    this.count.update(v => v + 1)
  }
}
```

Angular 的 Signal 与 Zone.js 解耦，带来了变革性的性能提升：当使用 `signal()` 时，Angular 不再需要遍历整个组件树来做脏检查，而是精确地只更新绑定了变化 Signal 的视图节点。结合 `OnPush` 策略，Angular 应用可以实现接近原生 DOM 操作的更新效率。

## Signal vs 传统方案：实战对比

让我们用同一个场景——一个带乐观更新的待办事项列表——来对比不同方案：

### React (useState + Context)

```jsx
const TodoContext = createContext()

function TodoProvider({ children }) {
  const [todos, setTodos] = useState([])
  const addTodo = useCallback((text) => {
    setTodos(prev => [...prev, { id: Date.now(), text, done: false }])
  }, [])
  const toggleTodo = useCallback((id) => {
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, done: !t.done } : t
    ))
  }, [])
  
  return (
    <TodoContext.Provider value={{ todos, addTodo, toggleTodo }}>
      {children}
    </TodoContext.Provider>
  )
}
```

问题：每次 `todos` 变化，所有消费 `TodoContext` 的组件都会重新渲染，即便只关心列表中某一项的状态。

### 用 Signal 重构

```js
// store.js（框架无关的 Signal store）
import { signal, computed } from '@preact/signals-core'

const todos = signal([
  { id: 1, text: '学习 Signal', done: false },
  { id: 2, text: '写博客文章', done: false }
])

const doneCount = computed(() => todos.value.filter(t => t.done).length)
const totalCount = computed(() => todos.value.length)

function addTodo(text) {
  todos.value = [...todos.value, { id: Date.now(), text, done: false }]
}

function toggleTodo(id) {
  todos.value = todos.value.map(t =>
    t.id === id ? { ...t, done: !t.done } : t
  )
}

export { todos, doneCount, totalCount, addTodo, toggleTodo }
```

使用 Signal 后，列表组件中的单个 TODO 组件只在自己对应数据变化时才会更新，其他项完全不受影响。`doneCount` 也只在相关 TODO 的 `done` 状态变化时才重新计算。

## TC39 Signals 提案：走向标准化

2024 年 4 月，多位框架作者（包括 Solid.js 的 Ryan Carniato、Svelte 的 Rich Harris、Preact 的 Marvin Hagemeister 等）联合向 TC39 提交了 [**Signals 标准化提案**](https://github.com/tc39/proposal-signals)，目前处于 Stage 1 阶段。

提案的核心 API 设计：

```js
// 创建 Signal（通过 Signal.State 实例）
const counter = new Signal.State(0)

// 读取值
console.log(counter.get())  // 0

// 写入值
counter.set(1)

// 派生（通过 Signal.Computed）
const doubled = new Signal.Computed(() => counter.get() * 2)

// 监听变化
const watcher = new Signal.subtle.Watcher(() => {
  console.log('变化了')
})
```

提案的一个重要设计决策是**不依赖 Proxy**，而是通过显式的 `.get()` / `.set()` API 来实现依赖追踪。这使得 Signal 可以在不支持 Proxy 的环境（如 older browsers）中使用，也让依赖关系更容易静态分析和调试。

## 如何选择？

| 方案 | 适用场景 | 学习成本 | 生态成熟度 |
|------|----------|----------|------------|
| Solid.js Signals | 新项目，追求极致性能 | 中等 | ★★★★☆ |
| Svelte 5 Runes | Svelte 项目 | 低 | ★★★★☆ |
| Preact Signals | 已有 React 项目渐进式迁移 | 低 | ★★★☆☆ |
| Angular Signals | Angular 项目 | 中 | ★★★★★ |
| Vue ref/reactive | Vue 项目 | 低 | ★★★★★ |

需要指出的是，Vue 3 的 `ref()` 和 `reactive()` 在概念上与 Signal 高度一致——它们都是响应式原语，自动追踪依赖、支持派生计算、驱动副作用。Vue 的响应式系统基于 Proxy，这是它与 Solid 等框架的差异点之一，但设计理念完全在同一方向上。

## 结语

2026 年，Signal 已经不是"是否使用"的问题，而是"你的框架已经支持了，你是否在用"的问题。从 Solid.js 的一鸣惊人，到 Svelte 5 的全面拥抱，再到 TC39 的标准化推进，Signal 正在成为 Web 平台的响应式基础设施。

对于开发者而言，现在学习 Signal 是最佳时机：概念简单、模式统一、跨框架可迁移。当 TC39 提案最终落地，理解 Signal 将像理解 Promise 一样，成为每一个 JavaScript 开发者的必备技能。

---

**参考来源：**

- [TC39 Proposal: Signals](https://github.com/tc39/proposal-signals) — Signals 标准化提案（Stage 1）
- [Solid.js 官方文档：Signals](https://docs.solidjs.com/concepts/intro-to-reactivity)
- [Svelte 5 Runes 文档](https://svelte.dev/docs/svelte/$state)
- [Preact Signals 官方指南](https://preactjs.com/guide/v10/signals/)
- [Angular Signals 文档](https://angular.dev/guide/signals)
