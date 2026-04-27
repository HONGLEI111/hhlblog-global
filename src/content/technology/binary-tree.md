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

## 1. 二叉树节点定义

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
```

---

## 2. 最大深度

```typescript
function maxDepth(root: TreeNode | null): number {
  if (root === null) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
```

---

## 3. 对称二叉树

```typescript
function isSymmetric(root: TreeNode | null): boolean {
  function check(p: TreeNode | null, q: TreeNode | null): boolean {
    if (p === null && q === null) return true;
    if (p === null || q === null) return false;
    return (
      p.val === q.val &&
      check(p.left, q.right) &&
      check(p.right, q.left)
    );
  }
  return root === null || check(root.left, root.right);
}
```

---

## 4. 翻转二叉树

```typescript
function invertTree(root: TreeNode | null): TreeNode | null {
  if (root === null) return null;
  [root.left, root.right] = [root.right, root.left];
  invertTree(root.left);
  invertTree(root.right);
  return root;
}
```

---

## 5. 相同的树

```typescript
function isSameTree(p: TreeNode | null, q: TreeNode | null): boolean {
  if (p === null && q === null) return true;
  if (p === null || q === null) return false;
  return (
    p.val === q.val &&
    isSameTree(p.left, q.left) &&
    isSameTree(p.right, q.right)
  );
}
```

---

## 6. 二叉树的直径

```typescript
function diameterOfBinaryTree(root: TreeNode | null): number {
  let max = 0;

  function depth(node: TreeNode | null): number {
    if (node === null) return 0;
    const left = depth(node.left);
    const right = depth(node.right);
    max = Math.max(max, left + right);
    return 1 + Math.max(left, right);
  }

  depth(root);
  return max;
}
```

---

## 7. 最近公共祖先

```typescript
function lowestCommonAncestor(
  root: TreeNode | null,
  p: TreeNode | null,
  q: TreeNode | null
): TreeNode | null {
  if (root === null || root === p || root === q) return root;

  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);

  if (left && right) return root;
  return left || right;
}
```

---

## 8. 序列化与反序列化

```typescript
function serialize(root: TreeNode | null): string {
  const result: string[] = [];

  function dfs(node: TreeNode | null): void {
    if (node === null) {
      result.push('#');
      return;
    }
    result.push(String(node.val));
    dfs(node.left);
    dfs(node.right);
  }

  dfs(root);
  return result.join(',');
}

function deserialize(data: string): TreeNode | null {
  const values = data.split(',');
  let index = 0;

  function build(): TreeNode | null {
    if (values[index] === '#') {
      index++;
      return null;
    }
    const node = new TreeNode(Number(values[index]));
    index++;
    node.left = build();
    node.right = build();
    return node;
  }

  return build();
}
```

---

## 9. 从前序和中序构建二叉树

```typescript
function buildTree(preorder: number[], inorder: number[]): TreeNode | null {
  const map = new Map<number, number>();
  inorder.forEach((val, i) => map.set(val, i));

  function build(preLeft: number, preRight: number, inLeft: number, inRight: number): TreeNode | null {
    if (preLeft > preRight) return null;

    const rootVal = preorder[preLeft];
    const root = new TreeNode(rootVal);
    const inRoot = map.get(rootVal)!;
    const leftSize = inRoot - inLeft;

    root.left = build(preLeft + 1, preLeft + leftSize, inLeft, inRoot - 1);
    root.right = build(preLeft + leftSize + 1, preRight, inRoot + 1, inRight);

    return root;
  }

  return build(0, preorder.length - 1, 0, inorder.length - 1);
}
```

---

## 10. 总结

| 问题 | 核心解法 |
|------|----------|
| 深度 | 递归 max(左, 右) + 1 |
| 对称 | 双指针递归对比 |
| 翻转 | 递归交换左右 |
| LCA | 自底向上找 p/q |
| 序列化 | 前序 + 空节点标记 |
| 构建 | 中序定位根 + 递归 |

---

## 参考资料

- [LeetCode — Binary Tree](https://leetcode.cn/tag/binary-tree/)
