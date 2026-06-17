---
title: React 和 Vue 框架到底是什么？从零理解前端框架
published: 2026-06-17
description: '抛开术语和八股文，用最直白的方式理解 React 和 Vue 到底解决了什么问题，以及它们各自的核心哲学。'
image: ''
tags: [React, Vue, 前端框架, 前端基础]
category: '前端'
draft: false
lang: ''
---

## 1. 引言

很多前端新手会困惑：已经学会了 HTML/CSS/JavaScript，为什么还要学框架？

我们先回到「三件套」写页面的原始方式：

```javascript
// 原生的方式：手动操作 DOM
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

这段代码能跑。但随着页面越来越复杂，你会发现几个痛苦：

1. **状态和 UI 不同步**：数据变了，你得手动更新 DOM（忘了就出 bug）
2. **代码组织混乱**：事件监听、DOM 操作、数据处理全混在一起
3. **复用困难**：换个页面就得复制粘贴，改一处容易漏另一处
4. **性能优化费劲**：哪些 DOM 该更新、哪些不用，全得自己判断

**框架就是为了解决这些问题而生的。**

---

## 2. 框架的核心思想

不管是 React 还是 Vue，所有现代前端框架都共享同一个核心思想：

```
数据（State） → 框架自动 → 界面（UI）
```

你只需要关心**数据是什么**，框架负责把数据变成界面。当数据变化时，框架自动更新界面 —— 你再也不用手动 `createElement`、`appendChild`、`remove` 了。

| 对比维度 | 原生写法 | 使用框架 |
|---------|---------|---------|
| 更新 UI | 手动查 DOM → 修改 → 插入 | 改数据 → 框架自动更新 |
| 代码组织 | 散落各处 | 组件化，高内聚 |
| 复用 | 复制粘贴 | 组件即插即用 |
| 性能 | 自己优化 | 框架内置 diff + 最小更新 |

---

## 3. React：数据驱动视图的函数式哲学

### 3.1 React 的核心公式

React 把 UI 看作**状态的函数**：

```
UI = f(State)
```

这意味着：给定同样的状态，React 渲染出同样的界面。界面不再是「修改出来的」，而是「声明出来的」。

### 3.2 用 JSX 描述界面

React 使用 **JSX** —— 一种在 JavaScript 里写 HTML 的语法：

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

对比原生写法，React 的代码：
- 不用手动创建 DOM 元素，直接写 JSX 描述结构
- 不用手动更新 DOM，改 `todos` 数组就行
- 每个功能封装在一个组件里，清晰内聚

### 3.3 React 的核心概念

| 概念 | 说明 | 示例 |
|------|------|------|
| **组件** | UI 的基本单元，函数返回 JSX | `function Card() { return <div>...</div> }` |
| **State** | 组件内部的可变数据 | `const [count, setCount] = useState(0)` |
| **Props** | 父组件传给子组件的数据 | `<Card title="Hello" />` |
| **Hooks** | 给函数组件「挂载」状态和副作用 | `useState`, `useEffect`, `useRef` |
| **Virtual DOM** | 内存中的虚拟 DOM 树，用于计算最小更新 | 框架内部实现 |
| **单向数据流** | 数据从父组件流向子组件 | `Parent → Child` |

### 3.4 React 的哲学

- **一切皆 JavaScript**：JSX 不过是 `createElement()` 的语法糖
- **不可变性**：不修改原数据，而是创建新数据（`[...arr, newItem]`）
- **显式更新**：必须调用 `setState` 才会触发重新渲染

---

## 4. Vue：渐进式的模板哲学

### 4.1 Vue 的核心理念

Vue 的设计目标是**渐进式**：你可以把它当作一个简单的模板引擎只用在页面的某个部分，也可以用它构建复杂的单页应用。

Vue 使用**模板语法**，将 HTML 作为模板的天然载体：

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

### 4.2 Vue 的核心概念

| 概念 | 说明 | 示例 |
|------|------|------|
| **模板** | 基于 HTML 的声明式模板 | `<template>` 块 |
| **响应式数据** | 数据变化时视图自动更新 | `ref()`, `reactive()` |
| **指令** | 以 `v-` 开头的特殊属性 | `v-if`, `v-for`, `v-model`, `v-bind` |
| **组件** | 单文件组件 `.vue` | `<script setup>` + `<template>` + `<style>` |
| **双向绑定** | `v-model` 实现数据和视图的双向同步 | `<input v-model="text">` |
| **Computed** | 基于响应式数据的计算属性 | `const doubled = computed(() => count.value * 2)` |

### 4.3 Vue 的哲学

- **模板优先**：写起来像 HTML，对设计师和后端开发者友好
- **响应式系统**：数据变了，用到这个数据的地方自动更新（底层用 Proxy 实现）
- **灵活性**：Options API 和 Composition API 两种写法任选

---

## 5. React vs Vue：如何选择

| 对比维度 | React | Vue |
|---------|-------|-----|
| 核心理念 | UI = f(State)，函数式 | 响应式 + 模板，渐进式 |
| 写法 | JSX（JS 中写 HTML） | SFC 模板（HTML 中写逻辑） |
| 数据更新 | 不可变 + 显式 setState | 可变 + 自动追踪 |
| 学习曲线 | 稍陡（需理解 Hooks 规则） | 较平缓（模板直觉友好） |
| 生态 | 庞大，Next.js 全栈方案 | 完善，Nuxt 全栈方案 |
| 社区 | Meta 维护，社区最活跃 | 社区驱动，中文生态好 |
| 适用场景 | 大型应用、跨平台（React Native） | 中小型到大型均适合 |

> **没有最好的框架，只有最适合你的框架。** 如果你喜欢「一切皆 JavaScript」的极简哲学，选 React；如果你更习惯「模板 + 脚本 + 样式分离」的直观方式，选 Vue。

---

## 6. 框架不等于抛弃基础

一个常见的误区：「学了框架就不用学 JavaScript 了」。

事实上恰恰相反：**框架是对基础的封装，理解基础才能驾驭框架**。以下能力在框架开发中依然重要：

| 基础能力 | 在框架中的体现 |
|---------|-------------|
| ES6 模块化 | `import` / `export` 组件 |
| 解构赋值 | `const { title, content } = props` |
| 数组方法 | `map`、`filter`、`reduce` 处理列表 |
| 异步编程 | `async/await` 处理 API 请求 |
| 闭包 | 理解 Hooks 的工作原理 |
| 事件机制 | `onClick`、`@click` 底层就是事件监听 |

---

## 7. 小结

React 和 Vue 本质上都在做同一件事：**让你用声明式的方式描述界面，框架负责把数据高效地同步到 DOM。**

- **React** 说：「UI 是状态的函数，把一切都当成 JavaScript」
- **Vue** 说：「HTML 是最好的模板，让响应式系统自动追踪依赖」

学会其中一个，另一个也能很快上手 —— 因为它们共享了同一个核心理念：**数据驱动视图**。
