---
title: 链表双指针：快慢指针在链表中的精妙应用
published: 2026-04-26
description: '掌握链表双指针的核心技巧：快慢指针找中点、判环、求交点，用 TypeScript 实现所有经典题目。'
image: ''
tags: [链表双指针, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 概述

链表双指针是一组围绕节点引用移动的技巧。因为链表不能通过下标随机访问，很多数组中简单的“取中点”“倒数第 k 个”“判断是否相交”，在链表里都需要通过指针速度或距离来完成。

最常见的链表双指针包括：

- 快慢指针：一个走得快，一个走得慢；
- 前后指针：两个指针保持固定距离；
- 同步指针：两个指针在不同链表上按规则同步移动。

> 前置知识
> - **链表节点**：只能沿 `next` 单向前进
> - **快慢指针**：用速度差制造距离关系
> - **虚拟头节点**：删除节点时统一边界处理

---

## 问题定义

链表双指针主要解决三类问题：

| 问题 | 指针模型 | 关键思想 |
| --- | --- | --- |
| 找中点 | 快慢指针 | 快指针走两步，慢指针走一步 |
| 判断环 | 快慢指针 | 如果有环，快指针会追上慢指针 |
| 删除倒数第 N 个 | 前后指针 | 两指针保持 N 个节点距离 |
| 找相交节点 | 同步指针 | 两指针走过相同总长度 |

这些问题的共同点是：不能依赖长度或下标直接定位，只能通过移动过程建立关系。

---

## 核心原理：分步图解

### 快慢指针找中点

```text
slow 每次走 1 步
fast 每次走 2 步
```

当 `fast` 到达尾部时，`slow` 正好在中间附近。

```text
1 -> 2 -> 3 -> 4 -> 5 -> null
          ^
         slow
```

### 快慢指针判环

如果链表有环，快指针会在环内不断追赶慢指针。由于每轮快指针比慢指针多走一步，最终一定会相遇。

```text
A -> B -> C -> D
     ^         |
     |---------|
```

### 前后指针删除倒数节点

让 `fast` 先走 `n` 步，然后 `slow` 和 `fast` 一起走。当 `fast` 到尾部时，`slow` 就在待删除节点前面。

---

## 算法精细步骤

链表双指针题的通用步骤：

1. 明确两个指针之间要维护什么关系；
2. 处理空链表、单节点、头节点删除等边界；
3. 按规则移动指针；
4. 在循环结束时解释每个指针所在位置；
5. 修改指针连接或返回目标节点。

最容易错的是循环条件。例如找中点时常见两种写法：

```typescript
while (fast !== null && fast.next !== null) {
  slow = slow.next;
  fast = fast.next.next;
}
```

这个条件保证 `fast.next.next` 不会访问空值。

---

## TypeScript 实现

### 1. 节点定义

```typescript
class ListNode<T> {
  constructor(
    public value: T,
    public next: ListNode<T> | null = null,
  ) {}
}
```

### 2. 找链表中点

```typescript
function middleNode<T>(head: ListNode<T> | null): ListNode<T> | null {
  let slow = head;
  let fast = head;

  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
  }

  return slow;
}
```

偶数长度时，这个实现返回第二个中间节点。

### 3. 判断是否有环

```typescript
function hasCycle<T>(head: ListNode<T> | null): boolean {
  let slow = head;
  let fast = head;

  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;

    if (slow === fast) return true;
  }

  return false;
}
```

### 4. 删除倒数第 N 个节点

```typescript
function removeNthFromEnd<T>(head: ListNode<T> | null, n: number): ListNode<T> | null {
  const dummy = new ListNode<T>(null as T, head);
  let fast: ListNode<T> | null = dummy;
  let slow: ListNode<T> | null = dummy;

  for (let i = 0; i < n; i++) {
    fast = fast!.next;
  }

  while (fast?.next !== null) {
    fast = fast.next;
    slow = slow!.next;
  }

  slow!.next = slow!.next!.next;
  return dummy.next;
}
```

---

## 工程优化：把距离变成不变量

链表双指针的本质是维护不变量：

- 快慢指针：`fast` 走过的距离约等于 `2 * slow`；
- 前后指针：`fast` 和 `slow` 始终相差 `n` 个节点；
- 相交链表：两个指针最终走过 `lenA + lenB` 的相同长度。

相交链表可以这样写：

```typescript
function getIntersectionNode<T>(
  headA: ListNode<T> | null,
  headB: ListNode<T> | null,
): ListNode<T> | null {
  let a = headA;
  let b = headB;

  while (a !== b) {
    a = a === null ? headB : a.next;
    b = b === null ? headA : b.next;
  }

  return a;
}
```

两个指针交换起点后，路径长度被拉平，因此如果有交点会在同一轮抵达。

---

## 应用与局限

### 典型应用

- 找链表中点；
- 判断环和寻找入环点；
- 删除倒数第 N 个节点；
- 判断两个链表是否相交；
- 回文链表中的“找中点 + 反转后半段”。

### 局限性

- 指针语义不如数组下标直观；
- 循环条件非常敏感；
- 修改链表前必须保存后续节点；
- 不适合需要频繁随机访问的问题。

---

## 总结

```mermaid
graph LR
    A[定义指针距离] --> B[同步移动]
    B --> C[触发相遇/定位]
    C --> D[执行判断或删除]
```

- 链表双指针用移动关系代替下标定位。
- 快慢指针适合找中点和判环。
- 前后指针适合倒数位置相关问题。
- 同步指针可以消除链表长度差。
- 写代码前先定义两个指针之间的不变量。
