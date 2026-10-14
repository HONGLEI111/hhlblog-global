---
title: 链表的分解：双 Dummy 节点分离再拼接
published: 2026-08-10
description: '将链表中小于 x 的节点和大于等于 x 的节点分离，并保持相对顺序不变。使用两个 dummy 虚拟头节点分别收集，最后拼接。附带 C / C++ / JavaScript 三语言实现。'
image: ''
tags: [链表, 双指针, 分解, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 题目描述

给定一个链表和一个特定值 `x`，将链表**重新排列**，使得所有**小于 `x`** 的节点出现在**大于或等于 `x`** 的节点之前。同时保留两部分内部节点的**原始相对顺序**。

```
输入：head = 1→4→3→2→5→2, x = 3
输出：1→2→2→4→3→5
解释：小于 3 的：1, 2, 2（保持原序）
      大于等于 3 的：4, 3, 5（保持原序）
```

## 解题思路

### 核心思想：双 Dummy 分离

直观想法是创建两个新链表——一个装"小值"，一个装"大值"——遍历原链表时把每个节点归到对应的链表。遍历完毕后，把小值链表的尾部接到大值链表的头部即可。

但直接操作"新链表的头指针"会遇到"第一个节点是谁"的边界问题。所以我们用两个 **dummy 虚拟头节点** 来分别管理两条链。

### 算法步骤

1. 创建 `smallDummy` 和 `largeDummy` 两个虚拟头节点
2. 用 `small` 和 `large` 尾指针分别维护两个链表
3. 遍历原链表，根据节点值与 `x` 的比较将节点归入对应链表
4. 遍历结束后，将 `large` 链表接到 `small` 链表尾部
5. **关键**：将 `large.next` 置为 `null`，否则可能形成环
6. 返回 `smallDummy.next`

> **为什么必须置 `large.next = null`？**
> 大值链表的最后一个节点可能原本指向一个大值节点，如果不断开，拼接后链表末尾可能指向旧节点形成环。

## 代码实现

:::code-tabs{default="cpp"}
```c title="C"
#include <stdio.h>
#include <stdlib.h>

typedef struct ListNode {
    int val;
    struct ListNode *next;
} ListNode;

ListNode* partition(ListNode* head, int x) {
    // 创建两个 dummy 虚拟头节点
    ListNode smallDummy, largeDummy;
    smallDummy.next = NULL;
    largeDummy.next = NULL;
    ListNode *small = &smallDummy;
    ListNode *large = &largeDummy;

    // 遍历原链表，分离节点
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

    // 拼接两个链表
    small->next = largeDummy.next;
    // 断开大值链表末尾，防止环
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
        // 创建两个 dummy 虚拟头节点
        ListNode smallDummy(0), largeDummy(0);
        ListNode *small = &smallDummy;
        ListNode *large = &largeDummy;

        // 遍历原链表，分离节点
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

        // 拼接两个链表
        small->next = largeDummy.next;
        // 断开大值链表末尾，防止环
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
    // 创建两个 dummy 虚拟头节点
    const smallDummy = new ListNode(0);
    const largeDummy = new ListNode(0);
    let small = smallDummy;
    let large = largeDummy;

    // 遍历原链表，分离节点
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

    // 拼接两个链表
    small.next = largeDummy.next;
    // 断开大值链表末尾，防止环
    large.next = null;

    return smallDummy.next;
}
```
:::

## 图解过程

```
输入：head = 1→4→3→2→5→2, x = 3

初始状态：
smallDummy → ?
largeDummy → ?

Step 1: curr=1, 1<3 → 归入 small
smallDummy → 1
largeDummy → ?

Step 2: curr=4, 4≥3 → 归入 large
smallDummy → 1
largeDummy → 4

Step 3: curr=3, 3≥3 → 归入 large
smallDummy → 1
largeDummy → 4→3

Step 4: curr=2, 2<3 → 归入 small
smallDummy → 1→2
largeDummy → 4→3

Step 5: curr=5, 5≥3 → 归入 large
smallDummy → 1→2
largeDummy → 4→3→5

Step 6: curr=2, 2<3 → 归入 small
smallDummy → 1→2→2
largeDummy → 4→3→5

拼接并断开 large 末尾：
结果：1→2→2→4→3→5
```

## 复杂度分析

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — 遍历链表一次 |
| 空间复杂度 | **O(1)** — 只用了几个指针，原地重组 |

## 关键要点

1. **两个 dummy 节点各管一摊**：分别维护小值链和大值链，代码逻辑清晰
2. **必须断开 large 末尾**：`large->next = null` 是防止环的关键一步，面试时忘记这一行会导致严重 bug
3. **保持相对顺序**：由于是依次遍历并追加到尾部，两部分内部节点顺序自然不变

## 扩展思考

- 如果题目不要求保持相对顺序，能否用更简洁的方法？（直接交换或原地调整）
- 如果要求"大于 x 的在前、小于 x 的在后"，如何修改？

相关文章：
- [合并两个有序链表](/technology/linked-list-merge-two-sorted/) — 同样是"拼接"操作
