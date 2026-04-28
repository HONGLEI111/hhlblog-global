---
title: 二分搜索：从入门到边界处理精通
published: 2026-04-26
description: '彻底掌握二分搜索的左闭右闭、左闭右开写法，以及搜索左边界、右边界的 TypeScript 实现，附带实用场景。'
image: ''
tags: [二分搜索, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 概述

**二分搜索（Binary Search）** 是利用单调性每次排除一半候选空间的算法。它不只用于“在有序数组里找值”，也常用于“寻找第一个满足条件的位置”或“在答案范围上二分”。

> 前置知识
> - **有序数组**：最常见的二分载体
> - **单调谓词**：条件从 false 到 true，或从 true 到 false 只变化一次
> - **区间不变量**：每轮循环都要保持答案仍在候选区间内

---

## 问题定义

给定一个有序或具有单调性的搜索空间，快速定位目标值、边界位置或最优答案。

| 要素 | 说明 |
|------|------|
| 输入 | 有序数组、目标值，或一个单调判断函数 |
| 输出 | 目标下标、插入位置、左/右边界或最小可行答案 |
| 核心条件 | 搜索空间可以被一分为二并安全排除一半 |
| 典型应用 | 查找、lower_bound、旋转数组、答案二分 |

---

## 核心原理：分步图解

以数组 `[1, 3, 5, 7, 9, 11, 13]` 查找 `9` 为例：

```mermaid
graph LR
    A[区间 0..6 mid=3 值 7] --> B[目标更大 排除左半]
    B --> C[区间 4..6 mid=5 值 11]
    C --> D[目标更小 排除右半]
    D --> E[区间 4..4 找到 9]
```

二分的关键不是 `mid` 怎么写，而是每次比较后能证明被排除的一半一定不包含答案。

### 边界搜索

很多题不是找任意一个目标，而是找边界：

```text
nums:   1  2  2  2  3
index:  0  1  2  3  4
左边界:    ^
右边界:          ^
```

这类问题更适合转化为“找第一个 `>= target` 的位置”和“找第一个 `> target` 的位置”。

---

## 算法精细步骤

```
算法：LowerBound(nums, target)
输入：升序数组 nums，目标 target
输出：第一个 >= target 的位置

1. left ← 0, right ← nums.length
2. while left < right:
3.     mid ← left + floor((right - left) / 2)
4.     if nums[mid] >= target:
5.         right ← mid
6.     else:
7.         left ← mid + 1
8. return left
```

**复杂度分析**：

| 操作 | 时间复杂度 | 空间复杂度 | 说明 |
|------|------|------|------|
| 普通查找 | O(log n) | O(1) | 每轮排除一半 |
| 左边界 / 右边界 | O(log n) | O(1) | 循环次数不变 |
| 旋转数组搜索 | O(log n) | O(1) | 每轮至少一半有序 |
| 答案二分 | O(log R × check) | O(1) 或取决于 check | R 为答案范围 |

---

## TypeScript 实现

### 1. 普通查找

```typescript
function binarySearch(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }

  return -1;
}
```

### 2. 左边界

```typescript
function lowerBound(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] >= target) right = mid;
    else left = mid + 1;
  }

  return left;
}

function searchLeft(nums: number[], target: number): number {
  const index = lowerBound(nums, target);
  return index < nums.length && nums[index] === target ? index : -1;
}
```

### 3. 右边界

```typescript
function upperBound(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] > target) right = mid;
    else left = mid + 1;
  }

  return left;
}

function searchRight(nums: number[], target: number): number {
  const index = upperBound(nums, target) - 1;
  return index >= 0 && nums[index] === target ? index : -1;
}
```

### 4. 旋转排序数组搜索

```typescript
function searchRotated(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] === target) return mid;

    if (nums[left] <= nums[mid]) {
      if (nums[left] <= target && target < nums[mid]) right = mid - 1;
      else left = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[right]) left = mid + 1;
      else right = mid - 1;
    }
  }

  return -1;
}
```

### 5. 寻找峰值

```typescript
function findPeakElement(nums: number[]): number {
  let left = 0;
  let right = nums.length - 1;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] > nums[mid + 1]) right = mid;
    else left = mid + 1;
  }

  return left;
}
```

---

## 工程优化：把问题改写成单调判断

二分最稳定的写法是抽象出 `check(mid)`：

| 问题 | 单调判断 |
|------|------|
| 找插入位置 | `nums[mid] >= target` |
| 最小可行容量 | `capacity` 是否能完成任务 |
| 第一个错误版本 | `isBadVersion(mid)` |
| 峰值问题 | `nums[mid] > nums[mid + 1]` 决定峰值方向 |

在工程代码里，推荐先写清楚区间含义，再写循环条件。对于左闭右开 `[left, right)`，循环通常是 `while (left < right)`；对于左闭右闭 `[left, right]`，循环通常是 `while (left <= right)`。

---

## 应用与局限

### 典型应用

- 有序数组查找、插入位置、边界定位
- 日志时间戳定位、版本区间定位
- 峰值、旋转数组等隐式单调问题
- 最小化最大值、最大化最小值的答案二分

### 局限性

| 局限 | 说明 |
|------|------|
| 依赖单调性 | 无序且不可判定方向时不能直接二分 |
| 边界易错 | 区间定义不清会导致死循环或漏答案 |
| 重复元素复杂 | 旋转数组含大量重复值时可能退化 |

---

## 总结

```mermaid
graph LR
    A[确认单调性] --> B[定义搜索区间]
    B --> C[计算 mid]
    C --> D[判断答案方向]
    D --> E[排除一半]
    E --> F[返回边界或目标]
```

**核心要点**：

1. 二分的本质是利用单调性排除一半候选空间。
2. 普通查找可用左闭右闭，边界查找更适合左闭右开。
3. `lowerBound` 和 `upperBound` 能覆盖大多数边界问题。
4. 先写区间不变量，再写代码，能显著减少边界错误。
