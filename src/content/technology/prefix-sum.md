---
title: 前缀和：把区间求和从 O(n) 降到 O(1)
published: 2026-04-26
description: '掌握前缀和的核心思想与变体（二维前缀和、差分数组、和为K的子数组），用 TypeScript 实现高频面试题。'
image: ''
tags: [前缀和, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 1. 什么是前缀和？

前缀和是一种预处理技术：**预先计算前缀数组，让任意区间求和变为 O(1)。**

```typescript
// 原始数组
const arr = [1, 3, 5, 2, 4];

// 前缀和数组：prefix[i] = arr[0] + ... + arr[i-1]
// prefix[0] = 0
// prefix[1] = 1
// prefix[2] = 1 + 3 = 4
// prefix[3] = 1 + 3 + 5 = 9
// ...
const prefix: number[] = [0, 1, 4, 9, 11, 15];

// 任意区间 arr[l..r] 的和 = prefix[r+1] - prefix[l]
// arr[1..3] = prefix[4] - prefix[1] = 11 - 1 = 10 ✅
```

---

## 2. 基本实现

```typescript
function buildPrefixSum(arr: number[]): number[] {
  const prefix: number[] = new Array(arr.length + 1).fill(0);
  for (let i = 0; i < arr.length; i++) {
    prefix[i + 1] = prefix[i] + arr[i];
  }
  return prefix;
}

function rangeSum(prefix: number[], l: number, r: number): number {
  return prefix[r + 1] - prefix[l];
}

// 使用示例
const arr = [1, 2, 3, 4, 5];
const pre = buildPrefixSum(arr);
console.log(rangeSum(pre, 1, 3)); // 2 + 3 + 4 = 9
```

---

## 3. 何时使用前缀和？

| 场景 | 暴力 | 前缀和 |
|------|------|--------|
| 单次区间求和 | O(n) | O(1) |
| m 次区间求和 | O(n×m) | O(n+m) |
| 子数组和为 K | O(n²) → O(n³) | O(n) |

**核心特征**：题目涉及 **连续子数组** 的求和问题。

---

## 4. 实战题目

### 4.1 和为 K 的子数组

```typescript
function subarraySum(nums: number[], k: number): number {
  const map = new Map<number, number>();
  map.set(0, 1);

  let count = 0;
  let prefix = 0;

  for (const num of nums) {
    prefix += num;
    // 如果存在 prefix - k，说明有子数组和为 k
    if (map.has(prefix - k)) {
      count += map.get(prefix - k)!;
    }
    map.set(prefix, (map.get(prefix) || 0) + 1);
  }

  return count;
}

// 示例
console.log(subarraySum([1, 1, 1], 2)); // 2
console.log(subarraySum([1, 2, 3], 3)); // 2
```

### 4.2 区域和检索（不可变）

```typescript
class NumArray {
  private prefix: number[];

  constructor(nums: number[]) {
    this.prefix = new Array(nums.length + 1).fill(0);
    for (let i = 0; i < nums.length; i++) {
      this.prefix[i + 1] = this.prefix[i] + nums[i];
    }
  }

  sumRange(left: number, right: number): number {
    return this.prefix[right + 1] - this.prefix[left];
  }
}
```

### 4.3 连续子数组的最大和

```typescript
function maxSubArray(nums: number[]): number {
  let maxSum = nums[0];
  let prefixMin = 0;
  let prefix = 0;

  for (const num of nums) {
    prefix += num;
    maxSum = Math.max(maxSum, prefix - prefixMin);
    prefixMin = Math.min(prefixMin, prefix);
  }

  return maxSum;
}
```

### 4.4 除自身以外数组的乘积

```typescript
function productExceptSelf(nums: number[]): number[] {
  const n = nums.length;
  const result: number[] = new Array(n).fill(1);

  // 左前缀积
  let left = 1;
  for (let i = 0; i < n; i++) {
    result[i] = left;
    left *= nums[i];
  }

  // 右前缀积
  let right = 1;
  for (let i = n - 1; i >= 0; i--) {
    result[i] *= right;
    right *= nums[i];
  }

  return result;
}
```

---

## 5. 前缀和变体

### 5.1 前缀异或

```typescript
function xorRange(arr: number[], l: number, r: number): number {
  const prefix: number[] = [0];
  for (const x of arr) {
    prefix.push(prefix[prefix.length - 1] ^ x);
  }
  return prefix[r + 1] ^ prefix[l];
}
```

### 5.2 前缀最大值/最小值

```typescript
function maxInRange(arr: number[]): number[] {
  const prefixMax: number[] = [arr[0]];
  for (let i = 1; i < arr.length; i++) {
    prefixMax[i] = Math.max(prefixMax[i - 1], arr[i]);
  }
  return prefixMax;
  // 查询 arr[0..i] 的最大值 → prefixMax[i]
}
```

---

## 6. 总结

1. **前缀和 = 预处理 + O(1) 查询**
2. 见到 **连续子数组求和** 就想前缀和
3. 前缀和 + 哈希表 = 子数组和为 K 的经典解法
4. 可扩展到前缀积、前缀异或、前缀最值

---

## 参考资料

- [LeetCode — 前缀和](https://leetcode.cn/tag/prefix-sum/)
