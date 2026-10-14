---
title: 合并 K 个有序链表：最小堆与分治法
published: 2026-08-10
description: '将 K 个升序链表合并为一个新的升序链表。介绍两种解法：最小堆（优先队列）和分治法两两合并，分析各自优劣。附带 C / C++ / JavaScript 三语言实现。'
image: ''
tags: [链表, 堆, 分治, 合并, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 题目描述

给定一个链表数组，每个链表都已按**升序**排列。将所有链表合并为一个**升序**链表，并返回合并后的链表头。

```
输入：lists = [1→4→5, 1→3→4, 2→6]
输出：1→1→2→3→4→4→5→6
```

## 解题思路

这道题是"合并两个有序链表"的扩展。当 K 变大时，如果我们每次都遍历 K 个链表的头节点来找最小值，时间复杂度会退化到 O(K·N)。我们需要更高效的方式。

### 方法一：最小堆（优先队列）

核心思想是维护一个大小为 K 的小根堆，每次从堆顶取出最小的节点，再将该节点的下一个节点入堆。

- 初始化：将 K 个链表的头节点放入最小堆
- 每轮：弹出堆顶节点追加到结果链表，将该节点的 next 入堆
- 直到堆为空

**时间复杂度**：O(N log K)，每次堆操作 O(log K)  
**空间复杂度**：O(K)，堆中最多同时存放 K 个节点

### 方法二：分治法两两合并

利用"合并两个有序链表"作为基本操作，将 K 个链表**两两配对**合并，层层归并。

- 第一轮：合并 (0,1), (2,3), (4,5), ... → K/2 个链表
- 第二轮：合并上轮结果两两配对 → K/4 个链表
- 直到只剩一个链表

**时间复杂度**：O(N log K)，每轮合并 O(N)，共 log K 轮  
**空间复杂度**：O(1)（递归栈 O(log K)）

### 两种方法对比

| 维度 | 最小堆 | 分治法 |
|------|--------|--------|
| 时间复杂度 | O(N log K) | O(N log K) |
| 空间复杂度 | O(K) | O(1) |
| 实现难度 | 需要堆数据结构 | 递归直观 |
| 适用场景 | K 很大但 N 不大 | K 很大且 N 也很大 |

下面给出两种方法的完整实现。

## 代码实现（最小堆法）

:::code-tabs{default="cpp"}
```c title="C"
#include <stdio.h>
#include <stdlib.h>

typedef struct ListNode {
    int val;
    struct ListNode *next;
} ListNode;

/* —— 自定义最小堆 —— */
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

    // 将 K 个链表的头节点入堆
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
        // 自定义比较器：按节点值从小到大
        auto cmp = [](ListNode *a, ListNode *b) { return a->val > b->val; };
        priority_queue<ListNode*, vector<ListNode*>, decltype(cmp)> pq(cmp);

        // 将 K 个链表的头节点入堆
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

// 使用最小优先队列的简单实现（手动维护排序数组）
function mergeKLists(lists) {
    // 过滤空链表，收集所有头节点
    const heap = lists.filter(h => h !== null);

    // 按值排序（简易最小堆替代）
    const sortHeap = () => heap.sort((a, b) => a.val - b.val);

    const dummy = new ListNode(0);
    let tail = dummy;

    while (heap.length > 0) {
        sortHeap();
        const minNode = heap.shift(); // 取出最小值
        tail.next = minNode;
        tail = tail.next;
        if (minNode.next) heap.push(minNode.next);
    }

    return dummy.next;
}

// 性能优化版本：分治法（见下方）
```
:::

## 代码实现（分治法）

:::code-tabs{default="cpp"}
```c title="C"
// 合并两个有序链表（基础操作）
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

// 分治法：两两合并
ListNode* mergeKListsDivide(ListNode** lists, int listsSize) {
    if (listsSize == 0) return NULL;
    // interval 表示当前每组合并的步长：1→2→4→8→...
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
    // 合并两个有序链表（基础操作）
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

    // 分治法：两两合并
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

## 分治法图解

```
初始 K=6 个链表：
L0  L1  L2  L3  L4  L5

interval=1 (步长为1)：
合并 L0+L1 → L0'
合并 L2+L3 → L2'
合并 L4+L5 → L4'

interval=2 (步长为2)：
合并 L0'+L2' → L0''
合并 L4' 独自留下

interval=4 (步长为4)：
合并 L0''+L4' → 最终结果

总共 log₂6 ≈ 3 轮合并
```

## 复杂度分析

| 维度 | 最小堆法 | 分治法 |
|------|---------|--------|
| 时间复杂度 | O(N log K) | O(N log K) |
| 空间复杂度 | O(K) | O(1) |
| 实现难度 | 依赖语言提供的堆 | 递归/迭代，逻辑简单 |

其中 N 为所有链表节点总数，K 为链表个数。

## 关键要点

1. **最小堆是"K 指针选最小"的优化**：避免每轮都遍历 K 个指针
2. **分治法的 interval 迭代**：`interval *= 2` 的精妙循环，原地合并，空间 O(1)
3. **与合并两个的区别**：K=2 时退化为经典双指针合并；K>2 时需要"多路归并"的框架

相关文章：
- [合并两个有序链表](/technology/linked-list-merge-two-sorted/) — 本题的基础操作
