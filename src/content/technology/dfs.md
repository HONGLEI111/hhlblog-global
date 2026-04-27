---
title: 深度优先搜索：DFS 的递归与迭代 TypeScript 实现
published: 2026-04-26
description: '掌握 DFS 在二叉树、图、二维数组中的递归和迭代模板，用 TypeScript 解决路径总和、岛屿周长、全排列等经典问题。'
image: ''
tags: [深度优先搜索, DFS, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 1. DFS 模板

```typescript
// 递归模板
function dfs(node: Node): void {
  if (/* 终止条件 */) return;

  // 处理当前节点
  visited.add(node);

  for (const neighbor of getNeighbors(node)) {
    if (!visited.has(neighbor)) {
      dfs(neighbor);
    }
  }
}

// 迭代模板（显式栈）
function dfsIterative(start: Node): void {
  const stack: Node[] = [start];
  const visited = new Set<Node>([start]);

  while (stack.length > 0) {
    const node = stack.pop()!;
    // 处理 node
    for (const neighbor of getNeighbors(node)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
  }
}
```

---

## 2. 二叉树路径总和

```typescript
class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val: number, left: TreeNode | null = null, right: TreeNode | null = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

function hasPathSum(root: TreeNode | null, targetSum: number): boolean {
  if (root === null) return false;
  if (root.left === null && root.right === null) {
    return root.val === targetSum;
  }
  return (
    hasPathSum(root.left, targetSum - root.val) ||
    hasPathSum(root.right, targetSum - root.val)
  );
}
```

### 2.1 路径总和 II（收集所有路径）

```typescript
function pathSum(root: TreeNode | null, targetSum: number): number[][] {
  const result: number[][] = [];
  const path: number[] = [];

  function dfs(node: TreeNode | null, remaining: number): void {
    if (node === null) return;

    path.push(node.val);
    if (node.left === null && node.right === null && remaining === node.val) {
      result.push([...path]);
    }

    dfs(node.left, remaining - node.val);
    dfs(node.right, remaining - node.val);
    path.pop();
  }

  dfs(root, targetSum);
  return result;
}
```

---

## 3. 岛屿周长

```typescript
function islandPerimeter(grid: number[][]): number {
  const m = grid.length;
  const n = grid[0].length;

  function dfs(i: number, j: number): number {
    // 出界 = 一条边
    if (i < 0 || i >= m || j < 0 || j >= n) return 1;
    // 碰到水 = 一条边
    if (grid[i][j] === 0) return 1;
    // 已访问 = 不加边
    if (grid[i][j] === -1) return 0;

    grid[i][j] = -1;

    return dfs(i + 1, j) + dfs(i - 1, j) + dfs(i, j + 1) + dfs(i, j - 1);
  }

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 1) return dfs(i, j);
    }
  }

  return 0;
}
```

---

## 4. 岛屿最大面积

```typescript
function maxAreaOfIsland(grid: number[][]): number {
  const m = grid.length;
  const n = grid[0].length;

  function dfs(i: number, j: number): number {
    if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] !== 1) return 0;
    grid[i][j] = 0;
    return 1 + dfs(i + 1, j) + dfs(i - 1, j) + dfs(i, j + 1) + dfs(i, j - 1);
  }

  let max = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 1) {
        max = Math.max(max, dfs(i, j));
      }
    }
  }

  return max;
}
```

---

## 5. 全排列（回溯 = DFS 决策树）

```typescript
function permute(nums: number[]): number[][] {
  const result: number[][] = [];
  const path: number[] = [];
  const used: boolean[] = new Array(nums.length).fill(false);

  function dfs(): void {
    if (path.length === nums.length) {
      result.push([...path]);
      return;
    }

    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      path.push(nums[i]);
      used[i] = true;
      dfs();
      path.pop();
      used[i] = false;
    }
  }

  dfs();
  return result;
}
```

---

## 6. 括号生成

```typescript
function generateParenthesis(n: number): string[] {
  const result: string[] = [];

  function dfs(left: number, right: number, path: string): void {
    if (left === n && right === n) {
      result.push(path);
      return;
    }
    if (left < n) dfs(left + 1, right, path + '(');
    if (right < left) dfs(left, right + 1, path + ')');
  }

  dfs(0, 0, '');
  return result;
}
```

---

## 7. 总结

| 场景 | DFS 写法 |
|------|----------|
| 二叉树 | 递归（最自然） |
| 二维网格 | 递归 + 方向数组 |
| 图 | 递归 + visited 集合 |
| 回溯 | DFS + 撤销选择 |

1. DFS 的核心是 **递归 + visited** 或 **递归 + 撤销**
2. 网格类问题建议**原地标记**避免 visited 数组
3. 回溯 = DFS 决策树

---

## 参考资料

- [LeetCode — DFS](https://leetcode.cn/tag/depth-first-search/)
