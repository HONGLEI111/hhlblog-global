---
title: 递归遍历：前序、中序、后序的 TypeScript 完全指南
published: 2026-04-26
description: '掌握二叉树的前序、中序、后序遍历的递归与迭代实现，理解 Morris 遍历的 O(1) 空间优化，用 TypeScript 实现所有变体。'
image: ''
tags: [递归遍历, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 1. 三种遍历对比

```
       1
      / \
     2   3
    / \
   4   5

前序(root→left→right): 1 2 4 5 3
中序(left→root→right): 4 2 5 1 3
后序(left→right→root): 4 5 2 3 1
```

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

## 2. 递归实现（三行模板）

```typescript
function preorder(root: TreeNode | null): number[] {
  if (root === null) return [];
  return [root.val, ...preorder(root.left), ...preorder(root.right)];
}

function inorder(root: TreeNode | null): number[] {
  if (root === null) return [];
  return [...inorder(root.left), root.val, ...inorder(root.right)];
}

function postorder(root: TreeNode | null): number[] {
  if (root === null) return [];
  return [...postorder(root.left), ...postorder(root.right), root.val];
}
```

---

## 3. 迭代实现

### 3.1 前序迭代

```typescript
function preorderIterative(root: TreeNode | null): number[] {
  const result: number[] = [];
  if (root === null) return result;

  const stack: TreeNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    result.push(node.val);
    if (node.right) stack.push(node.right); // 先右后左
    if (node.left) stack.push(node.left);
  }

  return result;
}
```

### 3.2 中序迭代

```typescript
function inorderIterative(root: TreeNode | null): number[] {
  const result: number[] = [];
  const stack: TreeNode[] = [];
  let cur: TreeNode | null = root;

  while (cur !== null || stack.length > 0) {
    while (cur !== null) {
      stack.push(cur);
      cur = cur.left; // 一直往左走
    }
    cur = stack.pop()!;
    result.push(cur.val); // 访问当前
    cur = cur.right;      // 转向右子树
  }

  return result;
}
```

### 3.3 后序迭代

```typescript
function postorderIterative(root: TreeNode | null): number[] {
  const result: number[] = [];
  if (root === null) return result;

  const stack: TreeNode[] = [root];
  // 前序 → 反转 = 后序（但先右再左）
  while (stack.length > 0) {
    const node = stack.pop()!;
    result.unshift(node.val); // 头部插入
    if (node.left) stack.push(node.left);
    if (node.right) stack.push(node.right);
  }

  return result;
}
```

---

## 4. 迭代模板（统一写法）

用标记法统一三种遍历：

```typescript
function traversal(root: TreeNode | null, order: 'pre' | 'in' | 'post'): number[] {
  const result: number[] = [];
  if (root === null) return result;

  const stack: (TreeNode | null)[] = [root];
  const visited = new Set<TreeNode>();

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (visited.has(node)) {
      result.push(node.val);
      continue;
    }

    visited.add(node);
    if (order === 'pre') {
      if (node.right) stack.push(node.right);
      if (node.left) stack.push(node.left);
      stack.push(node); // 最后压入自己
    } else if (order === 'in') {
      if (node.right) stack.push(node.right);
      stack.push(node);
      if (node.left) stack.push(node.left);
    } else {
      stack.push(node);
      if (node.right) stack.push(node.right);
      if (node.left) stack.push(node.left);
    }
  }

  return result;
}
```

---

## 5. Morris 遍历（O(1) 空间）

```typescript
function morrisInorder(root: TreeNode | null): number[] {
  const result: number[] = [];
  let cur = root;

  while (cur !== null) {
    if (cur.left === null) {
      result.push(cur.val);
      cur = cur.right;
    } else {
      // 找左子树的最右节点（前驱）
      let pre = cur.left;
      while (pre.right !== null && pre.right !== cur) {
        pre = pre.right;
      }
      if (pre.right === null) {
        pre.right = cur;    // 建立临时连接
        cur = cur.left;
      } else {
        pre.right = null;   // 恢复树结构
        result.push(cur.val);
        cur = cur.right;
      }
    }
  }

  return result;
}
```

---

## 6. 实战：验证二叉搜索树

```typescript
function isValidBST(root: TreeNode | null): boolean {
  const stack: TreeNode[] = [];
  let cur = root;
  let prev: number | null = null;

  while (cur !== null || stack.length > 0) {
    while (cur !== null) {
      stack.push(cur);
      cur = cur.left;
    }
    cur = stack.pop()!;
    if (prev !== null && cur.val <= prev) return false;
    prev = cur.val;
    cur = cur.right;
  }

  return true;
}
```

---

## 7. 总结

| 遍历 | 递归 | 迭代 | 应用 |
|------|------|------|------|
| 前序 | 三行 | 栈 + 右先左后 | 序列化、复制树 |
| 中序 | 三行 | 左链入栈 | BST 有序输出 |
| 后序 | 三行 | 前序反序 | 删除树、表达式求值 |

1. **递归最直观**，迭代防栈溢出
2. BST 的**中序遍历 = 升序数组**
3. Morris 遍历 O(1) 空间，面试加分

---

## 参考资料

- [LeetCode — Binary Tree](https://leetcode.cn/tag/binary-tree/)
