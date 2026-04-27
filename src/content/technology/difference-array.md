---
title: 差分数组：把区间修改从 O(n) 降到 O(1)
published: 2026-04-26
description: '理解差分数组的原理与实现，用 TypeScript 解决区间增减、航班预订统计等高频问题。'
image: ''
tags: [差分数组, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 1. 什么是差分数组？

差分数组是前缀和的**逆运算**。它能将 **区间增减** 操作从 O(n) 降到 O(1)，最后通过前缀和还原结果。

```typescript
// 原始数组
const arr = [1, 2, 3, 4, 5];

// 差分数组 diff[i] = arr[i] - arr[i-1]
// diff[0] = arr[0] = 1
// diff[1] = 2 - 1 = 1
// diff[2] = 3 - 2 = 1
const diff = [1, 1, 1, 1, 1];

// 对区间 [1, 3] 加 2
// 只需修改 diff 的两端
diff[1] += 2;    // 从位置 1 开始 +2
diff[4] -= 2;    // 从位置 4 开始 -2（因为 3 之后不需要）

// diff = [1, 3, 1, 1, -1]
// 前缀和还原 → [1, 4, 5, 6, 5] ✅
```

---

## 2. 基本实现

```typescript
class Difference {
  private diff: number[];

  constructor(nums: number[]) {
    this.diff = new Array(nums.length).fill(0);
    this.diff[0] = nums[0];
    for (let i = 1; i < nums.length; i++) {
      this.diff[i] = nums[i] - nums[i - 1];
    }
  }

  // 对区间 [l, r] 的每个元素加 val
  increment(l: number, r: number, val: number): void {
    this.diff[l] += val;
    if (r + 1 < this.diff.length) {
      this.diff[r + 1] -= val;
    }
  }

  // 还原结果数组
  result(): number[] {
    const res: number[] = new Array(this.diff.length);
    res[0] = this.diff[0];
    for (let i = 1; i < this.diff.length; i++) {
      res[i] = res[i - 1] + this.diff[i];
    }
    return res;
  }
}

// 使用示例
const diff = new Difference([1, 2, 3, 4, 5]);
diff.increment(1, 3, 2);   // [2, 3] 区间 +2
diff.increment(0, 1, 1);   // [0, 1] 区间 +1
console.log(diff.result()); // [2, 5, 5, 6, 5]
```

---

## 3. 差分 vs 暴力

| 操作 | 暴力 | 差分 |
|------|------|------|
| 单次区间修改 | O(n) | O(1) |
| m 次区间修改 | O(n×m) | O(n+m) |
| 最终一次性查询 | — | O(n) 前缀和还原 |

**前提条件**：所有修改完成后才查询。如果边改边查，差分不适用。

---

## 4. 实战题目

### 4.1 航班预订统计

```typescript
// 有 n 个航班，bookings[i] = [first, last, seats]
// 返回每个航班的总预订座位数
function corpFlightBookings(bookings: number[][], n: number): number[] {
  const diff = new Array(n + 1).fill(0);

  for (const [first, last, seats] of bookings) {
    diff[first - 1] += seats;
    diff[last] -= seats;       // last 之后不受影响
  }

  const result: number[] = [];
  let cur = 0;
  for (let i = 0; i < n; i++) {
    cur += diff[i];
    result.push(cur);
  }

  return result;
}

console.log(corpFlightBookings([[1, 2, 10], [2, 3, 20], [2, 5, 25]], 5));
// [10, 55, 45, 25, 25]
```

### 4.2 拼车

```typescript
// trips[i] = [numPassengers, from, to]
// 判断是否能一次接完所有乘客
function carPooling(trips: number[][], capacity: number): boolean {
  const diff = new Array(1001).fill(0);

  for (const [num, from, to] of trips) {
    diff[from] += num;
    diff[to] -= num;            // 下车点不减人数
  }

  let cur = 0;
  for (let i = 0; i <= 1000; i++) {
    cur += diff[i];
    if (cur > capacity) return false;
  }

  return true;
}
```

---

## 5. 总结

1. **差分是前缀和的逆运算**
2. 适合 **多次区间修改 + 最后一次查询** 的场景
3. 修改时改两端，查询时前缀和还原
4. 和前缀和配合使用：差分做修改，前缀和做查询

---

## 参考资料

- [LeetCode — 差分数组](https://leetcode.cn/tag/prefix-sum/)
