---
title: 数组：从底层到实战的 TypeScript 指南
published: 2026-04-26
description: '深入理解数组的底层原理、TypeScript 高级用法，从 CRUD 到实战优化，全方位掌握前端最核心的数据结构。'
image: ''
tags: [数组, TypeScript, 数据结构]
category: '算法'
draft: false
lang: ''
---

## 1. 数组的本质

数组是**连续内存空间**中存储的**相同类型**元素的集合。正是"连续"这个特性，赋予了数组 O(1) 的随机访问能力。

```typescript
// 内存布局示意
// arr[0] arr[1] arr[2] arr[3] arr[4]
//   ↓       ↓       ↓       ↓       ↓
// [0x100][0x104][0x108][0x10C][0x110]  ← 每个 int32 占 4 字节

// 知道了首地址 + 下标 × 元素大小 = 目标地址
// arr[3] 的地址 = 0x100 + 3 × 4 = 0x10C → O(1)
```

JavaScript 的数组是动态的，但 V8 引擎内部会根据元素类型做优化。

---

## 2. 基本操作与复杂度

```typescript
const arr: number[] = [1, 2, 3];

// O(1) 操作
arr[1];              // 随机访问
arr.push(4);         // 末尾追加
arr.pop();           // 末尾删除

// O(n) 操作 —— 需要移动元素
arr.unshift(0);      // 头部插入
arr.shift();         // 头部删除
arr.splice(1, 1);    // 中间插入/删除
```

---

## 3. 遍历与转换

```typescript
const nums: number[] = [1, 2, 3, 4, 5];

// 传统 for —— 最快，可控制索引
for (let i = 0; i < nums.length; i++) {
  console.log(nums[i]);
}

// for...of —— 最可读
for (const num of nums) {
  console.log(num);
}

// forEach —— 函数式风格，不可 break
nums.forEach((num, i) => console.log(num, i));

// map —— 转换每个元素，返回新数组
const doubled: number[] = nums.map(n => n * 2);

// filter —— 筛选 O(n)
const even: number[] = nums.filter(n => n % 2 === 0);

// reduce —— 归约 O(n)
const sum: number = nums.reduce((acc, n) => acc + n, 0);

// some / every —— 短路判断
const hasNegative: boolean = nums.some(n => n < 0);
const allPositive: boolean = nums.every(n => n > 0);

// find —— 查找第一个满足条件的元素 O(n)
const first: number | undefined = nums.find(n => n > 3);

// flat —— 展平嵌套数组
const nested: number[][] = [[1, 2], [3, 4]];
const flat: number[] = nested.flat();
```

---

## 4. 经典操作 TypeScript 实现

### 4.1 反转数组

```typescript
function reverse<T>(arr: T[]): T[] {
  let left = 0, right = arr.length - 1;
  while (left < right) {
    [arr[left], arr[right]] = [arr[right], arr[left]];
    left++;
    right--;
  }
  return arr;
}
```

### 4.2 原地删除重复项（有序数组）

```typescript
function removeDuplicates(nums: number[]): number {
  if (nums.length === 0) return 0;
  let slow = 0;
  for (let fast = 1; fast < nums.length; fast++) {
    if (nums[fast] !== nums[slow]) {
      slow++;
      nums[slow] = nums[fast];
    }
  }
  return slow + 1;
}
```

### 4.3 旋转数组

```typescript
function rotate(nums: number[], k: number): void {
  k = k % nums.length;
  reverseRange(nums, 0, nums.length - 1);
  reverseRange(nums, 0, k - 1);
  reverseRange(nums, k, nums.length - 1);
}

function reverseRange(nums: number[], start: number, end: number): void {
  while (start < end) {
    [nums[start], nums[end]] = [nums[end], nums[start]];
    start++;
    end--;
  }
}
```

---

## 5. 排序

```typescript
// 默认排序：按字符串
[3, 1, 10, 2].sort();                    // [1, 10, 2, 3] ❌

// 数字排序
[3, 1, 10, 2].sort((a, b) => a - b);    // [1, 2, 3, 10] ✅

// 对象排序
interface User { name: string; age: number }
const users: User[] = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
];
users.sort((a, b) => a.age - b.age);
```

---

## 6. 实战：合并两个有序数组

```typescript
function merge(nums1: number[], m: number, nums2: number[], n: number): void {
  let p1 = m - 1;
  let p2 = n - 1;
  let tail = m + n - 1;

  while (p2 >= 0) {
    if (p1 >= 0 && nums1[p1] > nums2[p2]) {
      nums1[tail] = nums1[p1];
      p1--;
    } else {
      nums1[tail] = nums2[p2];
      p2--;
    }
    tail--;
  }
}
```

---

## 7. 常见陷阱

| 陷阱 | 说明 |
|------|------|
| `new Array(3)` vs `[3]` | 前者创建 3 个空位，后者创建 `[3]` |
| `sort()` 默认字符串排序 | 数字必须传比较函数 |
| `splice` 修改原数组 | `toSpliced()` 返回新数组（ES2023） |
| 数组越界 | TypeScript 不检查运行时越界 |
| `indexOf(NaN)` | 找不到 NaN，用 `findIndex` |

---

## 8. 总结

1. **随机访问 O(1)** 是数组最大优势
2. **中间插入/删除 O(n)** 是主要代价
3. TypeScript 的泛型让数组操作类型安全
4. 了解内置方法的时间复杂度，避免写出 O(n²) 代码

---

## 参考资料

- [MDN — Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
- [V8 Array 内部实现](https://v8.dev/blog/elements-kinds)
