---
title: 链表：从节点到 LRU 缓存的 TypeScript 实现
published: 2026-04-26
description: '深入理解链表的增删改查、反转技巧、以及 LFU/LRU 缓存的 TypeScript 实现，含完整代码。'
image: ''
tags: [链表, TypeScript, 数据结构]
category: '算法'
draft: false
lang: ''
---

## 1. 链表节点定义

```typescript
class ListNode<T> {
  val: T;
  next: ListNode<T> | null;

  constructor(val: T, next: ListNode<T> | null = null) {
    this.val = val;
    this.next = next;
  }
}
```

**数组 vs 链表**：

| 操作 | 数组 | 链表 |
|------|------|------|
| 随机访问 | O(1) | O(n) |
| 头部插入 | O(n) | O(1) |
| 头部删除 | O(n) | O(1) |
| 尾部追加 | O(1) | O(n) |

---

## 2. 基本操作

### 2.1 遍历

```typescript
function traverse<T>(head: ListNode<T> | null): void {
  let cur = head;
  while (cur !== null) {
    console.log(cur.val);
    cur = cur.next;
  }
}
```

### 2.2 追加节点

```typescript
function append<T>(head: ListNode<T> | null, val: T): ListNode<T> {
  const newNode = new ListNode(val);
  if (head === null) return newNode;
  let cur = head;
  while (cur.next !== null) {
    cur = cur.next;
  }
  cur.next = newNode;
  return head;
}
```

### 2.3 删除节点

```typescript
function remove<T>(head: ListNode<T> | null, val: T): ListNode<T> | null {
  if (head === null) return null;
  if (head.val === val) return head.next;

  let cur: ListNode<T> | null = head;
  while (cur !== null && cur.next !== null) {
    if (cur.next.val === val) {
      cur.next = cur.next.next;
      break;
    }
    cur = cur.next;
  }

  return head;
}
```

---

## 3. 经典操作

### 3.1 反转链表（迭代）

```typescript
function reverseList<T>(head: ListNode<T> | null): ListNode<T> | null {
  let prev: ListNode<T> | null = null;
  let cur = head;

  while (cur !== null) {
    const next = cur.next;
    cur.next = prev;
    prev = cur;
    cur = next;
  }

  return prev;
}
```

### 3.2 反转链表（递归）

```typescript
function reverseListRecursive<T>(head: ListNode<T> | null): ListNode<T> | null {
  if (head === null || head.next === null) return head;
  const newHead = reverseListRecursive(head.next);
  head.next.next = head;
  head.next = null;
  return newHead;
}
```

### 3.3 反转前 N 个节点

```typescript
let successor: ListNode<unknown> | null = null;

function reverseN<T>(head: ListNode<T> | null, n: number): ListNode<T> | null {
  if (n === 1) {
    successor = head!.next as ListNode<unknown> | null;
    return head;
  }
  const newHead = reverseN<T>(head!.next, n - 1);
  head!.next!.next = head;
  head!.next = successor as ListNode<T> | null;
  return newHead;
}
```

### 3.4 K 个一组反转

```typescript
function reverseKGroup<T>(head: ListNode<T> | null, k: number): ListNode<T> | null {
  if (head === null) return null;

  let a = head, b: ListNode<T> | null = head;

  for (let i = 0; i < k; i++) {
    if (b === null) return head;
    b = b.next;
  }

  const newHead = reverseRange(a, b);
  a.next = reverseKGroup(b!, k);
  return newHead;
}

function reverseRange<T>(a: ListNode<T>, b: ListNode<T> | null): ListNode<T> {
  let prev: ListNode<T> | null = null;
  let cur: ListNode<T> | null = a;
  while (cur !== b) {
    const next = cur!.next;
    cur!.next = prev;
    prev = cur;
    cur = next;
  }
  return prev!;
}
```

---

## 4. 双向链表

```typescript
class DoublyListNode<T> {
  val: T;
  next: DoublyListNode<T> | null;
  prev: DoublyListNode<T> | null;

  constructor(val: T) {
    this.val = val;
    this.next = null;
    this.prev = null;
  }
}
```

---

## 5. 实战：LRU 缓存

```typescript
class LRUCache {
  private capacity: number;
  private cache: Map<number, number>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: number): number {
    if (!this.cache.has(key)) return -1;
    const value = this.cache.get(key)!;
    // 移到末尾（最近使用）
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key: number, value: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Map 的迭代顺序是插入顺序，最先插入的就是最久未使用
      const lruKey = this.cache.keys().next().value;
      this.cache.delete(lruKey);
    }
    this.cache.set(key, value);
  }
}
```

---

## 6. 总结

1. **链表反转** = 三指针（prev, cur, next）
2. **K 个一组反转** = 反转区间 + 递归
3. JavaScript 中 Map 天然有序，适合做 LRU
4. 链表题的核心是 **画图 + 跟踪指针**

---

## 参考资料

- [LeetCode — Linked List](https://leetcode.cn/tag/linked-list/)
