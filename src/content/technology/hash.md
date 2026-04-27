---
title: 哈希表：从 Set 到 HashMap 的 TypeScript 实战
published: 2026-04-26
description: '理解哈希表的原理、JavaScript/TypeScript 中的 Map/Set 使用技巧，以及哈希在前端高频场景（去重、缓存、计数器）中的应用。'
image: ''
tags: [哈希, TypeScript, 数据结构]
category: '算法'
draft: false
lang: ''
---

## 1. 什么是哈希表？

哈希表 = 把 **Key 映射为数组下标**，实现 O(1) 的增删查。

```
key  ──→  hash(key)  ──→  index
                              ↓
                         buckets[index] = value
```

JavaScript 中直接使用 `Map` 和 `Set`。

---

## 2. Map vs Object

```typescript
// Map 的优势
const map = new Map<string, number>();

// 1. 任意类型作 key
const objKey = { id: 1 };
const map2 = new Map<object, string>();
map2.set(objKey, 'value');

// 2. 保持插入顺序
map.set('a', 1);
map.set('b', 2);
for (const [k, v] of map) console.log(k, v); // 'a' 1, 'b' 2

// 3. 有 size 属性
console.log(map.size); // 2

// 4. 原生迭代器
map.forEach((v, k) => console.log(k, v));

// 5. 避免原型污染
// Object 有 toString、__proto__ 等内置属性
// Map 是完全干净的
```

| 特性 | Map | Object |
|------|-----|--------|
| Key 类型 | 任意 | 字符串/Symbol |
| 插入顺序 | ✅ | ❌ (ES6 后部分有序) |
| 性能 | 频繁增删更优 | 少量固定属性 |
| 序列化 | 需转换 | 天然 JSON |

---

## 3. Set

```typescript
const set = new Set<number>();

// 基本操作 O(1)
set.add(1);
set.has(1);         // true
set.delete(1);
set.size;           // 0

// 迭代
for (const value of set) console.log(value);

// 集合运算
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);

// 并集
const union = new Set([...a, ...b]);             // {1, 2, 3, 4}

// 交集
const intersection = new Set([...a].filter(x => b.has(x))); // {2, 3}

// 差集
const difference = new Set([...a].filter(x => !b.has(x)));  // {1}
```

---

## 4. 实战场景

### 4.1 两数之和

```typescript
function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement)!, i];
    }
    seen.set(nums[i], i);
  }
  return [-1, -1];
}
```

### 4.2 多数元素

```typescript
function majorityElement(nums: number[]): number {
  const counter = new Map<number, number>();
  for (const num of nums) {
    counter.set(num, (counter.get(num) || 0) + 1);
    if (counter.get(num)! > Math.floor(nums.length / 2)) {
      return num;
    }
  }
  return -1;
}
```

### 4.3 最长连续序列

```typescript
function longestConsecutive(nums: number[]): number {
  const numSet = new Set(nums);
  let maxLen = 0;

  for (const num of numSet) {
    if (numSet.has(num - 1)) continue; // 不是起点就跳过
    let cur = num, len = 1;
    while (numSet.has(cur + 1)) {
      cur++;
      len++;
    }
    maxLen = Math.max(maxLen, len);
  }

  return maxLen;
}
```

### 4.4 前端缓存函数（Memoization）

```typescript
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key)!;
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// 使用
const expensiveCalc = memoize((n: number) => {
  console.log('computing...');
  return n * n;
});
expensiveCalc(5); // computing... → 25
expensiveCalc(5); // 25（缓存命中）
```

---

## 5. 总结

1. **Map** 解决 key-value 快速查找 O(1)
2. **Set** 解决去重和存在性判断 O(1)
3. 遇到 **"找两个数的关系"** → 哈希表
4. 前端缓存（memoize、数据去重）是最常见应用

---

## 参考资料

- [MDN — Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
- [MDN — Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
