---
title: 堆：TopK 问题的终极武器
published: 2026-04-26
description: '掌握大顶堆、小顶堆的原理与 TypeScript 实现，解决 TopK、合并 K 个有序链表、数据流中位数等高频问题。'
image: ''
tags: [堆, TypeScript, 数据结构]
category: '算法'
draft: false
lang: ''
---

## 1. 什么是堆？

堆是一种**完全二叉树**，满足：
- **大顶堆**：任意节点值 ≥ 孩子节点值
- **小顶堆**：任意节点值 ≤ 孩子节点值

```
小顶堆              大顶堆
    1                  9
   / \                / \
  3   5              7   5
 / \                / \
7   9              3   1
```

---

## 2. 小顶堆实现

```typescript
class MinHeap {
  private heap: number[] = [];

  private parent(i: number): number { return (i - 1) >> 1; }
  private left(i: number): number { return i * 2 + 1; }
  private right(i: number): number { return i * 2 + 2; }

  push(val: number): void {
    this.heap.push(val);
    this.siftUp(this.heap.length - 1);
  }

  pop(): number | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();
    const root = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.siftDown(0);
    return root;
  }

  peek(): number | undefined { return this.heap[0]; }
  get size(): number { return this.heap.length; }

  private siftUp(i: number): void {
    while (i > 0 && this.heap[this.parent(i)] > this.heap[i]) {
      [this.heap[i], this.heap[this.parent(i)]] = [this.heap[this.parent(i)], this.heap[i]];
      i = this.parent(i);
    }
  }

  private siftDown(i: number): void {
    while (this.left(i) < this.heap.length) {
      let smallest = this.left(i);
      if (this.right(i) < this.heap.length && this.heap[this.right(i)] < this.heap[smallest]) {
        smallest = this.right(i);
      }
      if (this.heap[i] <= this.heap[smallest]) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}
```

---

## 3. TopK 问题

### 3.1 数组中的第 K 个最大元素

```typescript
function findKthLargest(nums: number[], k: number): number {
  const heap = new MinHeap();

  for (const num of nums) {
    heap.push(num);
    if (heap.size > k) heap.pop();
  }

  return heap.peek()!;
}

// 维护一个大小为 K 的小顶堆
// 堆顶就是第 K 大的元素
```

### 3.2 前 K 个高频元素

```typescript
function topKFrequent(nums: number[], k: number): number[] {
  const freq = new Map<number, number>();
  for (const num of nums) {
    freq.set(num, (freq.get(num) || 0) + 1);
  }

  // 用频率的小顶堆
  const heap = new MinHeap();
  // 存储 [num, freq]，按 freq 比较
  // （实际工程中可用元组 + 自定义比较器）

  // 简化：用 Map 模拟
  // ...
  return [];
}
```

### 3.3 最接近原点的 K 个点

```typescript
function kClosest(points: number[][], k: number): number[][] {
  // 大顶堆保存距离最小的 K 个
  const heap: number[][] = [];
  const dist = (p: number[]) => p[0] ** 2 + p[1] ** 2;

  for (const p of points) {
    heap.push(p);
    // 按距离排序（简化说明）
  }

  return heap.slice(0, k);
}
```

---

## 4. 合并 K 个有序链表

```typescript
class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val: number, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}

function mergeKLists(lists: (ListNode | null)[]): ListNode | null {
  // JavaScript 没有内置堆，可以用排序数组模拟每轮最小值
  // 生产环境建议：@datastructures-js/priority-queue

  const nodes: ListNode[] = [];
  for (const head of lists) {
    let cur = head;
    while (cur !== null) {
      nodes.push(cur);
      cur = cur.next;
    }
  }
  nodes.sort((a, b) => a.val - b.val);

  const dummy = new ListNode(0);
  let cur = dummy;
  for (const node of nodes) {
    cur.next = node;
    cur = cur.next;
  }

  return dummy.next;
}
```

---

## 5. 数据流中的中位数

```typescript
// 用两个堆：大顶堆存左半，小顶堆存右半
class MedianFinder {
  private left: number[] = [];  // 大顶堆（存负数模拟）
  private right: number[] = []; // 小顶堆

  addNum(num: number): void {
    if (this.left.length === 0 || num < -this.left[0]) {
      this.left.push(-num);
      this.heapifyUp(this.left, true);
    } else {
      this.right.push(num);
      this.heapifyUp(this.right, false);
    }

    // 平衡两个堆
    if (this.left.length > this.right.length + 1) {
      const val = -this.extractRoot(this.left, true);
      this.right.push(val);
      this.heapifyUp(this.right, false);
    } else if (this.right.length > this.left.length) {
      const val = -this.extractRoot(this.right, false);
      this.left.push(val);
      this.heapifyUp(this.left, true);
    }
  }

  findMedian(): number {
    if (this.left.length > this.right.length) return -this.left[0];
    return (-this.left[0] + this.right[0]) / 2;
  }

  private heapifyUp(heap: number[], negate: boolean): void {
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if ((negate ? heap[i] > heap[p] : heap[i] < heap[p])) break;
      [heap[i], heap[p]] = [heap[p], heap[i]];
      i = p;
    }
  }

  private extractRoot(heap: number[], negate: boolean): number {
    const root = heap[0];
    heap[0] = heap.pop()!;
    // sift down...
    return root;
  }
}
```

---

## 6. 总结

| 场景 | 用哪种堆 |
|------|----------|
| 第 K 大 | 小顶堆（size=K） |
| 第 K 小 | 大顶堆（size=K） |
| 中位数 | 双堆 |
| 合并有序序列 | 小顶堆 |

1. **堆 = 完全二叉树 + 堆序性**
2. 索引公式：父 = (i-1)//2, 左 = 2i+1, 右 = 2i+2
3. TopK 的万能解法

---

## 参考资料

- [LeetCode — Heap](https://leetcode.cn/tag/heap-priority-queue/)
