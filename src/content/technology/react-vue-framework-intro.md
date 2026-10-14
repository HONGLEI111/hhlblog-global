---
title: What Are React and Vue, Really? Understanding Frontend Frameworks from Scratch
published: 2026-06-17
description: Cut through the jargon and boilerplate to understand what problems React and Vue actually solve, and the core philosophy behind each.
image: ''
tags: [React, Vue, Frontend Frameworks, Frontend Fundamentals]
category: Frontend
draft: false
---
## 1. Introduction

Many frontend beginners are confused: I've already learned HTML/CSS/JavaScript, why do I still need to learn a framework?

Let's first go back to the original way of writing pages with the "big three":

```javascript
//Native approach: manually manipulating the DOM
const list = document.getElementById('todo-list');
const input = document.getElementById('todo-input');
const button = document.getElementById('add-btn');

button.addEventListener('click', () => {
    const text = input.value;
    const li = document.createElement('li');
    li.textContent = text;

    const delBtn = document.createElement('button');
    delBtn.textContent = '删除';
    delBtn.addEventListener('click', () => li.remove());

    li.appendChild(delBtn);
    list.appendChild(li);
    input.value = '';
});
```

This code runs. But as pages get more and more complex, you'll notice a few pain points:

1. **State and UI are out of sync**: When data changes, you have to manually update the DOM (forget, and you get a bug)
2. **Messy code organization**: Event listeners, DOM operations, and data handling are all mixed together
3. **Hard to reuse**: Switching to another page means copy-pasting, and changing one place easily misses another
4. **Performance optimization is a chore**: Which DOM nodes should update and which shouldn't is all up to you to figure out

**Frameworks were born to solve these problems.**

---

## 2. The Core Idea of Frameworks

Whether it's React or Vue, all modern frontend frameworks share the same core idea:

```
数据（State） → 框架自动 → 界面（UI）
```

You only need to care about **what the data is**, and the framework handles turning data into the interface. When data changes, the framework automatically updates the interface — you never have to manually `createElement`, `appendChild`, `remove` again.

| Comparison Dimension | Native Approach | Using a Framework |
|---------|---------|---------|
| Updating UI | Manually query DOM → modify → insert | Change data → framework auto-updates |
| Code organization | Scattered everywhere | Componentized, high cohesion |
| Reuse | Copy-paste | Components are plug-and-play |
| Performance | Optimize it yourself | Framework has built-in diff + minimal updates |

---

## 3. React: The Functional Philosophy of Data-Driven Views

### 3.1 React's Core Formula

React views UI as **a function of state**:

```
UI = f(State)
```

This means: given the same state, React renders the same interface. The interface is no longer "modified" — it's "declared."

### 3.2 Describing the Interface with JSX

React uses **JSX** — a syntax for writing HTML inside JavaScript:

```jsx
function TodoList() {
    const [todos, setTodos] = useState([]);
    const [text, setText] = useState('');

    const addTodo = () => {
        setTodos([...todos, { id: Date.now(), text, done: false }]);
        setText('');
    };

    const removeTodo = (id) => {
        setTodos(todos.filter(t => t.id !== id));
    };

    return (
        <div>
            <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="输入待办事项"
            />
            <button onClick={addTodo}>添加</button>
            <ul>
                {todos.map(todo => (
                    <li key={todo.id}>
                        {todo.text}
                        <button onClick={() => removeTodo(todo.id)}>删除</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
```

Compared to the native approach, React's code:
- No need to manually create DOM elements; just write JSX to describe the structure
- No need to manually update the DOM; just change the `todos` array
- Each feature is encapsulated in a component, clear and cohesive

### 3.3 React's Core Concepts

| Concept | Description | Example |
|------|------|------|
| **Component** | The basic unit of UI; a function returns JSX | `function Card() { return <div>...</div> }` |
| **State** | Mutable data inside a component | `const [count, setCount] = useState(0)` |
| **Props** | Data passed from parent component to child component | `<Card title="Hello" />` |
| **Hooks** | "Attach" state and side effects to function components | `useState`, `useEffect`, `useRef` |
| **Virtual DOM** | A virtual DOM tree in memory, used to compute minimal updates | Framework internal implementation |
| **One-way data flow** | Data flows from parent component to child component | `Parent → Child` |

### 3.4 React's Philosophy

- **Everything is JavaScript**: JSX is just syntactic sugar for `createElement()`
- **Immutability**: Don't modify the original data; create new data instead (`[...arr, newItem]`)
- **Explicit updates**: You must call `setState` to trigger a re-render

---

## 4. Vue: The Progressive Template Philosophy

### 4.1 Vue's Core Idea

Vue's design goal is to be **progressive**: you can use it as a simple template engine for just one part of a page, or use it to build a complex single-page application.

Vue uses **template syntax**, treating HTML as the natural carrier for templates:

```vue
<template>
    <div>
        <input
            v-model="text"
            placeholder="输入待办事项"
            @keyup.enter="addTodo"
        />
        <button @click="addTodo">添加</button>
        <ul>
            <li v-for="todo in todos" :key="todo.id">
                {{ todo.text }}
                <button @click="removeTodo(todo.id)">删除</button>
            </li>
        </ul>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const text = ref('');
const todos = ref([]);

function addTodo() {
    if (!text.value.trim()) return;
    todos.value.push({ id: Date.now(), text: text.value, done: false });
    text.value = '';
}

function removeTodo(id) {
    todos.value = todos.value.filter(t => t.id !== id);
}
</script>
```

### 4.2 Vue's Core Concepts

| Concept | Description | Example |
|------|------|------|
| **Template** | HTML-based declarative template | `<template>` block |
| **Reactive data** | The view auto-updates when data changes | `ref()`, `reactive()` |
| **Directives** | Special attributes starting with `v-` | `v-if`, `v-for`, `v-model`, `v-bind` |
| **Component** | Single-File Component `.vue` | `<script setup>` + `<template>` + `<style>` |
| **Two-way binding** | `v-model` achieves two-way sync between data and view | `<input v-model="text">` |
| **Computed** | Computed properties based on reactive data | `const doubled = computed(() => count.value * 2)` |

### 4.3 Vue's Philosophy

- **Template-first**: Writes like HTML, friendly to designers and backend developers
- **Reactive system**: When data changes, everywhere that uses this data auto-updates (implemented with Proxy under the hood)
- **Flexibility**: Choose between Options API and Composition API

---

## 5. React vs Vue: How to Choose

| Comparison Dimension | React | Vue |
|---------|-------|-----|
| Core idea | UI = f(State), functional | Reactive + templates, progressive |
| Writing style | JSX (write HTML in JS) | SFC templates (write logic in HTML) |
| Data updates | Immutable + explicit setState | Mutable + automatic tracking |
| Learning curve | Slightly steep (need to understand Hooks rules) | Gentler (templates are intuitive and friendly) |
| Ecosystem | Huge, Next.js full-stack solution | Mature, Nuxt full-stack solution |
| Community | Maintained by Meta, most active community | Community-driven, strong Chinese ecosystem |
| Use cases | Large applications, cross-platform (React Native) | Suitable for small-to-medium to large |

> **There is no best framework, only the framework that suits you best.** If you like the minimalist philosophy of "everything is JavaScript," choose React; if you're more used to the intuitive way of "template + script + style separation," choose Vue.

---
## 6. Frameworks Don't Mean Abandoning the Fundamentals

A common misconception: "Once you learn a framework, you don't need to learn JavaScript anymore."

In fact, it's the exact opposite: **frameworks are abstractions built on top of the fundamentals, and only by understanding the fundamentals can you truly master a framework**. The following skills remain important in framework development:

| Fundamental Skill | How It Manifests in Frameworks |
|---------|-------------|
| ES6 modularity | `import` / `export` components |
| Destructuring assignment | `const { title, content } = props` |
| Array methods | `map`, `filter`, `reduce` for handling lists |
| Asynchronous programming | `async/await` for handling API requests |
| Closures | Understanding how Hooks work |
| Event mechanisms | `onClick` and `@click` are built on event listeners |

---

## 7. Summary

React and Vue are essentially doing the same thing: **letting you describe the UI in a declarative way, with the framework responsible for efficiently syncing data to the DOM.**

- **React** says: "UI is a function of state — treat everything as JavaScript"
- **Vue** says: "HTML is the best template — let the reactive system automatically track dependencies"

Once you learn one, you can pick up the other quickly — because they share the same core philosophy: **data-driven views**.

--- END CONTENT ---