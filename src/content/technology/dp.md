---
title: 动态规划：从爬楼梯到背包问题的 TypeScript 实战
published: 2026-04-26
description: '掌握 DP 的核心概念（最优子结构、重叠子问题、状态转移），用 TypeScript 解决爬楼梯、背包、最长公共子序列、编辑距离等经典问题。'
image: ''
tags: [动态规划, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 1. 什么是动态规划？

动态规划 = 将大问题分解为**重叠子问题**，用数组/表格**存储中间结果**，避免重复计算。

```typescript
// DP 三要素
// 1. 定义状态（dp[i] 表示什么）
// 2. 找出状态转移方程（dp[i] 怎么从前面推出来）
// 3. 确定初始条件和边界
```

---

## 2. 爬楼梯

```typescript
// 每次可以爬 1 或 2 阶，到第 n 阶有多少种方法
function climbStairs(n: number): number {
  if (n <= 2) return n;

  let a = 1, b = 2;
  for (let i = 3; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

// dp[i] = dp[i-1] + dp[i-2]
```

---

## 3. 打家劫舍

```typescript
// 不能偷相邻的，求最大价值
function rob(nums: number[]): number {
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];

  let prev2 = nums[0];
  let prev1 = Math.max(nums[0], nums[1]);

  for (let i = 2; i < nums.length; i++) {
    const cur = Math.max(prev1, prev2 + nums[i]);
    prev2 = prev1;
    prev1 = cur;
  }

  return prev1;
}

// dp[i] = max(dp[i-1], dp[i-2] + nums[i])
```

---

## 4. 最长公共子序列 (LCS)

```typescript
function longestCommonSubsequence(text1: string, text2: string): number {
  const m = text1.length, n = text2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
}
```

---

## 5. 编辑距离

```typescript
function minDistance(word1: string, word2: string): number {
  const m = word1.length, n = word2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // 删除
          dp[i][j - 1],     // 插入
          dp[i - 1][j - 1]  // 替换
        );
      }
    }
  }

  return dp[m][n];
}
```

---

## 6. 0-1 背包

```typescript
function knapsack(weights: number[], values: number[], capacity: number): number {
  const n = weights.length;
  const dp: number[] = new Array(capacity + 1).fill(0);

  for (let i = 0; i < n; i++) {
    // 倒序遍历，防止重复使用物品
    for (let w = capacity; w >= weights[i]; w--) {
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }

  return dp[capacity];
}

// dp[w] = max(dp[w], dp[w - weight[i]] + value[i])
```

### 6.1 完全背包

```typescript
function completeKnapsack(weights: number[], values: number[], capacity: number): number {
  const dp: number[] = new Array(capacity + 1).fill(0);

  for (let i = 0; i < weights.length; i++) {
    // 正序遍历，允许重复使用
    for (let w = weights[i]; w <= capacity; w++) {
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }

  return dp[capacity];
}
```

---

## 7. 最长递增子序列 (LIS)

```typescript
function lengthOfLIS(nums: number[]): number {
  const dp: number[] = new Array(nums.length).fill(1);

  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
  }

  return Math.max(...dp);
}

// O(n log n) 贪心 + 二分
function lengthOfLISFast(nums: number[]): number {
  const tails: number[] = [];

  for (const num of nums) {
    let left = 0, right = tails.length;
    while (left < right) {
      const mid = (left + right) >>> 1;
      if (tails[mid] < num) left = mid + 1;
      else right = mid;
    }
    if (left === tails.length) tails.push(num);
    else tails[left] = num;
  }

  return tails.length;
}
```

---

## 8. DP 解题步骤

1. **定义 dp**：dp[i]、dp[i][j] 表示什么
2. **推导转移方程**：dp[i] 能不能从 dp[<i] 推出来
3. **初始化**：dp[0]、dp[0][*] 的值
4. **遍历顺序**：正序/倒序
5. **返回结果**：dp[n-1] 还是 max(dp)

---

## 9. 总结

| 问题 | 状态定义 | 复杂度 |
|------|----------|--------|
| 爬楼梯 | dp[i] 到第 i 阶 | O(n) |
| 打家劫舍 | dp[i] 前 i 个最大 | O(n) |
| LCS | dp[i][j] 两串前缀 | O(mn) |
| 编辑距离 | dp[i][j] 最少操作 | O(mn) |
| 0-1 背包 | dp[w] 容量 w 最大价值 | O(nW) |
| LIS | dp[i] 以 i 结尾最长 | O(n²) / O(n log n) |

---

## 参考资料

- [LeetCode — DP](https://leetcode.cn/tag/dynamic-programming/)
