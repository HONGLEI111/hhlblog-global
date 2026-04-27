---
title: 层序遍历：BFS 在二叉树中的标准应用
published: 2026-04-26
description: '掌握二叉树层序遍历的标准模板和变体（锯齿形、右视图、层平均值），用 TypeScript 实现全部题解。'
image: ''
tags: [层序遍历, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 1. 标准模板

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

function levelOrder(root: TreeNode | null): number[][] {
  if (root === null) return [];

  const result: number[][] = [];
  const queue: TreeNode[] = [root];

  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel: number[] = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      currentLevel.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    result.push(currentLevel);
  }

  return result;
}
```

---

## 2. 变体一：锯齿形层序遍历

```typescript
function zigzagLevelOrder(root: TreeNode | null): number[][] {
  if (root === null) return [];

  const result: number[][] = [];
  const queue: TreeNode[] = [root];
  let leftToRight = true;

  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel: number[] = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      if (leftToRight) {
        currentLevel.push(node.val);
      } else {
        currentLevel.unshift(node.val);
      }
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    result.push(currentLevel);
    leftToRight = !leftToRight;
  }

  return result;
}
```

---

## 3. 变体二：二叉树的右视图

```typescript
function rightSideView(root: TreeNode | null): number[] {
  if (root === null) return [];

  const result: number[] = [];
  const queue: TreeNode[] = [root];

  while (queue.length > 0) {
    const levelSize = queue.length;

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      if (i === levelSize - 1) {
        result.push(node.val); // 每层最后一个
      }
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }

  return result;
}
```

---

## 4. 变体三：每层最大值

```typescript
function largestValues(root: TreeNode | null): number[] {
  if (root === null) return [];

  const result: number[] = [];
  const queue: TreeNode[] = [root];

  while (queue.length > 0) {
    const levelSize = queue.length;
    let max = -Infinity;

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      max = Math.max(max, node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    result.push(max);
  }

  return result;
}
```

---

## 5. 变体四：层平均值

```typescript
function averageOfLevels(root: TreeNode | null): number[] {
  if (root === null) return [];

  const result: number[] = [];
  const queue: TreeNode[] = [root];

  while (queue.length > 0) {
    const levelSize = queue.length;
    let sum = 0;

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      sum += node.val;
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    result.push(sum / levelSize);
  }

  return result;
}
```

---

## 6. 变体五：填充每个节点的右侧指针

```typescript
class NodeWithNext {
  val: number;
  left: NodeWithNext | null;
  right: NodeWithNext | null;
  next: NodeWithNext | null;
  constructor(val: number, left: NodeWithNext | null = null, right: NodeWithNext | null = null, next: NodeWithNext | null = null) {
    this.val = val;
    this.left = left;
    this.right = right;
    this.next = next;
  }
}

function connect(root: NodeWithNext | null): NodeWithNext | null {
  if (root === null) return null;

  const queue: NodeWithNext[] = [root];

  while (queue.length > 0) {
    const levelSize = queue.length;
    let prev: NodeWithNext | null = null;

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      if (prev) prev.next = node;
      prev = node;
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }

  return root;
}
```

---

## 7. BFS 层序 vs DFS 遍历

| 特性 | BFS（层序） | DFS（前/中/后序） |
|------|------------|-------------------|
| 结构 | 队列 | 栈/递归 |
| 顺序 | 一层一层 | 一条路径到底 |
| 最短路径 | ✅ | ❌ |
| 空间 | O(w) w=最宽层 | O(h) h=树高 |

---

## 8. 总结

1. 层序模板：**队列 + 记录当前层大小**
2. 锯齿形：用 `unshift` / `push` 交替
3. 右视图：每层取最后一个
4. 完全二叉树层序遍历天然**有序**

---

## 参考资料

- [LeetCode — Tree](https://leetcode.cn/tag/tree/)
