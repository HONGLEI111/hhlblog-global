---
title: 链表：从节点到 LRU 缓存的 TypeScript 实现
published: 2026-04-26
description: '深入理解链表的增删改查、反转技巧、以及 LFU/LRU 缓存的 TypeScript 实现，含完整代码。'
image: ''
tags: [链表, TypeScript, 数据结构]
category: '算法'
draft: false
lang: ''
---

## 概述

链表是一种由节点串联起来的数据结构。每个节点保存数据，并通过指针指向下一个节点。和数组不同，链表不依赖连续下标，而是依赖节点之间的引用关系。

链表的优势是插入和删除节点时不需要移动大量元素；代价是无法像数组一样 O(1) 随机访问某个位置。

在前端和算法中，链表经常出现在 LRU 缓存、队列、撤销栈、虚拟列表调度和各种指针题中。

> 前置知识
> - **节点引用**：链表通过 `next` 串联节点
> - **指针重连**：插入和删除本质是修改引用
> - **虚拟头节点**：统一头节点和普通节点的处理

---

## 问题定义

链表适合表示“顺序存在，但位置不依赖下标”的数据。

一个单链表节点可以抽象为：

```text
value + next
```

多个节点串起来：

```text
head -> A -> B -> C -> null
```

链表要解决的问题是：当我们只知道某个节点引用时，如何高效地改变它周围的连接关系。

| 操作 | 数组 | 链表 |
| --- | --- | --- |
| 通过下标访问 | O(1) | O(n) |
| 已知位置后插入 | O(n) 移动元素 | O(1) 改指针 |
| 已知位置后删除 | O(n) 移动元素 | O(1) 改指针 |
| 顺序遍历 | O(n) | O(n) |

---

## 核心原理：分步图解

### 插入节点

在 `A` 和 `B` 之间插入 `X`：

```text
插入前: A -> B
步骤一: X -> B
步骤二: A -> X
插入后: A -> X -> B
```

顺序很重要：必须先让新节点指向后继节点，再让前驱节点指向新节点，否则会丢失原链路。

### 删除节点

删除 `B`：

```text
删除前: A -> B -> C
删除后: A ------> C
```

只需要让 `A.next = C`。在有垃圾回收的语言里，`B` 不再被引用后会被回收。

### 虚拟头节点

很多链表题会引入 dummy 节点：

```text
dummy -> head -> ...
```

它能把“删除头节点”和“删除中间节点”统一成同一种逻辑，减少边界分支。

---

## 基本操作与复杂度

| 操作 | 时间复杂度 | 说明 |
| --- | --- | --- |
| 查找某个值 | O(n) | 需要从头遍历 |
| 头部插入 | O(1) | 新节点指向旧 head |
| 尾部插入 | O(n) / O(1) | 有 tail 指针则 O(1) |
| 删除已知后继 | O(1) | 改变 `next` 指向 |
| 反转链表 | O(n) | 每条边反向一次 |

链表题最关键的不是复杂度，而是指针更新顺序。一个节点引用写错，就可能断链或形成环。

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

### 2. 反转链表

```typescript
function reverseList<T>(head: ListNode<T> | null): ListNode<T> | null {
  let prev: ListNode<T> | null = null;
  let current = head;

  while (current !== null) {
    const next = current.next;
    current.next = prev;
    prev = current;
    current = next;
  }

  return prev;
}
```

反转过程中的不变量：

- `prev` 是已经反转好的链表头；
- `current` 是还未处理的第一个节点；
- `next` 临时保存后续链路，避免断链。

### 3. 删除指定值

```typescript
function removeElements<T>(head: ListNode<T> | null, target: T): ListNode<T> | null {
  const dummy = new ListNode<T>(target, head);
  let current: ListNode<T> | null = dummy;

  while (current.next !== null) {
    if (current.next.value === target) {
      current.next = current.next.next;
    } else {
      current = current.next;
    }
  }

  return dummy.next;
}
```

虚拟头节点让删除头节点和删除普通节点共享同一段逻辑。

---

## 工程优化：双向链表与 LRU

单链表只能从前往后走。若需要 O(1) 删除任意节点，通常使用双向链表：

```text
prev <- node -> next
```

LRU 缓存就是双向链表和哈希表的组合：

- `Map` 负责 O(1) 找到节点；
- 双向链表负责 O(1) 移动最近使用节点；
- 头部表示最新，尾部表示最旧。

```typescript
class DoublyNode<K, V> {
  prev: DoublyNode<K, V> | null = null;
  next: DoublyNode<K, V> | null = null;

  constructor(
    public key: K,
    public value: V,
  ) {}
}
```

链表在工程里的价值往往不是单独使用，而是和哈希表组合，补足“顺序维护”能力。

---

## 应用与局限

### 典型应用

- LRU / LFU 缓存；
- 队列和双端队列的底层实现；
- 撤销、重做、历史记录；
- 高频插入删除的有序数据；
- 算法题中的反转、合并、判环、找中点。

### 局限性

- 不能通过下标快速访问；
- 每个节点额外存储指针，空间开销更高；
- 指针操作容易断链、成环；
- 在 JavaScript 中对象节点分散在堆上，缓存局部性不如数组。

---

## 总结

```mermaid
graph LR
    A[节点定义] --> B[next 串联]
    B --> C[插入/删除重连]
    C --> D[虚拟头简化边界]
```

- 链表用引用关系维护顺序，不依赖连续下标。
- 插入和删除的核心是改变指针指向。
- dummy 节点能显著减少头节点边界处理。
- 反转链表要先保存 `next`，再修改当前节点指向。
- 链表常和哈希表组合，用于缓存和顺序维护。
