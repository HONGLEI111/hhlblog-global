---
title: 'Finding the Kth Node from the End of a Singly Linked List: Two-Pointer Gap Method'
published: 2026-08-10
description: 'Find the Kth node from the end of a singly linked list in just one pass. Use the two-pointer technique: fast moves K steps ahead, then slow and fast advance together, so when fast reaches the end, slow is exactly at the target position. Includes implementations in C, C++, and JavaScript.'
image: ''
tags: [Linked List, Two Pointers, Sliding Window, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Problem Description

Given the head node `head` of a singly linked list and a positive integer `k`, return the **`k`th from the end** node in the linked list.

```
Input: head = 1→2→3→4→5, k = 2
Output: 4→5
Explanation: The 2nd node from the end is 4
```

## Solution Approach

### The Problem with the Brute Force Method

The most straightforward idea is to first traverse the list to find its length `n`, then walk `n - k` steps from the beginning. But this requires **two traversals**.

### Two-Pointer Gap Method (Single Traversal)

Imagine two people racing on a straight road: A runs K meters ahead first, then B starts running. When A reaches the finish line, B is exactly K meters from the finish line—which is the "Kth from the end" position.

Applied to a linked list:
- The `fast` pointer moves `k` steps first
- Then `slow` and `fast` advance in sync (each moving one step at a time)
- When `fast` reaches `null` (the end), `slow` points exactly to the `k`th from the end node

### Algorithm Steps

1. The fast pointer moves k steps first
2. If fast becomes null while moving k steps → k exceeds the list length, return null
3. slow and fast advance in sync until fast points to null
4. Return slow (at this point slow points to the kth from the end node)

### Key Detail: Where Should fast Stop?

Assume the list length is n, and the kth from the end node is the `n - k`th node from the start (1-indexed).

- fast moves k steps first, reaching the (k+1)th node
- slow starts from the 1st node
- When fast reaches the (n+1)th position (null), slow advances in sync to the `(n+1) - k = n - k + 1`th node
- This is exactly the kth from the end ✓

## Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdio.h>
#include <stdlib.h>

typedef struct ListNode {
    int val;
    struct ListNode *next;
} ListNode;

ListNode* findKthFromEnd(ListNode* head, int k) {
    ListNode *fast = head;
    ListNode *slow = head;

    // fast moves k steps first
    for (int i = 0; i < k; i++) {
        // k exceeds the linked list length
        if (!fast) return NULL;
        fast = fast->next;
    }

    // slow and fast advance in sync
    while (fast) {
        slow = slow->next;
        fast = fast->next;
    }

    // when fast reaches null, slow points to the k-th node from the end
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
    ListNode* findKthFromEnd(ListNode* head, int k) {
        ListNode *fast = head;
        ListNode *slow = head;

        // fast moves k steps first
        for (int i = 0; i < k; i++) {
            // k exceeds the linked list length
            if (!fast) return nullptr;
            fast = fast->next;
        }

        // slow and fast advance in sync
        while (fast) {
            slow = slow->next;
            fast = fast->next;
        }

        // when fast reaches null, slow points to the k-th node from the end
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

function findKthFromEnd(head, k) {
    let fast = head;
    let slow = head;

    // fast moves k steps first
    for (let i = 0; i < k; i++) {
        // k exceeds the linked list length
        if (!fast) return null;
        fast = fast.next;
    }

    // slow and fast advance in sync
    while (fast) {
        slow = slow.next;
        fast = fast.next;
    }

    // when fast reaches null, slow points to the k-th node from the end
    return slow;
}
```
:::

## Illustrated Walkthrough

```
Input: head = 1→2→3→4→5, k = 2

Initial: fast and slow are both at the head node
        fast
        slow
        ↓
        1 → 2 → 3 → 4 → 5

Step 1: fast moves k=2 steps first
                     fast
                     ↓
        1 → 2 → 3 → 4 → 5
        ↑
        slow

Step 2: slow and fast move in sync
                     fast
                     ↓
        1 → 2 → 3 → 4 → 5 → null
                  ↑
                  slow

When fast == null, slow points to node 4 (the 2nd node from the end)
```

## Complexity Analysis

| Dimension | Analysis |
|------|------|
| Time Complexity | **O(n)** — only one traversal of the list |
| Space Complexity | **O(1)** — only two pointers used |

## Key Takeaways

1. **The gap concept**: fast and slow always maintain a gap of k steps—this is the core of the two-pointer technique
2. **Boundary handling**: while fast moves k steps first, if it becomes null midway, it means k > n, and null should be returned
3. **Single traversal**: compared to the two-traversal approach of "find length first, then walk n-k steps," two pointers need only one

## Extended Thinking

- If you need to **delete** the kth from the end node (LeetCode 19), how can you use this problem's approach to find the (k+1)th from the end node?
- If the list is **doubly linked**, is there a more optimal solution?

Related articles:
- [Finding the Middle of a Linked List](/technology/linked-list-middle/) — also two pointers, but here it's a "speed difference" rather than a "position difference"