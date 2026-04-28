---
title: 时间与空间复杂度入门
published: 2026-04-26
description: '从零理解大O表示法，掌握常见时间/空间复杂度分析。含前端实战案例与图解，适合算法初学者快速上手。'
image: ''
tags: [算法入门, 复杂度分析, 大O表示法]
category: '算法'
draft: false 
lang: ''
---

## 概述

**时间复杂度** 和 **空间复杂度** 用来描述代码在输入规模变大时，运行时间和内存占用如何增长。它们不关心某台机器上的具体耗时，而关心增长趋势。

> 前置知识
> - **输入规模 n**：数组长度、节点数量、字符串长度等
> - **循环与递归**：复杂度通常来自重复执行的次数
> - **数据结构操作成本**：数组、Map、Set、排序等 API 的复杂度不同

---

## 问题定义

给定一段代码或算法，估算它随输入规模增长时的时间和空间成本。

| 要素 | 说明 |
|------|------|
| 输入 | 一段程序、算法或数据结构操作 |
| 输出 | 时间复杂度、空间复杂度和主要瓶颈 |
| 分析目标 | 找出增长最快的部分，忽略常数和低阶项 |
| 常见结果 | O(1)、O(log n)、O(n)、O(n log n)、O(n²)、O(2^n) |

---

## 核心原理：分步图解

从 100 万用户中查找一个用户：

```typescript
interface User {
  id: number;
  name: string;
}

function findUserLinear(users: User[], id: number): User | null {
  for (const user of users) {
    if (user.id === id) return user;
  }
  return null;
}

const userMap = new Map<number, User>();
function findUserByMap(id: number): User | undefined {
  return userMap.get(id);
}
```

```mermaid
graph LR
    A[输入规模 n 增长] --> B[线性扫描 O(n)]
    A --> C[哈希查找 O(1)]
    B --> D[数据越大越慢]
    C --> E[查询成本基本稳定]
```

大 O 表示法只保留增长最快的项：

```text
T(n) = 3n² + 100n + 5000  =>  O(n²)
T(n) = 50n + 1000         =>  O(n)
T(n) = 200                =>  O(1)
```

---

## 算法精细步骤

```
算法：AnalyzeComplexity(code)
输入：一段代码或算法
输出：时间复杂度和空间复杂度

1. 明确输入规模 n 表示什么
2. 找出随 n 增长而重复执行的语句
3. 计算循环、递归或数据结构操作次数
4. 保留增长最快的项，忽略常数和低阶项
5. 统计额外申请的空间，不把输入本身算入额外空间
```

**常见复杂度对比**：

| 复杂度 | 增长方式 | 典型场景 |
|------|------|------|
| O(1) | 不随输入规模变化 | 数组下标访问、Map 查询 |
| O(log n) | 每次排除一半 | 二分搜索、堆操作 |
| O(n) | 遍历一次输入 | 求和、过滤、线性查找 |
| O(n log n) | 每层 O(n)，共 log n 层 | 归并排序、堆排序 |
| O(n²) | 双重枚举 | 暴力两数配对、矩阵遍历 |
| O(2^n) | 每个元素选或不选 | 子集枚举、朴素递归 |

---

## TypeScript 实现

### 1. O(1)：常量时间

```typescript
function getFirst<T>(arr: T[]): T | undefined {
  return arr[0];
}

function getByKey<K, V>(map: Map<K, V>, key: K): V | undefined {
  return map.get(key);
}
```

### 2. O(log n)：二分查找

```typescript
function binarySearch(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }

  return -1;
}
```

### 3. O(n)：线性扫描

```typescript
function sum(nums: number[]): number {
  let total = 0;
  for (const num of nums) {
    total += num;
  }
  return total;
}

function findMax(nums: number[]): number {
  let max = nums[0];
  for (const num of nums) {
    if (num > max) max = num;
  }
  return max;
}
```

### 4. O(n²) 优化到 O(n)

```typescript
function findDuplicatesSlow(nums: number[]): number[] {
  const result: number[] = [];

  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] === nums[j]) result.push(nums[i]);
    }
  }

  return result;
}

function findDuplicatesFast(nums: number[]): number[] {
  const seen = new Set<number>();
  const duplicates = new Set<number>();

  for (const num of nums) {
    if (seen.has(num)) duplicates.add(num);
    else seen.add(num);
  }

  return [...duplicates];
}
```

### 5. 空间复杂度对比

```typescript
function reverseInPlace<T>(arr: T[]): T[] {
  let left = 0;
  let right = arr.length - 1;

  while (left < right) {
    [arr[left], arr[right]] = [arr[right], arr[left]];
    left++;
    right--;
  }

  return arr;
}

function reverseNew<T>(arr: T[]): T[] {
  const result: T[] = [];
  for (let i = arr.length - 1; i >= 0; i--) {
    result.push(arr[i]);
  }
  return result;
}
```

---

## 工程优化：先看数据量再优化

复杂度分析的目的不是让所有代码都极致优化，而是判断当前数据规模下风险在哪里。

| 数据量 | 经验判断 | 建议 |
|------|------|------|
| < 1,000 | 多数写法都可接受 | 优先可读性 |
| 1,000 ~ 100,000 | 避免 O(n²) | 用 Map/Set、排序、双指针 |
| 100,000 ~ 1,000,000 | 警惕大常数和内存复制 | 优先 O(n log n) 或 O(n) |
| > 1,000,000 | 关注索引、分页、流式处理 | 尽量 O(log n) / O(1) 查询 |

前端场景也有复杂度问题：大列表渲染、搜索联想、表格筛选、组件树重渲染，都需要关注输入规模。

---

## 应用与局限

### 典型应用

- 评估算法题解能否通过数据范围
- 判断接口、列表、搜索在大数据量下的性能风险
- 选择数组、Map、Set、堆、树等数据结构
- 解释排序、搜索、遍历和递归的成本

### 局限性

| 局限 | 说明 |
|------|------|
| 忽略常数 | O(n) 不一定总比 O(n log n) 快 |
| 忽略硬件因素 | 缓存、IO、网络延迟可能更重要 |
| 平均和最坏不同 | 哈希、快速排序等需要区分场景 |
| 只看增长趋势 | 小数据下可读性往往比复杂度更重要 |

---

## 总结

```mermaid
graph LR
    A[确定输入规模] --> B[数循环和递归]
    B --> C[保留最高阶]
    C --> D[分析额外空间]
    D --> E[结合数据量决策]
```

**核心要点**：

1. 大 O 描述的是增长趋势，而不是精确运行时间。
2. 时间复杂度看执行次数，空间复杂度看额外占用。
3. Map/Set 常用于用空间换时间，把 O(n²) 降到 O(n)。
4. 优化前先看数据量，避免为了小规模场景牺牲可读性。
