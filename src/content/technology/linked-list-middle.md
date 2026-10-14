---
title: 'Finding the Middle of a Singly Linked List: The Classic Fast and Slow Pointer Technique'
published: 2026-08-10
description: Use the fast and slow pointer technique to find the middle node of a singly linked list in one pass. The slow pointer moves one step at a time while the fast pointer moves two; when fast reaches the end, slow is exactly at the midpoint. Includes implementations in C, C++, and JavaScript.
image: ''
tags: [Linked List, Fast and Slow Pointers, Two Pointers, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Problem Description

Given the head node `head` of a singly linked list, return the **middle node** of the linked list. If there are two middle nodes (the linked list length is even), return the **second** middle node.

```
输入：head = 1→2→3→4→5
输出：3→4→5
解释：节点 3 是中间节点

输入：head = 1→2→3→4→5→6
输出：4→5→6
解释：有两个中间节点（3 和 4），返回第二个即节点 4
```

## Solution Approach

### Fast and Slow Pointer Method

Imagine two people running, where A's speed is twice that of B. When A finishes the entire course, B has run exactly half the distance.

Mapped to a linked list:
- `slow` moves **one step** at a time
- `fast` moves **two steps** at a time
- When `fast` reaches the end of the linked list (`null`) or cannot move two steps, `slow` is exactly at the middle position

### Why exactly in the middle?

Let the linked list length be n, slow has walked s steps, fast has walked 2s steps.
- When fast reaches the end (the nth node or beyond), 2s ≈ n, so s ≈ n/2
- slow has walked exactly n/2 steps, located at the middle position

### The "second middle node" for even lengths

The problem requires returning the second middle node. The fast and slow pointers naturally satisfy this requirement:
- When n=6, slow reaches the 4th node (after 3 steps), which is exactly the second middle node ✓

### Algorithm Steps

1. Initialize `slow = fast = head`
2. Loop condition: `while (fast && fast->next)`
3. Each round: slow moves one step, fast moves two steps
4. After the loop ends, return slow

> **Why is the loop condition `fast && fast->next`?**
> Because fast needs to move two steps each time, we need to ensure that both the current node and the next node are not null. When the fast pointer cannot move two steps, the slow pointer has already reached the midpoint.

## Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdio.h>
#include <stdlib.h>

typedef struct ListNode {
    int val;
    struct ListNode *next;
} ListNode;

ListNode* middleNode(ListNode* head) {
    ListNode *slow = head;
    ListNode *fast = head;

    // fast 每次走两步，slow 每次走一步
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }

    // fast 到末尾时，slow 恰好在中点
    return slow;
}
```

```cpp title="C++"
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

class Solution {
public:
    ListNode* middleNode(ListNode* head) {
        ListNode *slow = head;
        ListNode *fast = head;

        // fast 每次走两步，slow 每次走一步
        while (fast && fast->next) {
            slow = slow->next;
            fast = fast->next->next;
        }

        // fast 到末尾时，slow 恰好在中点
        return slow;
    }
};
```

```js title="JavaScript"
class ListNode {
    constructor(val, next) {
        this.val = (val === undefined ? 0 : val);
        this.next = (next === undefined ? null : next);
    }
}

function middleNode(head) {
    let slow = head;
    let fast = head;

    // fast 每次走两步，slow 每次走一步
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
    }

    // fast 到末尾时，slow 恰好在中点
    return slow;
}
```
:::

## Illustrated Process

### Odd length: n = 5

```
初始：     slow            slow              slow
           fast            fast              fast
           ↓               ↓                 ↓
           1 → 2 → 3 → 4 → 5
           ↑               ↑                 ↑

Step 0:    slow=1, fast=1
Step 1:    slow=2, fast=3
Step 2:    slow=3, fast=5
Step 3:    fast.next==null → 退出循环
           返回 slow=3（中点）✓
```

### Even length: n = 6

```
初始：     slow            slow              slow
           fast            fast              fast
           ↓               ↓                 ↓
           1 → 2 → 3 → 4 → 5 → 6 → null
           ↑               ↑             ↑

Step 0:    slow=1, fast=1
Step 1:    slow=2, fast=3
Step 2:    slow=3, fast=5
Step 3:    slow=4, fast=null → 退出循环
           返回 slow=4（第二个中间节点）✓
```

## Complexity Analysis

| Dimension | Analysis |
|------|------|
| Time Complexity | **O(n)** — Traverses the linked list only once |
| Space Complexity | **O(1)** — Only two pointers are used |

## Fast and Slow Pointer Pattern Summary

Fast and slow pointers are one of the most commonly used techniques in linked list problems. The core pattern:

```text
while (fast && fast->next) {
    slow = slow->next;       // 慢指针走一步
    fast = fast->next->next; // 快指针走两步
}
// 此时 slow 指向中点
```

This pattern is also used to solve:
- **Cycle detection** (Floyd's cycle-finding algorithm)
- **Finding the start of a cycle**
- **Palindrome linked list check** (find the midpoint, then reverse the second half)

## Key Points

1. **Loop condition `fast && fast->next`**: Ensures the fast pointer can move two steps each time without null pointer errors
2. **Even length returns the second midpoint**: This is the natural result of fast and slow pointers, requiring no extra handling
3. **Single traversal O(n)**: Better than the two-pass method of "first find the length, then walk n/2 steps"

Related articles:
- [Finding the Kth node from the end](/technology/linked-list-kth-from-end/) — Two pointers with the "position difference" pattern
- [Detecting a cycle and finding its start](/technology/linked-list-cycle/) — Another classic application of fast and slow pointers