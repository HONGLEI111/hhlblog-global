---
title: 'Merge Two Sorted Linked Lists: Two Pointers and a Dummy Node'
published: 2026-08-10
description: Merge two ascending linked lists into a single ascending linked list. Use two pointers to compare node values one by one, and a dummy head node to handle edge cases uniformly. Includes implementations in C, C++, and JavaScript.
image: ''
tags: [Linked List, Two Pointers, Merge, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Problem Description

Merge two **ascending** linked lists `list1` and `list2` into a new **ascending** linked list, and return the head node of the merged linked list. The new linked list is formed by concatenating all the nodes of the two input linked lists.

```
Input: list1 = 1→2→4, list2 = 1→3→4
Output: 1→1→2→3→4→4
```

## Solution Approach

### Core Idea: Two Pointers Comparing One by One

Imagine you have two stacks of playing cards sorted from smallest to largest, and you want to merge them into one stack. Each time, you only need to look at the top card of each stack and take the smaller one and put it into the result.

For linked lists, this process of "compare → take the smaller one → advance the pointer" can be perfectly implemented with two pointers.

### The Role of the Dummy Node

Who is the first node of the merged linked list? Is it the head of `list1` or the head of `list2`? This judgment would make the code verbose. Introduce a **dummy head node (dummy)**, append all nodes uniformly after the dummy, and finally return `dummy.next`.

### Algorithm Steps

1. Create a dummy node and a tail pointer `tail`
2. Traverse both linked lists simultaneously, comparing the current node values
3. Attach the smaller node after tail, and advance the corresponding pointer
4. When either linked list is fully traversed, directly attach the remaining linked list to the tail
5. Return `dummy.next`

## Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdio.h>
#include <stdlib.h>

typedef struct ListNode {
    int val;
    struct ListNode *next;
} ListNode;

ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
    // Create a dummy virtual head node
    ListNode dummy;
    dummy.next = NULL;
    ListNode* tail = &dummy;

    // Traverse both linked lists with two pointers
    while (list1 && list2) {
        if (list1->val <= list2->val) {
            tail->next = list1;
            list1 = list1->next;
        } else {
            tail->next = list2;
            list2 = list2->next;
        }
        tail = tail->next;
    }

    // Attach the remaining linked list to the tail
    tail->next = list1 ? list1 : list2;

    return dummy.next;
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
    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
        // Create a dummy virtual head node
        ListNode dummy(0);
        ListNode* tail = &dummy;

        // Traverse both linked lists with two pointers
        while (list1 && list2) {
            if (list1->val <= list2->val) {
                tail->next = list1;
                list1 = list1->next;
            } else {
                tail->next = list2;
                list2 = list2->next;
            }
            tail = tail->next;
        }

        // Attach the remaining linked list to the tail
        tail->next = list1 ? list1 : list2;

        return dummy.next;
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

function mergeTwoLists(list1, list2) {
    // Create a dummy virtual head node
    const dummy = new ListNode(0);
    let tail = dummy;

    // Traverse both linked lists with two pointers
    while (list1 && list2) {
        if (list1.val <= list2.val) {
            tail.next = list1;
            list1 = list1.next;
        } else {
            tail.next = list2;
            list2 = list2.next;
        }
        tail = tail.next;
    }

    // Attach the remaining linked list to the tail
    tail.next = list1 ? list1 : list2;

    return dummy.next;
}
```
:::

## Illustrated Process

```
Initial state:
list1:  1 → 2 → 4
list2:  1 → 3 → 4
dummy: [ ] → ?

Step 1: Compare 1 and 1 → take 1 from list1
dummy → 1(list1)  tail=1

Step 2: Compare 2 and 1 → take 1 from list2
dummy → 1 → 1(list2)  tail=1(list2)

Step 3: Compare 2 and 3 → take 2 from list1
dummy → 1 → 1 → 2(list1)  tail=2

Step 4: Compare 4 and 3 → take 3 from list2
dummy → 1 → 1 → 2 → 3(list2)  tail=3

Step 5: Compare 4 and 4 → take 4 from list1
dummy → 1 → 1 → 2 → 3 → 4(list1)  tail=4

Step 6: list1 is empty, append the remaining part of list2
dummy → 1 → 1 → 2 → 3 → 4 → 4(list2)

Result: 1→1→2→3→4→4
```

## Complexity Analysis

| Dimension | Analysis |
|------|------|
| Time Complexity | **O(m + n)** — Each linked list is traversed once |
| Space Complexity | **O(1)** — Only two extra pointers, dummy and tail, are used, merging in place |

## Key Points

1. **The clever use of the Dummy node**: It avoids the special judgment of "who is the head node" and allows all nodes to be handled uniformly
2. **Tail pointer tail**: Always points to the last node of the result linked list, making it convenient to append `O(1)`
3. **Directly concatenating the remaining linked list**: After the loop ends, the untraversed linked list is itself ordered, so it can be attached directly

## Extended Thinking

- If **deduplication** is required (keeping only one copy of equal elements), how should it be modified?
- If it is required to **not allocate new nodes** but return a **completely new linked list** (deep-copying nodes), how should it be handled?

Related Articles:
- [Merge K Sorted Linked Lists](/technology/linked-list-merge-k-sorted/) — Extending from 2 to K
- [Decomposition of Linked Lists](/technology/linked-list-partition/) — Also the idea of "split and recombine"