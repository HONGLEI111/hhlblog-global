---
title: 判断单链表环并找出环起点：Floyd 判圈算法
published: 2026-08-10
description: '先用快慢指针判断链表是否有环，若有环则通过等速回找法定位环的入口节点。两道经典题的合并：Floyd 判圈 + 环起点的数学证明。附带 C / C++ / JavaScript 三语言实现。'
image: ''
tags: [链表, 快慢指针, Floyd判圈, 环检测, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 题目描述

### 子问题一：判断链表是否包含环

给定一个单链表的头节点 `head`，判断链表中是否存在环。如果链表中有某个节点可以通过连续跟踪 `next` 指针再次到达，则链表中存在环。

```
输入：head = 3→2→0→-4
              ↑_______↓
输出：true
```

### 子问题二：找出环的起点

在上题基础上，如果存在环，返回环的**入口节点**。

```
输入：head = 3→2→0→-4
              ↑_______↓
输出：节点 2
解释：环的入口是节点 2
```

## 解题思路

### 第一阶段：Floyd 判圈（判断有无环）

使用**快慢指针**：slow 每次走一步，fast 每次走两步。

- 如果链表无环：fast 会先到达 `null`，判定无环
- 如果链表有环：fast 和 slow 一定会在环中**相遇**（就像在圆形操场上，快的人总会套圈慢的人）

### 第二阶段：找出环的入口（数学推导）

当 fast 和 slow 在环中相遇后：

1. 将 slow 重新指向链表头部
2. slow 和 fast **以相同的速度**（每次一步）前进
3. 两者再次相遇的节点就是**环的入口**

### 数学证明

设：
- 链表头部到环入口的距离为 **a**
- 环入口到第一次相遇点的距离为 **b**  
- 环的长度为 **L**，则相遇点到环入口的剩余距离为 **c = L - b**

第一次相遇时：
- slow 走了 `a + b` 步
- fast 走了 `a + b + n·L` 步（n 为 fast 多绕的圈数）

因为 fast 速度是 slow 的 2 倍：`2(a + b) = a + b + n·L`
→ `a + b = n·L`
→ `a = n·L - b = (n-1)·L + (L - b) = (n-1)·L + c`

**a = c + (n-1)·L** —— 这意味着从链表头部走 `a` 步到环入口的距离，等于从相遇点走 `c` 步到环入口（可能多绕几圈）的距离。

所以，让 slow 从头出发，fast 从相遇点出发，两者同速前进，必定在环入口相遇。

## 代码实现

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

## 图解过程

### 第一阶段：判圈

```
链表：3 → 2 → 0 → -4
           ↑__________↓

Step 1: slow=3, fast=3
Step 2: slow=2, fast=0
Step 3: slow=0, fast=2   ← fast 绕了一圈，套圈 slow
Step 4: slow=-4, fast=-4 ← 在节点 -4 相遇！有环！
```

### 第二阶段：找环入口

```
第一次相遇后：
  slow 重置到头部 (3)
  fast 留在相遇点 (-4)

以相同速度前进：
Step 1: slow=2, fast=2
        ↓       ↓
        两者在节点 2 相遇 → 节点 2 就是环的入口！
```

## 复杂度分析

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — slow 最多走 n 步（从头到入口再到相遇点），两阶段各 O(n) |
| 空间复杂度 | **O(1)** — 只用了两个指针 |

## 关键要点

1. **Floyd 判圈的核心是速度差**：只要 fast 比 slow 快（不一定是 2 倍），且速度差与环长互质，就能检测到环。选择 2 倍是工程最优实践。

2. **数学证明是面试亮点**：能推导出 `a = c + (n-1)·L` 是区分"背模板"和"真理解"的关键。

3. **等速回找的优雅**：第二阶段的 slow 和 fast 同速走，相遇即入口——这是 Floyd 算法最美妙的部分。

## 扩展思考

- 如果要求计算**环的长度**，如何做？（相遇后 fast 不动，slow 继续走一圈计数）
- 快指针走 3 步行不行？有什么影响？

相关文章：
- [寻找链表的中点](/technology/linked-list-middle/) — 快慢指针的简单应用
- [判断相交并找交点](/technology/linked-list-intersection/) — 另一个双指针经典
