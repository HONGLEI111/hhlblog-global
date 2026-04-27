---
title: 栈与队列：从底层实现到单调栈的 TypeScript 指南
published: 2026-04-26
description: '掌握栈和队列的原理、TypeScript 实现，以及单调栈、单调队列在 Next Greater Element 等问题中的妙用。'
image: ''
tags: [栈, 队列, TypeScript, 数据结构]
category: '算法'
draft: false
lang: ''
---

## 1. 栈

### 1.1 特性

- **后进先出 (LIFO)**：最后进的最先出
- 操作：push（压入）、pop（弹出）、peek（查看栈顶）

### 1.2 TypeScript 实现

```typescript
class Stack<T> {
  private items: T[] = [];

  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
  peek(): T | undefined { return this.items[this.items.length - 1]; }
  get size(): number { return this.items.length; }
  isEmpty(): boolean { return this.items.length === 0; }
}
```

---

## 2. 队列

### 2.1 特性

- **先进先出 (FIFO)**：最先进的最先出
- 操作：enqueue（入队）、dequeue（出队）、front（查看队首）

### 2.2 TypeScript 实现

```typescript
class Queue<T> {
  private items: T[] = [];

  enqueue(item: T): void { this.items.push(item); }
  dequeue(): T | undefined { return this.items.shift(); }
  front(): T | undefined { return this.items[0]; }
  get size(): number { return this.items.length; }
  isEmpty(): boolean { return this.items.length === 0; }
}
```

### 2.3 高效队列（使用双数组）

```typescript
class FastQueue<T> {
  private input: T[] = [];
  private output: T[] = [];

  enqueue(item: T): void {
    this.input.push(item);
  }

  dequeue(): T | undefined {
    if (this.output.length === 0) {
      while (this.input.length > 0) {
        this.output.push(this.input.pop()!);
      }
    }
    return this.output.pop();
  }

  get size(): number { return this.input.length + this.output.length; }
}
```

---

## 3. 经典题目

### 3.1 有效的括号

```typescript
function isValid(s: string): boolean {
  const stack: string[] = [];
  const map: Record<string, string> = { ')': '(', '}': '{', ']': '[' };

  for (const ch of s) {
    if (ch in map) {
      if (stack.pop() !== map[ch]) return false;
    } else {
      stack.push(ch);
    }
  }

  return stack.length === 0;
}
```

### 3.2 用栈实现队列

```typescript
class MyQueue<T> {
  private inStack: T[] = [];
  private outStack: T[] = [];

  push(x: T): void { this.inStack.push(x); }

  pop(): T {
    if (this.outStack.length === 0) {
      while (this.inStack.length > 0) {
        this.outStack.push(this.inStack.pop()!);
      }
    }
    return this.outStack.pop()!;
  }

  peek(): T {
    if (this.outStack.length === 0) {
      while (this.inStack.length > 0) {
        this.outStack.push(this.inStack.pop()!);
      }
    }
    return this.outStack[this.outStack.length - 1];
  }

  empty(): boolean {
    return this.inStack.length === 0 && this.outStack.length === 0;
  }
}
```

---

## 4. 单调栈

```typescript
// 模板：找下一个更大元素
function nextGreaterElement(nums: number[]): number[] {
  const n = nums.length;
  const result: number[] = new Array(n).fill(-1);
  const stack: number[] = []; // 单调递减栈，存索引

  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && nums[stack[stack.length - 1]] < nums[i]) {
      const idx = stack.pop()!;
      result[idx] = nums[i];
    }
    stack.push(i);
  }

  return result;
}
```

### 4.1 每日温度

```typescript
function dailyTemperatures(temperatures: number[]): number[] {
  const n = temperatures.length;
  const result: number[] = new Array(n).fill(0);
  const stack: number[] = [];

  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && temperatures[stack[stack.length - 1]] < temperatures[i]) {
      const idx = stack.pop()!;
      result[idx] = i - idx;
    }
    stack.push(i);
  }

  return result;
}
```

---

## 5. 单调队列

```typescript
// 滑动窗口最大值
function maxSlidingWindow(nums: number[], k: number): number[] {
  const result: number[] = [];
  const deque: number[] = []; // 存索引，单调递减

  for (let i = 0; i < nums.length; i++) {
    // 移除越界元素
    if (deque.length > 0 && deque[0] <= i - k) deque.shift();

    // 保持单调递减
    while (deque.length > 0 && nums[deque[deque.length - 1]] < nums[i]) {
      deque.pop();
    }

    deque.push(i);

    if (i >= k - 1) {
      result.push(nums[deque[0]]);
    }
  }

  return result;
}
```

---

## 6. 总结

| 结构 | 特点 | 经典应用 |
|------|------|----------|
| 栈 | LIFO | 括号匹配、DFS、函数调用栈 |
| 队列 | FIFO | BFS、任务调度、消息队列 |
| 单调栈 | 保持单调 | 下一个更大元素 |
| 单调队列 | 保持单调 | 滑动窗口最值 |

---

## 参考资料

- [LeetCode — Stack](https://leetcode.cn/tag/stack/)
- [LeetCode — Queue](https://leetcode.cn/tag/queue/)
- [LeetCode — Monotonic Stack](https://leetcode.cn/tag/monotonic-stack/)
