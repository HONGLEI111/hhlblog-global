---
title: 'Detecting a Cycle in a Singly Linked List and Finding Its Start: Floyd''s Cycle Detection Algorithm'
published: 2026-08-10
description: 'First use fast and slow pointers to determine whether a linked list has a cycle; if it does, locate the entry node of the cycle by moving at equal speed. A combination of two classic problems: Floyd''s cycle detection plus the mathematical proof for the cycle start. Includes implementations in C, C++, and JavaScript.'
image: ''
tags: [linked list, fast and slow pointers, Floyd's cycle detection, cycle detection, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Problem Description

### Subproblem 1: Determine Whether a Linked List Contains a Cycle

Given the head node `head` of a singly linked list, determine whether a cycle exists in the linked list. If there is a node in the linked list that can be reached again by continuously following the `next` pointer, then a cycle exists in the linked list.

```
输入：head = 3→2→0→-4
              ↑_______↓
输出：true
```

### Subproblem 2: Find the Starting Point of the Cycle

Building on the previous problem, if a cycle exists, return the **entry node** of the cycle.

```
输入：head = 3→2→0→-4
              ↑_______↓
输出：节点 2
解释：环的入口是节点 2
```

## Solution Approach

### Phase 1: Floyd's Cycle Detection (Determine Whether a Cycle Exists)

Use **fast and slow pointers**: slow moves one step at a time, fast moves two steps at a time.

- If the linked list has no cycle: fast will reach `null` first, and we determine there is no cycle
- If the linked list has a cycle: fast and slow will definitely **meet** in the cycle (just like on a circular track, the faster person will always lap the slower person)

### Phase 2: Find the Entry of the Cycle (Mathematical Derivation)

After fast and slow meet in the cycle:

1. Point slow back to the head of the linked list
2. slow and fast advance **at the same speed** (one step at a time)
3. The node where they meet again is the **entry of the cycle**

### Mathematical Proof

Let:
- The distance from the head of the linked list to the cycle entry be **a**
- The distance from the cycle entry to the first meeting point be **b**
- The length of the cycle be **L**, then the remaining distance from the meeting point to the cycle entry is **c = L - b**

At the first meeting:
- slow has walked `a + b` steps
- fast has walked `a + b + n·L` steps (n is the number of extra laps fast has made)

Since fast's speed is twice that of slow: `2(a + b) = a + b + n·L`
→ `a + b = n·L`
→ `a = n·L - b = (n-1)·L + (L - b) = (n-1)·L + c`

**a = c + (n-1)·L** — This means that the distance of `a` steps from the head of the linked list to the cycle entry equals the distance of `c` steps from the meeting point to the cycle entry (possibly with a few extra laps).

Therefore, if we let slow start from the head and fast start from the meeting point, and both advance at the same speed, they will definitely meet at the cycle entry.

## Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct ListNode {
    int val;
    struct ListNode *next;
} ListNode;

/* 检测是否有环 */
bool hasCycle(ListNode *head) {
    ListNode *slow = head;
    ListNode *fast = head;

    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true; // 快慢指针相遇，有环
    }
    return false; // fast 到达末尾，无环
}

/* 寻找环的入口节点 */
ListNode* detectCycle(ListNode *head) {
    ListNode *slow = head;
    ListNode *fast = head;

    // 第一阶段：判断是否有环
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            // 第二阶段：寻找环的入口
            slow = head;
            while (slow != fast) {
                slow = slow->next;
                fast = fast->next;
            }
            return slow; // 再次相遇点即为环入口
        }
    }
    return NULL; // 无环
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
    // 检测是否有环
    bool hasCycle(ListNode *head) {
        ListNode *slow = head;
        ListNode *fast = head;

        while (fast && fast->next) {
            slow = slow->next;
            fast = fast->next->next;
            if (slow == fast) return true;
        }
        return false;
    }

    // 寻找环的入口节点
    ListNode* detectCycle(ListNode *head) {
        ListNode *slow = head;
        ListNode *fast = head;

        // 第一阶段：判断是否有环
        while (fast && fast->next) {
            slow = slow->next;
            fast = fast->next->next;
            if (slow == fast) {
                // 第二阶段：寻找环的入口
                slow = head;
                while (slow != fast) {
                    slow = slow->next;
                    fast = fast->next;
                }
                return slow;
            }
        }
        return nullptr;
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

// 检测是否有环
function hasCycle(head) {
    let slow = head;
    let fast = head;

    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow === fast) return true;
    }
    return false;
}

// 寻找环的入口节点
function detectCycle(head) {
    let slow = head;
    let fast = head;

    // 第一阶段：判断是否有环
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow === fast) {
            // 第二阶段：寻找环的入口
            slow = head;
            while (slow !== fast) {
                slow = slow.next;
                fast = fast.next;
            }
            return slow;
        }
    }
    return null;
}
```
:::

## Illustrated Process

### Phase 1: Cycle Detection

```
链表：3 → 2 → 0 → -4
           ↑__________↓

Step 1: slow=3, fast=3
Step 2: slow=2, fast=0
Step 3: slow=0, fast=2   ← fast 绕了一圈，套圈 slow
Step 4: slow=-4, fast=-4 ← 在节点 -4 相遇！有环！
```

### Phase 2: Find the Cycle Entry

```
第一次相遇后：
  slow 重置到头部 (3)
  fast 留在相遇点 (-4)

以相同速度前进：
Step 1: slow=2, fast=2
        ↓       ↓
        两者在节点 2 相遇 → 节点 2 就是环的入口！
```

## Complexity Analysis

| Dimension | Analysis |
|------|------|
| Time Complexity | **O(n)** — slow walks at most n steps (from head to entry and then to the meeting point), each phase is O(n) |
| Space Complexity | **O(1)** — only two pointers are used |

## Key Takeaways

1. **The core of Floyd's cycle detection is the speed difference**: As long as fast is faster than slow (not necessarily 2x), and the speed difference is coprime with the cycle length, the cycle can be detected. Choosing 2x is the engineering-optimal practice.

2. **The mathematical proof is an interview highlight**: Being able to derive `a = c + (n-1)·L` is the key to distinguishing "memorizing templates" from "truly understanding."

3. **The elegance of the equal-speed return search**: In the second phase, slow and fast walk at the same speed, and their meeting point is the entry — this is the most beautiful part of Floyd's algorithm.

## Extended Thinking

- If you need to calculate the **length of the cycle**, how would you do it? (After meeting, keep fast stationary, and let slow continue walking one full lap while counting)
- Can the fast pointer move 3 steps at a time? What impact would that have?

Related Articles:
- [Finding the Middle of a Linked List](/technology/linked-list-middle/) — A simple application of fast and slow pointers
- [Determine Intersection and Find the Intersection Point](/technology/linked-list-intersection/) — Another two-pointer classic