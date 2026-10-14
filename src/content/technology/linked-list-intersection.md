---
title: 'Detecting Intersection of Two Singly Linked Lists and Finding the Intersection Node: Two-Pointer Alternating Traversal'
published: 2026-08-10
description: Determine whether two singly linked lists intersect, and if so, find the intersection node. The two-pointer alternating traversal method works by having pA jump to the head of pB after reaching the end, and pB jump to the head of pA after reaching the end, so the two pointers eventually meet at the intersection node or both become null. Includes implementations in C, C++, and JavaScript.
image: ''
tags: [Linked List, Two Pointers, Intersection, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Problem Description

Given the head nodes `headA` and `headB` of two singly linked lists, determine whether they **intersect** (i.e., some node is shared by both linked lists). If they intersect, return the **intersection node**; otherwise, return `null`.

```
输入：headA = 4→1→8→4→5
      headB = 5→6→1→8→4→5
                    ↑
                    交点
输出：节点 8
```

The two linked lists meet at node 8, after which they share the 4→5 portion.

## Solution Approach

### Problems with the brute-force approach

- **Hash table approach**: Traverse linked list A and store all nodes in a hash table; then traverse linked list B and check whether each node is in the hash table. Space O(n).
- **Two-pointer alternating traversal approach**: Space O(1), completed in a single traversal.

### Two-pointer alternating traversal approach

Key observation: If the two linked lists have an intersection, then **the nodes after the intersection are exactly the same**. The two lists may have different lengths, but **the total path length from each respective head node to the intersection and then to the end is fixed**.

#### Core idea

Let two pointers start from A and B respectively:
- Pointer `pA`: starts from the head of A, and after reaching the end, jumps to the head of B and continues
- Pointer `pB`: starts from the head of B, and after reaching the end, jumps to the head of A and continues

If an intersection exists, the total distance traveled by both pointers is equal (both are `lenA + lenB`), and they will meet at the intersection. If no intersection exists, both pointers will eventually reach `null` at the same time.

#### Mathematical proof

Let the length of linked list A be `lenA = a + c` (a is the part unique to A, c is the shared part), and the length of linked list B be `lenB = b + c`.

| Pointer | First segment | Second segment | Total distance | Reaches intersection |
|------|--------|--------|--------|----------|
| pA | a | c + b | a + c + b | Yes |
| pB | b | c + a | b + c + a | Yes |

The total distance traveled by both pointers is `a + b + c`, so they will reach the intersection **at the same time** (or reach null at the same time).

### Algorithm steps

1. `pA = headA`, `pB = headB`
2. Loop condition: `while (pA != pB)`
3. `pA` moves one step; if `pA == null`, jump to `headB`
4. `pB` moves one step; if `pB == null`, jump to `headA`
5. When the loop ends, return `pA` (the intersection or null)

## Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdio.h>
#include <stdlib.h>

typedef struct ListNode {
    int val;
    struct ListNode *next;
} ListNode;

ListNode* getIntersectionNode(ListNode *headA, ListNode *headB) {
    if (!headA || !headB) return NULL;

    ListNode *pA = headA;
    ListNode *pB = headB;

    // 两个指针交替遍历
    while (pA != pB) {
        pA = pA ? pA->next : headB; // pA 走完A走B
        pB = pB ? pB->next : headA; // pB 走完B走A
    }

    // 相遇点：交点或 null
    return pA;
}
```

```cpp title="C++"
struct ListNode {
    int val;
    ListNode *next;
    ListNode(int x) : val(x), next(nullptr) {}
};

class Solution {
public:
    ListNode* getIntersectionNode(ListNode *headA, ListNode *headB) {
        if (!headA || !headB) return nullptr;

        ListNode *pA = headA;
        ListNode *pB = headB;

        // 两个指针交替遍历
        while (pA != pB) {
            pA = pA ? pA->next : headB; // pA 走完A走B
            pB = pB ? pB->next : headA; // pB 走完B走A
        }

        // 相遇点：交点或 nullptr
        return pA;
    }
};
```

```js title="JavaScript"
class ListNode {
    constructor(val) {
        this.val = val;
        this.next = null;
    }
}

function getIntersectionNode(headA, headB) {
    if (!headA || !headB) return null;

    let pA = headA;
    let pB = headB;

    // 两个指针交替遍历
    while (pA !== pB) {
        pA = pA ? pA.next : headB; // pA 走完A走B
        pB = pB ? pB.next : headA; // pB 走完B走A
    }

    // 相遇点：交点或 null
    return pA;
}
```
:::

## Illustrated Process

### Case with an intersection

```
链表A：  a1 → a2
                 ↘
                   c1 → c2 → c3
                 ↗
链表B：  b1 → b2 → b3
```

```
pA 路径：a1 → a2 → c1 → c2 → c3 → b1 → b2 → b3 → ★c1
pB 路径：b1 → b2 → b3 → c1 → c2 → c3 → a1 → a2 → ★c1

★ 处两指针相遇，c1 就是交点 ✓
```

### Case without an intersection

```
链表A：  1 → 2 → 3
链表B：  4 → 5
```

```
pA 路径：1 → 2 → 3 → 4 → 5 → null
pB 路径：4 → 5 → 1 → 2 → 3 → null

★ 两指针同时到达 null ✓
```

## Complexity Analysis

| Dimension | Analysis |
|------|------|
| Time complexity | **O(m + n)** — each pointer walks m + n steps |
| Space complexity | **O(1)** — only two pointers are used |

## Key Points

1. **"Walk the path you walked"**: pA finishes its own list and then walks B, while pB finishes its own list and then walks A—this design lets the two pointers eliminate the length difference and reach the intersection at the same time
2. **Reach null at the same time**: If there is no intersection, the two pointers will also reach null at the same time after traversing the same total length, and the loop ends naturally
3. **Cannot skip null midway**: Some implementations say "jump when reaching null," which is fine, because acyclic linked lists all end in null
4. **Difference from cycle detection**: This problem assumes the linked lists are acyclic. If cycles are possible, cycle detection must be done first

## Extended Thinking

- If the linked lists may contain cycles, how do we determine intersection? — This requires case-by-case discussion: both acyclic, one cyclic and one acyclic, both cyclic
- Is there a more intuitive solution? — You can first compute the length difference between the two linked lists, let the pointer of the longer list walk the "difference" steps first, and then walk in sync

Related articles:
- [Detect a cycle and find its starting point](/technology/linked-list-cycle/) — another "meeting" logic
- [Find the Kth node from the end](/technology/linked-list-kth-from-end/) — a similar idea of "eliminating the length difference"