---
title: 'Seven Key Singly Linked List Algorithms: Two Pointers and Divide-and-Conquer'
published: 2026-08-10
description: 'A systematic guide to seven classic singly linked list algorithms: merging sorted lists, list partitioning, merging K lists, finding the Kth node from the end, midpoint search, cycle detection, and list intersection. Uses two-pointer and divide-and-conquer techniques, with implementations in C, C++, and JavaScript.'
image: ''
tags: [Linked List, Two Pointers, Divide and Conquer, Algorithms, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Overview

Singly linked lists are one of the most fundamental and most frequently tested data structures. They appear simple, but their **one-directional traversal and inability to support random access** give rise to a set of classic algorithmic techniques—two pointers, divide and conquer, and dummy head nodes. This article selects seven high-frequency singly linked list algorithms, breaks down each approach one by one, and provides implementations in three languages.

> Reading tip: This article is an overview. For the complete solution, diagrams, and code walkthrough of each algorithm, please follow the links below to the individual articles.

---

## Overview of the Seven Algorithms

| # | Algorithm | Core Technique | Time Complexity | Individual Article |
|---|------|----------|------------|----------|
| 1 | Merge Two Sorted Lists | Two pointers + dummy node | O(m+n) | [Detailed Solution](/technology/linked-list-merge-two-sorted/) |
| 2 | Partitioning a Linked List | Split with two dummy nodes | O(n) | [Detailed Solution](/technology/linked-list-partition/) |
| 3 | Merge K Sorted Lists | Min-heap / divide-and-conquer merge | O(N log k) | [Detailed Solution](/technology/linked-list-merge-k-sorted/) |
| 4 | Find the Kth Node from the End | Two pointers (k steps apart) | O(n) | [Detailed Solution](/technology/linked-list-kth-from-end/) |
| 5 | Find the Middle of a Linked List | Fast and slow pointers | O(n) | [Detailed Solution](/technology/linked-list-middle/) |
| 6 | Detect a Cycle and Find Its Start | Floyd's cycle detection + equal-speed meeting | O(n) | [Detailed Solution](/technology/linked-list-cycle/) |
| 7 | Determine Intersection and Find the Intersection Point | Two pointers alternating traversal | O(m+n) | [Detailed Solution](/technology/linked-list-intersection/) |

---

## Why These Algorithms?

These seven algorithms cover the **three most important modes of thinking** in singly linked list problems:

### 1. Two-Pointer Technique

The core of algorithms 1, 4, 5, 6, and 7 is the two-pointer technique (or fast and slow pointers). The essence of two pointers lies in using the **speed difference** or **position difference** between two pointers to extract key information in a single traversal:

- **Position difference**: fast advances k steps first → find the Kth node from the end
- **Speed difference**: fast moves two steps, slow moves one step → find the middle, detect a cycle
- **Alternating traversal**: pA finishes then moves to pB, pB finishes then moves to pA → find the intersection

### 2. Dummy Head Node

Algorithms 1, 2, and 3 all use a dummy node. It eliminates the edge cases where "the head node may be empty or modified," allowing the code to **handle all nodes uniformly** and greatly simplifying the logic.

### 3. Divide and Conquer and Heaps

Algorithm 3 demonstrates how to extend "merge two" to "merge K"—either by using divide and conquer to merge pairwise, or by using a min-heap to maintain the minimum among K pointers. This is a classic paradigm of **scaling up**.

---

## Linked List Node Definition

The singly linked list node structure used by all the following algorithms:

:::code-tabs
```c title="C"
typedef struct ListNode {
    int val;
    struct ListNode *next;
} ListNode;
```

```cpp title="C++"
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
```

```js title="JavaScript"
class ListNode {
    constructor(val, next) {
        this.val = (val === undefined ? 0 : val);
        this.next = (next === undefined ? null : next);
    }
}
```
:::

---

## Quick Navigation

Click the links below to access the detailed solutions for each algorithm, including complete problem-solving approaches, diagrams, code, and complexity analysis:

1. **[Merge Two Sorted Lists](/technology/linked-list-merge-two-sorted/)** — Two pointers compare one by one, dummy node simplifies edge cases
2. **[Partitioning a Linked List](/technology/linked-list-partition/)** — Two dummy nodes separate smaller and larger values, then concatenate
3. **[Merge K Sorted Lists](/technology/linked-list-merge-k-sorted/)** — Min-heap / divide-and-conquer merge, extending from 2 to K
4. **[Find the Kth Node from the End](/technology/linked-list-kth-from-end/)** — fast advances K steps first, then slow sets off in sync
5. **[Find the Middle of a Linked List](/technology/linked-list-middle/)** — Fast and slow pointers; when fast reaches the end, slow is exactly at the middle
6. **[Detect a Cycle and Find Its Start](/technology/linked-list-cycle/)** — Floyd's cycle detection + equal-speed return to find the entrance
7. **[Determine Intersection and Find the Intersection Point](/technology/linked-list-intersection/)** — Alternating traversal, walking each other's path to find the intersection