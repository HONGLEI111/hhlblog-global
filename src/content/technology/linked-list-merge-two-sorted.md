---
title: 合并两个有序链表：双指针与 Dummy 节点
published: 2026-08-10
description: '将两个升序链表合并为一个新的升序链表。使用双指针逐个比较节点值，dummy 虚拟头节点统一处理边界情况。附带 C / C++ / JavaScript 三语言实现。'
image: ''
tags: [链表, 双指针, 合并, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 题目描述

将两个**升序**链表 `list1` 和 `list2` 合并为一个新的**升序**链表，并返回合并后的链表头节点。新链表由两个输入链表的所有节点拼接而成。

```
输入：list1 = 1→2→4, list2 = 1→3→4
输出：1→1→2→3→4→4
```

## 解题思路

### 核心思想：双指针逐个比较

想象你有两叠按从小到大排好的扑克牌，你要把它们合并成一叠。每次你只需要看两叠牌最上面那张，把较小的拿走放到结果中。

对于链表，这个"比较 → 取较小者 → 指针后移"的过程可以完美地用双指针实现。

### Dummy 节点的作用

合并链表的第一个节点是谁？是 `list1` 的头还是 `list2` 的头？这个判断会让代码变得啰嗦。引入一个**虚拟头节点（dummy）**，所有节点统一追加在 dummy 之后，最后返回 `dummy.next` 即可。

### 算法步骤

1. 创建 dummy 节点和尾指针 `tail`
2. 同时遍历两个链表，比较当前节点值
3. 将较小节点接在 tail 后面，对应指针后移
4. 当任一链表遍历完毕，将剩余链表直接接在尾部
5. 返回 `dummy.next`

## 代码实现

:::code-tabs{default="cpp"}
```c title="C"
#include <stdio.h>
#include <stdlib.h>

typedef struct ListNode {
    int val;
    struct ListNode *next;
} ListNode;

ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
    // 创建 dummy 虚拟头节点
    ListNode dummy;
    dummy.next = NULL;
    ListNode* tail = &dummy;

    // 双指针遍历两个链表
    while (list1 && list2) {
        if (list1->val <= list2->val) {
            tail->next = list1;
            list1 = list1->next;
        } else {
            tail->next = list2;
            list2 = list2->next;
        }
        tail = tail->next;
    }

    // 将剩余链表接在尾部
    tail->next = list1 ? list1 : list2;

    return dummy.next;
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
    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
        // 创建 dummy 虚拟头节点
        ListNode dummy(0);
        ListNode* tail = &dummy;

        // 双指针遍历两个链表
        while (list1 && list2) {
            if (list1->val <= list2->val) {
                tail->next = list1;
                list1 = list1->next;
            } else {
                tail->next = list2;
                list2 = list2->next;
            }
            tail = tail->next;
        }

        // 将剩余链表接在尾部
        tail->next = list1 ? list1 : list2;

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

function mergeTwoLists(list1, list2) {
    // 创建 dummy 虚拟头节点
    const dummy = new ListNode(0);
    let tail = dummy;

    // 双指针遍历两个链表
    while (list1 && list2) {
        if (list1.val <= list2.val) {
            tail.next = list1;
            list1 = list1.next;
        } else {
            tail.next = list2;
            list2 = list2.next;
        }
        tail = tail.next;
    }

    // 将剩余链表接在尾部
    tail.next = list1 ? list1 : list2;

    return dummy.next;
}
```
:::

## 图解过程

```
初始状态：
list1:  1 → 2 → 4
list2:  1 → 3 → 4
dummy: [ ] → ?

Step 1: 比较 1 和 1 → 取 list1 的 1
dummy → 1(list1)  tail=1

Step 2: 比较 2 和 1 → 取 list2 的 1
dummy → 1 → 1(list2)  tail=1(list2)

Step 3: 比较 2 和 3 → 取 list1 的 2
dummy → 1 → 1 → 2(list1)  tail=2

Step 4: 比较 4 和 3 → 取 list2 的 3
dummy → 1 → 1 → 2 → 3(list2)  tail=3

Step 5: 比较 4 和 4 → 取 list1 的 4
dummy → 1 → 1 → 2 → 3 → 4(list1)  tail=4

Step 6: list1 为空，接上 list2 剩余部分
dummy → 1 → 1 → 2 → 3 → 4 → 4(list2)

结果：1→1→2→3→4→4
```

## 复杂度分析

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(m + n)** — 两个链表各遍历一次 |
| 空间复杂度 | **O(1)** — 只用了 dummy 和 tail 两个额外指针，原地合并 |

## 关键要点

1. **Dummy 节点的妙用**：避免了对"头节点是谁"的特殊判断，让所有节点统一处理
2. **尾指针 tail**：始终指向结果链表的最后一个节点，方便 `O(1)` 追加
3. **剩余链表直接拼接**：循环结束后，未遍历完的链表本身就是有序的，直接接上即可

## 扩展思考

- 如果要求**去重**（相等元素只保留一个），如何修改？
- 如果要求**不开辟新节点**但返回**全新链表**（深拷贝节点），怎么处理？

相关文章：
- [合并 K 个有序链表](/technology/linked-list-merge-k-sorted/) — 从 2 到 K 的扩展
- [链表的分解](/technology/linked-list-partition/) — 同样是"拆分再组合"的思想
