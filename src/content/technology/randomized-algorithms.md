---
title: 随机算法：洗牌、蓄水池抽样与蒙特卡洛
published: 2026-04-26
description: '掌握 Fisher-Yates 洗牌、蓄水池抽样、蒙特卡洛方法等经典随机算法，附带 TypeScript 实现与实际应用。'
image: ''
tags: [随机算法, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 1. Fisher-Yates 洗牌算法

将数组随机打乱，每个排列出现的概率相等。

```typescript
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 验证均匀性
const counter = new Map<string, number>();
for (let t = 0; t < 100000; t++) {
  const arr = [1, 2, 3];
  shuffle(arr);
  const key = arr.join('');
  counter.set(key, (counter.get(key) || 0) + 1);
}
console.log(counter); // 每种排列 ≈ 16666 次
```

**复杂度**：时间 O(n)，空间 O(1)，每个位置选到任意元素的概率 = 1/n。

---

## 2. 蓄水池抽样

从**未知大小**的数据流中随机抽取 k 个元素，每个元素被选中的概率相等。

```typescript
function reservoirSampling(stream: number[], k: number): number[] {
  const reservoir: number[] = [];

  for (let i = 0; i < stream.length; i++) {
    if (i < k) {
      reservoir.push(stream[i]);
    } else {
      const j = Math.floor(Math.random() * (i + 1));
      if (j < k) {
        reservoir[j] = stream[i];
      }
    }
  }

  return reservoir;
}
```

**证明**：第 i 个元素最终留在蓄水池的概率 = `k / i × (1 - k/(i+1) × 1/k) × ... × (1 - k/n × 1/k) = k/n`

---

## 3. 加权随机选取

```typescript
interface Weighted {
  value: number;
  weight: number;
}

function weightedRandom(items: Weighted[]): number {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item.value;
  }

  return items[items.length - 1].value;
}
```

### 3.1 前缀和 + 二分优化（多次选取）

```typescript
class WeightedPicker {
  private prefix: number[];
  private total: number;
  private items: number[];

  constructor(items: Weighted[]) {
    this.items = items.map(i => i.value);
    this.prefix = [];
    this.total = 0;
    for (const { weight } of items) {
      this.total += weight;
      this.prefix.push(this.total);
    }
  }

  pick(): number {
    const target = Math.random() * this.total;
    let left = 0, right = this.prefix.length - 1;
    while (left < right) {
      const mid = (left + right) >>> 1;
      if (this.prefix[mid] < target) left = mid + 1;
      else right = mid;
    }
    return this.items[left];
  }
}
```

---

## 4. 蒙特卡洛方法

通过随机采样估算确定性问题。

### 4.1 估算 π

```typescript
function estimatePi(samples: number = 1000000): number {
  let inside = 0;
  for (let i = 0; i < samples; i++) {
    const x = Math.random();
    const y = Math.random();
    if (x * x + y * y <= 1) inside++;
  }
  return (4 * inside) / samples;
}

console.log(estimatePi()); // ≈ 3.1416
```

---

## 5. 随机化数组分区（QuickSelect）

```typescript
function quickSelect(nums: number[], k: number): number {
  function partition(left: number, right: number): number {
    const pivotIndex = left + Math.floor(Math.random() * (right - left + 1));
    const pivot = nums[pivotIndex];
    [nums[pivotIndex], nums[right]] = [nums[right], nums[pivotIndex]];

    let storeIndex = left;
    for (let i = left; i < right; i++) {
      if (nums[i] < pivot) {
        [nums[storeIndex], nums[i]] = [nums[i], nums[storeIndex]];
        storeIndex++;
      }
    }
    [nums[storeIndex], nums[right]] = [nums[right], nums[storeIndex]];
    return storeIndex;
  }

  let left = 0, right = nums.length - 1;
  while (left <= right) {
    const pivotIdx = partition(left, right);
    if (pivotIdx === k) return nums[pivotIdx];
    if (pivotIdx < k) left = pivotIdx + 1;
    else right = pivotIdx - 1;
  }

  return nums[left];
}

// 期望 O(n)，最坏 O(n²)
```

---

## 6. 实战：前端 A/B 测试分流

```typescript
class ABTesting {
  private variants: string[];
  private weights: number[];

  constructor(config: Record<string, number>) {
    this.variants = Object.keys(config);
    this.weights = Object.values(config);
  }

  assign(userId: string): string {
    const total = this.weights.reduce((a, b) => a + b, 0);
    // 用 hash 确保同一用户始终分到同一组
    const hash = this.hashCode(userId) % total;
    let cumulative = 0;
    for (let i = 0; i < this.variants.length; i++) {
      cumulative += this.weights[i];
      if (hash < cumulative) return this.variants[i];
    }
    return this.variants[this.variants.length - 1];
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }
}
```

---

## 7. 总结

| 算法 | 复杂度 | 场景 |
|------|--------|------|
| Fisher-Yates | O(n) | 随机排列 |
| 蓄水池抽样 | O(n) | 流式均匀抽样 |
| 加权随机 | O(n) / O(log n) | 非均匀抽样 |
| 蒙特卡洛 | O(n) | 估算确定性问题 |

1. `Math.random()` 是伪随机，安全场景用 `crypto.getRandomValues()`
2. 随机化能避免最坏退化（如 QuickSelect）
3. 用 hash 做用户分组实现稳定分流

---

## 参考资料

- [Fisher-Yates Shuffle](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle)
- [Reservoir Sampling](https://en.wikipedia.org/wiki/Reservoir_sampling)
