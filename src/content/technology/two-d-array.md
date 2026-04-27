---
title: 二维数组：矩阵操作与 TypeScript 实战
published: 2026-04-26
description: '掌握二维数组的遍历技巧、矩阵操作（旋转、螺旋、搜索），以及二维前缀和的高效区间求和。'
image: ''
tags: [二维数组, TypeScript, 矩阵]
category: '算法'
draft: false
lang: ''
---

## 1. 二维数组基础

```typescript
// 创建二维数组
const matrix: number[][] = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

const rows = matrix.length;
const cols = matrix[0].length;

// 创建 m×n 的二维数组并填充
const m = 3, n = 4;
const grid: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
```

---

## 2. 遍历方式

```typescript
function traverse(matrix: number[][]): void {
  const m = matrix.length;
  const n = matrix[0].length;

  // 按行走访
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      console.log(matrix[i][j]);
    }
  }

  // 按列走访
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      console.log(matrix[i][j]);
    }
  }
}
```

---

## 3. 矩阵操作

### 3.1 矩阵转置

```typescript
function transpose(matrix: number[][]): number[][] {
  const m = matrix.length;
  const n = matrix[0].length;
  const result: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      result[j][i] = matrix[i][j];
    }
  }
  return result;
}
```

### 3.2 旋转图像 90 度

```typescript
function rotate(matrix: number[][]): void {
  const n = matrix.length;

  // 先转置
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
    }
  }

  // 再水平翻转每行
  for (let i = 0; i < n; i++) {
    matrix[i].reverse();
  }
}
```

### 3.3 螺旋矩阵

```typescript
function spiralOrder(matrix: number[][]): number[] {
  const result: number[] = [];
  if (matrix.length === 0) return result;

  let top = 0, bottom = matrix.length - 1;
  let left = 0, right = matrix[0].length - 1;

  while (top <= bottom && left <= right) {
    // 左 → 右
    for (let j = left; j <= right; j++) result.push(matrix[top][j]);
    top++;

    // 上 → 下
    for (let i = top; i <= bottom; i++) result.push(matrix[i][right]);
    right--;

    if (top <= bottom) {
      // 右 → 左
      for (let j = right; j >= left; j--) result.push(matrix[bottom][j]);
      bottom--;
    }

    if (left <= right) {
      // 下 → 上
      for (let i = bottom; i >= top; i--) result.push(matrix[i][left]);
      left++;
    }
  }

  return result;
}
```

---

## 4. 二维前缀和

```typescript
class NumMatrix {
  private preSum: number[][];

  constructor(matrix: number[][]) {
    const m = matrix.length;
    const n = matrix[0].length;
    this.preSum = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        this.preSum[i][j] =
          this.preSum[i - 1][j] +
          this.preSum[i][j - 1] -
          this.preSum[i - 1][j - 1] +
          matrix[i - 1][j - 1];
      }
    }
  }

  sumRegion(row1: number, col1: number, row2: number, col2: number): number {
    return (
      this.preSum[row2 + 1][col2 + 1] -
      this.preSum[row1][col2 + 1] -
      this.preSum[row2 + 1][col1] +
      this.preSum[row1][col1]
    );
  }
}
```

---

## 5. 搜索二维矩阵

```typescript
// 每行递增，每列递增
function searchMatrix(matrix: number[][], target: number): boolean {
  const m = matrix.length;
  const n = matrix[0].length;

  // 从右上角开始
  let row = 0, col = n - 1;

  while (row < m && col >= 0) {
    if (matrix[row][col] === target) return true;
    if (matrix[row][col] > target) {
      col--; // 排除当前列
    } else {
      row++; // 排除当前行
    }
  }

  return false;
}
```

---

## 6. 实战：岛屿数量

```typescript
function numIslands(grid: string[][]): number {
  const m = grid.length;
  const n = grid[0].length;
  let count = 0;

  function dfs(i: number, j: number): void {
    if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] !== '1') return;

    grid[i][j] = '0'; // 标记已访问

    dfs(i + 1, j);
    dfs(i - 1, j);
    dfs(i, j + 1);
    dfs(i, j - 1);
  }

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        count++;
        dfs(i, j);
      }
    }
  }

  return count;
}
```

---

## 7. 总结

1. **二维前缀和** = 二维空间的空间换时间
2. **螺旋遍历** = 控制四边界
3. **矩阵搜索** = 利用有序性从右上角/左下角开始
4. **岛屿问题** = DFS/BFS 染色

---

## 参考资料

- [LeetCode — 矩阵](https://leetcode.cn/tag/matrix/)
