---
title: 回溯算法：从全排列到 N 皇后的 TypeScript 实现
published: 2026-04-26
description: '掌握回溯算法的决策树模型、模板框架，用 TypeScript 解决排列、组合、子集、N 皇后等经典问题。'
image: ''
tags: [回溯算法, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 1. 什么是回溯？

回溯 = 在**决策树**上做 **DFS**，每次做出选择后递归，递归结束后**撤销选择**。

```typescript
function backtrack(路径: 状态[], 选择列表: 状态[]): void {
  if (满足结束条件) {
    收集结果;
    return;
  }

  for (const 选择 of 选择列表) {
    做选择;
    backtrack(路径, 新的选择列表);
    撤销选择; // ⬅️ 关键：回到上一层
  }
}
```

---

## 2. 全排列

```typescript
function permute(nums: number[]): number[][] {
  const result: number[][] = [];
  const path: number[] = [];
  const used: boolean[] = new Array(nums.length).fill(false);

  function backtrack(): void {
    if (path.length === nums.length) {
      result.push([...path]);
      return;
    }

    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      path.push(nums[i]);
      used[i] = true;
      backtrack();
      path.pop();
      used[i] = false;
    }
  }

  backtrack();
  return result;
}
```

---

## 3. 组合

```typescript
function combine(n: number, k: number): number[][] {
  const result: number[][] = [];
  const path: number[] = [];

  function backtrack(start: number): void {
    if (path.length === k) {
      result.push([...path]);
      return;
    }

    // 剪枝：剩余的数不够选了
    for (let i = start; i <= n - (k - path.length) + 1; i++) {
      path.push(i);
      backtrack(i + 1);
      path.pop();
    }
  }

  backtrack(1);
  return result;
}
```

---

## 4. 子集

```typescript
function subsets(nums: number[]): number[][] {
  const result: number[][] = [];
  const path: number[] = [];

  function backtrack(start: number): void {
    result.push([...path]);

    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);
      backtrack(i + 1);
      path.pop();
    }
  }

  backtrack(0);
  return result;
}
```

---

## 5. 组合总和（可重复选）

```typescript
function combinationSum(candidates: number[], target: number): number[][] {
  const result: number[][] = [];
  const path: number[] = [];

  function backtrack(start: number, remaining: number): void {
    if (remaining === 0) {
      result.push([...path]);
      return;
    }
    if (remaining < 0) return;

    for (let i = start; i < candidates.length; i++) {
      path.push(candidates[i]);
      backtrack(i, remaining - candidates[i]); // i 不变，可重复选
      path.pop();
    }
  }

  backtrack(0, target);
  return result;
}
```

---

## 6. N 皇后

```typescript
function solveNQueens(n: number): string[][] {
  const result: string[][] = [];
  const board: string[][] = Array.from({ length: n }, () => new Array(n).fill('.'));

  function isValid(row: number, col: number): boolean {
    for (let i = 0; i < row; i++) {
      if (board[i][col] === 'Q') return false;
      if (col - (row - i) >= 0 && board[i][col - (row - i)] === 'Q') return false;
      if (col + (row - i) < n && board[i][col + (row - i)] === 'Q') return false;
    }
    return true;
  }

  function backtrack(row: number): void {
    if (row === n) {
      result.push(board.map(r => r.join('')));
      return;
    }

    for (let col = 0; col < n; col++) {
      if (!isValid(row, col)) continue;
      board[row][col] = 'Q';
      backtrack(row + 1);
      board[row][col] = '.';
    }
  }

  backtrack(0);
  return result;
}
```

---

## 7. 电话号码的字母组合

```typescript
function letterCombinations(digits: string): string[] {
  if (digits.length === 0) return [];

  const map: Record<string, string> = {
    '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
    '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz',
  };

  const result: string[] = [];
  const path: string[] = [];

  function backtrack(index: number): void {
    if (index === digits.length) {
      result.push(path.join(''));
      return;
    }

    for (const ch of map[digits[index]]) {
      path.push(ch);
      backtrack(index + 1);
      path.pop();
    }
  }

  backtrack(0);
  return result;
}
```

---

## 8. 总结

| 问题类型 | 特征 | 关键参数 |
|----------|------|----------|
| 排列 | 顺序重要，不能重复用 | used 数组 |
| 组合 | 顺序无关，不能重复用 | start 索引 |
| 子集 | 所有可能 | start 索引 |
| 棋盘类 | 约束条件 | isValid 判断 |

1. 回溯 = **枚举 + 剪枝**
2. **做选择 → 递归 → 撤销选择** 是核心套路
3. 排列用 `used[]`，组合用 `start`

---

## 参考资料

- [LeetCode — Backtracking](https://leetcode.cn/tag/backtracking/)
