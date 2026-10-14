---
title: 差分数组实战：区间加法、航班预订、拼车三题一套模板，以及差分的四类延伸
published: 2026-10-13
description: '把 LeetCode 370 区间加法、1109 航班预订统计、1094 拼车收敛到同一套「两端打点 + 前缀和还原」模板：多开一位怎么写、1-indexed 怎么转、终点为什么是右开，附 C / C++ / JavaScript 三语言实现；最后延伸到二维差分、树上差分、扫描线思想与结构选型。'
image: ''
tags: [差分数组, 力扣, 数组, 区间修改, 二维差分, 树上差分, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 为什么单独再写一篇

[差分数组：把区间修改从 O(n) 降到 O(1)](/technology/difference-array/) 那篇讲的是**原理**：差分的定义、`diff[left] += delta` / `diff[right+1] -= delta` 为什么成立、离线与在线的取舍。

这篇要解决的是另一类问题——**真正坐到屏幕前，这三道题该怎么写**：

- **370. Range Addition**（区间加法）
- **1109. Corporate Flight Bookings**（航班预订统计）
- **1094. Car Pooling**（拼车）

它们的共同点是：**对一堆区间反复做「整体加同一个值」，最后要一批结果**。三题共用一套代码骨架，差别只在**下标从 0 还是 1 开始**、**右端点是开还是闭**、**是最后统一还原还是边还原边判断**。这篇把三题收敛到同一套模板，再逐个点出「差那一点点」的地方，最后用一节讲差分能延伸到哪——二维差分、树上差分、扫描线，以及它和树状数组/线段树的分工。

> **关于代码**
>
> 三道题都给出 C / C++ / JavaScript 三语言实现，逻辑完全等价，可切换标签查看。
> 三套模板统一使用**多开一位的 `diff`**（长度 `n + 1`）：多出来的最后一位专门接住 `right + 1`，省掉「越界判断」这一整类边界 bug。

---

## 一、一套模板：两端打点，前缀和还原

### 差分的定义

对数组 `nums`，定义**差分数组**：

```text
diff[0] = nums[0]
diff[i] = nums[i] - nums[i-1]        (i ≥ 1)
```

也就是说，`diff[i]` 记录的是**相邻两个元素的差**——**值本身不重要，值「变了多少」才重要**。

反过来，把 `diff` 从头累加（做一次前缀和）就能还原 `nums`：

```text
nums[i] = diff[0] + diff[1] + ... + diff[i]
```

`diff` 和 `nums` 之间是**前缀和与差分的互逆关系**：`nums` 是 `diff` 的前缀和，`diff` 是 `nums` 的差分。一个负责「累积」，一个负责「变化」。

### 区间加为什么只动两个端点

给区间 `[left, right]` 的**每个元素**加 `delta`，等价于在 `diff` 上做两次单点修改：

```text
diff[left]     += delta        /* 从 left 开始，整体抬高 delta */
diff[right + 1] -= delta       /* 从 right+1 开始，把抬高撤销 */
```

看着单调的 `diff` 也许不好懂，画出来就很直观。以 `nums = [1, 2, 3, 4, 5]`、给 `[1, 3]` 加 `2` 为例：

```text
nums:   1   2   3   4   5
diff:   1   1   1   1   1        ← 原差分

在 left=1 加 2：
diff:   1   3   1   1   1
在 right+1=4 减 2：
diff:   1   3   1   1  -1        ← 只改了两位

前缀和还原：
nums:   1   4   5   6   5        ← 下标 1..3 全部 +2，其余不变  ✓
```

原理一句话：**差分记录的是「变化率」**。在 `left` 处加一个台阶，从 `left` 往后所有前缀和都被抬高；再到 `right+1` 处减掉同样的台阶，`right` 之后又恢复原样。两个台阶之间，正好就是 `[left, right]`。

### 三段式模板

差分题永远是三段，**和三题无关，写法固定**：

```text
① 打点：对每个操作 [left, right, delta]：
            diff[left]     += delta
            diff[right+1]  -= delta
② 还原：running = 0
        for i in 0..n-1:  running += diff[i];  ans[i] = running
③ 判/取：需要全局判断的（如拼车是否超载），在 ② 里边扫边判
```

`diff` 长度开到 **`n + 1`** 就是为了第 ① 段里的 `right + 1`——当 `right == n - 1` 时它落在下标 `n`，多开的那一位正好接住，**不用再写 `if (right + 1 < n)`**。这一位不参与 ② 的累加，纯粹是「垃圾桶」。

### 复杂度：为什么快

| | 暴力（逐元素改） | 差分 |
|---|---|---|
| 单次区间加 | O(长度) | **O(1)** |
| `m` 次区间加 | O(n·m) | **O(m)** |
| 最后还原 | O(1) | O(n) |
| 总计 | O(n·m) | **O(n + m)** |

一次区间加从「遍历整个区间」变成「改两个数」，代价是**查询被推迟到最后一并还原**。这就是差分换速度的定价：**它卖的是「批量修改」，收的是「延迟查询」。**

---

## 二、例题一：区间加法（LeetCode 370）

### 题目描述

给定一个长度 `length` 的全零数组，和若干操作 `updates[i] = [startIdx, endIdx, inc]`。每个操作表示**给下标区间 `[startIdx, endIdx]`（含两端）的每个元素加 `inc`**。返回所有操作执行完毕后的数组。

**示例：**

```text
length = 5
updates = [[1, 3, 2], [2, 4, 3], [0, 2, -2]]

结果 = [-2, 0, 3, 5, 3]
```

**约束：** `0 <= length <= 10^5`，`0 <= updates.length <= 10^4`。

### 思路：初始全零，连建表都省了

这题初始数组**全是 0**，所以 `diff` 初始也全是 0——**第一步构建差分数组直接跳过**，只需要开一个长度为 `length + 1` 的全零数组，把每个操作打成两个点，最后前缀和还原。

这是差分题里最干净的一种：**没有初值 → 无构建阶段 → 三段变两段。**

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>

int *getModifiedArray(int length, int **updates, int updatesSize,
                      int *updatesColSize, int *returnSize) {
    int *diff = (int *)calloc(length + 1, sizeof(int));   /* 多开一位接 end+1 */
    for (int i = 0; i < updatesSize; i++) {
        int start = updates[i][0], end = updates[i][1], inc = updates[i][2];
        diff[start]     += inc;         /* 区间左端抬起来 */
        diff[end + 1]   -= inc;         /* 右端之后撤销 */
    }

    int *res = (int *)malloc(length * sizeof(int));
    int running = 0;
    for (int i = 0; i < length; i++) {
        running    += diff[i];          /* 前缀和还原 */
        res[i]      = running;
    }
    free(diff);
    *returnSize = length;
    return res;
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class Solution {
public:
    vector<int> getModifiedArray(int length, vector<vector<int>>& updates) {
        vector<int> diff(length + 1, 0);          // 多开一位接 end + 1
        for (auto& u : updates) {
            diff[u[0]]     += u[2];               // 区间左端抬起来
            diff[u[1] + 1] -= u[2];               // 右端之后撤销
        }

        vector<int> res(length);
        int running = 0;
        for (int i = 0; i < length; i++)
            res[i] = (running += diff[i]);        // 前缀和还原
        return res;
    }
};
```

```js title="JavaScript"
function getModifiedArray(length, updates) {
  const diff = new Array(length + 1).fill(0); // 多开一位接 end + 1
  for (const [start, end, inc] of updates) {
    diff[start] += inc; // 区间左端抬起来
    diff[end + 1] -= inc; // 右端之后撤销
  }

  const res = new Array(length).fill(0);
  let running = 0;
  for (let i = 0; i < length; i++) {
    running += diff[i]; // 前缀和还原
    res[i] = running;
  }
  return res;
}
```
:::

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间 | **O(length + updates.length)** — 打点 O(m)，还原 O(n) |
| 空间 | **O(n)** — 一个 `diff` 加一个 `res`；`res` 是题目要求的输出 |

### 易错点

1. **`diff` 只开了 `length`。** 那么 `end == length - 1` 时 `diff[end + 1]` 写成 `diff[length]` 就**越界**。多开一位是这道题最省事的解法，比每次判 `end + 1 < length` 干净。
2. **`diff[end + 1]` 写成了 `diff[end]`。** 这会把「撤销」提前一格，导致下标 `end` 那个元素**自己也撤掉了**，等价于只给 `[start, end-1]` 加了值——结果在边界上错一位。
3. **把「打点阶段」和「还原阶段」合并。** 有人想「每来一个操作就立刻更新答案数组」，那就退化成 O(n·m) 的暴力了，白用差分。**必须先把 `m` 个操作全部打成点，最后一次性还原。**

---

## 三、例题二：航班预订统计（LeetCode 1109）

### 题目描述

有 `n` 个航班，编号 **从 1 到 n**。给定预订记录 `bookings[i] = [first_i, last_i, seats_i]`，表示**从第 `first_i` 到第 `last_i` 个航班（含两端）预订了 `seats_i` 个座位**。返回长度为 `n` 的数组 `answer`，其中 `answer[i]` 是**第 `i + 1` 个航班**上预订的总座位数。

**示例：**

```text
bookings = [[1, 2, 10], [2, 3, 20], [2, 5, 25]], n = 5
结果 = [10, 55, 45, 25, 25]
```

**约束：** `1 <= n <= 2 · 10^4`，`bookings[i]` 的编号范围 `1 <= first <= last <= n`。

### 思路：这题就是 370，只是坐标系换了

和例题一相比，1109 有**两处「翻译」**要做，都是下标层面的：

1. **1-indexed → 0-indexed**：题目的航班号是 `1..n`，数组下标是 `0..n-1`。区间左端 `first` 要写成 `diff[first - 1]`。
2. **右端点的语义**：这是**闭区间** `[first, last]`，但按差分公式，撤销点应该落在 `last + 1`（1-indexed）。换到 0-indexed 数组，`last + 1` 恰好等于 `last`——所以**代码里写的是 `diff[last] -= seats`，看着像忘了 `+1`，其实正是它对**。

拿第 2 点验证一下：`[1, 2, 10]` 表示航班 1、2 各加 10。用 `diff[0] += 10`、`diff[2] -= 10`，还原时 `diff[0]`、`diff[1]` 拿到 10，`diff[2]` 起撤销——命中下标 0、1 两个航班，**正好是 1、2 号**。✓

```text
bookings = [[1,2,10], [2,3,20], [2,5,25]], n = 5

打点（0-indexed，diff 长度 n+1 = 6）：
  下标:    0     1     2     3     4     5
  [1,2]   +10         -10
  [2,3]         +20         -20
  [2,5]         +25                     -25   ← 撤销点落在下标 5（垃圾桶位）
  ───────────────────────────────────────────
  diff:    10    45   -10   -20     0   -25

只对下标 0..4 做前缀和：
  10 → 55 → 45 → 25 → 25
结果 = [10, 55, 45, 25, 25]   ✓
```

注意最后一条预订的 `last = 5` 等于 `n`，撤销点 `diff[5]` 正好落在**多开的那一位**（垃圾桶位）上——它不参与输出，只负责让「第 5 班之后不再有人」。这也再次说明 `diff` 为什么要开到 `n + 1`。

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>

int *corpFlightBookings(int **bookings, int bookingsSize, int *bookingsColSize,
                        int n, int *returnSize) {
    int *diff = (int *)calloc(n + 1, sizeof(int));   /* 多开一位接 last */
    for (int i = 0; i < bookingsSize; i++) {
        int first = bookings[i][0], last = bookings[i][1], seats = bookings[i][2];
        diff[first - 1] += seats;    /* 1-indexed → 0-indexed */
        diff[last]      -= seats;    /* 闭区间右端 +1 后正好是 last，右开 */
    }

    int *res = (int *)malloc(n * sizeof(int));
    int running = 0;
    for (int i = 0; i < n; i++) {
        running += diff[i];
        res[i]   = running;
    }
    free(diff);
    *returnSize = n;
    return res;
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class Solution {
public:
    vector<int> corpFlightBookings(vector<vector<int>>& bookings, int n) {
        vector<int> diff(n + 1, 0);              // 多开一位接 last
        for (auto& b : bookings) {
            diff[b[0] - 1] += b[2];              // 1-indexed → 0-indexed
            diff[b[1]]     -= b[2];              // 闭区间右端 +1 后正好是 b[1]
        }

        vector<int> res(n);
        int running = 0;
        for (int i = 0; i < n; i++)
            res[i] = (running += diff[i]);
        return res;
    }
};
```

```js title="JavaScript"
function corpFlightBookings(bookings, n) {
  const diff = new Array(n + 1).fill(0); // 多开一位接 last
  for (const [first, last, seats] of bookings) {
    diff[first - 1] += seats; // 1-indexed → 0-indexed
    diff[last] -= seats; // 闭区间右端 +1 后正好是 last
  }

  const res = new Array(n).fill(0);
  let running = 0;
  for (let i = 0; i < n; i++) {
    running += diff[i];
    res[i] = running;
  }
  return res;
}
```
:::

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间 | **O(n + bookings.length)** |
| 空间 | **O(n)** |

### 易错点

1. **忘了 1-indexed 转换。** 题目的 `first`、`last` 是**航班号（从 1 开始）**，直接拿去当数组下标，整个结果会右移一位、末尾丢一个。**左端一定写 `first - 1`。**
2. **自作主张给 `last` 加一。** 这是本题最反直觉的点：差分公式的「撤销点」是 `right + 1`，但那是 1-indexed 下的 `last + 1`；换到 0-indexed 数组，下标 `last + 1` 又减去 1，**净结果就是 `diff[last]`**。所以**代码里 `last` 不带 `+1`**。记法：**输入已经是 1-based 的「右开位置」，直接当 0-based 的撤销点用。**
3. **`diff` 只开 `n` 位。** `last` 最大是 `n`，`diff[n]` 需要存在——多开一位（`n + 1`）才安全，否则最后一条预订一旦覆盖到第 `n` 班就写越界。
4. **还原范围写成了 `n + 1`。** 多开的那一位是垃圾桶，**输出只有 `n` 个数**，循环上界是 `n`。

---

## 四、例题三：拼车（LeetCode 1094）

### 题目描述

一辆车**容量为 `capacity`**，只能朝一个方向开。给定行程 `trips[i] = [numPassengers_i, from_i, to_i]`，表示**在站点 `from_i` 上车 `numPassengers_i` 人，在站点 `to_i` 下车**。判断这辆车能否**一次性**接送完所有行程（即**任何时刻车上人数都不超过 `capacity`**）。

**示例：**

```text
trips = [[2,1,5], [3,3,7]], capacity = 4      → false
   // 站点 3 到 5 之间，车上同时有 2 + 3 = 5 人 > 4

trips = [[2,1,5], [3,3,7]], capacity = 5      → true
```

**约束：** `1 <= trips.length <= 1000`，`0 <= from_i < to_i <= 1000`。

### 思路：区间加，但「加」的是人数

把每一段行程 `[from, to)` 看成一个区间，给它加 `numPassengers` 人——**又是区间加！** 只不过这次我们要的不是「具体每一站多少人」，而是「**过程中最高峰有没有超载**」。

所以模板的第二段（还原）要改成**边累加边判断**：`running` 就是「每个站点之后的在车人数」，一旦超过 `capacity` 立刻返回 `false`。

**注意区间是右开的 `[from, to)`**：乘客在 `to` 站**下车**，所以 `to` 这一站**不计入**本次行程的人数占用。用差分写就是 `diff[from] += num`、`diff[to] -= num`——**撤销点落在 `to` 本身，不额外加一**，因为 `to` 就是「不包含」的第一个位置。

```text
trips = [[2,1,5], [3,3,7]], capacity = 4

diff（站点 0..1000）：
  diff[1] += 2 ; diff[5] -= 2
  diff[3] += 3 ; diff[7] -= 3

逐站累加（只看非零处）：
  站点  0   1   2   3   4   5   6   7
  diff  0  +2   0  +3   0  -2   0  -3
  在车  0   2   2   5   5   3   3   0
                └─── 峰值 5 > 4，false ───┘
```

:::code-tabs{default="cpp"}
```c title="C"
#include <stdbool.h>

bool carPooling(int **trips, int tripsSize, int *tripsColSize, int capacity) {
    int diff[1001] = {0};                /* 站点坐标 ≤ 1000，静态数组足够 */
    for (int i = 0; i < tripsSize; i++) {
        int num = trips[i][0], from = trips[i][1], to = trips[i][2];
        diff[from] += num;               /* from 站上车 */
        diff[to]   -= num;               /* to 站下车：区间是右开的 [from, to) */
    }

    int current = 0;
    for (int i = 0; i <= 1000; i++) {
        current += diff[i];              /* 该站之后的在车人数 */
        if (current > capacity) return false;
    }
    return true;
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class Solution {
public:
    bool carPooling(vector<vector<int>>& trips, int capacity) {
        vector<int> diff(1001, 0);       // 站点坐标 ≤ 1000
        for (auto& t : trips) {
            diff[t[1]] += t[0];          // from 站上车
            diff[t[2]] -= t[0];          // to 站下车：区间 [from, to)
        }

        int current = 0;
        for (int change : diff)
            if ((current += change) > capacity) return false;
        return true;
    }
};
```

```js title="JavaScript"
function carPooling(trips, capacity) {
  const diff = new Array(1001).fill(0); // 站点坐标 ≤ 1000
  for (const [num, from, to] of trips) {
    diff[from] += num; // from 站上车
    diff[to] -= num; // to 站下车：区间 [from, to)
  }

  let current = 0;
  for (const change of diff) {
    current += change; // 该站之后的在车人数
    if (current > capacity) return false;
  }
  return true;
}
```
:::

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间 | **O(trips.length + 1000)** — 坐标上界固定，等价于 O(n + C) |
| 空间 | **O(C)** — `C = 1000` 是坐标范围，常数级 |

### 易错点

1. **`to` 站写成 `diff[to + 1] -= num`。** 这会让乘客在 `to` 站**不下车**，多占一站，可能被误判超载。**`to` 是「下车」的位置，等价于右开区间的端点，不加一。**
2. **区间端点用反。** 有人习惯写闭区间，于是写成 `diff[from] += num; diff[to + 1] -= num`——如果题面确实是「在 `to` 站占着座」，那对；但本题明确 `to` 是下车，所以是右开。**先确认题目对端点的定义，再决定加不加一。**
3. **判超载的时机。** 必须在**每一站累加之后**立刻判——本题要的是「过程中任意时刻」，不是「最终总数」。累加到一半就超了，可以提前 `return false`。
4. **不用排序、不用模拟每站的人。** 常见误区是按 `from` 排序后模拟上下车。差分天然给出了「每一站的净变化」，**站着不动扫一遍**即可，排序反而是多余开销。
5. **坐标范围。** `to` 最大到 `1000`，`diff` 至少要 `1001` 长；写 `new Array(1000)` 会在最大站点处越界。

---

## 五、三题对照：差在哪一点点

三题的骨架**一模一样**，差别只在下面这几格：

| | 370 区间加法 | 1109 航班预订 | 1094 拼车 |
|---|---|---|---|
| 有无初始数组 | 全零（无构建阶段） | 全零（无构建阶段） | 全零（无构建阶段） |
| 下标基准 | 0-indexed | **1-indexed，要转** | 0-indexed |
| 题目区间语义 | 闭区间 `[start, end]` | 闭区间 `[first, last]` | **右开 `[from, to)`** |
| 打点写法 | `diff[s] += inc` / `diff[e+1] -= inc` | `diff[f-1] += seats` / `diff[last] -= seats` | `diff[from] += num` / `diff[to] -= num` |
| 坐标上界 | `length` | `n` | `1000` |
| 输出形式 | **整个数组** | **整个数组** | **一个布尔值** |
| 判定时机 | 全部还原后取数组 | 全部还原后取数组 | **边还原边判**，可提前退出 |

**一句话提炼：**

> 差分题只有一个变量——**把题目给的区间，翻译成 `diff` 上的两个点**。翻译时只要盯住两点：**左端在数组里落在哪**（要不要 `-1`）、**右端的「撤销点」是 `right + 1` 还是 `right`**（看右端开闭）。剩下的打点、还原、判断，三题共用一套代码。

---

## 六、拓展延伸：差分还能走多远

前面三题是「一维、离线、只加」。这一节把边界往外推四步。

### 6.1 二维差分：子矩阵整体加同一个值

一维是「区间加、两端打点」，二维就是「**子矩阵加、四角打点**」。给矩阵的矩形区域 `(r1, c1) ~ (r2, c2)`（四角都含）整体加 `v`：

```text
diff[r1][c1]         += v      /* 从左上角开始，整个右下区域抬高 */
diff[r1][c2 + 1]     -= v      /* 撤销：右边界之后 */
diff[r2 + 1][c1]     -= v      /* 撤销：下边界之后 */
diff[r2 + 1][c2 + 1] += v      /* 补回：右下角被减了两次，加回来 */
```

你有没有觉得眼熟？**四个角的符号顺序 `+ − − +`，和[二维前缀和查询](/technology/prefix-sum/)的容斥公式是同一组。** 这不是巧合——**二维前缀和与二维差分互为逆运算**：

```text
打点（用差分记录变化）  ── 二维前缀和 ──▶  还原出真正的矩阵
```

还原时对 `diff` 做一次**二维前缀和**（就地累加）：

```text
for i in 0..m-1:
    for j in 0..n-1:
        if i > 0:      diff[i][j] += diff[i-1][j]        /* 上方 */
        if j > 0:      diff[i][j] += diff[i][j-1]        /* 左方 */
        if i>0 && j>0: diff[i][j] -= diff[i-1][j-1]      /* 左上被加两次 */
        /* 此时 diff[i][j] 就是最终矩阵在 (i, j) 的值 */
```

典型题是 **LeetCode 2536. Increment Submatrices by One**（给每个查询的子矩阵加 1）。C++ 骨架：

```cpp
vector<vector<int>> rangeAddQueries(int n, vector<vector<int>>& queries) {
    vector<vector<int>> diff(n + 1, vector<int>(n + 1, 0));   // 多开一圈
    for (auto& q : queries) {
        int r1 = q[0], c1 = q[1], r2 = q[2], c2 = q[3];
        diff[r1][c1]++;
        diff[r1][c2 + 1]--;
        diff[r2 + 1][c1]--;
        diff[r2 + 1][c2 + 1]++;
    }
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) {                         // 就地二维前缀和
            if (i) diff[i][j] += diff[i - 1][j];
            if (j) diff[i][j] += diff[i][j - 1];
            if (i && j) diff[i][j] -= diff[i - 1][j - 1];
        }
    diff.resize(n);                                            // 丢掉那多开的一圈
    for (auto& row : diff) row.resize(n);
    return diff;
}
```

和一维一样：**「多开一圈」是为了接住 `+1`**，最后丢掉即可。

### 6.2 树上差分：给路径整体加

一维是「线段」，二维是「矩形」，**树上就是「路径」**：给树上 `u → v` 的简单路径上每个点加 `x`。做法是把差分搬到树的**子树前缀和**上——打四个点，最后一次 DFS 求子树和还原：

| 场景 | 打点（以点权为例，`t = LCA(u, v)`，`p = t 的父节点`） |
|---|---|
| 点权路径加 | `val[u] += x`、`val[v] += x`、`val[t] -= x`、`val[p] -= x` |
| 边权路径加 | `val[u] += x`、`val[v] += x`、`val[t] -= 2x`（边权把值记在「儿子」上） |

还原时按**后序遍历**做子树和：`val[u] += Σ val[child]`，一次 O(n)。本质还是那句老话——**「在变化的地方记录变化」**：路径加 = 两个「向上加」的叠加，在 LCA 处相互抵消。

### 6.3 一般化：扫描线思想

差分的本质不是数组技巧，而是一种更普遍的思想：

> **不要记录每个位置的值，只记录「值发生变化」的位置，然后从左到右扫一遍把它们累加起来。**

1094 拼车就是活例子——**我们从头到尾没有模拟「某人在某站上车、某人在某站下车」**，只记了每一站人数的**净变化**，扫一遍就得到了任意时刻的在车人数。同一思想换个名字，就是：

- **扫描线算法**：把区间拆成「进入 +1、离开 −1」两个事件，排序后扫一遍（比面积并、区间覆盖计数）。
- **事件时间轴统计**：预约系统、日志系统里，只在「开始 / 结束」时刻记录增减，而不是逐秒维护状态。

**一维差分 = 扫描线在「数轴上的区间」这个特例。** 认清了这层，差分就不再是「背公式」，而是「在变化处记账」。

### 6.4 选型与易混：什么时候不该用差分

差分是**「批量区间修改」**的专用工具。一旦需求里出现「边改边查」，它就不够用了：

| 需求 | 该用什么 | 复杂度 |
|---|---|---|
| 多次**区间加** + **最后一次**查询（本文三题） | **差分数组** | 改 O(1)、还原 O(n) |
| 多次**区间加** + 多次**单点查询** | **差分数组**（每次查就是求一次前缀和）或树状数组 | 视查询而定 |
| 多次**区间加** + 多次**区间求和**，交替进行 | **线段树**（带懒标记）或**两个树状数组** | 每次 O(log n) |
| 多次**区间加** + 多次**区间最值** | **线段树** | 每次 O(log n) |
| **二维**矩阵区间加 | **二维差分**（见 6.1） | 打点 O(1)、还原 O(m·n) |

> **一个容易混淆的名字**：**差分约束系统（Difference Constraints）** 和本文的差分数组**毫无关系**——它是一类「`x_j − x_i ≤ c` 的不等式系统」，用最短路 / SPFA 求解。名字里都有「差分」，但一个是数组技巧，一个是图论模型，别混。

---

## 相关文章

- [差分数组：把区间修改从 O(n) 降到 O(1)](/technology/difference-array/) — 原理、分步图解与更多变体
- [前缀和：把区间求和从 O(n) 降到 O(1)](/technology/prefix-sum/) — 差分的逆运算，二维容斥的前置
- [二维数组：从矩阵遍历到原地变换](/technology/two-d-array/) — 二维下标推导与「多开一圈」的通用套路
- [滑动窗口核心代码模板：三个问题搞定所有子串、子数组题](/technology/sliding-window-template/) — 另一套把一类题收敛到同一骨架的思路
