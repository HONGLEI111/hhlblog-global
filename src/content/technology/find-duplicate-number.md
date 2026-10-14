---
title: 寻找重复数：二分查找与快慢指针（不修改数组、O(1) 空间）
published: 2026-09-01
description: '给定 n+1 个取值范围在 [1,n] 的整数，找出唯一的重复数，且不修改数组、只用 O(1) 额外空间。分别用值域二分与 Floyd 判圈（快慢指针）两种思路求解，附 C / C++ / JavaScript 三语言实现。'
image: ''
tags: [数组, 二分查找, 快慢指针, Floyd判圈, 双指针, 鸽巢原理, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 题目描述

给定一个包含 `n + 1` 个整数的数组 `nums`，其数字都在 `[1, n]` 范围内（包括 1 和 n），可知至少存在一个重复的整数。

假设 `nums` **只有一个**重复的整数，返回这个重复的数。

你设计的解决方案必须**不修改**数组 `nums`，且只用常量级 **O(1)** 的额外空间。

**示例 1：**

```
输入：nums = [1,3,4,2,2]
输出：2
```

**示例 2：**

```
输入：nums = [3,1,3,4,2]
输出：3
```

**示例 3：**

```
输入：nums = [3,3,3,3,3]
输出：3
```

**提示与约束：**

- `1 <= n <= 10^5`
- `nums.length == n + 1`
- `1 <= nums[i] <= n`
- `nums` 中只有一个整数出现两次或多次，其余整数均只出现一次

## 为什么至少存在一个重复数

这是**鸽巢原理**（抽屉原理）的直接应用：

> 把 `n + 1` 只「鸽子」放进 `n` 个「巢」里，至少有一个巢里住着两只鸽子。

在本题中，「鸽子」是数组里的 `n + 1` 个元素，「巢」是取值范围 `1..n` 这 `n` 个数字。元素数量比取值个数多 1，所以必然有某个数字至少出现两次——重复数一定存在。

## 解法一：值域二分（O(n log n) 时间 / O(1) 空间）

### 核心洞察

直觉上，二分查找需要「有序数组」；但本题的关键在于：**我们不是对数组下标二分，而是对值的范围 `[1, n]` 二分**。

对任意候选值 `mid ∈ [1, n]`，统计 `nums` 中满足 `≤ mid` 的元素个数，记为 `cnt`：

- 如果 `cnt > mid`：说明 `[1, mid]` 这个范围里「装了比范围本身还多的元素」。由鸽巢原理，重复数必然落在 `[1, mid]`，于是把右边界收紧到 `mid`。
- 如果 `cnt <= mid`：说明重复数不在 `[1, mid]`，而落在 `[mid + 1, n]`，于是把左边界推进到 `mid + 1`。

> 为什么 `cnt > mid` 就一定有重复？因为范围 `[1, mid]` 一共只有 `mid` 个不同数字，若它们每个最多出现一次，则 `≤ mid` 的元素最多只有 `mid` 个；现在 `cnt > mid`，说明其中必然有数字出现了不止一次。

不断二分，最终收敛到的 `left` 就是那个重复数。

### 分步图解

以 `nums = [1,3,4,2,2]`、`n = 4` 为例（值域 `[1,4]`）：

```text
初始：left=1, right=4

mid = 2，统计 ≤ 2 的元素：[1,2,2] → cnt = 3
3 > 2 → 重复数在 [1,2]，right = 2

mid = 1，统计 ≤ 1 的元素：[1] → cnt = 1
1 > 1 不成立 → 重复数在 [2,2]，left = 2

left == right == 2 → 返回 2 ✔
```

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n log n)** — 二分共 O(log n) 轮，每轮扫描整个数组 O(n) |
| 空间复杂度 | **O(1)** — 只用了几个计数变量 |
| 是否修改数组 | **否** — 全程只读 |

## 解法二：快慢指针 / Floyd 判圈（O(n) 时间 / O(1) 空间）

### 核心洞察：把数组看成链表

这是本题最精妙的一步——**把数组当成一个链表**：

- 把每个下标 `i` 看作链表的一个「节点」；
- 节点 `i` 的 `next` 指针指向 `nums[i]`，即 `i → nums[i]`。

由于所有元素值都在 `[1, n]`，而数组长度为 `n + 1`，所以：

- **没有任何节点指向下标 `0`**（所有值都 ≥ 1）；
- 从下标 `0` 出发沿着 `next` 一直走，必然会进入一个「环」。

而这个**环的入口，恰好就是重复数**——因为重复数 `d` 被至少两个不同的下标同时指向，形成「两条路径汇入同一个节点」，这正是环入口的特征。

于是「找重复数」被转化成了我们已经熟悉的「**找链表环入口**」问题，直接套用 **Floyd 判圈**。

### 两阶段算法

- **第一阶段：找到环内相遇点**。`slow` 每次走一步（`slow = nums[slow]`），`fast` 每次走两步（`fast = nums[nums[fast]]`），直到两者相遇。
- **第二阶段：找到环入口**。把 `slow` 重置回下标 `0`，然后 `slow` 与 `fast` **以相同速度**（每次一步）前进，再次相遇的节点就是环入口，也就是重复数。

### 数学证明（简）

设链表起点到环入口的距离为 `a`，环入口到第一次相遇点的距离为 `b`，环长为 `L`，则相遇点到环入口的剩余距离为 `c = L - b`。

第一次相遇时，`slow` 走了 `a + b` 步，`fast` 走了 `a + b + k·L` 步（多绕了 k 圈）。因为 `fast` 速度是 `slow` 的两倍：

```text
2(a + b) = a + b + k·L
   a + b = k·L
       a = (k-1)·L + (L - b) = (k-1)·L + c
```

也就是说：**从起点走 `a` 步到环入口的距离，等于从相遇点走 `c` 步（可能多绕几圈）到环入口的距离**。所以让 `slow` 从起点、`fast` 从相遇点同速前进，必定在环入口相遇。

> 完整的推导细节可参考文末的《判断单链表环并找出环起点》一文。

### 分步图解

以 `nums = [1,3,4,2,2]` 为例，链表结构为 `0 → 1 → 3 → 2 ⇄ 4`：

```text
下标： 0  1  2  3  4
值：   1  3  4  2  2

链表：0 → 1 → 3 → 2 ⇄ 4   （2 和 4 构成环，环入口是 2）

第一阶段（找相遇点）：
slow=0, fast=0
  slow=nums[0]=1, fast=nums[nums[0]]=nums[1]=3
  slow=nums[1]=3, fast=nums[nums[3]]=nums[2]=4
  slow=nums[3]=2, fast=nums[nums[4]]=nums[2]=4
  slow=nums[2]=4, fast=nums[nums[4]]=nums[2]=4  ← 在 4 相遇

第二阶段（找环入口）：
slow 重置到 0，fast 留在 4
  slow=nums[0]=1, fast=nums[4]=2
  slow=nums[1]=3, fast=nums[2]=4
  slow=nums[3]=2, fast=nums[4]=2  ← 在 2 相遇
返回 2 ✔
```

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — 两个阶段各线性扫描 |
| 空间复杂度 | **O(1)** — 只用了两个指针 |
| 是否修改数组 | **否** — 全程只读 |

## 代码实现

:::code-tabs{default="cpp"}
```c title="C"
#include <stdio.h>

/* 解法一：值域二分 */
int findDuplicateBinarySearch(int *nums, int numsSize) {
    int left = 1, right = numsSize - 1; /* 值域是 [1, n]，n = numsSize - 1 */

    while (left < right) {
        int mid = left + (right - left) / 2;
        int cnt = 0;
        for (int i = 0; i < numsSize; i++) {
            if (nums[i] <= mid) cnt++;
        }
        if (cnt > mid) {
            right = mid;    /* 重复数在 [left, mid] */
        } else {
            left = mid + 1; /* 重复数在 [mid+1, right] */
        }
    }
    return left;
}

/* 解法二：快慢指针（Floyd 判圈） */
int findDuplicateFloyd(int *nums, int numsSize) {
    (void)numsSize;
    int slow = 0, fast = 0;

    /* 第一阶段：找到环内相遇点 */
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow != fast);

    /* 第二阶段：找到环入口（即重复数） */
    slow = 0;
    while (slow != fast) {
        slow = nums[slow];
        fast = nums[fast];
    }
    return slow;
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class Solution {
public:
    /* 解法一：值域二分 */
    int findDuplicateBinarySearch(vector<int>& nums) {
        int n = nums.size() - 1;
        int left = 1, right = n;

        while (left < right) {
            int mid = left + (right - left) / 2;
            int cnt = 0;
            for (int x : nums) {
                if (x <= mid) cnt++;
            }
            if (cnt > mid) {
                right = mid;    // 重复数在 [left, mid]
            } else {
                left = mid + 1; // 重复数在 [mid+1, right]
            }
        }
        return left;
    }

    /* 解法二：快慢指针（Floyd 判圈） */
    int findDuplicateFloyd(vector<int>& nums) {
        int slow = 0, fast = 0;

        // 第一阶段：找到环内相遇点
        do {
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);

        // 第二阶段：找到环入口（即重复数）
        slow = 0;
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[fast];
        }
        return slow;
    }
};
```

```js title="JavaScript"
/* 解法一：值域二分 */
function findDuplicateBinarySearch(nums) {
    let left = 1;
    let right = nums.length - 1;

    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        let cnt = 0;
        for (const x of nums) {
            if (x <= mid) cnt++;
        }
        if (cnt > mid) {
            right = mid;    // 重复数在 [left, mid]
        } else {
            left = mid + 1; // 重复数在 [mid+1, right]
        }
    }
    return left;
}

/* 解法二：快慢指针（Floyd 判圈） */
function findDuplicateFloyd(nums) {
    let slow = 0;
    let fast = 0;

    // 第一阶段：找到环内相遇点
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow !== fast);

    // 第二阶段：找到环入口（即重复数）
    slow = 0;
    while (slow !== fast) {
        slow = nums[slow];
        fast = nums[fast];
    }
    return slow;
}
```
:::

## 解法对比

| 解法 | 时间复杂度 | 空间复杂度 | 修改数组 | 核心思想 |
|------|-----------|-----------|---------|---------|
| 值域二分 | O(n log n) | O(1) | 否 | 对值域二分 + 鸽巢原理计数 |
| 快慢指针 | **O(n)** | O(1) | 否 | 把数组建模成链表 + Floyd 判圈 |

- **二分查找**更通用：只要存在「按阈值计数满足单调性」的性质即可套用，不依赖 `[1, n]` 这一特殊值域；代价是慢一档（多一个 log n）。
- **快慢指针**是线性最优解，但技巧性强：它依赖「值域 `[1, n]`、长度 `n + 1`」这个精确结构，才能把数组完美建模成带环链表。

## 关键要点

1. **鸽巢原理是正确性根基**：二分解法的「`cnt > mid` 则重复数在左侧」正是鸽巢原理的另一种表述。
2. **二分不一定二分下标**：本题展示了「对值域二分」这一重要变体，把「找数」变成「找第一个满足 `cnt > mid` 的位置」。
3. **把数组当链表是神来之笔**：`i → nums[i]` 的建模让「找重复数」回归到熟悉的「找环入口」问题。
4. **两者都天然满足约束**：全程只读数组、只用 O(1) 空间，无需排序、无需哈希表、无需标记。

## 扩展思考

- 如果**允许修改数组**，还有更直观的做法：遍历时把 `nums[i]` 对应位置的值取负数做「标记」，再次遇到负值即命中重复数（负号标记法，O(n) 时间）。
- 如果**允许 O(n) 额外空间**，直接用哈希表统计出现次数即可，这是最朴素的对照。
- 本题的链表建模依赖「值域正好是 `[1, n]`」。如果值域被破坏（比如包含 0），还能否建模成链表？提示：需要给下标 0 一个「不会被指向」的性质。

## 相关文章

- [判断单链表环并找出环起点](/technology/linked-list-cycle/) — Floyd 判圈在链表上的标准版本，含完整数学推导
- [二分搜索：从入门到边界处理精通](/technology/binary-search/) — 值域二分与边界处理的基础
- [数组双指针](/technology/two-pointers-array/) — 快慢指针等双指针模式概述
