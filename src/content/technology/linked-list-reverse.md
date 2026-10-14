---
title: 'Reversing a Singly Linked List: Iterative and Recursive Approaches Explained (Whole List / First N Nodes / Range / K-Group)'
published: 2026-09-01
description: 'Master both iterative and recursive solutions for reversing a singly linked list, and apply these two approaches to four classic problems: reversing the entire list, reversing the first N nodes, reversing a range, and reversing in groups of K. Includes implementations in C, C++, and JavaScript.'
image: ''
tags: [Linked List, Reversal, Iteration, Recursion, Two Pointers, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Overview

Reversing a singly linked list is the "foundation" of linked-list algorithm problems—almost all advanced linked-list operations (palindrome checking, reverse-in-groups-of-K, partial reversal) are built on top of it.

The essence of reversal is just one sentence: **reverse the direction of every `next` pointer**.

```text
反转前：1 → 2 → 3 → 4 → null
反转后：4 → 3 → 2 → 1 → null
```

Centered on the core concept of "reversal," this article walks through four classic problems in increasing order of difficulty:

| # | Problem | Corresponding Problem | Difficulty |
|---|------|---------|------|
| 1 | Reverse the entire linked list | LeetCode 206 | Easy |
| 2 | Reverse the first N nodes | Variant of 206 | Medium |
| 3 | Reverse part of the linked list (a range) | LeetCode 92 | Medium |
| 4 | Reverse the linked list in groups of K | LeetCode 25 | Hard |

Each problem is presented with both an **iterative** and a **recursive** solution. Once you've mastered them, you'll realize: the latter three problems are really just "wrappers" around the first one.

> Prerequisites
> - **Linked list nodes**: can only move forward along `next`
> - **Pointer reconnection**: the essence of reversal is modifying references
> - **Recursion**: understanding the "post-order traversal" style of processing order

## Linked List Node Definition

All code in this article shares the following singly linked list node structure:

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

## Core Idea: Iteration vs Recursion

### Iteration: Three Pointers

The iterative solution uses three pointers `prev`, `curr`, `next`, repeating four steps each round:

```text
初始：prev = null, curr = head

null   1 → 2 → 3 → 4 → null
 ^     ^
prev  curr

每一轮：
  1. next = curr.next   // 先保存后继，防止断链
  2. curr.next = prev   // 当前节点反向指向
  3. prev = curr        // prev 前移
  4. curr = next        // curr 前移
```

The loop ends when `curr` reaches `null`, at which point `prev` points exactly to the new head node after reversal.

> Key point: Step 1, "save `next` first," must never be skipped; otherwise, once `curr.next` is modified, the original subsequent linked list can never be found again.

### Recursion: Post-Order Traversal

The essence of the recursive solution is "**reverse the rest first, then handle the current one**," which is essentially a post-order traversal of the linked list:

```text
reverseList(1→2→3→4)
  = 先递归反转后面的：reverseList(2→3→4)  →  4→3→2
    再让「2」指向「1」：head.next.next = head
    最后断开「1」的旧指向：head.next = null
```

The core is just two lines:

```text
head.next.next = head   // 让后继节点反向指向自己
head.next = null        // 断开原来的正向指向
```

The **base case** of the recursion is when `head` is null or `head.next` is null (only one node left, no reversal needed), in which case `head` is returned directly.

## Four Classic Problems

### 1. Reverse the Entire Linked List (LeetCode 206)

**Approach (iterative)**: Three pointers walk from head to tail, as described above.

**Approach (recursive)**: First reverse the sub-list starting from `head.next`, then make `head.next` point to `head`, and finally disconnect `head.next`.

```text
输入：1 → 2 → 3 → 4 → 5 → null
输出：5 → 4 → 3 → 2 → 1 → null
```

### 2. Reverse the First N Nodes

**Approach (iterative)**: Reverse only the first `n` nodes; after reversal, connect the **original head node** (now the tail of the reversed segment) to the remaining list.

```text
反转前：1 → 2 → 3 → 4 → 5 → null，n = 3
反转后：3 → 2 → 1 → 4 → 5 → null
                          └─ 剩余部分原样保留
```

**Approach (recursive)**: Almost identical to "reverse the entire list," with the only difference being that after reversal, the tail node must connect to the **`n+1`-th node**. To achieve this, a successor pointer `successor` is introduced, recording "the successor of the n-th node" when recursing to `n == 1`, and on backtracking, pointing the tail node's `next` to it.

`successor` is precisely the key bridge that allows "reverse the first N" to transition to "range reversal."

### 3. Reverse Part of the Linked List (Range [left, right], LeetCode 92)

**Approach (iterative)**: Use a **dummy head node** to locate the predecessor `pre` of `left`, then perform "head-insertion" reversal on the segment `[left, right]`—each time detach `curr.next` and insert it after `pre`, for a total of `right - left` iterations.

```text
输入：1 → 2 → 3 → 4 → 5，left = 2, right = 4
输出：1 → 4 → 3 → 2 → 5
           └─ [2,3,4] 被反转 ─┘
```

**Approach (recursive)**: Recursively reduce the problem size. When `left == 1`, range reversal degenerates to "reverse the first `right`"; otherwise, keep moving the head pointer forward, decrementing both `left` and `right` by 1 while recursing deeper, and reconnect the current head on the way back.

### 4. Reverse the Linked List in Groups of K (LeetCode 25)

**Approach (iterative)**: Use two pointers `pre` and `end` to scan; each time, first advance `end` by `k` steps to "scout ahead":

- If fewer than `k` remain, stop immediately;
- Otherwise, record the start of the current group `start` and the start of the next group `next`, **truncate** the current group, reverse it as a whole, and reconnect it to the original list.

**Approach (recursive)**: First check whether the remaining nodes number at least `k`; if not, return as-is; if so, reverse the first `k` (reusing "reverse the first N"), then recursively process the remainder and reconnect.

```text
输入：1 → 2 → 3 → 4 → 5，k = 2
输出：2 → 1 → 4 → 3 → 5
      └ 反转 ┘ └ 反转 ┘ └ 不足 k 个，原样 ┘
```
## Code Implementation

Each language contains four problems × two solutions, for a total of 8 functions, divided into sections by comments. The `successor` used by the recursive "reverse the first N" is a module-level (file-level) variable.

:::code-tabs{default="cpp"}
```c title="C"
#include <stddef.h>

typedef struct ListNode {
    int val;
    struct ListNode *next;
} ListNode;

/* ============ 1. Reverse the entire linked list ============ */

/* Iterative */
ListNode* reverseList(ListNode* head) {
    ListNode* prev = NULL;
    ListNode* curr = head;
    while (curr) {
        ListNode* next = curr->next; /* save the successor first */
        curr->next = prev;           /* reverse the current pointer */
        prev = curr;                 /* advance prev */
        curr = next;                 /* advance curr */
    }
    return prev;
}

/* Recursive */
ListNode* reverseListRecursive(ListNode* head) {
    if (head == NULL || head->next == NULL) return head;
    ListNode* last = reverseListRecursive(head->next);
    head->next->next = head; /* successor points to itself */
    head->next = NULL;       /* break the original pointer */
    return last;
}

/* ============ 2. Reverse the first N nodes ============ */

/* Iterative */
ListNode* reverseN(ListNode* head, int n) {
    ListNode* prev = NULL;
    ListNode* curr = head;
    for (int i = 0; i < n && curr; i++) {
        ListNode* next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }
    head->next = curr; /* attach the original head to the remaining part */
    return prev;
}

/* Recursive (using the successor pointer) */
static ListNode* successor = NULL;

ListNode* reverseNRecursive(ListNode* head, int n) {
    if (n == 1) {
        successor = head->next; /* record the (n+1)-th node */
        return head;
    }
    ListNode* last = reverseNRecursive(head->next, n - 1);
    head->next->next = head;
    head->next = successor; /* attach the reversed tail to the successor */
    return last;
}

/* ============ 3. Reverse part of the linked list (interval [left, right]) ============ */

/* Iterative (head insertion) */
ListNode* reverseBetween(ListNode* head, int left, int right) {
    ListNode dummy;
    dummy.next = head;
    ListNode* pre = &dummy;
    for (int i = 1; i < left; i++) pre = pre->next; /* locate the predecessor of left */

    ListNode* curr = pre->next;
    for (int i = 0; i < right - left; i++) {
        ListNode* next = curr->next;
        curr->next = next->next;
        next->next = pre->next;
        pre->next = next;
    }
    return dummy.next;
}

/* Recursive (reduces to reversing the first right nodes) */
ListNode* reverseBetweenRecursive(ListNode* head, int left, int right) {
    if (left == 1) {
        return reverseNRecursive(head, right);
    }
    head->next = reverseBetweenRecursive(head->next, left - 1, right - 1);
    return head;
}

/* ============ 4. Reverse in groups of K ============ */

/* Iterative */
ListNode* reverseKGroup(ListNode* head, int k) {
    ListNode dummy;
    dummy.next = head;
    ListNode* pre = &dummy;
    ListNode* end = &dummy;

    while (end->next) {
        for (int i = 0; i < k && end; i++) end = end->next; /* probe ahead */
        if (!end) break; /* fewer than k, stop */

        ListNode* start = pre->next;
        ListNode* next = end->next;      /* record the start of the next group */
        end->next = NULL;                /* cut off this group */
        pre->next = reverseList(start);  /* reverse this group */
        start->next = next;              /* reconnect the rest */
        pre = start;                     /* pre points to the end of this group */
        end = pre;                       /* reset end */
    }
    return dummy.next;
}

/* Recursive */
ListNode* reverseKGroupRecursive(ListNode* head, int k) {
    ListNode* end = head;
    for (int i = 0; i < k; i++) {
        if (!end) return head; /* fewer than k, keep as is */
        end = end->next;
    }

    ListNode* newHead = reverseN(head, k);               /* reverse the first k */
    head->next = reverseKGroupRecursive(end, k);         /* recursively process the rest */
    return newHead;
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
    /* ============ 1. Reverse the entire linked list ============ */

    ListNode* reverseList(ListNode* head) {
        ListNode* prev = nullptr;
        ListNode* curr = head;
        while (curr) {
            ListNode* next = curr->next;
            curr->next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }

    ListNode* reverseListRecursive(ListNode* head) {
        if (!head || !head->next) return head;
        ListNode* last = reverseListRecursive(head->next);
        head->next->next = head;
        head->next = nullptr;
        return last;
    }

    /* ============ 2. Reverse the first N nodes ============ */

    ListNode* reverseN(ListNode* head, int n) {
        ListNode* prev = nullptr;
        ListNode* curr = head;
        for (int i = 0; i < n && curr; i++) {
            ListNode* next = curr->next;
            curr->next = prev;
            prev = curr;
            curr = next;
        }
        head->next = curr;
        return prev;
    }

    ListNode* reverseNRecursive(ListNode* head, int n) {
        if (n == 1) {
            successor = head->next;
            return head;
        }
        ListNode* last = reverseNRecursive(head->next, n - 1);
        head->next->next = head;
        head->next = successor;
        return last;
    }

    /* ============ 3. Reverse part of the linked list ============ */

    ListNode* reverseBetween(ListNode* head, int left, int right) {
        ListNode dummy(0, head);
        ListNode* pre = &dummy;
        for (int i = 1; i < left; i++) pre = pre->next;

        ListNode* curr = pre->next;
        for (int i = 0; i < right - left; i++) {
            ListNode* next = curr->next;
            curr->next = next->next;
            next->next = pre->next;
            pre->next = next;
        }
        return dummy.next;
    }

    ListNode* reverseBetweenRecursive(ListNode* head, int left, int right) {
        if (left == 1) {
            return reverseNRecursive(head, right);
        }
        head->next = reverseBetweenRecursive(head->next, left - 1, right - 1);
        return head;
    }

    /* ============ 4. Reverse in groups of K ============ */

    ListNode* reverseKGroup(ListNode* head, int k) {
        ListNode dummy(0, head);
        ListNode* pre = &dummy;
        ListNode* end = &dummy;

        while (end->next) {
            for (int i = 0; i < k && end; i++) end = end->next;
            if (!end) break;

            ListNode* start = pre->next;
            ListNode* next = end->next;
            end->next = nullptr;
            pre->next = reverseList(start);
            start->next = next;
            pre = start;
            end = pre;
        }
        return dummy.next;
    }

    ListNode* reverseKGroupRecursive(ListNode* head, int k) {
        ListNode* end = head;
        for (int i = 0; i < k; i++) {
            if (!end) return head;
            end = end->next;
        }
        ListNode* newHead = reverseN(head, k);
        head->next = reverseKGroupRecursive(end, k);
        return newHead;
    }

private:
    ListNode* successor = nullptr; /* successor pointer used by the recursive "reverse first N" */
};
```

```js title="JavaScript"
class ListNode {
    constructor(val, next) {
        this.val = (val === undefined ? 0 : val);
        this.next = (next === undefined ? null : next);
    }
}

// successor pointer used by the recursive "reverse first N"
let successor = null;

/* ============ 1. Reverse the entire linked list ============ */

function reverseList(head) {
    let prev = null;
    let curr = head;
    while (curr) {
        const next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}

function reverseListRecursive(head) {
    if (!head || !head.next) return head;
    const last = reverseListRecursive(head.next);
    head.next.next = head;
    head.next = null;
    return last;
}

/* ============ 2. Reverse the first N nodes ============ */

function reverseN(head, n) {
    let prev = null;
    let curr = head;
    for (let i = 0; i < n && curr; i++) {
        const next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    head.next = curr;
    return prev;
}

function reverseNRecursive(head, n) {
    if (n === 1) {
        successor = head.next;
        return head;
    }
    const last = reverseNRecursive(head.next, n - 1);
    head.next.next = head;
    head.next = successor;
    return last;
}

/* ============ 3. Reverse part of the linked list ============ */

function reverseBetween(head, left, right) {
    const dummy = new ListNode(0, head);
    let pre = dummy;
    for (let i = 1; i < left; i++) pre = pre.next;

    const curr = pre.next;
    for (let i = 0; i < right - left; i++) {
        const next = curr.next;
        curr.next = next.next;
        next.next = pre.next;
        pre.next = next;
    }
    return dummy.next;
}

function reverseBetweenRecursive(head, left, right) {
    if (left === 1) {
        return reverseNRecursive(head, right);
    }
    head.next = reverseBetweenRecursive(head.next, left - 1, right - 1);
    return head;
}

/* ============ 4. Reverse in groups of K ============ */

function reverseKGroup(head, k) {
    const dummy = new ListNode(0, head);
    let pre = dummy;
    let end = dummy;

    while (end.next) {
        for (let i = 0; i < k && end; i++) end = end.next;
        if (!end) break;

        const start = pre.next;
        const next = end.next;
        end.next = null;
        pre.next = reverseList(start);
        start.next = next;
        pre = start;
        end = pre;
    }
    return dummy.next;
}

function reverseKGroupRecursive(head, k) {
    let end = head;
    for (let i = 0; i < k; i++) {
        if (!end) return head;
        end = end.next;
    }
    const newHead = reverseN(head, k);
    head.next = reverseKGroupRecursive(end, k);
    return newHead;
}
```
:::
## Complexity and Solution Comparison

| Problem | Iterative Time | Iterative Space | Recursive Time | Recursive Space |
|------|---------|---------|---------|---------|
| Reverse the entire linked list | O(n) | O(1) | O(n) | O(n) (recursion stack) |
| Reverse the first N | O(n) | O(1) | O(n) | O(n) |
| Reverse a range | O(n) | O(1) | O(n) | O(n) |
| Reverse in groups of K | O(n) | O(1) | O(n) | O(n/k) |

**Iteration vs Recursion**:

- **Iteration**: O(1) space, no stack overflow risk, the preferred choice in engineering.
- **Recursion**: The code is more concise and the semantics more intuitive, but each call occupies stack space, and when n is very large it may cause a **stack overflow**; its value lies more in "transferring the approach" — the `reverseN` + `successor` style can cleanly derive range reversal and K-group reversal.

## Key Points

1. **Save `next` before reversing**: This is the crux of the iterative solution; forgetting to save it will break the chain.
2. **`head.next.next = head` is the soul of recursion**: The single statement "make the successor point to itself" accomplishes the reverse reconnection.
3. **`successor` is the bridge from "the first N" to "a range"**: Recording "the (n+1)th node" allows the reversed segment to correctly reconnect to the remaining part.
4. **Range reversal = locate the predecessor + head insertion**: The dummy node unifies the boundary cases of `left = 1`.
5. **K-group reversal "scouts ahead" first**: Determine whether the remaining nodes are enough for `k`; if not, keep them as is — this is the only difference from "reversing the whole thing".

## Extended Thoughts

- **Palindrome linked list** (LeetCode 234): First use fast and slow pointers to find the midpoint, then reverse the second half, and finally compare with two pointers — exactly the combination of "reversal" + "two pointers".
- **Recursion stack risk**: When the linked list length reaches `10^5`, the recursion depth may exceed the default stack limit, and iteration should be used instead.
- Reversing the entire linked list also has a "**tail insertion**" style (inserting `curr` after dummy each round), which is in the same vein as the head insertion of range reversal, and you can try it yourself.

## Related Articles

- [Linked List: From Nodes to LRU Cache](/technology/linked-list/) — Linked list basics and an introduction to reversal
- [Seven Major Singly Linked List Algorithms](/technology/singly-linked-list-seven-algorithms/) — An overview of linked list algorithms
- [Linked List Two Pointers](/technology/linked-list-two-pointers/) — Fast and slow pointers (finding the midpoint, which will be used for the palindrome linked list)