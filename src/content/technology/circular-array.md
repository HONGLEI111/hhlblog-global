---
title: 环形数组：循环缓冲区的 TypeScript 实现
published: 2026-04-26
description: '掌握环形数组的原理与实现，用 TypeScript 构建循环队列、环形缓冲区，解决循环遍历问题。'
image: ''
tags: [环形数组, TypeScript, 数据结构]
category: '算法'
draft: false
lang: ''
---

## 1. 什么是环形数组？

环形数组 = 用数组模拟环状结构，通过 **取模运算** 实现循环。

```
索引: 0  1  2  3  4
元素: a  b  c  d  e

下一个索引 = (当前 + 1) % 长度
上一个索引 = (当前 - 1 + 长度) % 长度
```

```typescript
const arr = ['a', 'b', 'c', 'd', 'e'];
const n = arr.length;

// 访问下一个（循环）
const next = (i: number) => (i + 1) % n;
console.log(arr[next(4)]); // 'a'，回到开头

// 访问上一个（循环）
const prev = (i: number) => (i - 1 + n) % n;
console.log(arr[prev(0)]); // 'e'，绕到末尾
```

---

## 2. 循环队列

```typescript
class CircularQueue<T> {
  private data: (T | null)[];
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;

  constructor(capacity: number) {
    this.data = new Array(capacity).fill(null);
  }

  enqueue(value: T): boolean {
    if (this.isFull()) return false;
    this.data[this.tail] = value;
    this.tail = (this.tail + 1) % this.data.length;
    this.size++;
    return true;
  }

  dequeue(): T | null {
    if (this.isEmpty()) return null;
    const value = this.data[this.head];
    this.data[this.head] = null;
    this.head = (this.head + 1) % this.data.length;
    this.size--;
    return value;
  }

  front(): T | null {
    return this.isEmpty() ? null : this.data[this.head];
  }

  rear(): T | null {
    if (this.isEmpty()) return null;
    return this.data[(this.tail - 1 + this.data.length) % this.data.length];
  }

  isEmpty(): boolean { return this.size === 0; }
  isFull(): boolean { return this.size === this.data.length; }
  getSize(): number { return this.size; }
}
```

---

## 3. 环形缓冲区

```typescript
class RingBuffer<T> {
  private buffer: (T | null)[];
  private writeIndex: number = 0;
  private readIndex: number = 0;
  private count: number = 0;

  constructor(capacity: number) {
    this.buffer = new Array(capacity).fill(null);
  }

  write(value: T): boolean {
    if (this.isFull()) return false;
    this.buffer[this.writeIndex] = value;
    this.writeIndex = (this.writeIndex + 1) % this.buffer.length;
    this.count++;
    return true;
  }

  read(): T | null {
    if (this.isEmpty()) return null;
    const value = this.buffer[this.readIndex];
    this.buffer[this.readIndex] = null;
    this.readIndex = (this.readIndex + 1) % this.buffer.length;
    this.count--;
    return value;
  }

  isFull(): boolean { return this.count === this.buffer.length; }
  isEmpty(): boolean { return this.count === 0; }
}
```

---

## 4. 实战题目

### 4.1 约瑟夫环

```typescript
function findTheWinner(n: number, k: number): number {
  let res = 0;
  for (let i = 2; i <= n; i++) {
    res = (res + k) % i;
  }
  return res + 1;
}
```

### 4.2 轮转数组

```typescript
function rotate(nums: number[], k: number): void {
  const n = nums.length;
  k = k % n;
  const rotated = new Array(n);
  for (let i = 0; i < n; i++) {
    rotated[(i + k) % n] = nums[i];
  }
  for (let i = 0; i < n; i++) {
    nums[i] = rotated[i];
  }
}
```

---

## 5. 总结

1. 环形数组 = **数组 + 取模**
2. 循环队列用 `head` 和 `tail` 两个指针
3. 避免浪费空间可以用 `count` 区分空和满

---

## 参考资料

- [Cycle Sort](https://en.wikipedia.org/wiki/Cycle_sort)
