---
title: 'Heaps: The Ultimate Weapon for TopK Problems'
published: 2026-04-26
description: Master the principles and TypeScript implementation of max-heaps and min-heaps to solve high-frequency problems like TopK, merging K sorted lists, and finding the median in a data stream.
image: ''
tags: [Heap, TypeScript, Data Structures]
category: Algorithms
draft: false
---
## Overview

A heap is a complete binary tree that satisfies a specific ordering constraint, usually implemented with an array. It excels at the problem of dynamically maintaining the maximum or minimum value in a set of data.

Common heaps fall into two categories:

- Min-heap: each parent node is less than or equal to its children, and the top of the heap is the minimum value;
- Max-heap: each parent node is greater than or equal to its children, and the top of the heap is the maximum value.

Heaps are an important foundation for TopK, priority queues, task scheduling, merging sorted streams, and shortest path algorithms.

> Prerequisites
> - **Complete binary tree**: the structural basis of a heap
> - **Array index relationships**: parent and child nodes can be computed from indices
> - **Priority queue**: the most common engineering interface for a heap

---

## Problem Definition

If we need to repeatedly extract the current minimum or maximum element, a plain array has two obvious problems:

| Approach | Insert | Get extremum | Problem |
| --- | --- | --- | --- |
| Unsorted array | O(1) | O(n) | Must scan every time |
| Sorted array | O(n) | O(1) | Insertion requires shifting elements |
| Heap | O(log n) | O(log n) | Both insertion and deletion are stable |

A heap sacrifices full ordering and only guarantees that the top of the heap is the global extremum, which allows it to achieve a better balance in dynamic scenarios.

---

## Core Principle: Step-by-Step Illustration

A heap is a complete binary tree that can be stored compactly in an array:

 ```text
        1
      /   \
     3     5
    / \   /
   7   9 8

数组: [1, 3, 5, 7, 9, 8]
```

Array index relationships:

 ```text
parent(i) = Math.floor((i - 1) / 2)
left(i)   = 2 * i + 1
right(i)  = 2 * i + 2
```

### Sift Up

When inserting a new element, first place it at the end of the array, then repeatedly compare it with its parent. If it is smaller than its parent, swap positions.

### Sift Down

When deleting the top of the heap, place the last element at the top, then repeatedly swap it with the smaller child until the heap property is restored.

---

## Detailed Algorithm Steps

Min-heap insertion:

1. Append the element to the end of the array;
2. Set the current index to the new element's position;
3. If the current element is smaller than its parent, swap;
4. Continue comparing upward until reaching the root or until the parent is smaller.

Min-heap pop:

1. Save the top of the heap as the return value;
2. Replace the top with the last element;
3. Starting from the root, compare with the smaller of the left and right children;
4. If the current node is larger, swap and continue sifting down;
5. After restoring the heap property, return the original top.

---

## TypeScript Implementation

 ```typescript
class MinHeap<T> {
  private readonly data: T[] = [];

  constructor(private readonly compare: (a: T, b: T) => number) {}

  get size(): number {
    return this.data.length;
  }

  peek(): T | undefined {
    return this.data[0];
  }

  push(value: T): void {
    this.data.push(value);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    if (this.data.length === 1) return this.data.pop();

    const root = this.data[0];
    this.data[0] = this.data.pop()!;
    this.sinkDown(0);
    return root;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.data[index], this.data[parent]) >= 0) break;

      [this.data[index], this.data[parent]] = [this.data[parent], this.data[index]];
      index = parent;
    }
  }

  private sinkDown(index: number): void {
    while (true) {
      const left = index * 2 + 1;
      const right = index * 2 + 2;
      let smallest = index;

      if (left < this.data.length && this.compare(this.data[left], this.data[smallest]) < 0) {
        smallest = left;
      }

      if (right < this.data.length && this.compare(this.data[right], this.data[smallest]) < 0) {
        smallest = right;
      }

      if (smallest === index) break;

      [this.data[index], this.data[smallest]] = [this.data[smallest], this.data[index]];
      index = smallest;
    }
  }
}
```

### TopK Example

 ```typescript
function topK(nums: number[], k: number): number[] {
  const heap = new MinHeap<number>((a, b) => a - b);

  for (const num of nums) {
    heap.push(num);

    if (heap.size > k) {
      heap.pop();
    }
  }

  const result: number[] = [];
  while (heap.size > 0) {
    result.push(heap.pop()!);
  }

  return result;
}
```

Here a min-heap is used to keep the largest k numbers, and the top of the heap is always the smallest candidate in the current TopK.

---

## Engineering Optimization: Priority Queue Interface

Many business scenarios do not directly care about the "heap" but about "the task with the highest priority executes first." In this case, the heap can be encapsulated as a priority queue:

 ```typescript
const queue = new MinHeap<{ priority: number; task: string }>(
  (a, b) => a.priority - b.priority,
);

queue.push({ priority: 10, task: 'low' });
queue.push({ priority: 1, task: 'high' });
console.log(queue.pop()?.task); // high
```

Using a comparison function as a constructor parameter allows the same heap implementation to support numbers, objects, and custom priorities.

---

## Applications and Limitations

### Typical Applications

- TopK problems;
- Merging K sorted arrays or linked lists;
- Median of a data stream;
- Dijkstra's shortest path;
- Task scheduling and priority queues.

### Limitations

- A heap only guarantees that the top is optimal, not that the whole structure is ordered;
- Finding an arbitrary element is still O(n);
- Deleting a non-top element requires additional index support;
- The JavaScript standard library has no built-in heap, so you need to implement one yourself or bring in a library.

---

## Summary

 ```mermaid
graph LR
    A[Array representation of a complete binary tree] --> B[Sift up to maintain heap order]
    B --> C[Sift down to maintain heap order]
    C --> D[Priority queue interface]
```

- A heap is a complete binary tree represented as an array.
- In a min-heap the top is the minimum value, and in a max-heap the top is the maximum value.
- Insertion relies on sifting up, and deleting the top relies on sifting down.
- A heap is suitable for dynamically maintaining extrema, not for full sorting.
- TopK and priority queues are the most common application scenarios for heaps.