---
title: 滑动窗口算法经典习题（一）：窗口内的和、积与计数
published: 2026-09-30
description: '四道变长窗口真题精讲：长度最小的子数组、乘积小于 K 的子数组、最大连续 1 的个数 III、替换后的最长重复字符。每题给出三个问题的答案、过程图解、易错点和 C / C++ / JavaScript 三语言实现。'
image: ''
tags: [滑动窗口, 双指针, 数组, 力扣, 子数组, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 导读

[滑动窗口核心代码模板：三个问题搞定所有子串、子数组题](/technology/sliding-window-template/) 把子串、子数组题收敛成了一套骨架，[滑动窗口：子数组/子串问题的通用解法](/technology/sliding-window/) 讲的是分类。这篇开始把骨架落到真题上。

八道题按「窗口里维护什么状态」拆成两篇：

| 篇目 | 题目 | 窗口状态 |
|------|------|---------|
| **本篇（一）** | 长度最小的子数组、乘积小于 K 的子数组、最大连续 1 的个数 III、替换后的最长重复字符 | 都是在窗口上**加减一个数**（和、积、0 的个数、频次），收缩条件是一个不等式 |
| [（二）换状态、反向转化与枚举维度](/technology/sliding-window-exercises-2/) | 存在重复元素 II、存在重复元素 III、将 x 减到 0 的最小操作数、至少有 K 个重复字符的最长子串 | 状态换成哈希表、分桶，以及「反着问」和「多枚举一个维度」两种变形 |

这四道题有个共同点：**窗口的合法性可以只看一个跟着窗口单调变化的量**——和、积、0 的个数、最高频字符的次数。所以模板里的 ②③④⑤ 四个填空处都是「加减一个数 + 比一个不等式」，不需要额外的数据结构。真正需要动脑子的只有一件事：**这个量什么时候用来判收缩，什么时候用来记答案。**

### 四道题的三问速查

| 题目 | ② 加入时维护 | ③ 收缩条件 | ④ 更新结果 | 答案是什么 |
|------|------------|-----------|-----------|-----------|
| [长度最小的子数组](#1-长度最小的子数组leetcode-209) | `sum += nums[right]` | `sum >= target`（满足就缩） | 收缩**前** | 最短长度 |
| [乘积小于 K 的子数组](#2-乘积小于-k-的子数组leetcode-713) | `prod *= nums[right]` | `prod >= k`（违规就缩） | 收缩**后**，按 `right - left` 记账 | 子数组个数 |
| [最大连续 1 的个数 III](#3-最大连续-1-的个数-iiileetcode-1004) | `zeros += (nums[right] == 0)` | `zeros > k`（违规就缩） | 收缩**后** | 最长长度 |
| [替换后的最长重复字符](#4-替换后的最长重复字符leetcode-424) | `cnt[c]++`，维护 `maxCnt` | `right - left - maxCnt > k`（违规就缩） | 收缩**后** | 最长长度 |

> **关于代码**
> 每题给出 C / C++ / JavaScript 三语言实现，三种写法逻辑完全等价，可切换标签查看。
> 窗口一律写成左闭右开的 `[left, right)`，所以长度永远是 `right - left`，`nums[right]` 是刚进窗的元素、`nums[left]` 是即将出窗的元素。

---

## 1. 长度最小的子数组（LeetCode 209）

### 题目描述

给定一个含有 `n` 个**正整数**的数组 `nums` 和一个正整数 `target`。找出该数组中满足其总和**大于等于** `target` 的长度最小的子数组，并返回其长度。如果不存在符合条件的子数组，返回 `0`。

**示例：**

```text
输入：target = 7, nums = [2,3,1,2,4,3]
输出：2
解释：子数组 [4,3] 是该条件下的长度最小的子数组。

输入：target = 4, nums = [1,4,4]          输出：1
输入：target = 11, nums = [1,1,1,1,1,1,1,1]  输出：0
```

**约束：** `1 <= target <= 10^9`，`1 <= nums.length <= 10^5`，`1 <= nums[i] <= 10^4`。

### 思路：和够了就缩，收缩前记录

窗口状态只有一个 `sum`。因为数组里**全是正数**，往右扩张时 `sum` 单调增、往左收缩时 `sum` 单调减，这就带来两个性质：

1. **只要 `sum >= target` 就该立刻收缩**——继续往外扩只会让窗口更长，不可能更优。这是模板里典型的「满足就缩」（流派 A）。
2. **收缩一定会破坏「已经够了」这个状态**，所以答案必须在移出 `left` **之前**记录，也就是「先记录、再破坏」。

顺着模板填四个空：② 加入时 `sum += nums[right]`；③ 收缩条件是 `sum >= target`；④ 在收缩循环的第一行记录 `right - left`；⑤ 移出时 `sum -= nums[left]`。

### 过程图解

以 `target = 7`、`nums = [2,3,1,2,4,3]` 为例：

```text
下标   0  1  2  3  4  5
nums   2  3  1  2  4  3
```

```text
扩张到 right=1，窗口 [0,1)=[2]，sum=2   → 不够，不收缩
扩张到 right=2，窗口 [0,2)=[2,3]，sum=5 → 不够，不收缩
扩张到 right=3，窗口 [0,3)=[2,3,1]，sum=6 → 不够，不收缩
扩张到 right=4，窗口 [0,4)=[2,3,1,2]，sum=10 ≥ 7 ← 进入收缩循环
  ├ 先记录：[0,4) 长度 4 → best = 4
  ├ 移出 2 → sum=8，窗口 [1,4) 长度 3 → best = 3
  ├ 移出 3 → sum=5，停止收缩，窗口 [2,4)=[1,2]
扩张到 right=5，窗口 [2,5)=[1,2,4]，sum=9 ≥ 7 ← 再次进入收缩循环
  ├ 先记录：[2,5) 长度 3，不比 3 更优
  ├ 移出 1 → sum=8，窗口 [3,5) 长度 2 → best = 2
  ├ 移出 2 → sum=6，停止收缩，窗口 [4,5)=[4]
扩张到 right=6，窗口 [4,6)=[4,3]，sum=9 ≥ 7
  ├ 先记录：[4,6) 长度 2，不比 2 更优
  └ 移出 4 → sum=5，停止收缩

答案 2 ✔（子数组 [4,3]）
```

注意两件事：`left` 永远不会超过 `right`（窗口始终合法）；以及**每一轮收缩都要先记录、再移出**——顺序反了就会记到一段「和已经小于 `target`」的窗口，长度偏小而且根本不合法。这道题上因为这个原因得到的长度恰好相同，所以很容易蒙混过关；换一组数据就会露馅（见下面的易错点 4）。

### 代码实现

:::code-tabs{default="cpp"}
```c title="C"
int minSubArrayLen(int target, int *nums, int numsSize) {
    long long sum = 0;                 /* 窗口内元素之和，long long 防溢出 */
    int left = 0, right = 0;
    int best = numsSize + 1;           /* 比任何合法长度都大，表示「还没找到」 */

    while (right < numsSize) {
        sum += nums[right];            /* ① 右边界元素入窗 */
        right++;                       /*    窗口变成 [left, right) */

        while (sum >= target) {        /* ③ 和已经够了，开始收缩 */
            if (right - left < best)   /* ④ 先记录答案，再把 left 移出去 */
                best = right - left;
            sum -= nums[left];         /* ⑤ 左边界元素出窗 */
            left++;
        }
    }
    return best == numsSize + 1 ? 0 : best;
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class Solution {
public:
    int minSubArrayLen(int target, vector<int>& nums) {
        long long sum = 0;
        int left = 0, right = 0;
        int best = (int)nums.size() + 1;      // 比任何合法长度都大

        while (right < (int)nums.size()) {
            sum += nums[right];               // ① 右边界元素入窗
            right++;

            while (sum >= target) {           // ③ 和已经够了，开始收缩
                if (right - left < best)      // ④ 先记录答案
                    best = right - left;
                sum -= nums[left];            // ⑤ 左边界元素出窗
                left++;
            }
        }
        return best == (int)nums.size() + 1 ? 0 : best;
    }
};
```

```js title="JavaScript"
function minSubArrayLen(target, nums) {
  let sum = 0;
  let left = 0, right = 0;
  let best = nums.length + 1;      // 比任何合法长度都大

  while (right < nums.length) {
    sum += nums[right];            // ① 右边界元素入窗
    right++;

    while (sum >= target) {        // ③ 和已经够了，开始收缩
      if (right - left < best)     // ④ 先记录答案
        best = right - left;
      sum -= nums[left];           // ⑤ 左边界元素出窗
      left++;
    }
  }
  return best === nums.length + 1 ? 0 : best;
}
```
:::

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — `right` 和 `left` 各自单向走完全程，每个元素最多进窗一次、出窗一次 |
| 空间复杂度 | **O(1)** — 只用了 `sum`、`best` 和两个指针 |

### 易错点

1. **`sum` 用 `long long` 更稳妥。** 窗口和的上界就是整个数组之和 `n × nums[i] = 10^5 × 10^4 = 10^9`，`int` 恰好装得下（上限约 `2.1 × 10^9`）；但题目里 `target` 本身也给到了 `10^9`，只要数据规模再涨一档就会溢出。写 `long long` 不花什么代价。
2. **找不到答案时返回 `0`，而不是把 `best` 的初值返回。** 所以初值要取 `n + 1` 这种不可能等于任何合法长度的哨兵，最后再判断一次。
3. **收缩条件用的是 `>=` 而不是 `>`。** 题目要的是「大于等于 `target`」，写成 `>` 会漏掉和恰好等于 `target` 的窗口。
4. **内层必须是 `while`，不能换成 `if`。** 有些题的收缩是「一轮最多缩一格」，这题不是：`sum >= target` 时可能要连缩好几格才把 `sum` 降下去。反例：`target = 10, nums = [1,1,1,10]`，正确答案是 1（子数组 `[10]`）。用 `while` 会一路缩到 `[10]`；换成 `if` 只缩一格，`left` 停在 1，答案会错报成 4。

> **扩展**：本题还有一个 O(n log n) 的解法——前缀和 + 二分答案（固定长度 `L`，检查是否存在长度 `L` 且和 ≥ `target` 的窗口，检验函数随 `L` 单调）。因为是正数数组，滑动窗口已经是最优，但这个「二分 + 前缀和」的套路在「不好维护窗口状态」的题上很有用。

---

## 2. 乘积小于 K 的子数组（LeetCode 713）

### 题目描述

给你一个整数数组 `nums` 和一个整数 `k`，请返回子数组内所有元素的乘积**严格小于** `k` 的连续子数组的数目。

**示例：**

```text
输入：nums = [10,5,2,6], k = 100
输出：8
解释：8 个乘积小于 100 的子数组分别为：
      [10]、[5]、[2]、[6]、[10,5]、[5,2]、[2,6]、[5,2,6]。
      注意 [10,5,2] 的乘积是 100，不小于 100，不算。

输入：nums = [1,2,3], k = 0   输出：0
```

**约束：** `1 <= nums.length <= 3 * 10^4`，`1 <= nums[i] <= 1000`，`0 <= k <= 10^6`。

### 思路：每个右端点贡献 `right - left` 个子数组

窗口状态是 `prod`。这题和上一题是同一种味道——都是正数，`prod` 随扩张单调增、随收缩单调减——但**答案的形状不一样**：

- 上一题要的是「最短的、满足条件的窗口」，是一个**窗口本身**；
- 这题要的是**子数组的个数**，得会数。

数的办法是：固定右端点 `right - 1`，问「以它为结尾的合法子数组有多少个」。因为数组全是正数，乘积随窗口变长只增不减，所以**以 `right - 1` 结尾的合法子数组，起点正好是 `left, left+1, …, right-1` 这连续的一段**，一共 `right - left` 个。把每个右端点的贡献加起来就是答案。

于是四个填空处：② `prod *= nums[right]`；③ 收缩条件是 `prod >= k`（**违规就缩**，流派 B——`prod` 越小越合法）；④ 收缩**之后**才有 `right - left` 可数，所以在收缩循环之后累加；⑤ `prod /= nums[left]`。

### 过程图解

以 `nums = [10,5,2,6]`、`k = 100` 为例：

```text
下标   0   1  2  3
nums   10  5  2  6
```

```text
加入 10 → prod=10   < 100，窗口 [0,1)
          以 nums[0] 结尾的合法子数组：1 - 0 = 1 个 → [10]          累计 1
加入 5  → prod=50   < 100，窗口 [0,2)
          以 nums[1] 结尾：2 - 0 = 2 个 → [5]、[10,5]                累计 3
加入 2  → prod=100  ≥ 100 ← 违规，收缩
          移出 10 → prod=10，窗口 [1,3)，1 < 2
          以 nums[2] 结尾：3 - 1 = 2 个 → [2]、[5,2]                 累计 5
加入 6  → prod=60   < 100，窗口 [1,4)
          以 nums[3] 结尾：4 - 1 = 3 个 → [6]、[2,6]、[5,2,6]        累计 8

答案 8 ✔
```

注意 `prod = 100` 那一轮：题目要求**严格小于** `k`，所以 `prod >= k` 就得缩；缩到 `prod = 10` 之后，窗口是 `[5,2]`，`prod` 的递减性保证了「再缩只会更小」，不会漏解。

### 代码实现

:::code-tabs{default="cpp"}
```c title="C"
int numSubarrayProductLessThanK(int *nums, int numsSize, int k) {
    long long prod = 1;                 /* 窗口内元素之积 */
    int left = 0, right = 0, count = 0;

    while (right < numsSize) {
        prod *= nums[right];            /* ① 右边界元素入窗 */
        right++;

        while (left < right && prod >= k) {   /* ③ 乘积超了就收缩；left < right 防空窗除零 */
            prod /= nums[left];               /* ⑤ 左边界元素出窗 */
            left++;
        }
        count += right - left;          /* ④ 以 right-1 结尾、起点落在窗口里的子数组 */
    }
    return count;
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class Solution {
public:
    int numSubarrayProductLessThanK(vector<int>& nums, int k) {
        long long prod = 1;
        int left = 0, right = 0, count = 0;

        while (right < (int)nums.size()) {
            prod *= nums[right];              // ① 右边界元素入窗
            right++;

            while (left < right && prod >= k) {   // ③ 乘积超了就收缩
                prod /= nums[left];               // ⑤ 左边界元素出窗
                left++;
            }
            count += right - left;            // ④ 以 right-1 结尾的合法子数组个数
        }
        return count;
    }
};
```

```js title="JavaScript"
function numSubarrayProductLessThanK(nums, k) {
  let prod = 1;
  let left = 0, right = 0, count = 0;

  while (right < nums.length) {
    prod *= nums[right];                    // ① 右边界元素入窗
    right++;

    while (left < right && prod >= k) {     // ③ 乘积超了就收缩
      prod /= nums[left];                   // ⑤ 左边界元素出窗
      left++;
    }
    count += right - left;                  // ④ 以 right-1 结尾的合法子数组个数
  }
  return count;
}
```
:::

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — 每个元素进窗一次、出窗一次，`count += right - left` 是 O(1) |
| 空间复杂度 | **O(1)** |

### 易错点

1. **收缩循环里必须带 `left < right` 这个条件。** 当 `k <= 1` 时（`nums[i] >= 1`，任何非空子数组的乘积都 ≥ 1），`prod >= k` 会一直成立，循环会把 `left` 推到 `right`。此时若还想 `prod /= nums[left]`，就会读到窗口外的元素、甚至除到 0 上。加上 `left < right` 之后，空窗口时自动停下，`count += right - left` 恰好贡献 0。
2. **`count += right - left` 写在收缩循环之外。** 写在里面会把同一轮的多个窗口重复计数。
3. **`count` 会很大。** `n = 3 × 10^4` 且全部元素为 1、`k` 很大时，答案是 `n(n+1)/2 = 4.5 × 10^8`，还在 `int` 范围内；但如果你把同样的模板套到更大的数据上，记得换 64 位。
4. **`prod` 在 C / C++ 里要留出余量。** 收缩是「超了就缩」，所以 `prod` 的峰值是 `k × nums[right] ≈ 10^6 × 1000 = 10^9`，`int` 勉强够，但写 `long long` 更稳。

---

## 3. 最大连续 1 的个数 III（LeetCode 1004）

### 题目描述

给定一个二进制数组 `nums` 和一个整数 `k`，假设最多可以翻转 `k` 个 `0`，返回执行操作后数组中连续 `1` 的最大个数。

**示例：**

```text
输入：nums = [1,1,1,0,0,0,1,1,1,1,0], k = 2
输出：6
解释：把下标 3、4 的两个 0 翻转成 1，得到 [1,1,1,1,1,1,0,1,1,1,1,0]，前 6 位是连续的 1；
      把下标 5、10 两个 0 翻转则是后 6 位连续为 1。

输入：nums = [0,0,1,1,0,0,1,1,1,0,1,1,0,0,0,1,1,1,1], k = 3
输出：10
```

**约束：** `1 <= nums.length <= 10^5`，`nums[i]` 不是 `0` 就是 `1`，`0 <= k <= nums.length`。

### 思路：把「窗口里有几个 0」当违规计数

「翻转最多 `k` 个 0」等价于：**找一个最长的窗口，窗口里的 0 不超过 `k` 个**。因为窗口里的 `0` 全部翻转成 `1` 之后，这个窗口就是一整段连续的 `1`；而窗口外的 `0` 不用管。

于是窗口状态是 `zeros`（窗口里 0 的个数）：

- ② 加入 `nums[right]` 时，如果是 0 就 `zeros++`；
- ③ 收缩条件是 `zeros > k`，这是「违规就缩」（流派 B）；
- ④ 收缩**之后**窗口才是合法的，这时才记录 `right - left`；
- ⑤ 移出 `nums[left]` 时，如果是 0 就 `zeros--`。

这题是「违规就缩」里最干净的一个例子：违规指标和窗口内容一一对应，没有任何花样。真正值得注意的是 ④ 的位置——**它必须写在收缩循环之后**。

### 过程图解

以 `nums = [1,1,1,0,0,0,1,1,1,1,0]`、`k = 2` 为例：

```text
下标  0  1  2  3  4  5  6  7  8  9  10
nums  1  1  1  0  0  0  1  1  1  1  0
```

```text
right=3：窗口 [0,4)=1110，zeros=1 ≤ 2 → best = 4
right=4：窗口 [0,5)=11100，zeros=2 ≤ 2 → best = 5
right=5：窗口 [0,6)=111000，zeros=3 > 2 ← 违规，收缩
  ├ 移出 1（下标 0）→ zeros 仍为 3
  ├ 移出 1（下标 1）→ 仍为 3
  ├ 移出 1（下标 2）→ 仍为 3
  ├ 移出 0（下标 3）→ zeros=2，停止收缩，窗口 [4,6)=00，长度 2
  └ 收缩后才记录：长度 2，不更新 best（best 还是 5）
right=6：窗口 [4,7)=001，zeros=2 → 长度 3
right=7：长度 4      right=8：长度 5      right=9：长度 6 → best = 6
right=10：窗口 [4,11)=0011110，zeros=3 > 2 ← 违规，收缩
  ├ 移出 0（下标 4）→ zeros=2，停止收缩，窗口 [5,11)
  └ 长度 5，不更新 best

答案 6 ✔
```

看清楚 ③ 和 ④ 的关系：**违规的窗口永远参与不了计分**。收缩循环的作用就是把窗口修回到 `zeros <= k`，修好之后再量长度。

### 代码实现

:::code-tabs{default="cpp"}
```c title="C"
int longestOnes(int *nums, int numsSize, int k) {
    int left = 0, right = 0;
    int zeros = 0;                      /* 窗口里有几个 0 */
    int best = 0;

    while (right < numsSize) {
        if (nums[right] == 0) zeros++;  /* ① 右边界入窗，顺带数 0 */
        right++;

        while (zeros > k) {             /* ③ 0 太多了，收缩到刚刚够用 */
            if (nums[left] == 0) zeros--;
            left++;
        }
        if (right - left > best)        /* ④ 收缩之后，窗口一定是合法的，这时才记录 */
            best = right - left;
    }
    return best;
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class Solution {
public:
    int longestOnes(vector<int>& nums, int k) {
        int left = 0, right = 0;
        int zeros = 0;                      // 窗口里有几个 0
        int best = 0;

        while (right < (int)nums.size()) {
            if (nums[right] == 0) zeros++;  // ① 右边界入窗，顺带数 0
            right++;

            while (zeros > k) {             // ③ 0 太多了，收缩到刚刚够用
                if (nums[left] == 0) zeros--;
                left++;
            }
            if (right - left > best)        // ④ 收缩之后窗口必然合法，这时才记录
                best = right - left;
        }
        return best;
    }
};
```

```js title="JavaScript"
function longestOnes(nums, k) {
  let left = 0, right = 0;
  let zeros = 0;                      // 窗口里有几个 0
  let best = 0;

  while (right < nums.length) {
    if (nums[right] === 0) zeros++;   // ① 右边界入窗，顺带数 0
    right++;

    while (zeros > k) {               // ③ 0 太多了，收缩到刚刚够用
      if (nums[left] === 0) zeros--;
      left++;
    }
    if (right - left > best)          // ④ 收缩之后窗口必然合法，这时才记录
      best = right - left;
  }
  return best;
}
```
:::

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** |
| 空间复杂度 | **O(1)** |

### 易错点

1. **`k = 0` 是合法输入。** 此时窗口里一个 0 都不能有，答案可能为 0（比如 `nums = [0,0]`），所以 `best` 的初值取 0 是对的，不要取 `-1` 或者 `n + 1`。
2. **记录答案放在收缩循环之后。** 放进去会记到 `zeros > k` 的窗口，答案偏大。
3. **不要把「翻转」真的写出到数组上。** 这题只要求个数，窗口里的 0 视作可翻转即可，不需要真的改 `nums`——`nums` 一旦被改，后面的窗口统计就全乱了。
4. **`zeros > k` 而不是 `zeros >= k`。** 最多可以翻转 `k` 个，所以 `zeros == k` 是合法的。

---

## 4. 替换后的最长重复字符（LeetCode 424）

### 题目描述

给你一个字符串 `s` 和一个整数 `k`。你可以选择字符串中的任一字符，并将其更改为任何其他大写英文字母，该操作最多可执行 `k` 次。返回执行上述操作之后，包含相同字母的最长子字符串的长度。

**示例：**

```text
输入：s = "ABAB", k = 2     输出：4
输入：s = "AABABBA", k = 1  输出：4
解释：把中间的 'A' 替换为 'B'，得到 "AABBBBA"，其中子串 "BBBB" 有最长重复字母，长度为 4。
```

**约束：** `1 <= s.length <= 10^5`，`s` 仅由大写英文字母组成，`0 <= k <= s.length`。

### 思路：窗口长度 − 窗口内最多字符的个数 ≤ k

这题和上一题是**同一道题换了层皮**：

| | 1004 | 424 |
|---|---|---|
| 「可操作」的字符 | 0（翻转成 1） | 非最高频字符（改成最高频字符） |
| 窗口合法条件 | `窗口里 0 的个数 ≤ k` | `窗口长度 - 窗口内最多字符的个数 ≤ k` |

道理是：想让一个窗口整体变成同一个字母，代价最小的改法是「留下窗口里出现最多的那种字母，其余的全都改掉」，所以要替换的字符数就是 `窗口长度 - 最高频字符的次数`。它不超过 `k` 就说明这个窗口可行。

维护的状态是 `cnt[26]` 和 `maxCnt`（窗口里出现最多的那个字符出现了几次）。③ 收缩条件是 `right - left - maxCnt > k`。

这里有个**关键细节**：`maxCnt` 只在加入字符时更新，**从不因为移出字符而减小**。也就是说它记的是「历史上出现过的最大频次」，不是「当前窗口内的最大频次」。这样写有两个好处：窗口长度变成单调不降的，收缩从 `while` 退化成 `if`（每轮最多缩一格）；同时真实答案也不会被算错。为什么可以这样，见下面的易错点。

### 过程图解

以 `s = "AABABBA"`、`k = 1` 为例：

```text
下标  0  1  2  3  4  5  6
s     A  A  B  A  B  B  A
```

```text
加入下标 0 的 A：[0,1)=A，cnt[A]=1，maxCnt=1
  长度 1 - 1 = 0 ≤ 1 → 不需要替换 → 窗口长度 1
加入下标 1 的 A：[0,2)=AA，cnt[A]=2，maxCnt=2
  2 - 2 = 0 ≤ 1 → 长度 2
加入下标 2 的 B：[0,3)=AAB，cnt[B]=1，maxCnt 仍为 2
  3 - 2 = 1 ≤ 1 → 长度 3（把 B 改成 A）
加入下标 3 的 A：[0,4)=AABA，cnt[A]=3，maxCnt=3
  4 - 3 = 1 ≤ 1 → 长度 4（把 B 改成 A）      best = 4
加入下标 4 的 B：[0,5)=AABAB，cnt[B]=2，maxCnt 仍为 3
  5 - 3 = 2 > 1 ← 违规，缩一格：cnt[A]-- → cnt[A]=2，窗口 [1,5)=ABAB，长度 4
  4 - 3 = 1 ≤ 1 → 长度 4，不更新 best
加入下标 5 的 B：[1,6)=ABABB，cnt[B]=3，maxCnt 仍为 3
  5 - 3 = 2 > 1 ← 违规，缩一格：cnt[A]-- → cnt[A]=1，窗口 [2,6)=BABB，长度 4
  4 - 3 = 1 ≤ 1 → 长度 4，不更新 best
加入下标 6 的 A：[2,7)=BABBA，cnt[A]=2，maxCnt 仍为 3
  5 - 3 = 2 > 1 ← 违规，缩一格：cnt[B]-- → cnt[B]=2，窗口 [3,7)=ABBA，长度 4
  4 - 3 = 1 ≤ 1 → 长度 4，不更新 best

答案 4 ✔
```

注意后面三轮里 `maxCnt = 3` 已经**不是当前窗口的真实最高频次**了（`[3,7)` 里 `A` 和 `B` 各 2 个），但窗口长度被稳定在 4，`best` 也就停在 4——而 4 确实是正确答案。

### 代码实现

:::code-tabs{default="cpp"}
```c title="C"
#include <string.h>

int characterReplacement(char *s, int k) {
    int cnt[26] = {0};
    int n = (int)strlen(s);
    int left = 0, right = 0;
    int maxCnt = 0;                 /* 历史上出现过的最大频次，只增不减 */
    int best = 0;

    while (right < n) {
        int c = s[right] - 'A';
        cnt[c]++;                   /* ① 右边界入窗 */
        if (cnt[c] > maxCnt) maxCnt = cnt[c];
        right++;

        if (right - left - maxCnt > k) {   /* ③ 需要替换的字符超过了 k */
            cnt[s[left] - 'A']--;          /* ⑤ 左边界出窗 */
            left++;
        }
        if (right - left > best) best = right - left;   /* ④ 收缩后记录 */
    }
    return best;
}
```

```cpp title="C++"
#include <string>
using namespace std;

class Solution {
public:
    int characterReplacement(string s, int k) {
        int cnt[26] = {0};
        int left = 0, right = 0;
        int maxCnt = 0;                 // 历史上出现过的最大频次，只增不减
        int best = 0;

        while (right < (int)s.size()) {
            int c = s[right] - 'A';
            cnt[c]++;                   // ① 右边界入窗
            if (cnt[c] > maxCnt) maxCnt = cnt[c];
            right++;

            if (right - left - maxCnt > k) {   // ③ 需要替换的字符超过了 k
                cnt[s[left] - 'A']--;          // ⑤ 左边界出窗
                left++;
            }
            if (right - left > best) best = right - left;   // ④ 收缩后记录
        }
        return best;
    }
};
```

```js title="JavaScript"
function characterReplacement(s, k) {
  const cnt = new Array(26).fill(0);
  let left = 0, right = 0;
  let maxCnt = 0;                 // 历史上出现过的最大频次，只增不减
  let best = 0;

  while (right < s.length) {
    const c = s.charCodeAt(right) - 65;
    cnt[c]++;                     // ① 右边界入窗
    if (cnt[c] > maxCnt) maxCnt = cnt[c];
    right++;

    if (right - left - maxCnt > k) {        // ③ 需要替换的字符超过了 k
      cnt[s.charCodeAt(left) - 65]--;       // ⑤ 左边界出窗
      left++;
    }
    if (right - left > best) best = right - left;   // ④ 收缩后记录
  }
  return best;
}
```
:::

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — 每个字符进出窗口各一次，`cnt` 只有 26 个格子 |
| 空间复杂度 | **O(1)** — 定长 26 的计数数组 |

### 易错点

1. **`maxCnt` 不是「当前窗口的最大频次」，而是「历史最大频次」。** 它只增不减，所以 `长度 - maxCnt <= k` 只能用来控制窗口长度，不能理解为「当前窗口一定合法」。配上 `if`（每轮最多缩一格、窗口长度单调不降）是主流写法；如果改成 `while`，就必须在收缩时重新统计窗口内的真实最高频次，否则判断条件和「窗口合法」不再等价。（顺带说一句：网上流传的「`while` + 只增不减的 `maxCnt` 一定是错的」这个说法我没能验证出来——把两种写法在 64 万组穷举数据上跑了一遍（长度 ≤ 9 的三字母串 118092 组 + 长度 ≤ 16 的二字母串 524280 组），结果完全一致。稳妥起见，还是用 `if` 版。）
2. **`cnt` 的下标要减去 `'A'`（65），别直接拿字符当下标。** C / C++ 里 `cnt[c]` 会越界；JS 里 `cnt[c]` 会变成 `undefined`，`++` 之后是 `NaN`，一路静默算错。
3. **收缩要写在更新答案之前。** 和 1004 一样，违规窗口不能参与计分。
4. **窗口里只留「成本最低」的那个字母作为保留字符。** 也就是出现次数最多的那个——别去枚举「保留哪个字母」，`maxCnt` 已经替你选好了。

---

## 四道题对照表

```text
题目                          ② 加入时维护               ③ 收缩条件                 ④ 更新结果           流派
209  长度最小的子数组        sum += nums[right]        sum >= target              收缩循环内、移出前    满足就缩
713  乘积小于 K 的子数组      prod *= nums[right]       prod >= k                  收缩循环后            违规就缩
1004 最大连续 1 的个数 III    zeros += nums[right]==0   zeros > k                  收缩循环后            违规就缩
424  替换后的最长重复字符      cnt[c]++、更新 maxCnt     right-left-maxCnt > k      收缩循环后            违规就缩
```

三句话概括：

1. **全正数的数组上，「和 / 积」这类窗口状态天然单调**：扩张让它变大，收缩让它变小。所以收缩条件就是「它越过了某个阈值」，答案的合法性完全由这个不等式决定。
2. **「最短」类问题（209）属于流派 A**：窗口一旦满足条件，继续扩张只会变差，就地收缩，并且要**在收缩前**把满足条件的窗口记下来。
3. **「最长」类问题（1004、424）属于流派 B**：窗口一旦违规，先收缩修好，**收缩后**才有资格量长度。713 也是流派 B，只是它记的不是长度，而是「以当前右端点结尾的合法窗口个数」。

再回头看模板的三问，「什么时候更新结果」这一问的答案在这里体现得最直接：**你要的状态会不会被收缩破坏？会被破坏就提前记，不能被破坏就收缩后再记。**

## 相关文章

- [滑动窗口核心代码模板：三个问题搞定所有子串、子数组题](/technology/sliding-window-template/) — 本篇用到的骨架、三问和左闭右开区间
- [滑动窗口算法经典习题（二）：换状态、反向转化与枚举维度](/technology/sliding-window-exercises-2/) — 哈希表、分桶、反向转化与枚举维度
- [滑动窗口：子数组/子串问题的通用解法](/technology/sliding-window/) — 定长、变长、覆盖三类窗口的分类
- [数组双指针：从 O(n²) 到 O(n) 的优化利器](/technology/two-pointers-array/) — 滑动窗口背后的双指针思想
