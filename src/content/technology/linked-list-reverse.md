---
title: 单链表反转：迭代与递归全解析（整个 / 前 N 个 / 区间 / K 个一组）
published: 2026-09-01
description: '系统掌握单链表反转的迭代与递归两种解法，并用两种思路分别解决反转整个链表、反转前 N 个节点、区间反转、K 个一组反转四个经典问题，附 C / C++ / JavaScript 三语言实现。'
image: ''
tags: [链表, 反转, 迭代, 递归, 双指针, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 概述

反转单链表是链表类算法题的「地基」，几乎所有链表的进阶操作（回文判断、K 个一组反转、部分反转）都以它为基础。

反转的本质只有一句话：**把每条 `next` 指针的方向反过来**。

```text
反转前：1 → 2 → 3 → 4 → null
反转后：4 → 3 → 2 → 1 → null
```

围绕「反转」这一核心，本文按难度递进讲四个经典问题：

| # | 问题 | 对应题目 | 难度 |
|---|------|---------|------|
| 1 | 反转整个链表 | LeetCode 206 | 简单 |
| 2 | 反转前 N 个节点 | 206 的变体 | 中等 |
| 3 | 反转链表的一部分（区间） | LeetCode 92 | 中等 |
| 4 | K 个一组反转链表 | LeetCode 25 | 困难 |

每个问题都给出**迭代**与**递归**两种解法。掌握后你会发现：后三个问题其实都是第一个问题的「套壳」。

> 前置知识
> - **链表节点**：只能沿 `next` 单向前进
> - **指针重连**：反转的本质是修改引用
> - **递归**：理解「后序遍历」式的处理顺序

## 链表节点定义

本文所有代码共用下面的单链表节点结构：

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

## 核心思想：迭代 vs 递归

### 迭代：三指针

迭代解法用三个指针 `prev`、`curr`、`next`，每一轮重复四步：

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

循环结束的条件是 `curr` 走到 `null`，此时 `prev` 正好指向反转后的新头节点。

> 关键点：第 1 步「先保存 `next`」绝不能省，否则 `curr.next` 被改后，原本的后续链表就再也找不回来了。

### 递归：后序遍历

递归解法的精髓是「**先反转后面的，再处理当前的**」，本质上是链表的后序遍历：

```text
reverseList(1→2→3→4)
  = 先递归反转后面的：reverseList(2→3→4)  →  4→3→2
    再让「2」指向「1」：head.next.next = head
    最后断开「1」的旧指向：head.next = null
```

核心只有两行：

```text
head.next.next = head   // 让后继节点反向指向自己
head.next = null        // 断开原来的正向指向
```

递归的**基准情况**是 `head` 为空或 `head.next` 为空（只剩一个节点，无需反转），此时直接返回 `head`。

## 四大经典问题

### 1. 反转整个链表（LeetCode 206）

**思路（迭代）**：三指针从头走到尾，见上文。

**思路（递归）**：先反转 `head.next` 开始的子链，再让 `head.next` 指向 `head`，最后断开 `head.next`。

```text
输入：1 → 2 → 3 → 4 → 5 → null
输出：5 → 4 → 3 → 2 → 1 → null
```

### 2. 反转前 N 个节点

**思路（迭代）**：只反转前 `n` 个，反转结束后把**原头节点**（此时已是反转段的尾）接到剩余链上。

```text
反转前：1 → 2 → 3 → 4 → 5 → null，n = 3
反转后：3 → 2 → 1 → 4 → 5 → null
                          └─ 剩余部分原样保留
```

**思路（递归）**：与「反转整个」几乎一样，唯一区别是反转结束后，尾节点要接到**第 `n+1` 个节点**上。为此引入一个后继指针 `successor`，在递归到 `n == 1` 时记录下「第 n 个节点的后继」，并在回溯时把尾节点的 `next` 指向它。

`successor` 正是「反转前 N 个」能过渡到「区间反转」的关键桥梁。

### 3. 反转链表的一部分（区间 [left, right]，LeetCode 92）

**思路（迭代）**：用**虚拟头节点 dummy** 定位到 `left` 的前驱 `pre`，然后对 `[left, right]` 这段做「头插法」反转——每次把 `curr.next` 摘下来插到 `pre` 后面，共执行 `right - left` 次。

```text
输入：1 → 2 → 3 → 4 → 5，left = 2, right = 4
输出：1 → 4 → 3 → 2 → 5
           └─ [2,3,4] 被反转 ─┘
```

**思路（递归）**：递归地缩小问题规模。当 `left == 1` 时，区间反转就退化为「反转前 `right` 个」；否则不断移动头指针，把 `left` 和 `right` 同时减 1 向深处递归，回来时把当前头接回去。

### 4. K 个一组反转链表（LeetCode 25）

**思路（迭代）**：用 `pre` 和 `end` 两个指针扫描，每次先把 `end` 前进 `k` 步「探路」：

- 若剩余不足 `k` 个，直接结束；
- 否则记录本组起点 `start` 和下一组起点 `next`，把本组**截断**后整体反转，再接回原链。

**思路（递归）**：先判断剩余是否够 `k` 个，不够则原样返回；够则反转前 `k` 个（复用「反转前 N 个」），再递归处理剩余部分并接回。

```text
输入：1 → 2 → 3 → 4 → 5，k = 2
输出：2 → 1 → 4 → 3 → 5
      └ 反转 ┘ └ 反转 ┘ └ 不足 k 个，原样 ┘
```

## 代码实现

每种语言都包含四个问题 × 两种解法共 8 个函数，按注释分区。递归「反转前 N 个」用到的 `successor` 是模块级（文件级）变量。

:::code-tabs{default="cpp"}
```c title="C"
#include <stddef.h>

typedef struct ListNode {
    int val;
    struct ListNode *next;
} ListNode;

/* ============ 1. 反转整个链表 ============ */

/* 迭代 */
ListNode* reverseList(ListNode* head) {
    ListNode* prev = NULL;
    ListNode* curr = head;
    while (curr) {
        ListNode* next = curr->next; /* 先保存后继 */
        curr->next = prev;           /* 反转当前指向 */
        prev = curr;                 /* prev 前移 */
        curr = next;                 /* curr 前移 */
    }
    return prev;
}

/* 递归 */
ListNode* reverseListRecursive(ListNode* head) {
    if (head == NULL || head->next == NULL) return head;
    ListNode* last = reverseListRecursive(head->next);
    head->next->next = head; /* 后继指向自己 */
    head->next = NULL;       /* 断开原指向 */
    return last;
}

/* ============ 2. 反转前 N 个节点 ============ */

/* 迭代 */
ListNode* reverseN(ListNode* head, int n) {
    ListNode* prev = NULL;
    ListNode* curr = head;
    for (int i = 0; i < n && curr; i++) {
        ListNode* next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }
    head->next = curr; /* 原头节点接上剩余部分 */
    return prev;
}

/* 递归（借助后继指针 successor） */
static ListNode* successor = NULL;

ListNode* reverseNRecursive(ListNode* head, int n) {
    if (n == 1) {
        successor = head->next; /* 记录第 n+1 个节点 */
        return head;
    }
    ListNode* last = reverseNRecursive(head->next, n - 1);
    head->next->next = head;
    head->next = successor; /* 反转后的尾节点接上后继 */
    return last;
}

/* ============ 3. 反转链表的一部分（区间 [left, right]） ============ */

/* 迭代（头插法） */
ListNode* reverseBetween(ListNode* head, int left, int right) {
    ListNode dummy;
    dummy.next = head;
    ListNode* pre = &dummy;
    for (int i = 1; i < left; i++) pre = pre->next; /* 定位到 left 前驱 */

    ListNode* curr = pre->next;
    for (int i = 0; i < right - left; i++) {
        ListNode* next = curr->next;
        curr->next = next->next;
        next->next = pre->next;
        pre->next = next;
    }
    return dummy.next;
}

/* 递归（退化为反转前 right 个） */
ListNode* reverseBetweenRecursive(ListNode* head, int left, int right) {
    if (left == 1) {
        return reverseNRecursive(head, right);
    }
    head->next = reverseBetweenRecursive(head->next, left - 1, right - 1);
    return head;
}

/* ============ 4. K 个一组反转 ============ */

/* 迭代 */
ListNode* reverseKGroup(ListNode* head, int k) {
    ListNode dummy;
    dummy.next = head;
    ListNode* pre = &dummy;
    ListNode* end = &dummy;

    while (end->next) {
        for (int i = 0; i < k && end; i++) end = end->next; /* 探路 */
        if (!end) break; /* 不够 k 个，结束 */

        ListNode* start = pre->next;
        ListNode* next = end->next;      /* 记录下一组起点 */
        end->next = NULL;                /* 截断本组 */
        pre->next = reverseList(start);  /* 反转本组 */
        start->next = next;              /* 接回后续 */
        pre = start;                     /* pre 指向本组末尾 */
        end = pre;                       /* 重置 end */
    }
    return dummy.next;
}

/* 递归 */
ListNode* reverseKGroupRecursive(ListNode* head, int k) {
    ListNode* end = head;
    for (int i = 0; i < k; i++) {
        if (!end) return head; /* 不够 k 个，保持原样 */
        end = end->next;
    }

    ListNode* newHead = reverseN(head, k);               /* 反转前 k 个 */
    head->next = reverseKGroupRecursive(end, k);         /* 递归处理剩余 */
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
    /* ============ 1. 反转整个链表 ============ */

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

    /* ============ 2. 反转前 N 个节点 ============ */

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

    /* ============ 3. 反转链表的一部分 ============ */

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

    /* ============ 4. K 个一组反转 ============ */

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
    ListNode* successor = nullptr; /* 递归「反转前 N 个」用到的后继指针 */
};
```

```js title="JavaScript"
class ListNode {
    constructor(val, next) {
        this.val = (val === undefined ? 0 : val);
        this.next = (next === undefined ? null : next);
    }
}

// 递归「反转前 N 个」用到的后继指针
let successor = null;

/* ============ 1. 反转整个链表 ============ */

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

/* ============ 2. 反转前 N 个节点 ============ */

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

/* ============ 3. 反转链表的一部分 ============ */

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

/* ============ 4. K 个一组反转 ============ */

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

## 复杂度与解法对比

| 问题 | 迭代时间 | 迭代空间 | 递归时间 | 递归空间 |
|------|---------|---------|---------|---------|
| 反转整个链表 | O(n) | O(1) | O(n) | O(n)（递归栈） |
| 反转前 N 个 | O(n) | O(1) | O(n) | O(n) |
| 区间反转 | O(n) | O(1) | O(n) | O(n) |
| K 个一组 | O(n) | O(1) | O(n) | O(n/k) |

**迭代 vs 递归**：

- **迭代**：空间 O(1)，无栈溢出风险，工程首选。
- **递归**：代码更简洁、语义更直观，但每次调用都占用栈空间，n 很大时可能**栈溢出**；其价值更多在于「思路迁移」——`reverseN` + `successor` 的写法能干净地推出区间反转和 K 组反转。

## 关键要点

1. **反转前先保存 `next`**：这是迭代解法的命门，忘记保存就会断链。
2. **`head.next.next = head` 是递归的灵魂**：一句「让后继指向自己」完成了反向重连。
3. **`successor` 是「前 N 个」到「区间」的桥梁**：记录「第 n+1 个节点」，让反转段能正确接回剩余部分。
4. **区间反转 = 定位前驱 + 头插法**：dummy 节点统一了 `left = 1` 的边界情况。
5. **K 组反转先「探路」**：判断剩余是否够 `k` 个，不够则原样保留，这是它与「整个反转」的唯一区别。

## 扩展思考

- **回文链表**（LeetCode 234）：先快慢指针找中点，再反转后半段，最后双指针比较——正是「反转」+「双指针」的组合拳。
- **递归栈风险**：链表长度到 `10^5` 时，递归深度可能超出默认栈上限，此时应改用迭代。
- 反转整个链表还有一种「**尾插法**」写法（每轮把 `curr` 插到 dummy 之后），与区间反转的头插法一脉相承，可以自行尝试。

## 相关文章

- [链表：从节点到 LRU 缓存](/technology/linked-list/) — 链表基础与反转入门
- [单链表七大算法](/technology/singly-linked-list-seven-algorithms/) — 链表算法总览
- [链表双指针](/technology/linked-list-two-pointers/) — 快慢指针（回文链表会用到的找中点）
