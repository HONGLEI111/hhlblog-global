---
title: 二叉搜索树：查找、插入、删除与验证的 TypeScript 实现
published: 2026-04-26
description: '掌握 BST 的核心操作（增删查）与特性，理解 BST 的局限性和平衡树的概念，用 TypeScript 实现完整代码。'
image: ''
tags: [二叉搜索树, TypeScript, 数据结构]
category: '算法'
draft: false
lang: ''
---

## 1. BST 的定义

二叉搜索树满足：**对任意节点，左子树所有节点的值 < 根节点的值 < 右子树所有节点的值。**

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

## 2. 查找 O(h)

```typescript
function searchBST(root: TreeNode | null, val: number): TreeNode | null {
  let cur = root;
  while (cur !== null) {
    if (cur.val === val) return cur;
    cur = val < cur.val ? cur.left : cur.right;
  }
  return null;
}

// 递归版
function searchBSTRecursive(root: TreeNode | null, val: number): TreeNode | null {
  if (root === null || root.val === val) return root;
  return val < root.val
    ? searchBSTRecursive(root.left, val)
    : searchBSTRecursive(root.right, val);
}
```

---

## 3. 插入 O(h)

```typescript
function insertIntoBST(root: TreeNode | null, val: number): TreeNode {
  if (root === null) return new TreeNode(val);

  let cur = root;
  while (true) {
    if (val < cur.val) {
      if (cur.left === null) {
        cur.left = new TreeNode(val);
        break;
      }
      cur = cur.left;
    } else {
      if (cur.right === null) {
        cur.right = new TreeNode(val);
        break;
      }
      cur = cur.right;
    }
  }

  return root;
}
```

---

## 4. 删除 O(h)

BST 删除分三种情况：

```typescript
function deleteNode(root: TreeNode | null, key: number): TreeNode | null {
  if (root === null) return null;

  if (key < root.val) {
    root.left = deleteNode(root.left, key);
  } else if (key > root.val) {
    root.right = deleteNode(root.right, key);
  } else {
    // 情况 1+2：0 或 1 个孩子
    if (root.left === null) return root.right;
    if (root.right === null) return root.left;

    // 情况 3：两个孩子 → 找后继（右子树最小的）
    let successor = root.right;
    while (successor.left !== null) {
      successor = successor.left;
    }
    root.val = successor.val;
    root.right = deleteNode(root.right, successor.val);
  }

  return root;
}
```

| 情况 | 操作 |
|------|------|
| 叶子节点 | 直接删 |
| 一个孩子 | 孩子替上去 |
| 两个孩子 | 找后继/前驱替换，再删 |

---

## 5. 验证 BST

```typescript
function isValidBST(root: TreeNode | null): boolean {
  function validate(
    node: TreeNode | null,
    min: number,
    max: number
  ): boolean {
    if (node === null) return true;
    if (node.val <= min || node.val >= max) return false;
    return (
      validate(node.left, min, node.val) &&
      validate(node.right, node.val, max)
    );
  }

  return validate(root, -Infinity, Infinity);
}
```

---

## 6. BST 的局限性

| 问题 | 说明 |
|------|------|
| 退化成链表 | 顺序插入 `[1,2,3,4,5]` → 全右子 |
| 最坏 O(n) | 所有操作退化成 O(n) |
| 解决方案 | AVL 树（严格平衡）/ 红黑树（宽松平衡） |

---

## 7. 实战：有序数组转 BST

```typescript
function sortedArrayToBST(nums: number[]): TreeNode | null {
  function build(left: number, right: number): TreeNode | null {
    if (left > right) return null;
    const mid = (left + right) >>> 1;
    const root = new TreeNode(nums[mid]);
    root.left = build(left, mid - 1);
    root.right = build(mid + 1, right);
    return root;
  }

  return build(0, nums.length - 1);
}
```

---

## 8. 实战：BST 中第 K 小的元素

```typescript
function kthSmallest(root: TreeNode | null, k: number): number {
  const stack: TreeNode[] = [];
  let cur = root;

  while (cur !== null || stack.length > 0) {
    while (cur !== null) {
      stack.push(cur);
      cur = cur.left;
    }
    cur = stack.pop()!;
    k--;
    if (k === 0) return cur.val;
    cur = cur.right;
  }

  return -1;
}
```

---

## 9. 总结

1. **增删查都是 O(h)**，h 是树高
2. 中序遍历 = **升序输出**
3. 删除两个孩子节点 = **找后继替换**
4. 平衡树解决退化问题

---

## 参考资料

- [LeetCode — BST](https://leetcode.cn/tag/binary-search-tree/)
