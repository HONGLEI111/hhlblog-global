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

## 1. 为什么要学复杂度？

写代码最怕的场景是什么？——本地跑得好好的，一上线数据量大了就崩了。

```javascript
// 假设你需要从 100 万用户中找到某个用户
const users = Array.from({ length: 1_000_000 }, (_, i) => ({ id: i, name: `user_${i}` }));

// 方案 A：逐一遍历
function findUserA(users, id) {
  for (const user of users) {
    if (user.id === id) return user;
  }
  return null;
}

// 方案 B：用 Map 索引
const userMap = new Map(users.map(u => [u.id, u]));
function findUserB(id) {
  return userMap.get(id) || null;
}
```

方案 A 最坏情况要检查 **100 万次**，方案 B 只需要 **1 次**。这就是复杂度的意义——在没有上线之前，就能预判代码在"大规模数据"下的表现。

---

## 2. 什么是大 O 表示法？

### 2.1 通俗理解

大 O 表示法描述的是一条 **数学曲线**：当数据量 `n` 不断翻倍时，代码的运行时间（或占用内存）会按照什么比例增长。

你可以这样记住它：

| 说法 | 含义 |
|------|------|
| 时间复杂度 | 输入变大了，**跑得有多慢** |
| 空间复杂度 | 输入变大了，**吃得有多多** |
| O(n) | 数据翻倍，时间也翻倍 |
| O(n²) | 数据翻倍，时间翻 4 倍 |

### 2.2 数学定义（可以跳过）

`O(f(n))` 表示存在常数 `c` 和 `n₀`，使得对所有 `n ≥ n₀`，有 `T(n) ≤ c·f(n)`。

翻译成人话：**只关心增长最快的部分，忽略常数和低阶项。**

```
T(n) = 3n² + 100n + 5000  →  O(n²)  ← 只保留增长最快的 n²
T(n) = 50n + 1000         →  O(n)
T(n) = 200                →  O(1)
```

---

## 3. 常见时间复杂度排行榜

```
O(1)      ▏常量    不管数据多大，时间不变
O(log n)  ▏对数    数据翻倍，时间只多一步
O(n)      ▏线性    数据翻倍，时间翻倍
O(n log n)▏线性对数 比O(n)慢一点，排序的下限
O(n²)     ▏平方    数据翻倍，时间翻4倍，常见的坑
O(2ⁿ)     ▏指数    数据+1，时间翻倍，写错了
O(n!)     ▏阶乘    数据+1，时间爆炸，肯定写错了
```

### 3.1 O(1) — 常量时间

不管输入多大，固定一个操作就能拿到结果。

```javascript
function getFirst(arr) {
  return arr[0];          // 永远只取第一个
}

function getByKey(map, key) {
  return map.get(key);    // 哈希查找
}
```

### 3.2 O(log n) — 对数时间

数据量翻倍，只需要多做一次操作。典型场景：二分查找。

```javascript
// 在有序数组中查找目标值
function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

// 100 万条数据，最多只需要 20 次比较
// log₂(1,000,000) ≈ 20
```

### 3.3 O(n) — 线性时间

数据翻倍，时间也翻倍。这是最"诚实"的复杂度。

```javascript
function sum(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i];       // 每个元素都要访问一次
  }
  return total;
}

function findMax(arr) {
  let max = arr[0];
  for (const num of arr) {
    if (num > max) max = num;
  }
  return max;
}
```

### 3.4 O(n log n) — 线性对数时间

最优的比较排序算法的时间下限。数据量很大时，比 O(n²) 快非常多。

```javascript
// JavaScript 内置的 sort() 通常就是 O(n log n)
const sorted = [3, 1, 4, 1, 5, 9, 2, 6].sort((a, b) => a - b);
```

### 3.5 O(n²) — 平方时间

最常见的"翻车"现场。嵌套循环就是典型。

```javascript
// ❌ 双重循环 = O(n²)
function findDuplicates(arr) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) result.push(arr[i]);
    }
  }
  return result;
}

// ✅ 用 Set 优化到 O(n)
function findDuplicatesFast(arr) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of arr) {
    if (seen.has(item)) duplicates.add(item);
    else seen.add(item);
  }
  return [...duplicates];
}
```

### 3.6 O(2ⁿ) — 指数时间

每多一个元素，时间翻倍。递归算斐波那契的经典反例。

```javascript
// ❌ 指数级，n=50 时可能需要几千年
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

// ✅ 动态规划优化到 O(n)
function fibDP(n) {
  const dp = [0, 1];
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}
```

---

## 4. 空间复杂度

### 4.1 常见级别

| 级别 | 说明 | 示例 |
|------|------|------|
| O(1) | 原地操作，不开辟新空间 | 交换两个数 |
| O(n) | 开辟一个和输入等长的额外空间 | 复制数组 |
| O(n²) | 开辟二维额外空间 | 矩阵乘法 |

### 4.2 实战对比

```javascript
// O(1) 空间：原地反转
function reverseInPlace(arr) {
  let left = 0, right = arr.length - 1;
  while (left < right) {
    [arr[left], arr[right]] = [arr[right], arr[left]];
    left++; right--;
  }
  return arr;
}

// O(n) 空间：创建新数组
function reverseNew(arr) {
  const result = [];
  for (let i = arr.length - 1; i >= 0; i--) {
    result.push(arr[i]);
  }
  return result;
}
```

---

## 5. 前端实战：复杂度分析四例

### 5.1 数组去重

```javascript
// 方案 1：双重循环 O(n²) + O(1) 空间
function unique1(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) {
        arr.splice(j, 1);
        j--;
      }
    }
  }
  return arr;
}

// 方案 2：Set O(n) + O(n) 空间
function unique2(arr) {
  return [...new Set(arr)];
}
```

**结论**：用 Set 是典型的"空间换时间"。

### 5.2 虚拟列表渲染

```javascript
// 如果渲染全部 10 万条数据
// 时间复杂度：O(n) 渲染
// 空间复杂度：O(n) DOM 节点 → 页面直接卡死

// 虚拟列表：只渲染可视区域
function VirtualList({ items, itemHeight, containerHeight }) {
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // 多渲染 2 个缓冲
  const [start, setStart] = useState(0);
  
  // O(visibleCount) ≈ O(1) 渲染，与总数据量无关
  const visibleItems = items.slice(start, start + visibleCount);
  
  return (
    <div style={{ height: items.length * itemHeight }}>
      {visibleItems.map((item, i) => (
        <div key={start + i} style={{ transform: `translateY(${(start + i) * itemHeight}px)` }}>
          {item}
        </div>
      ))}
    </div>
  );
}
```

### 5.3 搜索联想

```javascript
// 用户输入 "hel" → 匹配 ["hello", "help", "helium", ...]

// ❌ 每次输入都遍历全部单词 O(n*m)，n=单词数，m=单词长度
function searchNaive(query, words) {
  return words.filter(w => w.startsWith(query));
}

// ✅ 用 Trie 树，O(k) k=查询词长度
class Trie {
  constructor() { this.root = {}; }
  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node[ch]) node[ch] = {};
      node = node[ch];
    }
    node['#'] = true;
  }
  searchPrefix(prefix) {
    let node = this.root;
    for (const ch of prefix) {
      if (!node[ch]) return [];
      node = node[ch];
    }
    return this._collect(node, prefix);
  }
  _collect(node, prefix) {
    const result = [];
    if (node['#']) result.push(prefix);
    for (const [ch, child] of Object.entries(node)) {
      if (ch !== '#') result.push(...this._collect(child, prefix + ch));
    }
    return result;
  }
}
```

### 5.4 React 组件重渲染

```javascript
// ❌ 每次父组件渲染，子组件都跟着渲染 → O(n²) 级重渲染
function Parent({ items }) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      {items.map(item => <ExpensiveChild key={item.id} item={item} />)}
    </div>
  );
}

// ✅ memo + useCallback，只在 items 变化时子树才重渲染
const MemoChild = memo(function Child({ item, onClick }) {
  return <div onClick={() => onClick(item)}>{item.name}</div>;
});
```

---

## 6. 速查表

### 6.1 常用操作复杂度

| 操作 | 时间复杂度 |
|------|-----------|
| 数组 push/pop | O(1) |
| 数组 shift/unshift | O(n) |
| 数组 indexOf/includes | O(n) |
| 数组 sort | O(n log n) |
| Map/Set 增删查 | O(1) |
| Object 属性访问 | O(1) |
| forEach/map/filter/reduce | O(n) |
| 字符串 slice/substring | O(n) |

### 6.2 常用算法复杂度

| 算法 | 平均 | 最坏 | 空间 |
|------|------|------|------|
| 快速排序 | O(n log n) | O(n²) | O(log n) |
| 归并排序 | O(n log n) | O(n log n) | O(n) |
| 二分查找 | O(log n) | O(log n) | O(1) |
| BFS/DFS | O(V+E) | O(V+E) | O(V) |
| Dijkstra | O((V+E) log V) | — | O(V) |

---

## 7. 如何评估自己的代码？

### 7.1 三步法

1. **数循环**：几层 for 循环 → 大概什么级别
2. **看递归**：递归树有多深 → 指数？线性？
3. **查 API**：内置方法的时间复杂度（见速查表）

### 7.2 经验法则

```javascript
// 数据量 < 1000      → 基本不用考虑优化
// 数据量 1000-10万   → 避免 O(n²)
// 数据量 10万-100万  → 用 O(n log n)，警惕 O(n) 的常数
// 数据量 > 100万     → 首选 O(log n) 或 O(1)
```

### 7.3 常见优化手段

| 问题 | 手段 | 复杂度变化 |
|------|------|-----------|
| 嵌套循环查重 | 用 Set/Map | O(n²) → O(n) |
| 无序数组搜索 | 先排序再二分 | O(n) → O(log n) |
| 海量字符串前缀搜索 | Trie 树 | O(n*m) → O(k) |
| 重复计算 | 缓存/动态规划 | O(2ⁿ) → O(n) |
| 大列表渲染 | 虚拟滚动 | O(n) 渲染 → O(1) |

---

## 8. 总结

1. **大 O 是一种"规模感"**：只看增长趋势，不看具体数值
2. **时间换空间，空间换时间**：没有银弹，只有权衡
3. **数据量是一切的前提**：100 条数据不需要优化，100 万条必须优化
4. **写代码前去想"能不能不用循环"**：用 Map/Set 替代双重 for，用公式替代递归
5. **前端也有复杂度问题**：虚拟列表、搜索联想、组件重渲染都是典型场景

---

## 参考资料

- [Big O Cheat Sheet](https://www.bigocheatsheet.com/)
- [Master Theorem 主定理](https://en.wikipedia.org/wiki/Master_theorem_(analysis_of_algorithms))
- [MDN — Array 方法时间复杂度](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
