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

## 概述

二维数组可以看作“数组中的数组”，也可以看作矩阵。它用两个维度描述位置：行和列。

在算法中，二维数组常用于地图、棋盘、图像像素、表格和动态规划状态表。它比一维数组多了一个维度，也多了方向、边界和坐标转换这些问题。

学习二维数组的重点不是记住某个矩阵题，而是掌握三个模型：

- 如何遍历每一个格子；
- 如何在上下左右方向移动；
- 如何把局部操作扩展到整张矩阵。

> 前置知识
> - **行列坐标**：二维数组通过 `(row, col)` 定位元素
> - **方向数组**：网格搜索常用四方向或八方向移动
> - **边界判断**：每次移动都要确认坐标合法

---

## 问题定义

一个 `m x n` 的矩阵可以表示为：

```text
matrix[row][col]

row: 0..m-1
col: 0..n-1
```

例如：

```text
[
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
]
```

其中 `matrix[1][2]` 是第 1 行第 2 列，也就是 `6`。

二维数组常见问题可以归为几类：

| 类型 | 代表问题 | 核心能力 |
| --- | --- | --- |
| 遍历 | 按行、按列、对角线 | 控制循环边界 |
| 变换 | 旋转、翻转、转置 | 坐标映射 |
| 搜索 | 岛屿数量、迷宫 | 方向数组 + BFS/DFS |
| 预处理 | 二维前缀和 | 区域快速查询 |

---

## 核心原理：分步图解

### 行列遍历

最基础的遍历是双层循环：

```text
row = 0: 1 2 3
row = 1: 4 5 6
row = 2: 7 8 9
```

外层控制行，内层控制列。

### 方向数组

当需要从一个格子移动到相邻格子时，可以用方向数组统一处理：

```text
上: (-1,  0)
下: ( 1,  0)
左: ( 0, -1)
右: ( 0,  1)
```

从 `(r, c)` 出发，下一个位置是：

```text
nextRow = r + dr
nextCol = c + dc
```

### 坐标变换

矩阵旋转和转置，本质是坐标重新映射。

顺时针旋转 90 度时：

```text
old[row][col] -> next[col][n - 1 - row]
```

理解坐标映射，比背代码更可靠。

---

## 算法精细步骤

以“岛屿数量”为例，二维数组的搜索流程非常典型：

1. 遍历每一个格子；
2. 遇到陆地 `1`，说明发现一个新岛屿；
3. 从该格子出发，用 DFS 或 BFS 把相连陆地全部标记；
4. 继续扫描剩余格子；
5. 最终计数就是岛屿数量。

关键边界判断：

```text
0 <= row < rows
0 <= col < cols
```

只要访问二维数组，就应该先问自己：当前位置是否越界？是否已经访问过？是否满足题目条件？

---

## TypeScript 实现

### 1. 矩阵转置

```typescript
function transpose(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  const result: number[][] = Array.from({ length: cols }, () => Array(rows));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][r] = matrix[r][c];
    }
  }

  return result;
}
```

### 2. 岛屿数量

```typescript
function numIslands(grid: string[][]): number {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  function dfs(row: number, col: number): void {
    if (row < 0 || row >= rows || col < 0 || col >= cols) return;
    if (grid[row][col] !== '1') return;

    grid[row][col] = '0';

    for (const [dr, dc] of directions) {
      dfs(row + dr, col + dc);
    }
  }

  let count = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid[row][col] === '1') {
        count++;
        dfs(row, col);
      }
    }
  }

  return count;
}
```

这个实现把已经访问过的陆地改成水，避免额外的 `visited` 矩阵。

---

## 工程优化：二维前缀和

如果需要频繁查询子矩阵之和，逐格累加会很慢。二维前缀和可以把每次查询降到 O(1)。

```typescript
class NumMatrix {
  private readonly prefix: number[][];

  constructor(matrix: number[][]) {
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    this.prefix = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(0));

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        this.prefix[r][c] =
          matrix[r - 1][c - 1] +
          this.prefix[r - 1][c] +
          this.prefix[r][c - 1] -
          this.prefix[r - 1][c - 1];
      }
    }
  }

  sumRegion(row1: number, col1: number, row2: number, col2: number): number {
    return (
      this.prefix[row2 + 1][col2 + 1] -
      this.prefix[row1][col2 + 1] -
      this.prefix[row2 + 1][col1] +
      this.prefix[row1][col1]
    );
  }
}
```

多加一行一列哨兵，可以让边界计算更统一。

---

## 应用与局限

### 典型应用

- 表格数据、棋盘、地图和网格；
- 图像像素处理；
- BFS/DFS 网格搜索；
- 动态规划状态表；
- 子矩阵统计与区域查询。

### 局限性

- 边界条件比一维数组更容易出错；
- 大矩阵会占用大量内存；
- JavaScript 中二维数组不是连续矩阵，而是嵌套数组；
- 原地修改矩阵时要注意是否影响调用方。

---

## 总结

```mermaid
graph LR
    A[行列坐标] --> B[方向移动]
    B --> C[边界判断]
    C --> D[遍历/搜索/变换]
```

- 二维数组的核心是行列坐标和边界判断。
- 方向数组能统一处理上下左右移动。
- 矩阵变换本质是坐标映射。
- 搜索类问题通常是遍历 + DFS/BFS 标记。
- 高频区域查询适合用二维前缀和优化。
