---
title: 滑动窗口：子数组/子串问题的通用解法
published: 2026-04-26
description: '掌握滑动窗口的两大模板（定长窗口和变长窗口），用 TypeScript 解决无重复字符的最长子串、最小覆盖子串等经典问题。'
image: ''
tags: [滑动窗口, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 1. 什么是滑动窗口？

滑动窗口 = 双指针 + 维护窗口内的状态。它能在 O(n) 时间内解决"子数组/子串"问题。

```typescript
// 滑动窗口 = 维护一个 [left, right) 的区间
//  随着 right 右移，窗口扩大
//  条件不满足时 left 右移，窗口缩小
let left = 0;
for (let right = 0; right < n; right++) {
  // 1. 加入 right 对应元素
  // 2. while (窗口不满足条件) 移动 left
  // 3. 更新答案
}
```

---

## 2. 定长窗口模板

```typescript
function fixedWindow(arr: number[], k: number): number {
  let sum = 0;
  // 初始化第一个窗口
  for (let i = 0; i < k; i++) sum += arr[i];
  let maxSum = sum;

  for (let i = k; i < arr.length; i++) {
    sum += arr[i] - arr[i - k];
    maxSum = Math.max(maxSum, sum);
  }

  return maxSum;
}
```

### 2.1 长度为 K 的最大子数组和

```typescript
function maxSumSubarray(nums: number[], k: number): number {
  if (nums.length < k) return 0;

  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i];
  let max = sum;

  for (let i = k; i < nums.length; i++) {
    sum = sum - nums[i - k] + nums[i];
    max = Math.max(max, sum);
  }

  return max;
}
```

### 2.2 长度为 K 的最大平均数

```typescript
function findMaxAverage(nums: number[], k: number): number {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i];
  let maxSum = sum;

  for (let i = k; i < nums.length; i++) {
    sum = sum - nums[i - k] + nums[i];
    maxSum = Math.max(maxSum, sum);
  }

  return maxSum / k;
}
```

---

## 3. 变长窗口模板

```typescript
function variableWindow(s: string): number {
  const window = new Map<string, number>();
  let left = 0, maxLen = 0;

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    window.set(c, (window.get(c) || 0) + 1);

    // 收缩窗口条件
    while (/* 窗口不满足条件 */) {
      const d = s[left];
      window.set(d, window.get(d)! - 1);
      if (window.get(d) === 0) window.delete(d);
      left++;
    }

    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
}
```

### 3.1 无重复字符的最长子串

```typescript
function lengthOfLongestSubstring(s: string): number {
  const window = new Map<string, number>();
  let left = 0, maxLen = 0;

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    window.set(c, (window.get(c) || 0) + 1);

    while (window.get(c)! > 1) {
      const d = s[left];
      window.set(d, window.get(d)! - 1);
      left++;
    }

    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
}
```

### 3.2 长度最小的子数组

```typescript
function minSubArrayLen(target: number, nums: number[]): number {
  let left = 0, sum = 0;
  let minLen = Infinity;

  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];

    while (sum >= target) {
      minLen = Math.min(minLen, right - left + 1);
      sum -= nums[left];
      left++;
    }
  }

  return minLen === Infinity ? 0 : minLen;
}
```

---

## 4. 进阶：最小覆盖子串

```typescript
function minWindow(s: string, t: string): string {
  const need = new Map<string, number>();
  const window = new Map<string, number>();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);

  let left = 0, right = 0, valid = 0;
  let start = 0, minLen = Infinity;

  while (right < s.length) {
    const c = s[right];
    right++;

    if (need.has(c)) {
      window.set(c, (window.get(c) || 0) + 1);
      if (window.get(c) === need.get(c)) valid++;
    }

    while (valid === need.size) {
      if (right - left < minLen) {
        start = left;
        minLen = right - left;
      }

      const d = s[left];
      left++;

      if (need.has(d)) {
        if (window.get(d) === need.get(d)) valid--;
        window.set(d, window.get(d)! - 1);
      }
    }
  }

  return minLen === Infinity ? '' : s.substring(start, start + minLen);
}
```

---

## 5. 总结

| 类型 | 特征 | 模板 |
|------|------|------|
| 定长窗口 | 窗口长度固定 | 前进 + 后撤各一个元素 |
| 变长窗口 | 求最大/最小满足条件的窗口 | while 收缩 + 更新答案 |

1. 看到 **子数组/子串** 就想滑动窗口
2. 定长简单，变长需要维护窗口内状态
3. 最小覆盖是滑动窗口的终极考题

---

## 参考资料

- [LeetCode — Sliding Window](https://leetcode.cn/tag/sliding-window/)
