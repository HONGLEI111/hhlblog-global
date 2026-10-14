---
title: 寻找单链表的倒数第 K 个节点：双指针间隔法
published: 2026-08-10
description: '只遍历一次就找到单链表倒数第 K 个节点。使用双指针技巧：fast 先走 K 步，然后 slow 和 fast 同步前进，fast 到末尾时 slow 恰在目标位置。附带 C / C++ / JavaScript 三语言实现。'
image: ''
tags: [链表, 双指针, 滑动窗口, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 题目描述

给定一个单链表的头节点 `head` 和一个正整数 `k`，返回链表中**倒数第 `k`** 个节点。

```
输入：head = 1→2→3→4→5, k = 2
输出：4→5
解释：倒数第 2 个节点是 4
```

## 解题思路

### 暴力法的问题

最直接的想法是先遍历一遍求出链表长度 `n`，然后再从头走 `n - k` 步。但这需要**两次遍历**。

### 双指针间隔法（一次遍历）

想象两个人在一条笔直的马路上赛跑：A 先跑出去 K 米，然后 B 才开始跑。当 A 到达终点时，B 距离终点恰好是 K 米——也就是"倒数第 K 米"的位置。

对应到链表：
- `fast` 指针先走 `k` 步
- 然后 `slow` 和 `fast` 同步前进（每次都走一步）
- 当 `fast` 到达 `null`（末尾）时，`slow` 恰好指向倒数第 `k` 个节点

### 算法步骤

1. fast 指针先走 k 步
2. 如果 fast 在走 k 步的过程中变为 null → k 超出链表长度，返回 null
3. slow 和 fast 同步前进，直到 fast 指向 null
4. 返回 slow（此时 slow 指向倒数第 k 个节点）

### 关键细节：fast 应该走到哪里？

假设链表长度为 n，倒数第 k 个节点是正数第 `n - k` 个（从 1 开始编号）。

- fast 先走 k 步，到达第 k+1 个节点
- slow 从第 1 个开始
- 当 fast 走到第 n+1 个（null）时，slow 同步走到 `(n+1) - k = n - k + 1` 个
- 这恰好是倒数第 k 个 ✓

## 代码实现

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

    // fast 先走 k 步
    for (int i = 0; i < k; i++) {
        // k 超出链表长度
        if (!fast) return NULL;
        fast = fast->next;
    }

    // slow 和 fast 同步前进
    while (fast) {
        slow = slow->next;
        fast = fast->next;
    }

    // fast 到达 null 时，slow 指向倒数第 k 个节点
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

        // fast 先走 k 步
        for (int i = 0; i < k; i++) {
            // k 超出链表长度
            if (!fast) return nullptr;
            fast = fast->next;
        }

        // slow 和 fast 同步前进
        while (fast) {
            slow = slow->next;
            fast = fast->next;
        }

        // fast 到达 null 时，slow 指向倒数第 k 个节点
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

    // fast 先走 k 步
    for (let i = 0; i < k; i++) {
        // k 超出链表长度
        if (!fast) return null;
        fast = fast.next;
    }

    // slow 和 fast 同步前进
    while (fast) {
        slow = slow.next;
        fast = fast.next;
    }

    // fast 到达 null 时，slow 指向倒数第 k 个节点
    return slow;
}
```
:::

## 图解过程

```
输入：head = 1→2→3→4→5, k = 2

初始：fast 和 slow 都在头节点
        fast
        slow
        ↓
        1 → 2 → 3 → 4 → 5

Step 1: fast 先走 k=2 步
                     fast
                     ↓
        1 → 2 → 3 → 4 → 5
        ↑
        slow

Step 2: slow 和 fast 同步走
                     fast
                     ↓
        1 → 2 → 3 → 4 → 5 → null
                  ↑
                  slow

当 fast == null 时，slow 指向节点 4（倒数第 2 个节点）
```

## 复杂度分析

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — 只遍历一次链表 |
| 空间复杂度 | **O(1)** — 只用了两个指针 |

## 关键要点

1. **间隔的思想**：fast 和 slow 始终保持 k 步的间隔，这是双指针技巧的核心
2. **边界处理**：fast 先走 k 步的过程中，如果中途变为 null，说明 k > n，需返回 null
3. **一次遍历**：相比"先求长度再走 n-k 步"的两次遍历，双指针只需一次

## 扩展思考

- 如果要**删除**倒数第 k 个节点（LeetCode 19），如何利用本题思路找到倒数第 k+1 个节点？
- 如果链表是**双向链表**，能否有更优解法？

相关文章：
- [寻找链表的中点](/technology/linked-list-middle/) — 同样是双指针，但这里是"速度差"而非"位置差"
