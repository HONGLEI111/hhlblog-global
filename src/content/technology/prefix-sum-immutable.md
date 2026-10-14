---
title: 前缀和实战：数组不可变、矩阵不可变的区间查询，以及它答不了的题
published: 2026-10-13
description: '把 LeetCode 303 / 304 两道 "Immutable" 题收敛到同一套「多开一位」模板：一维 pre[r+1] - pre[l]、二维容斥四个角怎么来，附 C / C++ / JavaScript 三语言实现；最后聊前缀和答不了的四类问题（动态修改、无逆元运算、溢出、丢失内部结构），以及该换成什么结构。'
image: ''
tags: [前缀和, 力扣, 数组, 矩阵, 容斥原理, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 为什么单独再写一篇

[前缀和：把区间求和从 O(n) 降到 O(1)](/technology/prefix-sum/) 那篇讲的是**原理**：前缀和为什么快、和为 K 的子数组怎么套哈希。这篇要解决的是另一类问题——**力扣里那两道名字就叫 "Immutable" 的题**：

- **303. Range Sum Query - Immutable**（数组不可变）
- **304. Range Sum Query 2D - Immutable**（矩阵不可变）

它们的共同点写在题名里：**数组/矩阵本身不会变，变的是查询**。这正是前缀和最擅长的场景，也是它一维和二维两套模板的「标准答案」。而题名里的 "Immutable" 反过来也点破了前缀和的软肋——**一旦元素可变，这套预处理就崩了**。

所以这篇分三段：一维模板、二维模板，最后专门用一节讲**前缀和的局限性**——它在什么条件下才成立，以及条件不满足时该换成什么。

> **关于代码**
>
> 两道题都给出 C / C++ / JavaScript 三语言实现，逻辑完全等价，可切换标签查看。
> 两套模板统一采用**多开一位（圈）**的写法：一维 `pre` 长 `n + 1`，二维 `pre` 是 `(m + 1) × (n + 1)`。多出来的这一位是 0，专门用来消掉边界特判。

---

## 一、把问题抽象成同一句话

两道题去掉背景后，是同一个问题：

> **预处理一次，之后每次查询「某个连续区域的和」都要 O(1)。**

| | 303 数组不可变 | 304 矩阵不可变 |
|---|---|---|
| 预处理 | 一维前缀和 | 二维前缀和 |
| 查询对象 | 一维区间 `[l, r]` | 二维矩形 `(r1, c1) ~ (r2, c2)` |
| 预处理复杂度 | O(n) | O(m·n) |
| 单次查询 | O(1) | O(1) |
| 空间 | O(n) | O(m·n) |

核心动作只有一个：**把「区域和」拆成「两个（或四个）从原点出发的前缀和」的加减**。难点全在「多开的一圈」和「±号有几项」上，下面逐个拆。

---

## 二、数组不可变（LeetCode 303）

### 题目描述

给定一个整数数组 `nums`，多次调用 `sumRange(left, right)`，返回下标 `left` 到 `right`（含两端）之间元素的和。**数组本身不会被修改**。

**示例：**

```text
nums = [-2, 0, 3, -5, 2, -1]

sumRange(0, 2) → 1      // -2 + 0 + 3
sumRange(2, 5) → -1     // 3 + (-5) + 2 + (-1)
sumRange(0, 5) → -3     // 整个数组
```

**约束：** `0 <= nums.length <= 10^4`，`sumRange` 最多调用 `10^4` 次。

### 朴素解为什么不给分

每次 `sumRange` 都从 `left` 累加到 `right`，单次 O(n)。最坏情况下（每次查整个数组）总复杂度 O(n·q)，`n = q = 10^4` 就是 10⁸ 次累加——够呛，而且这个瓶颈**每次查询都要重新付**。

前缀和的价值就在「**付一次，用很久**」：构造时扫一遍 O(n)，之后每次查询只碰两次数组——**O(1)**。

### 关键：多开一位，语义才干净

定义前缀数组 `pre`，长度 **`n + 1`**：

```text
pre[0] = 0
pre[i] = nums[0] + nums[1] + ... + nums[i-1]     (1 ≤ i ≤ n)
```

也就是说 **`pre[i]` 表示「前 i 个元素的和」**，是一个**左闭右开**区间的累计值 `[0, i)`。多开的那一位 `pre[0] = 0` 是整套写法的粘合剂——它让「空区间」也有前缀和，边界不用特判。

于是区间 `[left, right]`（闭区间）的和可以写成**两个前缀之差**：

```text
sum(left, right) = nums[left] + ... + nums[right]
                 = pre[right + 1] - pre[left]
```

为什么是 `right + 1`？因为 `pre[right + 1]` 才刚好包含到 `nums[right]`（前 `right + 1` 个元素 = 下标 0..right），而 `pre[left]` 恰好是 `left` 之前的部分。**一头一尾对上了。**

```text
nums:  [ -2,  0,  3, -5,  2, -1 ]
index:    0   1   2   3   4   5

pre:   [ 0, -2, -2,  1, -4, -2, -3 ]
index:   0   1   2   3   4   5   6
          ↑                       ↑
      pre[0]=0             pre[6]=整个数组的和

sumRange(2, 5) = pre[6] - pre[2] = -3 - (-2) = -1   ✓
                  └ 前 6 个 ┘  └ 前 2 个 ┘
```

### 三段式模板

前缀和的代码永远是三段：**建表 → 查表 → （C 语言）释放**。

```text
① 建表：pre[0] = 0;  for i in 1..n:  pre[i] = pre[i-1] + nums[i-1]
② 查询：return pre[right + 1] - pre[left]
③ 释放：（C 语言）free 掉 pre 和对象本身
```

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>

typedef struct {
    int *pre;   /* pre[i] = nums[0..i-1] 的和，长度 n + 1 */
    int n;
} NumArray;

NumArray *numArrayCreate(int *nums, int numsSize) {
    NumArray *obj = (NumArray *)malloc(sizeof(NumArray));
    obj->n = numsSize;
    obj->pre = (int *)malloc((numsSize + 1) * sizeof(int));
    obj->pre[0] = 0;                                  /* 多开的一位 */
    for (int i = 0; i < numsSize; i++)
        obj->pre[i + 1] = obj->pre[i] + nums[i];      /* 前 i+1 个元素的和 */
    return obj;
}

int numArraySumRange(NumArray *obj, int left, int right) {
    return obj->pre[right + 1] - obj->pre[left];      /* 一头一尾 */
}

void numArrayFree(NumArray *obj) {
    free(obj->pre);
    free(obj);
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class NumArray {
    vector<int> pre;   // pre[i] = nums[0..i-1] 的和，长度 n + 1
public:
    NumArray(vector<int>& nums) : pre(nums.size() + 1, 0) {
        for (int i = 0; i < (int)nums.size(); i++)
            pre[i + 1] = pre[i] + nums[i];             // 前 i+1 个元素的和
    }
    int sumRange(int left, int right) {
        return pre[right + 1] - pre[left];             // 一头一尾
    }
};
```

```js title="JavaScript"
var NumArray = function (nums) {
  // pre[i] = nums[0..i-1] 的和，长度 n + 1
  this.pre = new Array(nums.length + 1).fill(0);
  for (let i = 0; i < nums.length; i++) {
    this.pre[i + 1] = this.pre[i] + nums[i]; // 前 i+1 个元素的和
  }
};

NumArray.prototype.sumRange = function (left, right) {
  return this.pre[right + 1] - this.pre[left]; // 一头一尾
};
```
:::

### 复杂度

| 维度 | 分析 |
|------|------|
| 构造 | **O(n)** — 扫一遍数组 |
| 单次查询 | **O(1)** — 一次减法 |
| 空间 | **O(n)** — 多存一个长度 `n + 1` 的数组 |

### 易错点

1. **`pre` 忘记多开一位。** 只开 `n` 长度，`pre[right + 1]` 在 `right == n - 1` 时就越界。多开的那一位不是「浪费」，它是 `sumRange(0, x)` 能写成统一公式的前提。
2. **下标差一。** 记住这套语义就错不了：**`pre[i]` 对应「前 i 个」，查询是 `pre[right + 1] - pre[left]`**。`right` 要 `+1`、`left` 不要，是因为左闭右开区间 `[left, right+1)` 正好等于闭区间 `[left, right]`。
3. **混淆 `nums[i]` 和 `pre[i]` 的下标。** 建表那行是 `pre[i + 1] = pre[i] + nums[i]`——**`pre` 比 `nums` 整体错开一位**。写成 `pre[i] += nums[i]` 就全乱了。
4. **题目没保证区间非空但保证了 `left ≤ right`。** `left == right` 时公式给出 `nums[left]` 本身，天然正确，不用特判。

---

## 三、矩阵不可变（LeetCode 304）

### 题目描述

给定一个二维矩阵 `matrix`，多次调用 `sumRegion(row1, col1, row2, col2)`，返回左上角 `(row1, col1)` 到右下角 `(row2, col2)` 构成的**矩形区域**内元素的和（四个角都含）。**矩阵本身不会被修改**。

**示例：**

```text
matrix = [[3, 0, 1, 4, 2],
          [5, 6, 3, 2, 1],
          [1, 2, 0, 1, 5],
          [4, 1, 0, 1, 7],
          [1, 0, 3, 0, 5]]

sumRegion(2, 1, 4, 3) → 8     // 见下方矩形
sumRegion(1, 1, 2, 2) → 11
sumRegion(1, 2, 2, 4) → 12
```

**约束：** `m, n <= 200`，`sumRegion` 最多调用 `10^4` 次。

### 从一维到二维：多开「一圈」

一维时多开一位（`pre[0] = 0`），二维时**多开一行一列**：`pre` 大小 `(m + 1) × (n + 1)`，第 0 行和第 0 列全填 0。

定义：

```text
pre[i][j] = 矩阵中左上角 (0,0) 到右下角 (i-1, j-1) 的子矩阵之和
```

也就是 `pre[i][j]` 表示「**前 i 行、前 j 列**」构成的矩形和。多出来的第 0 行 / 第 0 列，就是二维版的 `pre[0] = 0`——它让「贴着上边界或左边界」的查询不用特判。

### 递推：一个格子由三个格子推出来

`pre[i][j]` 覆盖的矩形，可以拆成三块已知区域再加当前格子 `matrix[i-1][j-1]`：

```text
① pre[i-1][j]     正上方的矩形（前 i-1 行、前 j 列）
② pre[i][j-1]     正左方的矩形（前 i 行、前 j-1 列）
③ pre[i-1][j-1]   左上角重叠部分 —— 被 ①② 各算了一次，要减掉
④ matrix[i-1][j-1] 当前格子本身

pre[i][j] = pre[i-1][j] + pre[i][j-1] - pre[i-1][j-1] + matrix[i-1][j-1]
            └────①────┘ └────②────┘ └─────③─────┘ └──────④──────┘
```

**为什么减 `pre[i-1][j-1]`？** ① 和 ② 都覆盖了左上角那块「前 i-1 行、前 j-1 列」，它被重复加了两次，所以补一次减法——这就是**容斥原理**。

```text
      前 j-1 列   第 j 列
    ┌──────────┬─────┐
前  ┌──────────┬─────┐
i-1 │    ③     │  ① │
行  ├──────────┼─────┤
第  │    ②     │  ④ │
i行 └──────────┴─────┘
```

### 查询：四个角，两个减一个加

矩形 `(r1, c1) ~ (r2, c2)` 的和，用四个「从原点到某角」的前缀和做容斥：

```text
sum(r1, c1, r2, c2)
  =   pre[r2 + 1][c2 + 1]     /* 大矩形：到右下角 */
    - pre[r1][c2 + 1]         /* 减：上方多出来的 */
    - pre[r2 + 1][c1]         /* 减：左方多出来的 */
    + pre[r1][c1]             /* 加：左上被减了两次，补回来 */
```

**四个角的位置**（注意每个都是 `±1` 之后的前缀和下标）：

```text
                        c1        c2
          0     c1        c2      c2+1
       ┌─────┬──────┬─────────┐
    0  │     │      │         │
       ├─────┼──────┼─────────┤
   r1  │     │  ▓▓  │  ▓▓▓▓▓  │   ← pre[r1][*]
       ├─────┼──────┼─────────┤
   r2  │     │  ▓▓  │  ▓▓▓▓▓  │   ← pre[r2+1][*]
       └─────┴──────┴─────────┘

   大矩形  pre[r2+1][c2+1]
 − 上方条  pre[r1][c2+1]
 − 左方条  pre[r2+1][c1]
 + 左上块  pre[r1][c1]      ← 被减两次，加回来
   ─────────────────────────
 = 目标    ▓▓ 格子之和
```

**记忆口诀：右下 `+1`，左上不加；减两次的补一次加。** 也就是 `r2`、`c2` 处取 `+1`，`r1`、`c1` 处原样，符号从左到右是 `+ − − +`。

### 三段式模板

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>

typedef struct {
    int **pre;         /* (m+1) x (n+1)，多开一圈 */
    int rows, cols;
} NumMatrix;

NumMatrix *numMatrixCreate(int **matrix, int matrixSize, int *matrixColSize) {
    int m = matrixSize, n = matrixColSize[0];
    NumMatrix *obj = (NumMatrix *)malloc(sizeof(NumMatrix));
    obj->rows = m;
    obj->cols = n;
    obj->pre = (int **)malloc((m + 1) * sizeof(int *));
    for (int i = 0; i <= m; i++)
        obj->pre[i] = (int *)calloc(n + 1, sizeof(int));   /* 多开的一圈，初值 0 */

    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            obj->pre[i][j] = obj->pre[i - 1][j] + obj->pre[i][j - 1]
                           - obj->pre[i - 1][j - 1] + matrix[i - 1][j - 1];
    return obj;
}

int numMatrixSumRegion(NumMatrix *obj, int row1, int col1, int row2, int col2) {
    return obj->pre[row2 + 1][col2 + 1]      /* 大矩形 */
         - obj->pre[row1][col2 + 1]          /* 减上方 */
         - obj->pre[row2 + 1][col1]          /* 减左方 */
         + obj->pre[row1][col1];             /* 补左上 */
}

void numMatrixFree(NumMatrix *obj) {
    for (int i = 0; i <= obj->rows; i++)
        free(obj->pre[i]);
    free(obj->pre);
    free(obj);
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class NumMatrix {
    vector<vector<int>> pre;   // (m+1) x (n+1)，多开一圈
public:
    NumMatrix(vector<vector<int>>& matrix) {
        int m = matrix.size(), n = matrix[0].size();
        pre.assign(m + 1, vector<int>(n + 1, 0));
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++)
                pre[i][j] = pre[i - 1][j] + pre[i][j - 1]
                          - pre[i - 1][j - 1] + matrix[i - 1][j - 1];
    }
    int sumRegion(int row1, int col1, int row2, int col2) {
        return pre[row2 + 1][col2 + 1]   // 大矩形
             - pre[row1][col2 + 1]       // 减上方
             - pre[row2 + 1][col1]       // 减左方
             + pre[row1][col1];          // 补左上
    }
};
```

```js title="JavaScript"
var NumMatrix = function (matrix) {
  const m = matrix.length;
  const n = matrix[0].length;
  // pre 是 (m+1) x (n+1)，多开的一圈是 0
  this.pre = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      this.pre[i][j] =
        this.pre[i - 1][j] + this.pre[i][j - 1] - this.pre[i - 1][j - 1] + matrix[i - 1][j - 1];
    }
  }
};

NumMatrix.prototype.sumRegion = function (row1, col1, row2, col2) {
  return (
    this.pre[row2 + 1][col2 + 1] - // 大矩形
    this.pre[row1][col2 + 1] - // 减上方
    this.pre[row2 + 1][col1] + // 减左方
    this.pre[row1][col1] // 补左上
  );
};
```
:::

### 复杂度

| 维度 | 分析 |
|------|------|
| 构造 | **O(m·n)** — 每个格子常数次运算 |
| 单次查询 | **O(1)** — 四个查询、三次加减 |
| 空间 | **O(m·n)** — 多开一行一列 |

### 易错点

1. **四个角记混。** 卡死时别背公式，回去看上面的容斥图：大矩形减上方条、减左方条，左上块被减了两次所以加回来。**符号顺序 `+ − − +`**，只有 `r2`、`c2` 带 `+1`。
2. **`pre` 的第 0 行 / 第 0 列没置 0。** C 语言里 `malloc` 不会清零——必须用 `calloc`（或 memset）把多开的一圈显式置 0，否则贴着上/左边界时读到垃圾值。
3. **`matrix[i-1][j-1]` 写成了 `matrix[i][j]`。** 建表循环从 1 开始，`pre` 的下标比 `matrix` 大 1，取原矩阵元素时一定要**减回来**。
4. **行列为空。** 矩阵至少 1 行 1 列（题目约束保证），所以 C 版直接取 `matrixColSize[0]` 安全；但如果自己封装通用函数，空矩阵要单独挡一道。

---

## 四、两套模板对照

| | 一维（数组不可变） | 二维（矩阵不可变） |
|---|---|---|
| `pre` 尺寸 | `n + 1` | `(m + 1) × (n + 1)` |
| `pre` 的语义 | 前 `i` 个元素和 | 前 `i` 行、前 `j` 列的矩形和 |
| 建表递推 | `pre[i] = pre[i-1] + nums[i-1]` | `pre[i][j] = pre[i-1][j] + pre[i][j-1] − pre[i-1][j-1] + M[i-1][j-1]` |
| 容斥项数 | 2 项（两端） | 4 项（四个角） |
| 查询公式 | `pre[r+1] − pre[l]` | `pre[r2+1][c2+1] − pre[r1][c2+1] − pre[r2+1][c1] + pre[r1][c1]` |
| 符号规律 | `−` | `+ − − +` |
| 构造 / 查询 / 空间 | O(n) / O(1) / O(n) | O(m·n) / O(1) / O(m·n) |

一句话总结：**一维是「多开一位」，二维是「多开一圈」；项数从 2 变 4，是因为矩形边界比线段多一个维度。** 理解了二维的容斥，三维、四维只是项数指数增长——但工程里几乎用不到，理解到这个层级足够了。

---

## 五、前缀和的局限性

前面两节顺风顺水，是因为题目把最苛刻的条件写在了标题里：**Immutable——不可变**。这一节把隐藏的前提摊开讲：**前缀和不是万能加速器，它是拿「预处理换查询」的静态技巧，一旦前提破了就会失效。**

### 局限 1：不支持动态修改

前缀和是**一次性算好、只读**的结构。原数组只要改一个元素 `nums[i]`，从 `i` 往后所有的 `pre[i]` 全部失效，**重建是 O(n)**。

```text
nums: [ 1, 2, 3, 4, 5 ]        把 nums[0] 改成 100
pre:  [ 0, 1, 3, 6, 10, 15 ]   →  pre[1..5] 全部要重算，O(n)
```

于是：

| 需求 | 前缀和 | 该换成 |
|---|---|---|
| **只查询、不修改** | ✅ 最优 | —— |
| **批量区间修改，最后统一查询** | ❌ | [差分数组](/technology/difference-array/)，修改 O(1)、最后 O(n) 还原 |
| **单点修改 + 区间查询，交替进行** | ❌ O(n) | **树状数组（BIT）/ 线段树**，两者都是 O(log n) |

这就是题目为什么反复强调 "Immutable"——**一旦可变，正确答案就不是前缀和了**。树状数组和线段树本质上是「让前缀和也能增量更新」的升级版，那是另一个话题。

### 局限 2：只对「有逆运算」的运算成立

一维取区间和的公式 `pre[r+1] - pre[l]`，本质是**用减法去掉区间外的部分**。所以前缀和只对**有逆元的运算**有效：

| 运算 | 有逆元？ | 区间查询能否用前缀和 | 说明 |
|---|---|---|---|
| 加法 `+` | ✅ 减法 | **可以** | 区间和 `= pre[r+1] - pre[l]` |
| 异或 `^` | ✅ 异或自身 | **可以** | 区间异或 `= pre[r+1] ^ pre[l]` |
| 模意义下的乘法 | ✅ 乘法逆元 | 可以（模为素数时） | 需要求逆元，且**遇到 0 就崩** |
| `min` / `max` | ❌ | **不行** | 前缀最小值和区间最小值没有减法关系 |
| `gcd` / `lcm` | ❌ | **不行** | 同理，无法「除掉」区间外部分 |
| 普通乘法 | ❌ | **不行** | 数组里一旦有 0 就无逆元；就算没有，也要小心精度 |

```text
区间最小值 ≠ prefixMin[r+1] - prefixMin[l]     ← 完全错误，前缀 min 减不出来
```

需要**区间 min / max / gcd** 时，该换的武器是：

| 需求 | 结构 | 单次查询 |
|---|---|---|
| 静态区间最值 | **ST 表（稀疏表）** | O(1) 查询，O(n log n) 预处理 |
| 动态区间最值 | **线段树** | O(log n) |
| **滑动窗口**最值 | **单调队列** | O(1) 均摊 |

> **一句话判据：能写出 `区间结果 = f(前缀, 前缀)` 这种「相减/相消」关系的，才轮到前缀和。**

### 局限 3：累加会溢出，也会丢精度

前缀和是**累加量**，数值比原数组大得多，溢出风险和原数组不是一个量级。

- **整数溢出**：`10^5` 个 `10^9` 级别的数相加，和能到 `10^14`——**32 位 `int` 早就爆了**。构建前缀和时**必须开 `long long`（C / C++）/ `BigInt`（JS）**，哪怕题目原数组是 `int`。
- **浮点误差**：`pre[r+1] - pre[l]` 是两个大数相减，**大数相减会导致有效位丢失**。若数组元素是浮点数，长前缀相减可能得到明显偏差的结果，需要对精度敏感的场景改用其他方案。
- **二维放大更快**：矩阵不可变里 `pre` 的每个格子是矩形和，总量是 `m·n` 个元素的和——**溢出门槛比一维更低**，更要用宽类型。

```cpp
// ❌ 原数组是 int，但前缀和一定是 long long
vector<int> pre(n + 1, 0);
pre[i + 1] = pre[i] + nums[i];          // 10^9 量级累加几万次就溢出

// ✅
vector<long long> pre(n + 1, 0);
pre[i + 1] = pre[i] + nums[i];
```

### 局限 4：丢掉了区间内部结构

前缀和只记住「到某点的累计值」，换来 O(1) 查询，代价是**看不见区间内部的分布**。两类问题因此与它无缘：

- **需要内部极值的**：区间最大值、最长连续子段……内部信息的答案没法由「两个前缀之差」推出（见局限 2）。
- **依赖单调性的**：前缀和单调**只在元素全非负时成立**。数组里一旦有负数，`pre` 就不再单调，于是「二分前缀和找答案」这类套路当场失效——比如**和为 K 的子数组**，元素含负数时就不能靠双指针/二分，只能老老实实**哈希表 + 前缀和**统计出现次数（详见[原理篇](/technology/prefix-sum/)）。

```text
nums = [1, -1, 1, -1]     pre = [0, 1, 0, 1, 0]   ← 上下反复，不单调
nums = [1,  2, 3,  4]     pre = [0, 1, 3, 6, 10]  ← 单调递增
```

### 局限小结

| 前缀和能回答 | 前缀和答不了，该换成 |
|---|---|
| 静态数组/矩阵的任意区间和 | 元素可变 → 树状数组 / 线段树 |
| 静态区间异或、模意义乘法 | 区间 min / max / gcd → ST 表 / 线段树 / 单调队列 |
| 全非负 + 找和/二分类问题 | 含负数 + 二分 → 哈希表前缀和计数 |
| —— | 数值超大 → 宽类型 / BigInt；浮点 → 换方案 |

**记住前缀和的定位：它是「静态区间可逆聚合」的专用加速器，不是通用数据结构。** 用之前先问三句——**数据会变吗？运算可逆吗？数值会溢出吗？** 三问都过关，再上前缀和。

---

## 相关文章

- [前缀和：把区间求和从 O(n) 降到 O(1)](/technology/prefix-sum/) — 原理、和为 K 的子数组、前缀积等变体
- [差分数组：把区间修改从 O(n) 降到 O(1)](/technology/difference-array/) — 前缀和的逆运算，批量区间修改的利器
- [二维数组：从矩阵遍历到原地变换](/technology/two-d-array/) — 矩阵不变量、原地旋转与二维下标推导
- [二分查找框架：一套模板搞定元素搜索与左右边界](/technology/binary-search-template/) — 同属「一套模板收敛一类题」的思路
