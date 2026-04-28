---
title: 二叉树：从定义到进阶的 TypeScript 完全指南
published: 2026-04-26
description: '全面掌握二叉树的结构、遍历（DFS/BFS）、序列化、最近公共祖先等经典问题，用 TypeScript 逐个击破。'
image: ''
tags: [二叉树, TypeScript, 数据结构]
category: '算法'
draft: false
lang: ''
---

## 概述

二叉树是每个节点最多有两个子节点的树结构。它既能表示层级关系，也能作为搜索、堆、表达式树、语法树等结构的基础。

学习二叉树最重要的是建立两个视角：

- 递归视角：一棵树由根节点、左子树和右子树组成；
- 遍历视角：用某种顺序访问每个节点，并在访问过程中维护答案。

很多看似不同的二叉树问题，最终都会回到“当前节点要从左右子树获得什么信息”。

> 前置知识
> - **递归**：二叉树问题通常拆成左右子树
> - **遍历顺序**：前序、中序、后序对应不同处理时机
> - **空节点**：边界条件通常从 `null` 开始定义

---

## 问题定义

一个二叉树节点包含三个部分：

```text
value
left  -> 左子树
right -> 右子树
```

示例：

```text
      1
     / \
    2   3
   / \
  4   5
```

这棵树的根节点是 `1`，节点 `2` 有两个子节点，节点 `4` 和 `5` 是叶子节点。

二叉树问题常见目标：

| 类型 | 例子 | 核心问题 |
| --- | --- | --- |
| 遍历 | 前序、中序、后序、层序 | 以什么顺序访问节点 |
| 高度/深度 | 最大深度、最小深度 | 子树如何向上返回信息 |
| 结构判断 | 对称、相同、平衡 | 左右子树关系是否满足条件 |
| 路径问题 | 直径、路径和 | 路径如何穿过当前节点 |
| 构造问题 | 根据遍历序列建树 | 根节点如何切分左右子树 |

---

## 核心原理：分步图解

### 递归分解

二叉树天然适合递归。对任意节点 `root`，都可以把问题拆成：

```text
solve(root) = combine(root.value, solve(root.left), solve(root.right))
```

例如最大深度：

```text
maxDepth(root) = 1 + max(maxDepth(left), maxDepth(right))
```

### 遍历顺序

同一棵树，不同遍历顺序会得到不同序列：

```text
      A
     / \
    B   C
```

| 遍历 | 顺序 | 结果 |
| --- | --- | --- |
| 前序 | 根 -> 左 -> 右 | A B C |
| 中序 | 左 -> 根 -> 右 | B A C |
| 后序 | 左 -> 右 -> 根 | B C A |
| 层序 | 从上到下 | A B C |

### 当前节点的角色

写二叉树递归时，先问三个问题：

1. 空节点返回什么？
2. 当前节点要从左、右子树拿到什么？
3. 当前节点要向父节点返回什么？

这三个答案确定后，代码通常就很短。

---

## 算法精细步骤

以“二叉树直径”为例，直径是任意两个节点之间最长路径的边数。

核心思路：

1. 对每个节点计算左子树高度；
2. 计算右子树高度；
3. 经过当前节点的最长路径是 `leftHeight + rightHeight`；
4. 用全局变量更新最大值；
5. 当前节点向父节点返回自己的高度。

这里有一个常见区分：

- 返回给父节点的是“单边高度”；
- 更新答案时用的是“左右两边相加”。

很多树形 DP 都有类似结构：返回值服务父节点，全局答案记录当前节点能形成的最优结果。

---

## TypeScript 实现

### 1. 节点定义

```typescript
class TreeNode<T> {
  constructor(
    public value: T,
    public left: TreeNode<T> | null = null,
    public right: TreeNode<T> | null = null,
  ) {}
}
```

### 2. 最大深度

```typescript
function maxDepth<T>(root: TreeNode<T> | null): number {
  if (root === null) return 0;

  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
```

### 3. 判断对称二叉树

```typescript
function isSymmetric<T>(root: TreeNode<T> | null): boolean {
  function isMirror(left: TreeNode<T> | null, right: TreeNode<T> | null): boolean {
    if (left === null || right === null) return left === right;

    return (
      left.value === right.value &&
      isMirror(left.left, right.right) &&
      isMirror(left.right, right.left)
    );
  }

  return root === null || isMirror(root.left, root.right);
}
```

### 4. 二叉树直径

```typescript
function diameterOfBinaryTree<T>(root: TreeNode<T> | null): number {
  let diameter = 0;

  function height(node: TreeNode<T> | null): number {
    if (node === null) return 0;

    const left = height(node.left);
    const right = height(node.right);
    diameter = Math.max(diameter, left + right);

    return 1 + Math.max(left, right);
  }

  height(root);
  return diameter;
}
```

---

## 工程优化：序列化与边界表达

如果要把二叉树存储到文本、网络或本地缓存中，需要序列化。关键是保留空节点，否则结构会丢失。

```typescript
function serialize<T>(root: TreeNode<T> | null): Array<T | null> {
  const result: Array<T | null> = [];

  function dfs(node: TreeNode<T> | null): void {
    if (node === null) {
      result.push(null);
      return;
    }

    result.push(node.value);
    dfs(node.left);
    dfs(node.right);
  }

  dfs(root);
  return result;
}
```

空节点标记是结构信息的一部分。没有它，很多不同形状的树可能会得到相同遍历序列。

---

## 应用与局限

### 典型应用

- 层级数据和组织结构；
- 表达式树、AST、DOM 类树结构；
- 二叉搜索树、堆、平衡树；
- 编码树、决策树；
- 搜索、路径、构造和序列化问题。

### 局限性

- 普通二叉树没有排序特性，查找不一定快；
- 树过深时递归可能栈溢出；
- 指针结构比数组更难做缓存友好访问；
- 构造和序列化时必须明确空节点表示。

---

## 总结

```mermaid
graph LR
    A[定义当前节点任务] --> B[处理左子树]
    B --> C[处理右子树]
    C --> D[合并返回值]
```

- 二叉树的核心模型是根节点、左子树、右子树。
- 递归是解决二叉树问题的第一思路。
- 遍历顺序决定“何时处理当前节点”。
- 树形问题要区分返回给父节点的信息和全局答案。
- 空节点是边界，也是序列化时不可忽略的结构信息。
