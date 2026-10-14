---
title: 滑动窗口算法经典习题（二）：换状态、反向转化与枚举维度
published: 2026-10-01
description: '四道进阶滑动窗口真题精讲：存在重复元素 II、存在重复元素 III、将 x 减到 0 的最小操作数、至少有 K 个重复字符的最长子串。分别演示把窗口状态换成哈希表与分桶、把题目反向转化、以及枚举维度这三种变形，附 C / C++ / JavaScript 实现。'
image: ''
tags: [滑动窗口, 双指针, 哈希表, 力扣, 分桶, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 导读

[滑动窗口核心代码模板：三个问题搞定所有子串、子数组题](/technology/sliding-window-template/) 里的三段骨架、[滑动窗口算法经典习题（一）](/technology/sliding-window-exercises-1/) 里的「加减一个数 + 比一个不等式」，处理的是窗口状态能用一两个整数表达清楚的题。这篇的四道题，骨架还是那套骨架，但都要先做一步变形：

| 篇目 | 题目 | 变形 |
|------|------|------|
| [（一）窗口内的和、积与计数](/technology/sliding-window-exercises-1/) | 长度最小的子数组、乘积小于 K 的子数组、最大连续 1 的个数 III、替换后的最长重复字符 | 窗口状态是「加减一个数」 |
| **本篇（二）** | 存在重复元素 II、存在重复元素 III、将 x 减到 0 的最小操作数、至少有 K 个重复字符的最长子串 | **换状态**（哈希表、分桶）、**反向转化**、**多枚举一个维度** |

四道题各自的关卡：

1. **存在重复元素 II**：判断条件是「值相等」而不是「计数达标」，窗口状态得从计数换成**哈希表**；
2. **存在重复元素 III**：「值相等」放宽成「值相差不超过 `t`」，哈希表不够用了，要按**值域分桶**；
3. **将 x 减到 0 的最小操作数**：题面是从两端删，正面做不了滑窗，得**反向转化**成「中间留下的一段」；
4. **至少有 K 个重复字符的最长子串**：直接滑窗不成立（窗口变长、变短都可能破坏条件），得**枚举「窗口里有几种字符」**这个维度，把一道题拆成 26 道可滑窗的题。

> **关于代码**
> 每题给出 C / C++ / JavaScript 三语言实现，三种写法逻辑完全等价，可切换标签查看。
> 窗口依旧写成左闭右开的 `[left, right)`。

### 四道题对照表

| 题目 | 窗口状态 | 收缩条件 | 关键动作 |
|------|---------|---------|---------|
| [存在重复元素 II](#1-存在重复元素-iileetcode-219) | 哈希表「值 → 最近一次出现的下标」 | 不需要收缩 | 命中时比较下标距离 |
| [存在重复元素 III](#2-存在重复元素-iiileetcode-220) | 哈希表「桶号 → 桶里的元素」 | 删掉过期下标的桶 | 桶宽取 `t + 1` |
| [将 x 减到 0 的最小操作数](#3-将-x-减到-0-的最小操作数leetcode-1658) | 中间那一段的 `sum` | `sum > total - x` | 先把题面反转过来 |
| [至少有 K 个重复字符的最长子串](#4-至少有-k-个重复字符的最长子串leetcode-395) | `cnt[26]` + `distinct` + `reached` | `distinct > types` | 外层再枚举 `types` |

---

## 1. 存在重复元素 II（LeetCode 219）

### 题目描述

给你一个整数数组 `nums` 和一个整数 `k`，判断数组中是否存在两个**不同的索引** `i` 和 `j`，满足 `nums[i] == nums[j]` 且 `abs(i - j) <= k`。如果存在，返回 `true`；否则，返回 `false`。

**示例：**

```text
输入：nums = [1,2,3,1], k = 3        输出：true    （下标 0 和 3，距离 3）
输入：nums = [1,0,1,1], k = 1        输出：true    （下标 2 和 3，距离 1）
输入：nums = [1,2,3,1,2,3], k = 2    输出：false
```

**约束：** `1 <= nums.length <= 10^5`，`-10^9 <= nums[i] <= 10^9`，`0 <= k <= 10^5`。

### 思路：把「窗口」换成「每个值最近一次出现的位置」

这题的判断条件也可以翻译成窗口语言：**存在一个长度不超过 `k + 1` 的窗口，窗口里有重复值**。按模板正着写，就是「窗口不超过 `k + 1` 个元素 + 哈希集合记录窗口内出现过哪些值」，进窗时 `add`、出窗时 `remove`。

但有个更省事的写法：**不维护窗口，只记录每个值「最近一次出现的下标」**。

- 扫到下标 `i`、值是 `v` 时，查表拿到 `v` 上次出现的下标 `j`；
- 如果 `j` 存在且 `i - j <= k`，直接返回 `true`；
- 否则把 `v` 的记录更新成 `i`。

为什么不需要显式出窗？因为「值相同」这个条件的有效期本来就很短：只要新来一个同值元素，旧下标就再也没用了（距离只会越来越大）。所以**用「最新下标」覆盖旧记录，等价于把旧记录移出了窗口**。⑤ 这一步被省掉了，但它并没有消失，只是并进了「更新」里。

顺着模板填空：② 加入时「查表 + 覆盖」；③ 没有收缩条件（不是每道变长窗口题都需要收缩——这题的窗口是靠「覆盖」自动维护的）；④ 在查表命中时立刻返回；⑤ 无需维护。

### 过程图解

以 `nums = [1,0,1,1]`、`k = 1` 为例（表里记的是「值 → 最新下标」）：

```text
下标  0  1  2  3
nums  1  0  1  1
```

```text
i=0  v=1  表里没有 1        → 记下 {1: 0}
i=1  v=0  表里没有 0        → 记下 {1: 0, 0: 1}
i=2  v=1  表里有 1，j=0     → 距离 2 - 0 = 2 > k=1 → 不算，覆盖成 {1: 2}
i=3  v=1  表里有 1，j=2     → 距离 3 - 2 = 1 ≤ k=1 → 返回 true ✔
```

再看一个返回 `false` 的例子 `nums = [1,2,3,1,2,3]`、`k = 2`：

```text
i=3  v=1  表里 {1: 0}  → 距离 3 > 2 → 覆盖成 {1: 3}
i=4  v=2  表里 {2: 1}  → 距离 3 > 2 → 覆盖成 {2: 4}
i=5  v=3  表里 {3: 2}  → 距离 3 > 2 → 覆盖成 {3: 5}
扫完也没有一对距离 ≤ 2 的相同值 → 返回 false ✔
```

注意 `i=3` 那一轮：`1` 在下标 0 出现过，距离不满足，于是**旧记录被丢掉**。后面就算再出现 `1`，比较的也是下标 3 而不是下标 0——这正是「旧记录自动出窗」的含义。

### 代码实现

:::code-tabs{default="cpp"}
```c title="C"
#include <stdbool.h>
#include <limits.h>

/* 值 → 最近一次出现的下标。开放寻址 + 线性探测，同一个值只保留最新下标，
   所以整张表只写不删，不需要墓碑。 */
#define CAP (1u << 18)                       /* 2 的幂：& (CAP-1) 代替取模 */
#define EMPTY LLONG_MIN

static long long key2[CAP];
static int       pos2[CAP];

static unsigned long long hash2(long long x) {
    unsigned long long h = (unsigned long long)x;
    h ^= h >> 33; h *= 0xff51afd7ed558ccdULL;
    h ^= h >> 33; h *= 0xc4ceb9fe1a85ec53ULL;
    h ^= h >> 33;
    return h;
}

static void clear2(void) {
    for (unsigned i = 0; i < CAP; i++) key2[i] = EMPTY;
}

bool containsNearbyDuplicate(int *nums, int numsSize, int k) {
    clear2();

    for (int i = 0; i < numsSize; i++) {
        long long v = nums[i];
        unsigned long long h = hash2(v) & (CAP - 1);

        while (key2[h] != EMPTY && key2[h] != v)
            h = (h + 1) & (CAP - 1);         /* 线性探测找位置 */

        if (key2[h] == v) {
            if (i - pos2[h] <= k) return true;   /* 距离够近，命中 */
            pos2[h] = i;                          /* 否则更新成最新下标 */
        } else {
            key2[h] = v;
            pos2[h] = i;
        }
    }
    return false;
}
```

```cpp title="C++"
#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    bool containsNearbyDuplicate(vector<int>& nums, int k) {
        unordered_map<int, int> last;   // 值 → 最近一次出现的下标

        for (int i = 0; i < (int)nums.size(); i++) {
            auto it = last.find(nums[i]);
            if (it != last.end() && i - it->second <= k) return true;
            last[nums[i]] = i;          // 同一个值只留最新下标，天然完成「出窗」
        }
        return false;
    }
};
```

```js title="JavaScript"
function containsNearbyDuplicate(nums, k) {
  const last = new Map();          // 值 → 最近一次出现的下标

  for (let i = 0; i < nums.length; i++) {
    const j = last.get(nums[i]);
    if (j !== undefined && i - j <= k) return true;
    last.set(nums[i], i);          // 同一个值只留最新下标，天然完成「出窗」
  }
  return false;
}
```
:::

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — C 版均摊 O(1)（开放寻址），C++ / JS 版哈希表均摊 O(1) |
| 空间复杂度 | **O(d)** — `d` 是数组里不同值的个数（≤ `n`）；记录只增不减，但同一个值始终只占一条 |

### 易错点

1. **`i - j <= k` 不是 `i - j < k`。** 题目要求下标差的**绝对值不超过 `k`**。`k = 0` 也是合法输入，这时只有 `i == j` 才满足距离条件，而题目要求的是两个不同的下标，所以答案必为 `false`。
2. **命中但距离超标时要「覆盖」而不是「跳过」。** 忘了覆盖，旧下标会一直留在表里，后面再遇到同值元素还是拿老下标比较，永远不会命中。
3. **C 版必须处理负数和 `LLONG_MIN` 的冲突。** `nums[i]` 可以是负数（下界 `-10^9`），哈希函数先把 `long long` 转成 `unsigned long long` 再混淆，负数也能正常散开；空槽标记用 `LLONG_MIN` 是因为它落在 `nums[i]` 的取值范围之外。
4. **JS 里判空要用 `=== undefined`，不能用假值判断。** `last.get(nums[i])` 有可能返回下标 `0`，`if (j)` 会把下标 0 当成「没出现过」。
5. **如果面试官要求「用窗口写」**，等价写法是「维护一个大小不超过 `k + 1` 的集合：进窗时 `add`，当集合大小超过 `k + 1` 时把 `nums[i - k]` 删掉」，就是模板里的 ②③⑤ 全套动作。两种写法时间都是 O(n)，但集合写法只装最近 `k + 1` 个元素，空间是 O(min(n, k))，比「记录全部不同值」的写法更省；反过来，本文这种写法不用真的维护窗口，代码更短。

---

## 2. 存在重复元素 III（LeetCode 220）

### 题目描述

给你一个整数数组 `nums` 和两个整数 `indexDiff` 和 `valueDiff`，找出满足下述条件的下标对 `(i, j)`：`i != j`、`abs(i - j) <= indexDiff`、`abs(nums[i] - nums[j]) <= valueDiff`。存在就返回 `true`。

> **关于参数名**：这题在力扣上有过两版题面——现行题面（`220. 存在重复元素 III`）把两个参数写作 `indexDiff`（下标距离上限）和 `valueDiff`（数值差上限），早期题面写作 `k` 和 `t`，取值上界也不同。两者只是命名差异，题面含义和解法完全一致，下面统一用更短的 `k` 和 `t`。

**示例：**

```text
输入：nums = [1,2,3,1], k = 3, t = 0        输出：true    （下标 0 和 3，值都是 1）
输入：nums = [1,5,9,1,5,9], k = 2, t = 3    输出：false
输入：nums = [-3,3], k = 2, t = 4           输出：false
输入：nums = [-2147483648, 2147483647], k = 1, t = 0   输出：false
```

**约束：** 现行题面是 `2 <= nums.length <= 10^5`、`-10^9 <= nums[i] <= 10^9`、`1 <= k <= nums.length`、`0 <= t <= 10^9`；早期题面是 `1 <= nums.length <= 2 * 10^4`、`-2^31 <= nums[i] <= 2^31 - 1`、`0 <= k <= 10^4`、`0 <= t <= 2^31 - 1`（上面最后一个示例就来自那一版）。下面的代码按两者的并集考虑边界：数值统一用 64 位、负数用向下取整、哈希表按数组长度 10^5 的上限开。

### 思路：按值域分桶

上一题只要判断「值相等」，哈希表够用。这题要判断的是「**值相差不超过 `t`**」——也就是「窗口里有没有一个数落在 `[v - t, v + t]` 这个区间里」。哈希表查不了区间，需要一种**按值有序**的窗口结构。

两种常用做法：

- **窗口 + 有序集合**：维护窗口内元素的有序集合，每次用二分找 `>= v - t` 的最小元素，判断它是否 `<= v + t`。C++ 用 `std::set` + `lower_bound`，复杂度 O(n log k)。
- **窗口 + 分桶**：把值域切成宽度为 `t + 1` 的桶，桶号是 `floor(v / (t + 1))`。同桶里任意两个数之差**一定不超过** `t`，于是只需要查三个桶：自己的桶、左邻桶、右邻桶。每个桶最多留一个元素，均摊 O(1)。

下面用分桶写。为什么「每个桶最多留一个元素」？因为一旦某个桶里已经有元素，而新元素又落进同一个桶，两者之差 `<= t`，当场就能返回 `true`——所以桶里那个唯一的元素，就是「还没被判定成功」时该桶的当前内容。

模板四个空：② 加入 `nums[i]` 时算出桶号并查邻桶；③ 收缩条件变成「**删掉过期下标的桶**」——`nums[i - k]`（距离已经超过 `k` 的那个元素）所在的桶要从表里删掉；④ 命中即返回；⑤ 就是删桶这一步。

这里头有个坑：**C / C++ 的整数除法是向零取整，不是向下取整**。`floor(-1 / 5)` 数学上等于 `-1`，而 `-1 / 5` 在 C 里等于 `0`，分桶就错位了。所以负数要手工修正一位。

### 过程图解

以 `nums = [1,5,9,1,5,9]`、`k = 2`、`t = 3` 为例，桶宽 `w = t + 1 = 4`：

```text
下标    0   1   2   3   4   5
nums    1   5   9   1   5   9
桶号    0   1   2   0   1   2      （桶号 = floor(值 / 4)）
```

```text
i=0  v=1  桶号 0 → 桶 0、-1、1 都空 → 写入「桶0 = 1（下标 0）」
i=1  v=5  桶号 1 → 左邻桶 0 里是 1：5 - 1 = 4 > 3，不成 → 写入「桶1 = 5（下标 1）」
i=2  v=9  桶号 2 → 左邻桶 1 里是 5：9 - 5 = 4 > 3，不成 → 写入「桶2 = 9（下标 2）」
                  i - k = 0 ≥ 0 → 删掉 nums[0] = 1 所在的桶 0
i=3  v=1  桶号 0 → 桶 0 已经被删了（那个元素距离 3 > k = 2，本该删）
                  左邻桶 -1 空，右邻桶 1 里是 5：4 > 3，不成 → 写入「桶0 = 1（下标 3）」
                  i - k = 1 → 删掉 nums[1] = 5 所在的桶 1
i=4  v=5  桶号 1 → 桶 1 已被删；左邻桶 0 里是 1（下标 3）：4 > 3，不成
                  右邻桶 2 里是 9：4 > 3，不成 → 写入「桶1 = 5（下标 4）」
                  i - k = 2 → 删掉 nums[2] = 9 所在的桶 2
i=5  v=9  桶号 2 → 桶 2 已被删（那个 9 在下标 2，距离 3 > 2）
                  左邻桶 1 里是 5：4 > 3，不成 → 写入「桶2 = 9（下标 5）」

扫完没有命中 → 返回 false ✔
```

请特别留意 `i=5`：**下标 2 的那个 9 和当前值完全相等**，如果忘了删过期桶，这里就会误报 `true`——但它们的下标距离是 3，超过了 `k = 2`。滑窗的「出窗」动作在这题里不是省油的灯。

再验证一下示例 1：`nums = [1,2,3,1], k = 3, t = 0` 时桶宽 `w = 1`，每个整数自成一个桶，`i=3` 时 `v = 1` 落回桶 1，而桶 1 里还留着下标 0（`i - k = 0` 刚好没到期）→ 命中，返回 `true` ✔。

### 代码实现

:::code-tabs{default="cpp"}
```c title="C"
#include <stdbool.h>
#include <stdlib.h>

/* 桶号 → 桶里那个元素的值。桶宽 w = t+1，同一个桶里任意两数之差 ≤ t，
   所以每个桶最多只需要留一个元素（要是有两个，早就返回 true 了）。
   元素滑出窗口时要删掉它所在的桶，所以这里用墓碑标记删除。 */
#define CAP3 (1u << 18)                      /* 窗口里最多 k+1 个桶，2^18 留足余量 */
#define EMPTY3 (1LL << 62)
#define TOMB3  (1LL << 61)

static long long key3[CAP3];
static long long val3[CAP3];

static unsigned long long hash3(long long x) {
    unsigned long long h = (unsigned long long)x;
    h ^= h >> 33; h *= 0xff51afd7ed558ccdULL;
    h ^= h >> 33; h *= 0xc4ceb9fe1a85ec53ULL;
    h ^= h >> 33;
    return h;
}

static long long floorDiv(long long a, long long b) {   /* b > 0 时向下取整 */
    long long q = a / b;
    if (a % b != 0 && a < 0) q--;                      /* C 的除法向零取整，负数要修正 */
    return q;
}

static long long get3(long long key) {
    unsigned long long h = hash3(key) & (CAP3 - 1);
    while (key3[h] != EMPTY3) {                        /* 墓碑要继续往后找 */
        if (key3[h] == key) return val3[h];
        h = (h + 1) & (CAP3 - 1);
    }
    return EMPTY3;
}

static void put3(long long key, long long val) {
    unsigned long long h = hash3(key) & (CAP3 - 1);
    while (key3[h] != EMPTY3 && key3[h] != TOMB3 && key3[h] != key)
        h = (h + 1) & (CAP3 - 1);
    key3[h] = key;
    val3[h] = val;                                     /* 墓碑位置可以复用 */
}

static void del3(long long key) {
    unsigned long long h = hash3(key) & (CAP3 - 1);
    while (key3[h] != EMPTY3) {
        if (key3[h] == key) { key3[h] = TOMB3; return; }
        h = (h + 1) & (CAP3 - 1);
    }
}

static void clear3(void) {
    for (unsigned i = 0; i < CAP3; i++) key3[i] = EMPTY3;
}

bool containsNearbyAlmostDuplicate(int *nums, int numsSize, int k, int t) {
    if (t < 0 || k < 0) return false;

    long long w = (long long)t + 1;      /* t 最大 2^31-1，先转 long long 再加一 */
    clear3();

    for (int i = 0; i < numsSize; i++) {
        long long v = nums[i];
        long long id = floorDiv(v, w);

        if (get3(id) != EMPTY3) return true;            /* 同一个桶，必然差 ≤ t */

        long long a = get3(id - 1);                     /* 左邻桶 */
        if (a != EMPTY3 && llabs(v - a) <= t) return true;

        long long b = get3(id + 1);                     /* 右邻桶 */
        if (b != EMPTY3 && llabs(v - b) <= t) return true;

        put3(id, v);

        if (i - k >= 0)                                 /* 下标滑出窗口，删掉它的桶 */
            del3(floorDiv((long long)nums[i - k], w));
    }
    return false;
}
```

```cpp title="C++"
#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    bool containsNearbyAlmostDuplicate(vector<int>& nums, int k, int t) {
        if (t < 0) return false;

        long long w = (long long)t + 1;     // 桶宽：同桶内任意两数之差 ≤ t
        unordered_map<long long, long long> bucket;   // 桶号 → 桶里的那个数

        // C++ 的整数除法向零取整，负数要手工修正成「向下取整」
        auto floorDiv = [](long long a, long long b) {
            long long q = a / b;
            if (a % b != 0 && a < 0) q--;
            return q;
        };

        for (int i = 0; i < (int)nums.size(); i++) {
            long long v = nums[i];
            long long id = floorDiv(v, w);

            if (bucket.count(id)) return true;          // 同一个桶，必然差 ≤ t

            auto lo = bucket.find(id - 1);              // 左邻桶
            if (lo != bucket.end() && v - lo->second <= t) return true;

            auto hi = bucket.find(id + 1);              // 右邻桶
            if (hi != bucket.end() && hi->second - v <= t) return true;

            bucket[id] = v;

            if (i - k >= 0)                             // 下标滑出窗口，删掉它的桶
                bucket.erase(floorDiv(nums[i - k], w));
        }
        return false;
    }
};
```

```js title="JavaScript"
function containsNearbyAlmostDuplicate(nums, k, t) {
  const w = t + 1;                 // 桶宽：同桶内任意两数之差 ≤ t
  const bucket = new Map();        // 桶号 → 桶里的那个下标（下标滑出窗口时要删）
  const idOf = (v) => Math.floor(v / w);   // Math.floor 对负数也是向下取整

  for (let i = 0; i < nums.length; i++) {
    const id = idOf(nums[i]);

    if (bucket.has(id)) return true;                 // 同一个桶，必然差 ≤ t

    const lo = bucket.get(id - 1);                   // 左邻桶
    if (lo !== undefined && nums[i] - nums[lo] <= t) return true;

    const hi = bucket.get(id + 1);                   // 右邻桶
    if (hi !== undefined && nums[hi] - nums[i] <= t) return true;

    bucket.set(id, i);

    if (i - k >= 0) bucket.delete(idOf(nums[i - k]));   // 移出窗口
  }
  return false;
}
```
:::

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — 每个元素查 3 个桶、写 1 个桶、删 1 个桶，均摊 O(1)（有序集合解法是 O(n log k)） |
| 空间复杂度 | **O(k)** — 表里同时存在的桶数不超过窗口长度 `k + 1` |

### 易错点

1. **负数必须用向下取整。** `-1 / 5` 在 C / C++ 里等于 `0`，而 `floor(-1/5) = -1`。分桶错位之后，「同桶必满足」这条不变式就不成立了。C / C++ 里要像 `floorDiv` 那样修正；JS 的 `Math.floor` 天然是向下取整，不用管。
2. **桶宽是 `t + 1`，不是 `t`。** 桶宽取 `t + 1` 才能保证「同桶 ⇒ 差 ≤ t」；取 `t` 会漏掉正好差 `t` 的一对。另外要注意 `t + 1` 本身可能溢出：早期题面里 `t` 的上界是 `2^31 - 1`，`int` 里加一就溢出了，必须先转成 64 位再加（C 版写的 `(long long)t + 1` 就是这个意思；现行题面的 `t` 上界是 `10^9`，加一不会溢出，但统一按 64 位处理最省心）。
3. **删桶要删「窗口外那个下标」的桶，而且顺序是「先查、再写、最后删」。** 删早了会把还能用的元素丢掉，删晚了会拿过期元素误报 `true`（上面 `i=5` 的例子里，两个 9 就只差一次「忘删」）。
4. **同桶直接返回 `true`，邻桶必须真的比一次差值。** 邻桶里任意两数之差可能到 `2t + 1`，所以邻桶不能只看「存在」。
5. **过期下标的桶只能删它自己。** 删的是 `nums[i - k]` 那个元素占的桶——注意不是 `nums[i - k - 1]`，因为此刻窗口里应该装着距离不超过 `k` 的元素，即下标区间 `[i - k, i - 1]`。
6. **C 版的哈希表需要「墓碑」删除。** 开放寻址的表不能直接把槽置空（会把探测链断开），要用一个 `TOMB3` 标记；查找时遇到墓碑要继续往后走，插入时才能复用墓碑位置。

---

## 3. 将 x 减到 0 的最小操作数（LeetCode 1658）

### 题目描述

给你一个整数数组 `nums` 和一个整数 `x`。每一次操作时，你应当移除数组 `nums` 最左边或最右边的元素，然后从 `x` 中减去该元素的值。如果可以将 `x` **恰好**减到 `0`，返回**最小操作数**；否则返回 `-1`。

**示例：**

```text
输入：nums = [1,1,4,2,3], x = 5
输出：2
解释：移除后两个元素 [2,3]，2 + 3 = 5，共 2 次操作。

输入：nums = [5,6,7,8,9], x = 4        输出：-1
输入：nums = [3,2,20,1,1,3], x = 10    输出：5   （移除后三个 + 前两个）
```

**约束：** `1 <= nums.length <= 10^5`，`1 <= nums[i] <= 10^4`，`1 <= x <= 10^9`。

### 思路：反着问——删掉的两端，等于留下的一段

从两端删元素，看起来是「两个指针朝中间夹」，但那是**两个独立的变量**（左边删了几个、右边删了几个），滑动窗口只有一个 `left`，套不上模板。真正好用的一步是**把问题反过来问**：

> 从两端一共删掉的那些元素，正好是 `nums` 的「一个前缀 + 一个后缀」；那么**中间没被删掉的那一段，一定是一段连续子数组**。

设数组总和为 `total`。删掉的元素之和要等于 `x`，等价于：

```text
留下的那一段和 = total - x
```

而操作数最少，等价于**留下的那一段最长**。于是题目变成一道标准的变长窗口题：

- 在全是正数的 `nums` 里，找**和恰好等于 `total - x` 的最长子数组**；
- 答案 = `n - 这个长度`。

窗口状态是 `sum`。② 加入时 `sum += nums[right]`；③ 收缩条件是 `sum > target`（超了就缩）；④ 收缩之后判断 `sum == target` 并记录长度；⑤ `sum -= nums[left]`。

两个边界要先处理掉：`total < x` 时无论怎么删都凑不出 `x`，直接返回 `-1`；`total == x` 时 `target = 0`，此时「和为 0 的最长子数组」是**空数组**（长度 0），返回 `n`——也就是把整个数组全删掉，正好 `n` 次操作。

### 过程图解

以 `nums = [1,1,4,2,3]`、`x = 5` 为例：`total = 11`，`target = 11 - 5 = 6`。

```text
下标  0  1  2  3  4
nums  1  1  4  2  3
```

```text
right=1：窗口 [0,1)=[1]，sum=1        ≠ 6
right=2：窗口 [0,2)=[1,1]，sum=2      ≠ 6
right=3：窗口 [0,3)=[1,1,4]，sum=6    = 6 → best = 3（这一段最长 3）
right=4：窗口 [0,4)=[1,1,4,2]，sum=8  > 6 ← 收缩
  ├ 移出 1 → sum=7，窗口 [1,4)=[1,4,2]，仍 > 6
  ├ 移出 1 → sum=6，窗口 [2,4)=[4,2]，停止收缩
  └ sum = 6 但长度 2 < 3，不更新 best
right=5：窗口 [2,5)=[4,2,3]，sum=9    > 6 ← 收缩
  ├ 移出 4 → sum=5，窗口 [3,5)=[2,3]，停止收缩
  └ sum = 5 ≠ 6，不记录

best = 3 → 最少操作数 = 5 - 3 = 2 ✔（删掉后两个元素 [2,3]）
```

对照一下题面：留下的 `[1,1,4]` 和是 6，删掉的就是后两个元素 `[2,3]`，和是 5 = `x`，两次操作 ✔。

### 代码实现

:::code-tabs{default="cpp"}
```c title="C"
int minOperations(int *nums, int numsSize, int x) {
    long long total = 0;
    for (int i = 0; i < numsSize; i++) total += nums[i];
    if (total < x) return -1;

    /* 从两端删掉的元素之和 = x，等价于「中间留下的那一段，和 = total - x」；
       操作数最少 = 中间这一段最长。 */
    long long target = total - x;
    long long sum = 0;
    int left = 0, right = 0, best = -1;

    while (right < numsSize) {
        sum += nums[right];              /* ① 右边界入窗 */
        right++;

        while (sum > target) {           /* ③ 全是正数，超了就一定能靠收缩降下来 */
            sum -= nums[left];
            left++;
        }
        if (sum == target && right - left > best)
            best = right - left;         /* ④ 收缩后记录：这一段越长，操作数越少 */
    }
    return best < 0 ? -1 : numsSize - best;
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class Solution {
public:
    int minOperations(vector<int>& nums, int x) {
        long long total = 0;
        for (int v : nums) total += v;
        if (total < x) return -1;

        // 两端删掉的元素之和 = x，等价于「中间留下的那一段，和 = total - x」；
        // 操作数最少 = 中间这一段最长
        long long target = total - x;
        long long sum = 0;
        int left = 0, right = 0, best = -1;

        while (right < (int)nums.size()) {
            sum += nums[right];              // ① 右边界入窗
            right++;

            while (sum > target) {           // ③ 都是正数，超了就能靠收缩降下来
                sum -= nums[left];
                left++;
            }
            if (sum == target && right - left > best)
                best = right - left;         // ④ 收缩后记录：这一段越长，操作数越少
        }
        return best < 0 ? -1 : (int)nums.size() - best;
    }
};
```

```js title="JavaScript"
function minOperations(nums, x) {
  let total = 0;
  for (const v of nums) total += v;
  if (total < x) return -1;

  // 两端删掉的元素之和 = x，等价于「中间留下的那一段，和 = total - x」；
  // 操作数最少 = 中间这一段最长
  const target = total - x;
  let sum = 0;
  let left = 0, right = 0, best = -1;

  while (right < nums.length) {
    sum += nums[right];              // ① 右边界入窗
    right++;

    while (sum > target) {           // ③ 都是正数，超了就能靠收缩降下来
      sum -= nums[left];
      left++;
    }
    if (sum === target && right - left > best)
      best = right - left;           // ④ 收缩后记录：这一段越长，操作数越少
  }
  return best < 0 ? -1 : nums.length - best;
}
```
:::

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — 求 `total` 一遍，滑窗一遍 |
| 空间复杂度 | **O(1)** |

### 易错点

1. **`total == x` 时要返回 `n`，不是 `0` 也不是 `-1`。** 这时 `target = 0`，「和为 0 的最长子数组」是空数组（长度 0），所以答案是 `n - 0 = n`。代码里用 `best = -1` 表示「没找到」，而 `best = 0` 是合法结果，两者不能混用（所以判断条件是 `best < 0`）。
2. **这题的滑窗只对正数成立。** 「超了就缩」依赖 `sum` 随 `right` 单调增——`nums[i]` 全为正整数才成立。如果 `nums` 里允许负数，就得用**前缀和 + 哈希表**去枚举「前缀和 + 后缀和 = x」的组合了，滑窗会失效。
3. **`sum` 和 `target` 用 64 位。** `n × nums[i] = 10^9`、`x` 也能到 `10^9`，`int` 算中间量容易溢出。
4. **别真的去模拟「从两端删」。** 那需要同时维护两个删除指针，还要处理「左边删到和右边碰头」的边界，代码量和出错概率都高得多。转换成「留下的那一段」之后，就是一道普通的滑窗题。
5. **记录答案的条件是 `sum == target`，不是 `sum <= target`。** 题目要求**恰好**减到 0。

---

## 4. 至少有 K 个重复字符的最长子串（LeetCode 395）

### 题目描述

给你一个字符串 `s` 和一个整数 `k`，请你找出 `s` 中的最长子串，要求该子串中的**每一字符出现次数都不少于 `k`**。返回这一子串的长度；不存在则返回 `0`。

**示例：**

```text
输入：s = "aaabb", k = 3     输出：3    （最长子串 "aaa"）
输入：s = "ababbc", k = 2    输出：5    （最长子串 "ababb"，'a' 出现 2 次、'b' 出现 3 次）
输入：s = "abc", k = 2       输出：0
```

**约束：** `1 <= s.length <= 10^4`，`s` 仅由小写英文字母组成，`1 <= k <= 10^5`。

### 思路：先枚举「窗口里有几种字符」，再滑窗

这题**不能**直接套滑窗。原因是判断条件没有单调性：窗口变长时，新字符可能把「每种字符都 ≥ k」破坏掉；窗口变短时，某个字符的次数掉到 `k` 以下，同样会破坏它。所以「越短越容易满足」和「越长越容易满足」两个流派都不成立，收缩条件无从写起。

但是题目有一个很特殊的性质：**字符集只有 26 个小写字母**。于是可以**多枚举一个维度**——枚举「窗口里恰好有 `types` 种字符」，`types` 从 1 到 26：

- 一旦固定了 `types`，「窗口里有几种字符」这件事就重新变得单调了：右边界右移只会让种类数增加或不变，左边界右移只会让它减少或不变；
- 于是「`distinct > types` 就收缩」是一个合法的收缩条件（流派 B），窗口能滑起来；
- 在 `distinct == types` 的窗口里，再数一数「有多少种字符的出现次数已经 ≥ k」（记作 `reached`），`reached == types` 就说明这个窗口每一种字符都达标，可以量长度。

说白了：**把一道不满足单调性的题，拆成 26 道满足单调性的题**，取最优的那个。`26n` 的复杂度对 `n = 10^4` 来说绰绰有余。

模板四个空：② 加入 `c` 时 `cnt[c]++`，若 `c` 是新出现的（`cnt[c]` 从 0 变成 1）则 `distinct++`；若 `cnt[c]` 恰好等于 `k` 则 `reached++`；③ 收缩条件是 `distinct > types`；④ 收缩之后判 `distinct == types && reached == types` 再记录；⑤ 移出 `d` 时如果 `cnt[d]` 从 `k` 掉下去则 `reached--`，如果归零则 `distinct--`。

### 过程图解

以 `s = "ababbc"`、`k = 2`、`types = 2` 这一轮为例：

```text
下标  0  1  2  3  4  5
s     a  b  a  b  b  c
```

```text
right=1：窗口 [0,1)=a       cnt[a]=1  distinct=1  reached=0
right=2：窗口 [0,2)=ab      cnt[a]=1 cnt[b]=1  distinct=2  reached=0
right=3：窗口 [0,3)=aba     cnt[a]=2 ← 恰好到 k，reached=1   distinct=2
right=4：窗口 [0,4)=abab    cnt[b]=2 ← 恰好到 k，reached=2
         distinct == types 且 reached == types → 窗口 [0,4) 每种字符都 ≥ 2 个 → best = 4
right=5：窗口 [0,5)=ababb   cnt[b]=3  distinct=2  reached=2 → best = 5
right=6：窗口 [0,6)=ababbc  cnt[c]=1 → distinct=3 > types=2 ← 收缩
  ├ 移出 s[0]='a'：cnt[a] 从 2 掉到 1，`cnt[d]-- == k` 成立 → reached=1；cnt[a] ≠ 0 → distinct 仍为 3
  ├ 移出 s[1]='b'：cnt[b] 从 3 掉到 2，`cnt[d]-- == k` 不成立（3 ≠ 2）→ reached 不变；cnt[b] ≠ 0 → distinct 仍为 3
  ├ 移出 s[2]='a'：cnt[a] 从 1 掉到 0 → distinct=2，停止收缩
  └ 窗口 [3,6)="bbc"：distinct=2 = types，但 reached=1 ≠ 2（'c' 只有 1 个）→ 不记录

这一轮的最好结果 best = 5 ✔（types 取 1 时也能得到 2，取 3 时不行——'c' 只有 1 个）
```

注意 `right=6` 那一轮的两次移出：`reached` 该不该减，判据是「移出**之前**这个字符的次数是否恰好是 `k`」（写成 `cnt[d]-- == k`，先比较再自减）。因为次数从 `k` 掉到 `k - 1` 才算掉出达标，从 `k + 1` 掉到 `k` 仍然达标。

### 代码实现

:::code-tabs{default="cpp"}
```c title="C"
#include <string.h>

int longestSubstring(char *s, int k) {
    int n = (int)strlen(s);
    int cnt[26], best = 0;

    for (int types = 1; types <= 26; types++) {   /* 枚举窗口里有几种字符 */
        memset(cnt, 0, sizeof(cnt));
        int left = 0, right = 0;
        int distinct = 0;      /* 窗口里有几种字符 */
        int reached = 0;       /* 其中有多少种的出现次数已经 ≥ k */

        while (right < n) {
            int c = s[right] - 'a';                /* ① 右边界入窗 */
            if (cnt[c]++ == 0) distinct++;
            if (cnt[c] == k) reached++;
            right++;

            while (distinct > types) {             /* ③ 种类超了就收缩 */
                int d = s[left] - 'a';
                if (cnt[d]-- == k) reached--;
                if (cnt[d] == 0) distinct--;
                left++;
            }
            if (distinct == types && reached == types && right - left > best)
                best = right - left;               /* ④ 窗口里每一种字符都 ≥ k 个 */
        }
    }
    return best;
}
```

```cpp title="C++"
#include <string>
using namespace std;

class Solution {
public:
    int longestSubstring(string s, int k) {
        int n = (int)s.size(), best = 0;

        for (int types = 1; types <= 26; types++) {   // 枚举窗口里有几种字符
            int cnt[26] = {0};
            int left = 0, right = 0;
            int distinct = 0;    // 窗口里有几种字符
            int reached = 0;     // 其中有多少种的出现次数已经 ≥ k

            while (right < n) {
                int c = s[right] - 'a';               // ① 右边界入窗
                if (cnt[c]++ == 0) distinct++;
                if (cnt[c] == k) reached++;
                right++;

                while (distinct > types) {            // ③ 种类超了就收缩
                    int d = s[left] - 'a';
                    if (cnt[d]-- == k) reached--;
                    if (cnt[d] == 0) distinct--;
                    left++;
                }
                if (distinct == types && reached == types && right - left > best)
                    best = right - left;              // ④ 窗口里每一种字符都 ≥ k 个
            }
        }
        return best;
    }
};
```

```js title="JavaScript"
function longestSubstring(s, k) {
  let best = 0;
  const cnt = new Array(26).fill(0);

  for (let types = 1; types <= 26; types++) {   // 枚举窗口里有几种字符
    cnt.fill(0);
    let left = 0, right = 0;
    let distinct = 0;    // 窗口里有几种字符
    let reached = 0;     // 其中有多少种的出现次数已经 ≥ k

    while (right < s.length) {
      const c = s.charCodeAt(right) - 97;       // ① 右边界入窗
      if (cnt[c]++ === 0) distinct++;
      if (cnt[c] === k) reached++;
      right++;

      while (distinct > types) {                // ③ 种类超了就收缩
        const d = s.charCodeAt(left) - 97;
        if (cnt[d]-- === k) reached--;
        if (cnt[d] === 0) distinct--;
        left++;
      }
      if (distinct === types && reached === types && right - left > best)
        best = right - left;                    // ④ 窗口里每一种字符都 ≥ k 个
    }
  }
  return best;
}
```
:::

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(26n)** — 外层 26 轮，每轮滑窗 O(n)；字符集固定，可视作 O(n) |
| 空间复杂度 | **O(1)** — 26 大小的计数数组 |

### 易错点

1. **`reached` 的判据是「移出之前是否恰好等于 `k`」。** 写成 `cnt[d] == k`（先减再比）就会在「从 `k+1` 掉到 `k`」时错误地 `reached--`。
2. **`distinct` 的判据是 `cnt[c]++ == 0`（先前没出现过）和 `cnt[d] == 0`（减完归零），两处都是「0」这个边界。** 这题的状态比前几题多，建议按模板的 ②③④⑤ 逐个对应着写，别临时拼。
3. **`k == 1` 时答案就是 `n`。** `types` 枚举到全体字符种类数那一轮自然会覆盖整个字符串。
4. **`k` 可以大于 `n`。** 题目给的 `k` 上界是 `10^5`，而 `n` 只有 `10^4`，此时任何字符都到不了 `k`，答案 `0`——代码里不用特判，`reached` 永远不会等于 `types`。
5. **不要指望「窗口越长越好」。** 这题的原生形态不具备二段性质，只有固定了 `types` 之后才单调——先想清楚为什么，再写代码。
6. **`types` 只需要枚举到 26（或 `s` 里实际出现的字符种类数）。** 枚举到 26 是为了代码里不用先去重统计一遍，多跑几轮的代价可以忽略。

> **扩展**：这题更常见的官方解法是**分治**：先统计整个区间里各字符的频次，找出一个出现次数小于 `k` 的字符，它必定不属于任何合法子串，于是以它为界把区间切开、递归求解；如果区间里没有这样的字符，整个区间就是答案。两种解法都是 O(26n) 量级，分治的代码更短，滑窗更贴本篇的主题。

---

## 四道题对照表

```text
题目                            正面做不了滑窗的原因                  变形
219 存在重复元素 II             判断条件是「值相等」而不是「计数」     换成哈希表「值 → 最新下标」
220 存在重复元素 III            「值相差 ≤ t」是区间查询              按值域分桶，桶宽 t+1
1658 将 x 减到 0 的最小操作数    两端删元素是两个自由度                 反向转化：留下的一段连续子数组
395 至少有 K 个重复字符的最长子串 条件没有单调性，收缩条件写不出来        枚举「窗口里有几种字符」这个维度
```

四道题总结成三句话：

1. **窗口状态可以换成任何支持「进窗 / 出窗 / 查询」的结构。** 219 把「计数」换成「值 → 最新下标」的哈希表，出窗被「覆盖旧记录」吸收掉了；220 再把哈希表换成按值域分的桶，出窗变成「删掉过期下标的桶」。换的只是状态和出窗的写法，①②③④⑤ 的分工没有变——哪一步被省略了，都要能说清它被并进了哪里。
2. **题目问「两端操作」时，先想想能不能反过来问「中间留下什么」。** 1658 的滑动窗口是「反着转化」出来的，转不过来的话这题就得同时管两个指针。
3. **条件不单调时，看看有没有别的维度可以枚举。** 395 用「字符种类数 ≤ 26」这个不起眼的约束，把一道不满足二段性质的题拆成了 26 道满足的题——这个「枚举一个维度换取单调性」的思路在别的地方也很常见。

## 相关文章

- [滑动窗口核心代码模板：三个问题搞定所有子串、子数组题](/technology/sliding-window-template/) — 本篇用到的骨架、三问和左闭右开区间
- [滑动窗口算法经典习题（一）：窗口内的和、积与计数](/technology/sliding-window-exercises-1/) — 窗口状态只需要加减一个数的四道题
- [哈希表：从 Set 到 HashMap 的 TypeScript 实战](/technology/hash/) — 219 用到的「值 → 下标」映射，以及哈希表的原理与取舍
- [滑动窗口：子数组/子串问题的通用解法](/technology/sliding-window/) — 定长、变长、覆盖三类窗口的分类
