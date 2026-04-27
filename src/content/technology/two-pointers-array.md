---
title: 数组双指针：从 O(n²) 到 O(n) 的优化利器
published: 2026-04-26
description: '掌握数组双指针的四种核心模式（左右指针、快慢指针、前后指针、分离指针），用 TypeScript 解决高频算法问题。'
image: ''
tags: [双指针, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 1. 什么是双指针？

双指针是用**两个变量**追踪数组位置，在单次遍历中完成原本需要嵌套循环的工作，将时间复杂度从 O(n²) 降到 O(n)。

```typescript
// ❌ 暴力 O(n²)
for (let i = 0; i < n; i++) {
  for (let j = i + 1; j < n; j++) { ... }
}

// ✅ 双指针 O(n)
let left = 0, right = n - 1;
while (left < right) { ... }
```

---

## 2. 模式一：左右指针

**两个指针从数组两端向中间移动。** 适用于有序数组、反转、回文等。

### 2.1 两数之和 II

```typescript
function twoSum(numbers: number[], target: number): number[] {
  let left = 0, right = numbers.length - 1;

  while (left < right) {
    const sum = numbers[left] + numbers[right];
    if (sum === target) return [left + 1, right + 1];
    if (sum < target) left++;
    else right--;
  }

  return [-1, -1];
}
```

### 2.2 反转字符串

```typescript
function reverseString(s: string[]): void {
  let left = 0, right = s.length - 1;
  while (left < right) {
    [s[left], s[right]] = [s[right], s[left]];
    left++;
    right--;
  }
}
```

### 2.3 验证回文串

```typescript
function isPalindrome(s: string): boolean {
  const str = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let left = 0, right = str.length - 1;
  while (left < right) {
    if (str[left] !== str[right]) return false;
    left++;
    right--;
  }
  return true;
}
```

### 2.4 盛最多水的容器

```typescript
function maxArea(height: number[]): number {
  let left = 0, right = height.length - 1;
  let max = 0;

  while (left < right) {
    const area = (right - left) * Math.min(height[left], height[right]);
    max = Math.max(max, area);
    // 移动较矮的那一边
    if (height[left] < height[right]) left++;
    else right--;
  }

  return max;
}
```

---

## 3. 模式二：快慢指针

**两个指针同向移动，一快一慢。** 适用于去重、原地修改。

### 3.1 删除有序数组的重复项

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

### 3.2 移动零

```typescript
function moveZeroes(nums: number[]): void {
  let slow = 0;
  for (let fast = 0; fast < nums.length; fast++) {
    if (nums[fast] !== 0) {
      [nums[slow], nums[fast]] = [nums[fast], nums[slow]];
      slow++;
    }
  }
}
```

### 3.3 删除指定元素

```typescript
function removeElement(nums: number[], val: number): number {
  let slow = 0;
  for (let fast = 0; fast < nums.length; fast++) {
    if (nums[fast] !== val) {
      nums[slow] = nums[fast];
      slow++;
    }
  }
  return slow;
}
```

---

## 4. 模式三：分离指针

**两个数组各用一个指针，归并排序的核心思想。**

### 4.1 合并两个有序数组

```typescript
function merge(nums1: number[], m: number, nums2: number[], n: number): void {
  let p1 = m - 1, p2 = n - 1;
  let tail = m + n - 1;

  while (p2 >= 0) {
    if (p1 >= 0 && nums1[p1] > nums2[p2]) {
      nums1[tail--] = nums1[p1--];
    } else {
      nums1[tail--] = nums2[p2--];
    }
  }
}
```

### 4.2 两个有序数组合并

```typescript
function mergeTwoArrays<T>(a: T[], b: T[]): T[] {
  const result: T[] = [];
  let i = 0, j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) result.push(a[i++]);
    else result.push(b[j++]);
  }

  while (i < a.length) result.push(a[i++]);
  while (j < b.length) result.push(b[j++]);

  return result;
}
```

---

## 5. 模式四：三数之和（扩展）

```typescript
function threeSum(nums: number[]): number[][] {
  nums.sort((a, b) => a - b);
  const result: number[][] = [];

  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue; // 跳过重复

    let left = i + 1, right = nums.length - 1;
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      if (sum === 0) {
        result.push([nums[i], nums[left], nums[right]]);
        while (left < right && nums[left] === nums[left + 1]) left++;
        while (left < right && nums[right] === nums[right - 1]) right--;
        left++;
        right--;
      } else if (sum < 0) {
        left++;
      } else {
        right--;
      }
    }
  }

  return result;
}
```

---

## 6. 总结

| 模式 | 场景 | 复杂度 |
|------|------|--------|
| 左右指针 | 有序数组、回文、反转 | O(n) |
| 快慢指针 | 原地去重、移动元素 | O(n) |
| 分离指针 | 合并有序序列 | O(m+n) |

1. **有序 + 查找两个元素** → 左右指针
2. **原地修改 + 保留顺序** → 快慢指针

---

## 参考资料

- [LeetCode — Two Pointers](https://leetcode.cn/tag/two-pointers/)
