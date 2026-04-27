---
title: 设计题：从设计模式到高频数据结构设计
published: 2026-04-26
description: '掌握 LRU、LFU、最小栈、设计哈希集合等高频数据结构设计题的 TypeScript 实现，理解设计题的核心考点。'
image: ''
tags: [设计, TypeScript, 数据结构]
category: '算法'
draft: false
lang: ''
---

## 1. 设计题的核心考点

| 考点 | 说明 |
|------|------|
| 数据结构选择 | 选对基础结构 |
| 时间复杂度 | 每个操作的要求 |
| 空间复杂度 | 额外的存储 |
| 边界情况 | 空、满、重复 |

---

## 2. 最小栈

获取最小值的栈，所有操作 O(1)。

```typescript
class MinStack {
  private stack: number[] = [];
  private minStack: number[] = [];

  push(val: number): void {
    this.stack.push(val);
    const min = this.minStack.length === 0
      ? val
      : Math.min(val, this.minStack[this.minStack.length - 1]);
    this.minStack.push(min);
  }

  pop(): void {
    this.stack.pop();
    this.minStack.pop();
  }

  top(): number {
    return this.stack[this.stack.length - 1];
  }

  getMin(): number {
    return this.minStack[this.minStack.length - 1];
  }
}
```

---

## 3. 设计哈希集合

```typescript
class MyHashSet {
  private buckets: number[][];
  private readonly SIZE = 769; // 质数，减少冲突

  constructor() {
    this.buckets = Array.from({ length: this.SIZE }, () => []);
  }

  private hash(key: number): number {
    return key % this.SIZE;
  }

  add(key: number): void {
    const bucket = this.buckets[this.hash(key)];
    if (!bucket.includes(key)) bucket.push(key);
  }

  remove(key: number): void {
    const bucket = this.buckets[this.hash(key)];
    const idx = bucket.indexOf(key);
    if (idx !== -1) bucket.splice(idx, 1);
  }

  contains(key: number): boolean {
    return this.buckets[this.hash(key)].includes(key);
  }
}
```

---

## 4. LRU 缓存（完整双向链表实现）

```typescript
class DLinkedNode {
  key: number;
  value: number;
  prev: DLinkedNode | null = null;
  next: DLinkedNode | null = null;

  constructor(key: number, value: number) {
    this.key = key;
    this.value = value;
  }
}

class LRUCache {
  private capacity: number;
  private cache: Map<number, DLinkedNode>;
  private head: DLinkedNode;
  private tail: DLinkedNode;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
    this.head = new DLinkedNode(0, 0);
    this.tail = new DLinkedNode(0, 0);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: number): number {
    if (!this.cache.has(key)) return -1;
    const node = this.cache.get(key)!;
    this.moveToHead(node);
    return node.value;
  }

  put(key: number, value: number): void {
    if (this.cache.has(key)) {
      const node = this.cache.get(key)!;
      node.value = value;
      this.moveToHead(node);
      return;
    }

    const node = new DLinkedNode(key, value);
    this.cache.set(key, node);
    this.addToHead(node);

    if (this.cache.size > this.capacity) {
      const removed = this.removeTail();
      this.cache.delete(removed.key);
    }
  }

  private addToHead(node: DLinkedNode): void {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  private removeNode(node: DLinkedNode): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  private moveToHead(node: DLinkedNode): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeTail(): DLinkedNode {
    const node = this.tail.prev!;
    this.removeNode(node);
    return node;
  }
}
```

---

## 5. LFU 缓存

```typescript
interface LFUNode {
  key: number;
  value: number;
  freq: number;
}

class LFUCache {
  private capacity: number;
  private minFreq: number = 0;
  private keyToNode: Map<number, LFUNode> = new Map();
  private freqToKeys: Map<number, Set<number>> = new Map();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: number): number {
    if (!this.keyToNode.has(key)) return -1;
    this.increaseFreq(key);
    return this.keyToNode.get(key)!.value;
  }

  put(key: number, value: number): void {
    if (this.capacity === 0) return;

    if (this.keyToNode.has(key)) {
      this.keyToNode.get(key)!.value = value;
      this.increaseFreq(key);
      return;
    }

    if (this.keyToNode.size >= this.capacity) {
      const evictKey = this.freqToKeys.get(this.minFreq)!.values().next().value;
      this.freqToKeys.get(this.minFreq)!.delete(evictKey);
      this.keyToNode.delete(evictKey);
    }

    this.keyToNode.set(key, { key, value, freq: 1 });
    if (!this.freqToKeys.has(1)) this.freqToKeys.set(1, new Set());
    this.freqToKeys.get(1)!.add(key);
    this.minFreq = 1;
  }

  private increaseFreq(key: number): void {
    const node = this.keyToNode.get(key)!;
    this.freqToKeys.get(node.freq)!.delete(key);
    if (this.freqToKeys.get(node.freq)!.size === 0) {
      if (node.freq === this.minFreq) this.minFreq++;
    }
    node.freq++;
    if (!this.freqToKeys.has(node.freq)) this.freqToKeys.set(node.freq, new Set());
    this.freqToKeys.get(node.freq)!.add(key);
  }
}
```

---

## 6. 总结

1. **最小栈**：辅助栈同步记录最小值
2. **哈希集合**：链地址法处理冲突
3. **LRU**：Map（JS 简单版）/ 双向链表（标准版）
4. **LFU**：频率 map + 双向链表组

---

## 参考资料

- [LeetCode — Design](https://leetcode.cn/tag/design/)
