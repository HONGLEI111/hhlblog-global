---
title: '2D Arrays: Matrix Operations and TypeScript in Practice'
published: 2026-04-26
description: Master traversal techniques for 2D arrays, matrix operations like rotation, spiral order, and search, plus efficient range sum queries with 2D prefix sums.
image: ''
tags: [2D Arrays, TypeScript, Matrix]
category: Algorithms
draft: false
---
## Overview

A 2D array can be thought of as an "array of arrays," or as a matrix. It uses two dimensions to describe position: rows and columns.

In algorithms, 2D arrays are commonly used for maps, chessboards, image pixels, tables, and dynamic programming state tables. It has one more dimension than a 1D array, and also introduces issues like directions, boundaries, and coordinate transformations.

The key to learning 2D arrays is not memorizing a particular matrix problem, but mastering three models:

- How to traverse every cell;
- How to move in the up, down, left, and right directions;
- How to extend local operations to the entire matrix.

> Prerequisites
> - **Row and column coordinates**: 2D arrays locate elements via `(row, col)`
> - **Direction arrays**: grid search commonly uses four-direction or eight-direction movement
> - **Boundary checking**: every move must confirm the coordinates are valid

---

## Problem Definition

An `m x n` matrix can be represented as:

```text
matrix[row][col]

row: 0..m-1
col: 0..n-1
```

For example:

```text
[
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
]
```

Here `matrix[1][2]` is the element at row 1, column 2, which is `6`.

Common 2D array problems can be grouped into several categories:

| Type | Representative Problem | Core Skill |
| --- | --- | --- |
| Traversal | By row, by column, by diagonal | Controlling loop boundaries |
| Transformation | Rotation, flipping, transposition | Coordinate mapping |
| Search | Number of islands, mazes | Direction arrays + BFS/DFS |
| Preprocessing | 2D prefix sums | Fast region queries |

---

## Core Principles: Step-by-Step Illustration

### Row and Column Traversal

The most basic traversal is a double loop:

```text
row = 0: 1 2 3
row = 1: 4 5 6
row = 2: 7 8 9
```

The outer loop controls rows, and the inner loop controls columns.

### Direction Arrays

When you need to move from one cell to an adjacent cell, you can handle it uniformly with a direction array:

```text
上: (-1,  0)
下: ( 1,  0)
左: ( 0, -1)
右: ( 0,  1)
```

Starting from `(r, c)`, the next position is:

```text
nextRow = r + dr
nextCol = c + dc
```

### Coordinate Transformation

Matrix rotation and transposition are essentially coordinate remapping.

When rotating 90 degrees clockwise:

```text
old[row][col] -> next[col][n - 1 - row]
```

Understanding coordinate mapping is more reliable than memorizing code.

---

## Detailed Algorithm Steps

Taking "Number of Islands" as an example, the search flow for 2D arrays is very typical:

1. Traverse every cell;
2. When encountering land `1`, it means a new island has been found;
3. Starting from that cell, use DFS or BFS to mark all connected land;
4. Continue scanning the remaining cells;
5. The final count is the number of islands.

Key boundary checks:

```text
0 <= row < rows
0 <= col < cols
```

Whenever you access a 2D array, you should first ask yourself: Is the current position out of bounds? Has it already been visited? Does it satisfy the problem's conditions?

---

## TypeScript Implementation

### 1. Matrix Transposition

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

### 2. Number of Islands

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

This implementation changes already-visited land into water, avoiding an extra `visited` matrix.

---

## Engineering Optimization: 2D Prefix Sums

If you need to frequently query the sum of submatrices, accumulating cell by cell will be very slow. 2D prefix sums can reduce each query to O(1).

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

Adding one extra row and one extra column as sentinels makes boundary calculations more uniform.

---

## Applications and Limitations

### Typical Applications

- Tabular data, chessboards, maps, and grids;
- Image pixel processing;
- BFS/DFS grid search;
- Dynamic programming state tables;
- Submatrix statistics and region queries.

### Limitations

- Boundary conditions are more error-prone than with 1D arrays;
- Large matrices consume a lot of memory;
- In JavaScript, 2D arrays are not contiguous matrices, but nested arrays;
- When modifying a matrix in place, be careful whether it affects the caller.

---

## Summary

```mermaid
graph LR
    A[行列坐标] --> B[方向移动]
    B --> C[边界判断]
    C --> D[遍历/搜索/变换]
```

- The core of 2D arrays is row-column coordinates and boundary checking.
- Direction arrays can uniformly handle up, down, left, and right movement.
- Matrix transformations are essentially coordinate mappings.
- Search-type problems are usually traversal + DFS/BFS marking.
- High-frequency region queries are suitable for optimization with 2D prefix sums.