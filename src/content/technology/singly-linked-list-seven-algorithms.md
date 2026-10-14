---
title: 单链表七大算法：双指针与分治思想精讲
published: 2026-08-10
description: '系统掌握单链表七大经典算法：合并有序链表、链表分解、合并 K 个链表、倒数第 K 个节点、中点查找、环检测、链表相交。使用双指针与分治思想，附带 C / C++ / JavaScript 三语言实现。'
image: ''
tags: [链表, 双指针, 分治, 算法, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 概述

单链表是最基础也最常考的数据结构之一。看似简单，但其**单向遍历、无法随机访问**的特性催生了一批经典的算法技巧——双指针、分治、虚拟头节点。本文精选七大单链表高频算法，逐一拆解思路并给出三语言实现。

> 阅读建议：本文为总览。每个算法的完整题解、图解与代码演示请通过下方链接进入独立文章。

---

## 七大算法一览

| # | 算法 | 核心技巧 | 时间复杂度 | 独立文章 |
|---|------|----------|------------|----------|
| 1 | 合并两个有序链表 | 双指针 + dummy 节点 | O(m+n) | [详细题解](/technology/linked-list-merge-two-sorted/) |
| 2 | 链表的分解 | 双 dummy 节点拆分 | O(n) | [详细题解](/technology/linked-list-partition/) |
| 3 | 合并 K 个有序链表 | 最小堆 / 分治合并 | O(N log k) | [详细题解](/technology/linked-list-merge-k-sorted/) |
| 4 | 寻找倒数第 K 个节点 | 双指针（间隔 k 步） | O(n) | [详细题解](/technology/linked-list-kth-from-end/) |
| 5 | 寻找链表的中点 | 快慢指针 | O(n) | [详细题解](/technology/linked-list-middle/) |
| 6 | 判断环并找环起点 | Floyd 判圈 + 等速相遇 | O(n) | [详细题解](/technology/linked-list-cycle/) |
| 7 | 判断相交并求交点 | 双指针交替遍历 | O(m+n) | [详细题解](/technology/linked-list-intersection/) |

---

## 为什么是这些算法？

这七个算法覆盖了单链表题目中**最重要的三种思维模式**：

### 一、双指针技术

算法 1、4、5、6、7 的核心都是双指针（或快慢指针）。双指针的精髓在于利用两个指针的**速度差**或**位置差**，在一次遍历中提取关键信息：

- **位置差**：fast 先走 k 步 → 找倒数第 k 个节点
- **速度差**：fast 走两步、slow 走一步 → 找中点、判环
- **交替遍历**：pA 走完走 pB、pB 走完走 pA → 找交点

### 二、虚拟头节点（Dummy Node）

算法 1、2、3 都用到了 dummy 节点。它消除了"头节点可能为空或被修改"的边界情况，让代码**统一处理所有节点**，大幅简化逻辑。

### 三、分治与堆

算法 3 展示了如何将"合并两个"扩展到"合并 K 个"——既可以用分治法两两归并，也可以用小根堆维护 K 个指针的最小值。这是**规模扩展**的经典范式。

---

## 链表节点定义

以下所有算法使用的单链表节点结构：

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

---

## 快速导航

点击下方链接进入各算法的详细题解，包含完整的解题思路、图解、代码与复杂度分析：

1. **[合并两个有序链表](/technology/linked-list-merge-two-sorted/)** — 双指针逐个比较，dummy 节点简化边界
2. **[链表的分解](/technology/linked-list-partition/)** — 双 dummy 分离小值和大值，再拼接
3. **[合并 K 个有序链表](/technology/linked-list-merge-k-sorted/)** — 最小堆 / 分治合并，从 2 到 K 的扩展
4. **[寻找倒数第 K 个节点](/technology/linked-list-kth-from-end/)** — fast 先走 K 步，slow 再同步出发
5. **[寻找链表的中点](/technology/linked-list-middle/)** — 快慢指针，fast 到终点时 slow 恰在中点
6. **[判断环并找环起点](/technology/linked-list-cycle/)** — Floyd 判圈 + 等速回找入口
7. **[判断相交并求交点](/technology/linked-list-intersection/)** — 交替遍历，走对方的路找到交点
