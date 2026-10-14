---
title: 寻找单链表的中点：快慢指针经典应用
published: 2026-08-10
description: '使用快慢指针技巧一次遍历找到单链表的中间节点。slow 每次走一步，fast 每次走两步，fast 到终点时 slow 恰在中点。附带 C / C++ / JavaScript 三语言实现。'
image: ''
tags: [链表, 快慢指针, 双指针, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 题目描述

给定一个单链表的头节点 `head`，返回链表的**中间节点**。如果有两个中间节点（链表长度为偶数），返回**第二个**中间节点。

```
输入：head = 1→2→3→4→5
输出：3→4→5
解释：节点 3 是中间节点

输入：head = 1→2→3→4→5→6
输出：4→5→6
解释：有两个中间节点（3 和 4），返回第二个即节点 4
```

## 解题思路

### 快慢指针法

想象两个人跑步，A 的速度是 B 的两倍。当 A 跑完全程时，B 恰好跑了一半的距离。

对应到链表：
- `slow` 每次走**一步**
- `fast` 每次走**两步**
- 当 `fast` 到达链表末尾（`null`）或无法走两步时，`slow` 恰好在中间位置

### 为什么正好在中间？

设链表长度为 n，slow 走了 s 步，fast 走了 2s 步。
- 当 fast 到达末尾（第 n 个或之后），2s ≈ n，所以 s ≈ n/2
- slow 恰好走了 n/2 步，位于中间位置

### 偶数长度的"第二个中间节点"

题目要求返回第二个中间节点。快慢指针天然满足这个要求：
- n=6 时，slow 走到第 4 个节点（前 3 步），恰好是第二个中间节点 ✓

### 算法步骤

1. 初始化 `slow = fast = head`
2. 循环条件：`while (fast && fast->next)`
3. 每轮：slow 走一步，fast 走两步
4. 循环结束，返回 slow

> **循环条件为什么是 `fast && fast->next`？**
> 因为 fast 每次要走两步，需要确保当前节点和下一个节点都不为空。当快指针无法走两步时，慢指针已到达中点。

## 代码实现

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

## 图解过程

### 奇数长度：n = 5

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

### 偶数长度：n = 6

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

## 复杂度分析

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — 只遍历一次链表 |
| 空间复杂度 | **O(1)** — 只用了两个指针 |

## 快慢指针模式总结

快慢指针是链表问题中最常用的技巧之一，核心模式：

```text
while (fast && fast->next) {
    slow = slow->next;       // 慢指针走一步
    fast = fast->next->next; // 快指针走两步
}
// 此时 slow 指向中点
```

这个模式还用于解决：
- **环检测**（Floyd 判圈算法）
- **寻找环的起点**
- **回文链表判断**（找到中点后反转后半部分）

## 关键要点

1. **循环条件 `fast && fast->next`**：确保快指针每次都能走两步，不会空指针
2. **偶数长度返回第二个中点**：这是快慢指针的自然结果，无需额外处理
3. **一次遍历 O(n)**：比"先求长度再走 n/2 步"的两趟法更优

相关文章：
- [寻找倒数第 K 个节点](/technology/linked-list-kth-from-end/) — "位置差"模式的双指针
- [判断环并找环起点](/technology/linked-list-cycle/) — 快慢指针的另一经典应用
