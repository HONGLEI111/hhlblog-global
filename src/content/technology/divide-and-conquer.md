---
title: 分治算法：从归并排序到快速选择的 TypeScript 实现
published: 2026-04-26
description: '掌握分治算法的核心思想（分解、求解、合并），用 TypeScript 实现归并排序、快速排序、快速选择等问题。'
image: ''
tags: [分治算法, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 1. 什么是分治？

分治 = **分解 → 求解 → 合并**，将大问题拆成若干相同结构的小问题。

```typescript
function divideAndConquer(problem: any): any {
  // 1. 终止条件：问题足够小，直接解决
  if (isBaseCase(problem)) return solve(problem);

  // 2. 分解：分成子问题
  const subproblems = split(problem);

  // 3. 求解：递归求解子问题
  const subResults = subproblems.map(divideAndConquer);

  // 4. 合并：合并子结果
  return merge(subResults);
}
```

---

## 2. 归并排序

```typescript
function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;

  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));

  return merge(left, right);
}

function merge(left: number[], right: number[]): number[] {
  const result: number[] = [];
  let i = 0, j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]);
    else result.push(right[j++]);
  }

  while (i < left.length) result.push(left[i++]);
  while (j < right.length) result.push(right[j++]);

  return result;
}
```

---

## 3. 快速排序

```typescript
function quickSort(arr: number[], left: number = 0, right: number = arr.length - 1): void {
  if (left >= right) return;

  const pivotIdx = partition(arr, left, right);
  quickSort(arr, left, pivotIdx - 1);
  quickSort(arr, pivotIdx + 1, right);
}

function partition(arr: number[], left: number, right: number): number {
  const pivot = arr[right];
  let i = left;

  for (let j = left; j < right; j++) {
    if (arr[j] < pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
      i++;
    }
  }
  [arr[i], arr[right]] = [arr[right], arr[i]];
  return i;
}
```

---

## 4. 快速选择 (QuickSelect)

找第 K 大元素，期望 O(n)。

```typescript
function findKthLargest(nums: number[], k: number): number {
  const target = nums.length - k;

  function quickSelect(left: number, right: number): number {
    const p = partition(nums, left, right);
    if (p === target) return nums[p];
    if (p < target) return quickSelect(p + 1, right);
    return quickSelect(left, p - 1);
  }

  return quickSelect(0, nums.length - 1);
}
```

---

## 5. 最近点对问题

```typescript
interface Point {
  x: number;
  y: number;
}

function closestPair(points: Point[]): number {
  points.sort((a, b) => a.x - b.x);

  function distance(p1: Point, p2: Point): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }

  function solve(left: number, right: number): number {
    if (right - left <= 3) {
      let min = Infinity;
      for (let i = left; i <= right; i++) {
        for (let j = i + 1; j <= right; j++) {
          min = Math.min(min, distance(points[i], points[j]));
        }
      }
      return min;
    }

    const mid = (left + right) >> 1;
    const dLeft = solve(left, mid);
    const dRight = solve(mid + 1, right);
    let d = Math.min(dLeft, dRight);

    // 合并带内
    const strip: Point[] = [];
    for (let i = left; i <= right; i++) {
      if (Math.abs(points[i].x - points[mid].x) < d) {
        strip.push(points[i]);
      }
    }
    strip.sort((a, b) => a.y - b.y);
    for (let i = 0; i < strip.length; i++) {
      for (let j = i + 1; j < strip.length && strip[j].y - strip[i].y < d; j++) {
        d = Math.min(d, distance(strip[i], strip[j]));
      }
    }

    return d;
  }

  return solve(0, points.length - 1);
}
```

---

## 6. 分治模式对比

| 算法 | 分解 | 求解 | 合并 |
|------|------|------|------|
| 归并排序 | 对半分 | 递归排序 | O(n) 归并 |
| 快速排序 | 按 pivot 分 | 递归排序 | 无需合并 |
| 二分搜索 | 排除一半 | 递归搜索 | 无需合并 |
| QuickSelect | 按 pivot 分 | 递归一侧 | 无需合并 |

---

## 7. 总结

1. 分治 = **分 → 治 → 合**
2. 时间复杂度 = **O(n log n)** 最常见
3. 问题规模每次减半 = **log n 层**
4. 二分搜索是最简单的分治

---

## 参考资料

- [Divide and Conquer](https://en.wikipedia.org/wiki/Divide-and-conquer_algorithm)
