---
title: 'Frontend State Management 2026: The Arrival of the Signal Era'
published: 2026-08-11
description: An in-depth look at how Signals, a new reactive primitive, are reshaping frontend state management, covering core usage in Solid.js, Svelte 5 Runes, Angular Signals, and Preact Signals, along with TC39 standardization progress.
image: ''
tags: [frontend, state management, Signals, JavaScript, React]
category: Frontend
draft: false
---
## From Store to Signal: A Paradigm Shift

Front-end state management has undergone several paradigm shifts over the past decade: from direct DOM manipulation in the jQuery era, to Backbone's event model, to Redux's single Store + immutable data flow. Each pattern solved the pain points of the previous one, but also introduced new complexity.

In 2026, **Signal** has become the mainstream paradigm for front-end state management. It didn't appear overnight—Knockout.js had the concept of "observables" back in 2010, but it wasn't until Solid.js pushed it to extreme performance in 2021, and subsequently Svelte 5, Angular, Preact, Qwik, and other frameworks built in support, that Signal truly "broke out."

So what exactly is a Signal? Why does it make state management simpler and more efficient?

## The Core Idea of Signal

A Signal is essentially an **automatically dependency-tracking reactive value container**. It consists of three parts:

1. **Signal**: a reactive container that holds a value
2. **Derived**: a read-only value computed from other Signals
3. **Effect**: a function that automatically executes when its dependent Signals change

Represented in the simplest pseudocode:

```js
const count = signal(0)           // 创建信号
const doubled = derived(() => count.value * 2)  // 派生值
effect(() => console.log(doubled.value))         // 自动追踪依赖

count.value = 1  // 输出: 2
count.value = 2  // 输出: 4
```

The key difference from traditional approaches (such as React's `useState` + `useEffect`) is that **Signals don't require declaring dependency arrays**. The framework automatically tracks which Signals are read at runtime, thereby building a precise dependency graph and achieving **fine-grained updates**—only the DOM nodes that actually depend on the changed data re-render, rather than the entire component tree.

## Signal Implementations in Mainstream Frameworks

### Solid.js: The Native Home of Signal

Solid.js is the first modern front-end framework to treat Signal as a first-class citizen. It has no virtual DOM; compiled JSX directly manipulates the real DOM, and changes to a Signal only trigger the most fine-grained DOM updates.

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

Note: reading a Signal is done through a **function call** `count()`, which is the key to Solid's automatic tracking—the function call is intercepted by a Proxy, thereby recording the dependency relationship.

### Svelte 5: The Magic of Runes

Svelte 5 introduced **Runes** syntax, using `$state`, `$derived`, `$effect` to replace the previous `let` + compiler magic. In `.svelte.js` files, Runes can even be used independently of components, enabling framework-agnostic reactive logic.

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

Svelte 5's Runes absorbed Solid's fine-grained update philosophy in design, but retained Svelte's tradition of compile-time optimization. Variables declared with `$state` are converted into Signals by the compiler, so that reassignment can also trigger reactive updates—something that was impossible in Svelte 4 (only `let` + assignment triggered updates, and reactivity was lost when passed as function arguments).

An important change is that Runes make reactive logic **extractable and reusable**:

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

### Preact Signals: The Least Intrusive Cross-Framework Solution

The Preact team developed `@preact/signals-core`, a **framework-agnostic** Signal library, and then bridged it to React via `@preact/signals-react`, allowing React developers to enjoy Signal's fine-grained updates without leaving familiar JSX:

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

The key here is: `count` and `doubled` are Signals created **outside the component**, yet React components can still correctly respond to their changes. `@preact/signals-react` injects interception logic for `.value` reads into JSX via a Babel plugin, bypassing React's "immutable data" limitation. Even better, changes to a Signal **do not trigger a re-render of the entire component**—only the specific DOM nodes that read that Signal update.

### Angular Signals: The Enterprise-Grade Signal Solution

Angular introduced Signal in v16 (developer preview), and by v19 it had stabilized, marking this "heavyweight framework's" full embrace of fine-grained reactivity:

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

Angular's Signal is decoupled from Zone.js, bringing transformative performance improvements: when using `signal()`, Angular no longer needs to traverse the entire component tree for dirty checking, but instead precisely updates only the view nodes bound to changed Signals. Combined with the `OnPush` strategy, Angular applications can achieve update efficiency approaching native DOM operations.
## Signal vs Traditional Approaches: A Practical Comparison

Let's use the same scenario—a todo list with optimistic updates—to compare different approaches:

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

Problem: Every time `todos` changes, all components consuming `TodoContext` re-render, even if they only care about the state of a single item in the list.

### Refactoring with Signal

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

With Signals, individual TODO components in the list only update when their own corresponding data changes, while other items remain completely unaffected. `doneCount` also only recalculates when the `done` state of the relevant TODO changes.

## TC39 Signals Proposal: Toward Standardization

In April 2024, several framework authors (including Ryan Carniato of Solid.js, Rich Harris of Svelte, Marvin Hagemeister of Preact, and others) jointly submitted the [**Signals standardization proposal**](https://github.com/tc39/proposal-signals) to TC39, which is currently at Stage 1.

The proposal's core API design:

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

An important design decision of the proposal is to **not rely on Proxy**, but instead implement dependency tracking through explicit `.get()` / `.set()` APIs. This allows Signals to be used in environments that don't support Proxy (such as older browsers), and also makes dependency relationships easier to statically analyze and debug.

## How to Choose?

| Approach | Use Case | Learning Curve | Ecosystem Maturity |
|------|----------|----------|------------|
| Solid.js Signals | New projects, pursuing ultimate performance | Medium | ★★★★☆ |
| Svelte 5 Runes | Svelte projects | Low | ★★★★☆ |
| Preact Signals | Gradual migration of existing React projects | Low | ★★★☆☆ |
| Angular Signals | Angular projects | Medium | ★★★★★ |
| Vue ref/reactive | Vue projects | Low | ★★★★★ |

It should be noted that Vue 3's `ref()` and `reactive()` are conceptually highly consistent with Signals—they are all reactive primitives that automatically track dependencies, support derived computations, and drive side effects. Vue's reactivity system is based on Proxy, which is one of the differences between it and frameworks like Solid, but the design philosophy is entirely in the same direction.

## Conclusion

In 2026, Signal is no longer a question of "whether to use it," but rather "your framework already supports it—are you using it?" From Solid.js's meteoric rise, to Svelte 5's full embrace, to TC39's standardization push, Signal is becoming the reactive infrastructure of the Web platform.

For developers, now is the best time to learn Signals: the concepts are simple, the patterns are unified, and they're transferable across frameworks. When the TC39 proposal finally lands, understanding Signals will become an essential skill for every JavaScript developer, just like understanding Promises.

---

**References:**

- [TC39 Proposal: Signals](https://github.com/tc39/proposal-signals) — Signals standardization proposal (Stage 1)
- [Solid.js Official Docs: Signals](https://docs.solidjs.com/concepts/intro-to-reactivity)
- [Svelte 5 Runes Documentation](https://svelte.dev/docs/svelte/$state)
- [Preact Signals Official Guide](https://preactjs.com/guide/v10/signals/)
- [Angular Signals Documentation](https://angular.dev/guide/signals)