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

## 1. 为什么链表需要双指针？

链表无法像数组那样随机访问，但双指针可以弥补这一缺陷：

```typescript
class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val: number, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}
```

---

## 2. 求中间节点

```typescript
// 快指针走两步，慢指针走一步 → 快指针到末尾时，慢指针在中间
function middleNode(head: ListNode | null): ListNode | null {
  let slow = head, fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
  }
  return slow;
}
```

---

## 3. 判断环形链表

```typescript
// 有环 → 快慢指针必定相遇
function hasCycle(head: ListNode | null): boolean {
  let slow = head, fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
```

### 3.1 找到环的入口

```typescript
function detectCycle(head: ListNode | null): ListNode | null {
  let slow = head, fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) {
      // 相遇后，一个从起点出发，一个从相遇点出发
      // 再次相遇即为环入口
      let ptr = head;
      while (ptr !== slow) {
        ptr = ptr!.next;
        slow = slow!.next;
      }
      return ptr;
    }
  }
  return null;
}
```

---

## 4. 相交链表

```typescript
function getIntersectionNode(
  headA: ListNode | null,
  headB: ListNode | null
): ListNode | null {
  if (headA === null || headB === null) return null;

  let pa: ListNode | null = headA;
  let pb: ListNode | null = headB;

  // 走到末尾后切换到对方的头，总距离相等时相遇
  while (pa !== pb) {
    pa = pa === null ? headB : pa.next;
    pb = pb === null ? headA : pb.next;
  }

  return pa;
}
```

---

## 5. 删除倒数第 N 个节点

```typescript
function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {
  const dummy = new ListNode(0, head);
  let fast: ListNode | null = dummy;
  let slow: ListNode | null = dummy;

  // fast 先走 n+1 步
  for (let i = 0; i <= n; i++) {
    fast = fast!.next;
  }

  // 一起走，fast 到末尾时 slow 在倒数第 n+1
  while (fast !== null) {
    fast = fast.next;
    slow = slow!.next;
  }

  // 删除 slow 的下一个
  slow!.next = slow!.next!.next;

  return dummy.next;
}
```

---

## 6. 回文链表

```typescript
function isPalindrome(head: ListNode | null): boolean {
  if (head === null) return true;

  // 1. 找中点
  let slow: ListNode | null = head;
  let fast: ListNode | null = head;
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
  }

  // 2. 反转后半部分
  let prev: ListNode | null = null;
  while (slow !== null) {
    const next: ListNode | null = slow.next;
    slow.next = prev;
    prev = slow;
    slow = next;
  }

  // 3. 比较前后两半
  let left = head;
  let right = prev;
  while (right !== null) {
    if (left.val !== right.val) return false;
    left = left.next!;
    right = right.next;
  }

  return true;
}
```

---

## 7. 总结

| 问题 | 解法 | 核心思路 |
|------|------|----------|
| 中节点 | 快慢指针 | fast 走两步，slow 走一步 |
| 判环 | 快慢指针 | 有环必相遇 |
| 环入口 | 快慢指针 + 双指针 | 数学推导：相遇后等距 |
| 倒数第 K | 前后指针 | 固定间距 K |
| 相交点 | 双指针 | 走完自己走对方 |
| 回文 | 中点 + 反转 | |



---

## 参考资料

- [LeetCode — Linked List](https://leetcode.cn/tag/linked-list/)
