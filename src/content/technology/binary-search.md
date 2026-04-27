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

## 1. 什么是二分搜索？

在**有序数组**中，每次排除一半候选元素，将查找范围缩小一半。

```typescript
// 从 100 万条数据中找到目标
// 线性搜索：最多 100 万次
// 二分搜索：最多 20 次（log₂(1,000,000) ≈ 20）
```

---

## 2. 基础模板：左闭右闭 [left, right]

```typescript
function binarySearch(nums: number[], target: number): number {
  let left = 0, right = nums.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1; // 未找到
}
```

---

## 3. 搜索左边界

找第一个 ≥ target 的位置（lower_bound）。

```typescript
function searchLeft(nums: number[], target: number): number {
  let left = 0, right = nums.length;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] >= target) {
      right = mid;       // 收缩右边界
    } else {
      left = mid + 1;
    }
  }

  return left < nums.length && nums[left] === target ? left : -1;
}

// 示例
console.log(searchLeft([1, 2, 2, 2, 3], 2));     // 1
console.log(searchLeft([1, 2, 2, 2, 3], 4));     // -1
```

---

## 4. 搜索右边界

找最后一个 ≤ target 的位置（upper_bound）。

```typescript
function searchRight(nums: number[], target: number): number {
  let left = 0, right = nums.length;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] <= target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left - 1 >= 0 && nums[left - 1] === target ? left - 1 : -1;
}

// 示例
console.log(searchRight([1, 2, 2, 2, 3], 2));     // 3
```

---

## 5. 搜索插入位置

```typescript
function searchInsert(nums: number[], target: number): number {
  let left = 0, right = nums.length;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] >= target) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }

  return left;
}
```

---

## 6. 实战题目

### 6.1 在旋转排序数组中搜索

```typescript
function searchRotated(nums: number[], target: number): number {
  let left = 0, right = nums.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] === target) return mid;

    if (nums[left] <= nums[mid]) {
      // 左半有序
      if (nums[left] <= target && target < nums[mid]) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    } else {
      // 右半有序
      if (nums[mid] < target && target <= nums[right]) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }

  return -1;
}
```

### 6.2 寻找峰值

```typescript
function findPeakElement(nums: number[]): number {
  let left = 0, right = nums.length - 1;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] > nums[mid + 1]) {
      right = mid;       // 峰值在左侧
    } else {
      left = mid + 1;   // 峰值在右侧
    }
  }

  return left;
}
```

### 6.3 寻找旋转排序数组中的最小值

```typescript
function findMin(nums: number[]): number {
  let left = 0, right = nums.length - 1;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] < nums[right]) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }

  return nums[left];
}
```

---

## 7. 边界处理速查

| 模板 | while 条件 | 区间 | mid 取值 |
|------|-----------|------|----------|
| 查找值 | `left <= right` | `[left, right]` | `(left + right) >>> 1` |
| 左边界 | `left < right` | `[left, right)` | `(left + right) >>> 1` |
| 右边界 | `left < right` | `[left, right)` | `(left + right + 1) >>> 1` |

---

## 8. 总结

1. **二分前提是数据有序**（或满足单调性）
2. 左闭右闭模板最通用
3. 左边界、右边界是高频面试题
4. 旋转数组二分靠"先判断哪半有序"

---

## 参考资料

- [LeetCode — Binary Search](https://leetcode.cn/tag/binary-search/)
