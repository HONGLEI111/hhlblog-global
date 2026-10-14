---
title: 'Merge K Sorted Lists: Min-Heap vs. Divide and Conquer'
published: 2026-08-10
description: 'Merge K ascending linked lists into a single ascending linked list. Covers two approaches: a min-heap (priority queue) and divide-and-conquer pairwise merging, with an analysis of their trade-offs. Includes implementations in C, C++, and JavaScript.'
image: ''
tags: [Linked List, Heap, Divide and Conquer, Merge, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Problem Description

Given an array of linked lists, each linked list is already sorted in **ascending** order. Merge all the linked lists into one **ascending** linked list and return the head of the merged linked list.

```
Input: lists = [1→4→5, 1→3→4, 2→6]
Output: 1→1→2→3→4→4→5→6
```

## Solution Approach

This problem is an extension of "Merge Two Sorted Lists." When K becomes large, if we traverse the head nodes of K linked lists each time to find the minimum value, the time complexity degrades to O(K·N). We need a more efficient approach.

### Method 1: Min-Heap (Priority Queue)

The core idea is to maintain a min-heap of size K, each time extracting the smallest node from the top of the heap, then pushing the next node of that node into the heap.

- Initialization: Put the head nodes of K linked lists into the min-heap
- Each round: Pop the top node from the heap and append it to the result list, then push that node's next into the heap
- Until the heap is empty

**Time complexity**: O(N log K), each heap operation is O(log K)  
**Space complexity**: O(K), the heap holds at most K nodes at a time

### Method 2: Divide and Conquer — Pairwise Merge

Using "Merge Two Sorted Lists" as the basic operation, merge K linked lists by **pairing them up**, merging level by level.

- First round: Merge (0,1), (2,3), (4,5), ... → K/2 linked lists
- Second round: Merge the previous round's results pairwise → K/4 linked lists
- Until only one linked list remains

**Time complexity**: O(N log K), each round merges O(N), for a total of log K rounds  
**Space complexity**: O(1) (recursion stack O(log K))

### Comparison of the Two Methods

| Dimension | Min-Heap | Divide and Conquer |
|------|--------|--------|
| Time complexity | O(N log K) | O(N log K) |
| Space complexity | O(K) | O(1) |
| Implementation difficulty | Requires heap data structure | Recursion is intuitive |
| Applicable scenarios | K is large but N is not | Both K and N are large |

The complete implementations of both methods are given below.

## Code Implementation (Min-Heap Method)

:::code-tabs{default="cpp"}
```c title="C"
#include <stdio.h>
#include <stdlib.h>

typedef struct ListNode {
    int val;
    struct ListNode *next;
} ListNode;

/* —— Custom Min-Heap —— */
typedef struct {
    ListNode **data;
    int size;
    int capacity;
} MinHeap;

static void heapSwap(ListNode **a, ListNode **b) {
    ListNode *tmp = *a; *a = *b; *b = tmp;
}

static void heapifyUp(MinHeap *h, int i) {
    while (i > 0) {
        int p = (i - 1) / 2;
        if (h->data[p]->val <= h->data[i]->val) break;
        heapSwap(&h->data[p], &h->data[i]);
        i = p;
    }
}

static void heapifyDown(MinHeap *h, int i) {
    while (1) {
        int left = 2 * i + 1, right = 2 * i + 2, smallest = i;
        if (left < h->size && h->data[left]->val < h->data[smallest]->val)
            smallest = left;
        if (right < h->size && h->data[right]->val < h->data[smallest]->val)
            smallest = right;
        if (smallest == i) break;
        heapSwap(&h->data[i], &h->data[smallest]);
        i = smallest;
    }
}

static void heapPush(MinHeap *h, ListNode *node) {
    h->data[h->size] = node;
    heapifyUp(h, h->size);
    h->size++;
}

static ListNode* heapPop(MinHeap *h) {
    ListNode *res = h->data[0];
    h->data[0] = h->data[--h->size];
    if (h->size > 0) heapifyDown(h, 0);
    return res;
}

ListNode* mergeKLists(ListNode** lists, int listsSize) {
    if (listsSize == 0) return NULL;

    MinHeap h;
    h.data = (ListNode**)malloc(sizeof(ListNode*) * listsSize);
    h.size = 0;
    h.capacity = listsSize;

    // Push the head nodes of the K linked lists into the heap
    for (int i = 0; i < listsSize; i++) {
        if (lists[i]) heapPush(&h, lists[i]);
    }

    ListNode dummy;
    dummy.next = NULL;
    ListNode *tail = &dummy;

    while (h.size > 0) {
        ListNode *minNode = heapPop(&h);
        tail->next = minNode;
        tail = tail->next;
        if (minNode->next) heapPush(&h, minNode->next);
    }

    free(h.data);
    return dummy.next;
}
```

```cpp title="C++"
#include <queue>
#include <vector>
using namespace std;

struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        // Custom comparator: by node value from smallest to largest
        auto cmp = [](ListNode *a, ListNode *b) { return a->val > b->val; };
        priority_queue<ListNode*, vector<ListNode*>, decltype(cmp)> pq(cmp);

        // Push the head nodes of the K linked lists into the heap
        for (auto head : lists) {
            if (head) pq.push(head);
        }

        ListNode dummy(0);
        ListNode *tail = &dummy;

        while (!pq.empty()) {
            ListNode *minNode = pq.top(); pq.pop();
            tail->next = minNode;
            tail = tail->next;
            if (minNode->next) pq.push(minNode->next);
        }

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

// Simple implementation using a min-priority queue (manually maintaining a sorted array)
function mergeKLists(lists) {
    // Filter out empty linked lists, collect all head nodes
    const heap = lists.filter(h => h !== null);

    // Sort by value (simple min-heap substitute)
    const sortHeap = () => heap.sort((a, b) => a.val - b.val);

    const dummy = new ListNode(0);
    let tail = dummy;

    while (heap.length > 0) {
        sortHeap();
        const minNode = heap.shift(); // Extract the minimum value
        tail.next = minNode;
        tail = tail.next;
        if (minNode.next) heap.push(minNode.next);
    }

    return dummy.next;
}

// Performance-optimized version: divide and conquer (see below)
```
:::
## Code Implementation (Divide and Conquer)

:::code-tabs{default="cpp"}
```c title="C"
// Merge two sorted linked lists (basic operation)
ListNode* mergeTwo(ListNode* a, ListNode* b) {
    ListNode dummy;
    dummy.next = NULL;
    ListNode *tail = &dummy;
    while (a && b) {
        if (a->val <= b->val) { tail->next = a; a = a->next; }
        else                  { tail->next = b; b = b->next; }
        tail = tail->next;
    }
    tail->next = a ? a : b;
    return dummy.next;
}

// Divide and conquer: merge in pairs
ListNode* mergeKListsDivide(ListNode** lists, int listsSize) {
    if (listsSize == 0) return NULL;
    // interval represents the current merge step size for each group: 1→2→4→8→...
    for (int interval = 1; interval < listsSize; interval *= 2) {
        for (int i = 0; i + interval < listsSize; i += interval * 2) {
            lists[i] = mergeTwo(lists[i], lists[i + interval]);
        }
    }
    return lists[0];
}
```

```cpp title="C++"
class Solution {
public:
    // Merge two sorted linked lists (basic operation)
    ListNode* mergeTwo(ListNode* a, ListNode* b) {
        ListNode dummy(0);
        ListNode *tail = &dummy;
        while (a && b) {
            if (a->val <= b->val) { tail->next = a; a = a->next; }
            else                  { tail->next = b; b = b->next; }
            tail = tail->next;
        }
        tail->next = a ? a : b;
        return dummy.next;
    }

    // Divide and conquer: merge in pairs
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        int n = lists.size();
        if (n == 0) return nullptr;

        for (int interval = 1; interval < n; interval *= 2) {
            for (int i = 0; i + interval < n; i += interval * 2) {
                lists[i] = mergeTwo(lists[i], lists[i + interval]);
            }
        }
        return lists[0];
    }
};
```

```js title="JavaScript"
function mergeTwo(a, b) {
    const dummy = new ListNode(0);
    let tail = dummy;
    while (a && b) {
        if (a.val <= b.val) { tail.next = a; a = a.next; }
        else                { tail.next = b; b = b.next; }
        tail = tail.next;
    }
    tail.next = a ? a : b;
    return dummy.next;
}

function mergeKLists(lists) {
    if (lists.length === 0) return null;
    const n = lists.length;

    for (let interval = 1; interval < n; interval *= 2) {
        for (let i = 0; i + interval < n; i += interval * 2) {
            lists[i] = mergeTwo(lists[i], lists[i + interval]);
        }
    }
    return lists[0];
}
```
:::

## Divide and Conquer Illustration

```
Initial K=6 linked lists:
L0  L1  L2  L3  L4  L5

interval=1 (step size is 1):
Merge L0+L1 → L0'
Merge L2+L3 → L2'
Merge L4+L5 → L4'

interval=2 (step size is 2):
Merge L0'+L2' → L0''
L4' is left alone

interval=4 (step size is 4):
Merge L0''+L4' → final result

A total of log₂6 ≈ 3 rounds of merging
```

## Complexity Analysis

| Dimension | Min-Heap Approach | Divide and Conquer |
|------|---------|--------|
| Time Complexity | O(N log K) | O(N log K) |
| Space Complexity | O(K) | O(1) |
| Implementation Difficulty | Depends on the language's built-in heap | Recursive/iterative, simple logic |

Where N is the total number of nodes across all linked lists, and K is the number of linked lists.

## Key Points

1. **The min-heap is an optimization of "selecting the minimum among K pointers"**: it avoids traversing all K pointers in every round
2. **The interval iteration of divide and conquer**: the ingenious loop of `interval *= 2`, merging in place, with O(1) space
3. **Difference from merging two**: when K=2 it degenerates to the classic two-pointer merge; when K>2 a "multi-way merge" framework is needed

Related articles:
- [Merge Two Sorted Lists](/technology/linked-list-merge-two-sorted/) — the foundational operation for this problem