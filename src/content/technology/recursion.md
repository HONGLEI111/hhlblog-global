---
title: 递归：从上而下拆分问题的艺术
published: 2026-04-26
description: '理解递归的三要素（终止条件、递推关系、返回值），掌握尾递归优化和记忆化搜索，用 TypeScript 实现经典递归算法。'
image: ''
tags: [递归, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 1. 什么是递归？

递归 = 函数**自己调用自己**，将大问题拆成相同结构的小问题。

```typescript
// 递归三要素
function recursion(n: number): number {
  // 1. 终止条件（base case）
  if (n <= 1) return n;

  // 2. 递推关系
  // 3. 返回值
  return recursion(n - 1) + recursion(n - 2);
}
```

---

## 2. 经典递归

### 2.1 阶乘

```typescript
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
```

### 2.2 斐波那契数

```typescript
// 朴素递归 O(2ⁿ) —— 大量重复计算
function fib(n: number): number {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

// 记忆化搜索 O(n)
function fibMemo(n: number, memo: Map<number, number> = new Map()): number {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n)!;
  const result = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, result);
  return result;
}
```

### 2.3 汉诺塔

```typescript
function hanoi(
  n: number,
  from: string,
  to: string,
  via: string
): void {
  if (n === 1) {
    console.log(`${from} → ${to}`);
    return;
  }
  hanoi(n - 1, from, via, to);
  console.log(`${from} → ${to}`);
  hanoi(n - 1, via, to, from);
}
```

---

## 3. 递归 vs 迭代

```typescript
// 递归版：计算 1+2+...+n
function sumRecursive(n: number): number {
  if (n === 1) return 1;
  return n + sumRecursive(n - 1);
}

// 迭代版
function sumIterative(n: number): number {
  let sum = 0;
  for (let i = 1; i <= n; i++) sum += i;
  return sum;
}
```

| 递归 | 迭代 |
|------|------|
| 代码简洁 | 性能更好 |
| 适合树/图 | 适合线性 |
| 有栈溢出风险 | 无 |

---

## 4. 尾递归优化

```typescript
// 普通递归：每次返回后还要做乘法（需要保存上下文）
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

// 尾递归：所有计算在参数中完成，返回直接是函数调用
function factorialTail(n: number, acc: number = 1): number {
  if (n <= 1) return acc;
  return factorialTail(n - 1, acc * n);
}
```

---

## 5. 递归分治

### 5.1 快速幂

```typescript
function myPow(x: number, n: number): number {
  if (n === 0) return 1;
  if (n < 0) return 1 / myPow(x, -n);

  const half = myPow(x, Math.floor(n / 2));
  return n % 2 === 0 ? half * half : half * half * x;
}
```

### 5.2 二叉树的深度

```typescript
interface TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

function maxDepth(root: TreeNode | null): number {
  if (root === null) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
```

---

## 6. 递归 vs 动态规划

```typescript
// 爬楼梯：每次可以爬 1 或 2 阶

// 递归 O(2ⁿ)
function climbStairs(n: number): number {
  if (n <= 2) return n;
  return climbStairs(n - 1) + climbStairs(n - 2);
}

// DP O(n)
function climbStairsDP(n: number): number {
  if (n <= 2) return n;
  let a = 1, b = 2;
  for (let i = 3; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}
```

---

## 7. 常见陷阱

| 陷阱 | 解决方案 |
|------|----------|
| 栈溢出 | 转迭代 / 尾递归 |
| 重复计算 | 记忆化搜索 |
| 死循环 | 确保 base case 可达 |
| 全局变量污染 | 参数传递 |

---

## 8. 总结

1. **三要素**：终止条件、递推关系、返回值
2. **记忆化** = 递归 + 缓存，是 DP 的另一种实现方式
3. 树和图问题**天然适合递归**
4. 深度过大时用**迭代替代**

---

## 参考资料

- [MDN — Recursion](https://developer.mozilla.org/en-US/docs/Glossary/Recursion)
