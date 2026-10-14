---
title: 判断两个单链表是否相交并找出交点：双指针交替遍历法
published: 2026-08-10
description: '判断两条单链表是否相交，若相交则找出交点。使用双指针交替遍历法：pA 走到末尾后跳到 pB 的头，pB 走到末尾后跳到 pA 的头，两指针最终相遇于交点或同归于 null。附带 C / C++ / JavaScript 三语言实现。'
image: ''
tags: [链表, 双指针, 相交, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 题目描述

给定两个单链表的头节点 `headA` 和 `headB`，判断它们是否**相交**（即某个节点被两个链表共享）。如果相交，返回**交点**；否则返回 `null`。

```
输入：headA = 4→1→8→4→5
      headB = 5→6→1→8→4→5
                    ↑
                    交点
输出：节点 8
```

两条链表在节点 8 处交汇，之后共享 4→5 部分。

## 解题思路

### 暴力法的问题

- **哈希表法**：遍历链表 A，将所有节点存入哈希表；再遍历链表 B，检查每个节点是否在哈希表中。空间 O(n)。
- **双指针交替遍历法**：空间 O(1)，一次遍历完成。

### 双指针交替遍历法

关键观察：如果两条链表有交点，那么**交点之后的节点完全相同**。两链表长度可能不同，但**从各自头节点走到交点再走到末尾的总路径长度是固定的**。

#### 核心思想

让两个指针分别从 A 和 B 出发：
- 指针 `pA`：从 A 的头出发，走到末尾后跳到 B 的头继续走
- 指针 `pB`：从 B 的头出发，走到末尾后跳到 A 的头继续走

如果存在交点，两个指针走过的总长度相等（都是 `lenA + lenB`），它们会在交点相遇。如果不存在交点，两个指针最终同时到达 `null`。

#### 数学证明

设链表 A 的长度为 `lenA = a + c`（a 为 A 独有部分，c 为共享部分），链表 B 的长度为 `lenB = b + c`。

| 指针 | 第一段 | 第二段 | 总距离 | 到达交点 |
|------|--------|--------|--------|----------|
| pA | a | c + b | a + c + b | 是 |
| pB | b | c + a | b + c + a | 是 |

两个指针走过的总距离都是 `a + b + c`，所以会**同时**到达交点（或同时到达 null）。

### 算法步骤

1. `pA = headA`, `pB = headB`
2. 循环条件：`while (pA != pB)`
3. `pA` 走一步；若 `pA == null`，跳到 `headB`
4. `pB` 走一步；若 `pB == null`，跳到 `headA`
5. 循环结束，返回 `pA`（交点或 null）

## 代码实现

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

## 图解过程

### 有交点的情况

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

### 无交点的情况

```
链表A：  1 → 2 → 3
链表B：  4 → 5
```

```
pA 路径：1 → 2 → 3 → 4 → 5 → null
pB 路径：4 → 5 → 1 → 2 → 3 → null

★ 两指针同时到达 null ✓
```

## 复杂度分析

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(m + n)** — 两指针各走 m + n 步 |
| 空间复杂度 | **O(1)** — 只用了两个指针 |

## 关键要点

1. **"走你走过的路"**：pA 走完自己走 B，pB 走完自己走 A——这个设计让两指针消除长度差，同时到达交点
2. **同时到达 null**：如果没有交点，两个指针也会在遍历相同总长度后同时到达 null，循环自然结束
3. **不能中途跳过 null**：有些写法是 "走到 null 就跳"，这没问题，因为无环链表最后都是 null
4. **与环检测的区别**：本题假设链表无环。如果可能有环，需要先判环

## 扩展思考

- 如果链表可能含有环，如何判断相交？—— 需要分情况讨论：都无环、一个有环一个无环、都有环
- 是否存在更直观的解法？—— 可以先算出两链表长度差，让较长链表的指针先走"差"步，然后同步走

相关文章：
- [判断环并找环起点](/technology/linked-list-cycle/) — 另一个"相遇"逻辑
- [寻找倒数第 K 个节点](/technology/linked-list-kth-from-end/) — "消除长度差"的类似思想
