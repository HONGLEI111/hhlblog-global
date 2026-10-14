---
title: 'Recursive Traversal: A Complete TypeScript Guide to Preorder, Inorder, and Postorder'
published: 2026-04-26
description: Master recursive and iterative implementations of binary tree preorder, inorder, and postorder traversal, understand the O(1) space optimization of Morris traversal, and implement all variants in TypeScript.
image: ''
tags: [Recursive Traversal, TypeScript, Algorithms]
category: Algorithms
draft: false
---
## Overview

Recursive traversal is the foundation for understanding binary trees. The difference between preorder, inorder, and postorder traversal is not which nodes are visited, but "when the current node is processed."

The three orders are:

- Preorder: process the current node first, then process the left and right subtrees;
- Inorder: process the left subtree first, then the current node, and finally the right subtree;
- Postorder: process the left and right subtrees first, and finally the current node.

Once you master these three orders, many tree problems can be transformed into choosing the appropriate processing timing.

> Prerequisites
> - **Recursive call stack**: stores the current node and return position
> - **Binary tree structure**: traversal order revolves around root, left, and right
> - **Visit timing**: preorder, inorder, and postorder differ only in where the current node is processed

---

## Problem Definition

Given a binary tree:

```text
      A
     / \
    B   C
   / \
  D   E
```

The different traversal results are as follows:

| Traversal Type | Order | Result |
| --- | --- | --- |
| Preorder | root -> left -> right | A B D E C |
| Inorder | left -> root -> right | D B E A C |
| Postorder | left -> right -> root | D E B C A |

The essence of traversal is: every node passes through three key positions.

```text
进入节点前
处理完左子树后
处理完右子树后
```

Whichever position you place the "visit current node" statement in, you get the corresponding traversal.

---

## Core Principle: Step-by-Step Diagram

A recursive function can be written as a unified framework:

```typescript
function traverse(node: TreeNode | null): void {
  if (node === null) return;

  // 前序位置
  traverse(node.left);
  // 中序位置
  traverse(node.right);
  // 后序位置
}
```

### Preorder Position

Suitable for passing information top-down, such as copying a tree, serialization, or printing a directory structure.

### Inorder Position

Especially important for BSTs, because the inorder traversal of a BST is in ascending order.

### Postorder Position

Suitable for aggregating information bottom-up, such as calculating height, checking balance, or releasing resources.

---

## Detailed Algorithm Steps

When writing recursive traversal, you can think in the following order:

1. How empty nodes are handled;
2. Whether the current node should be visited in the preorder, inorder, or postorder position;
3. Whether state needs to be passed down as parameters;
4. Whether return values need to be collected upward from subtrees;
5. Whether the recursion depth may become too large.

The advantage of recursion is that the code stays close to the definition of the tree; the disadvantage is that the call stack is maintained by the runtime, and extremely deep trees may cause a stack overflow.

---

## TypeScript Implementation

```typescript
class TreeNode<T> {
  constructor(
    public value: T,
    public left: TreeNode<T> | null = null,
    public right: TreeNode<T> | null = null,
  ) {}
}
```

### 1. Preorder Traversal

```typescript
function preorder<T>(root: TreeNode<T> | null): T[] {
  const result: T[] = [];

  function dfs(node: TreeNode<T> | null): void {
    if (node === null) return;

    result.push(node.value);
    dfs(node.left);
    dfs(node.right);
  }

  dfs(root);
  return result;
}
```

### 2. Inorder Traversal

```typescript
function inorder<T>(root: TreeNode<T> | null): T[] {
  const result: T[] = [];

  function dfs(node: TreeNode<T> | null): void {
    if (node === null) return;

    dfs(node.left);
    result.push(node.value);
    dfs(node.right);
  }

  dfs(root);
  return result;
}
```

### 3. Postorder Traversal

```typescript
function postorder<T>(root: TreeNode<T> | null): T[] {
  const result: T[] = [];

  function dfs(node: TreeNode<T> | null): void {
    if (node === null) return;

    dfs(node.left);
    dfs(node.right);
    result.push(node.value);
  }

  dfs(root);
  return result;
}
```

---

## Engineering Optimization: Converting Recursion to Iteration

Recursion relies on the call stack. If the tree may be very deep, you can explicitly use a stack to simulate traversal.

```typescript
function preorderIterative<T>(root: TreeNode<T> | null): T[] {
  if (root === null) return [];

  const result: T[] = [];
  const stack: TreeNode<T>[] = [root];

  while (stack.length > 0) {
    const node = stack.pop()!;
    result.push(node.value);

    if (node.right) stack.push(node.right);
    if (node.left) stack.push(node.left);
  }

  return result;
}
```

Because the stack is last-in, first-out, you must push the right child first and then the left child to ensure that the left subtree is processed first.

---

## Applications and Limitations

### Typical Applications

- Preorder: copying a tree, serialization, printing hierarchical structure;
- Inorder: ascending traversal of a BST, validating a BST, finding the Kth smallest;
- Postorder: calculating height, checking balance, deleting or releasing a tree;
- Iterative traversal: avoiding recursive stack overflow on deep trees.

### Limitations

- Recursion depth is limited by the runtime call stack;
- Too much closure state makes debugging difficult;
- Inorder traversal only has natural sorting significance for BSTs;
- The iterative version is more verbose and prone to errors in push order.

---

## Summary

```mermaid
graph LR
    A[进入节点] --> B[前序位置]
    B --> C[遍历左子树]
    C --> D[中序位置]
    D --> E[遍历右子树]
    E --> F[后序位置]
```

- The difference between preorder, inorder, and postorder is where the current node is processed.
- The binary tree recursion framework can unify all three traversals.
- Preorder is suitable for top-down, inorder is suitable for BSTs, and postorder is suitable for bottom-up.
- For deep tree scenarios, recursion can be rewritten using an explicit stack.