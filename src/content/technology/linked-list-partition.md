---
title: 'Splitting a Linked List: Separating and Rejoining with Two Dummy Nodes'
published: 2026-08-10
description: Separate nodes in a linked list that are less than x from those greater than or equal to x while preserving their relative order. Use two dummy head nodes to collect each group, then concatenate them. Includes implementations in C, C++, and JavaScript.
image: ''
tags: [Linked List, Two Pointers, Partition, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Problem Description

Given a linked list and a specific value `x`, **rearrange** the linked list so that all nodes **less than `x`** appear before nodes **greater than or equal to `x`**. At the same time, preserve the **original relative order** of the nodes within each of the two parts.

```
Input: head = 1→4→3→2→5→2, x = 3
Output: 1→2→2→4→3→5
Explanation: Less than 3: 1, 2, 2 (preserve original order)
      Greater than or equal to 3: 4, 3, 5 (preserve original order)
```

## Solution Approach

### Core Idea: Two-Dummy Separation

The intuitive idea is to create two new linked lists—one holding the "small values" and one holding the "large values"—and while traversing the original linked list, assign each node to the corresponding list. After the traversal is complete, connect the tail of the small-value list to the head of the large-value list.

But directly manipulating the "head pointer of the new list" runs into the boundary problem of "who is the first node." So we use two **dummy head nodes** to manage the two chains separately.

### Algorithm Steps

1. Create two dummy head nodes `smallDummy` and `largeDummy`
2. Use tail pointers `small` and `large` to maintain the two linked lists respectively
3. Traverse the original linked list, and assign each node to the corresponding list based on how its value compares with `x`
4. After the traversal ends, connect the `large` list to the tail of the `small` list
5. **Key**: Set `large.next` to `null`, otherwise a cycle may form
6. Return `smallDummy.next`

> **Why must `large.next = null` be set?**
> The last node of the large-value list may originally point to a large-value node. If it is not disconnected, after concatenation the end of the list may point to an old node and form a cycle.

## Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdio.h>
#include <stdlib.h>

typedef struct ListNode {
    int val;
    struct ListNode *next;
} ListNode;

ListNode* partition(ListNode* head, int x) {
    // Create two dummy virtual head nodes
    ListNode smallDummy, largeDummy;
    smallDummy.next = NULL;
    largeDummy.next = NULL;
    ListNode *small = &smallDummy;
    ListNode *large = &largeDummy;

    // Traverse the original linked list and separate the nodes
    ListNode *curr = head;
    while (curr) {
        if (curr->val < x) {
            small->next = curr;
            small = small->next;
        } else {
            large->next = curr;
            large = large->next;
        }
        curr = curr->next;
    }

    // Concatenate the two linked lists
    small->next = largeDummy.next;
    // Disconnect the end of the larger-value linked list to prevent a cycle
    large->next = NULL;

    return smallDummy.next;
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
    ListNode* partition(ListNode* head, int x) {
        // Create two dummy virtual head nodes
        ListNode smallDummy(0), largeDummy(0);
        ListNode *small = &smallDummy;
        ListNode *large = &largeDummy;

        // Traverse the original linked list and separate the nodes
        ListNode *curr = head;
        while (curr) {
            if (curr->val < x) {
                small->next = curr;
                small = small->next;
            } else {
                large->next = curr;
                large = large->next;
            }
            curr = curr->next;
        }

        // Concatenate the two linked lists
        small->next = largeDummy.next;
        // Disconnect the end of the larger-value linked list to prevent a cycle
        large->next = nullptr;

        return smallDummy.next;
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

function partition(head, x) {
    // Create two dummy virtual head nodes
    const smallDummy = new ListNode(0);
    const largeDummy = new ListNode(0);
    let small = smallDummy;
    let large = largeDummy;

    // Traverse the original linked list and separate the nodes
    let curr = head;
    while (curr) {
        if (curr.val < x) {
            small.next = curr;
            small = small.next;
        } else {
            large.next = curr;
            large = large.next;
        }
        curr = curr.next;
    }

    // Concatenate the two linked lists
    small.next = largeDummy.next;
    // Disconnect the end of the larger-value linked list to prevent a cycle
    large.next = null;

    return smallDummy.next;
}
```
:::

## Illustrated Process

```
Input: head = 1→4→3→2→5→2, x = 3

Initial state:
smallDummy → ?
largeDummy → ?

Step 1: curr=1, 1<3 → put into small
smallDummy → 1
largeDummy → ?

Step 2: curr=4, 4≥3 → put into large
smallDummy → 1
largeDummy → 4

Step 3: curr=3, 3≥3 → put into large
smallDummy → 1
largeDummy → 4→3

Step 4: curr=2, 2<3 → put into small
smallDummy → 1→2
largeDummy → 4→3

Step 5: curr=5, 5≥3 → put into large
smallDummy → 1→2
largeDummy → 4→3→5

Step 6: curr=2, 2<3 → put into small
smallDummy → 1→2→2
largeDummy → 4→3→5

Concatenate and break the end of large:
Result: 1→2→2→4→3→5
```

## Complexity Analysis

| Dimension | Analysis |
|------|------|
| Time Complexity | **O(n)** — traverse the linked list once |
| Space Complexity | **O(1)** — only a few pointers are used, reorganizing in place |

## Key Points

1. **Two dummy nodes each manage one part**: maintain the small-value chain and the large-value chain separately, making the code logic clear
2. **The end of large must be disconnected**: `large->next = null` is the key step to prevent a cycle; forgetting this line in an interview will cause a serious bug
3. **Preserve relative order**: because nodes are traversed in order and appended to the tail, the internal order of the two parts naturally remains unchanged

## Extended Thinking

- If the problem did not require preserving relative order, could a more concise method be used? (Direct swapping or in-place adjustment)
- If the requirement were "nodes greater than x first, nodes less than x after," how would you modify it?

Related articles:
- [Merge Two Sorted Lists](/technology/linked-list-merge-two-sorted/) — also a "concatenation" operation