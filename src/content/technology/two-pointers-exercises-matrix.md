---
title: 数组双指针经典习题（二）：矩阵与字符串
published: 2026-09-29
description: '力扣「数组和双指针」入门计划后四题精讲：将矩阵按对角线排序、二维网格迁移、转置矩阵、最长公共前缀。围绕 i - j 标识对角线、展平加索引映射、三次反转、纵向扫描等技巧，附 C / C++ / JavaScript 三语言实现。'
image: ''
tags: [双指针, 二维数组, 矩阵, 字符串, 力扣, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 导读

[上一篇](/technology/two-pointers-exercises-1d/) 的五道题都在一维数组和字符串上打转。这一篇把战场搬到二维矩阵，外加一道经典的字符串题。

细看会发现，矩阵题的双指针往往**不是两个下标在移动，而是一个下标在「对角线」上移动**——把二维坐标 `(i, j)` 折叠成一维的某种序号，双指针的直觉立刻回来了。这正是本篇的主线：

| 题目 | 把二维折叠成一维的方式 | 指针/下标技巧 |
|------|---------------------|--------------|
| 将矩阵按对角线排序 | `i - j`（同一个值 = 同一条对角线） | 从每条对角线的起点出发，沿对角线走 |
| 二维网格迁移 | `i * n + j`（行优先展平） | 展平后整体循环移动 k 位 |
| 转置矩阵 | `res[j][i] = mat[i][j]`（行列互换） | 方阵可原地做，只走一半坐标 |
| 最长公共前缀 | 字符串的第 `j` 个字符 | 列指针纵向扫、行指针横向比 |

> **关于代码**
> 四道题同样给出 C / C++ / JavaScript 三语言实现。
> C 版本为了聚焦核心逻辑，以「传入 `m`、`n` 的核心函数」形式给出，省略了力扣官方签名里的 `returnSize`、`returnColumnSizes` 等返回参数管理。

---

## 1. 将矩阵按对角线排序（LeetCode 1329）

### 题目描述

给你一个 `m × n` 的整数矩阵 `mat`，请你将同一条**对角线**上的元素按升序排序后，返回排好序的矩阵。

这里说的对角线是**从左上到右下**的斜线，即坐标满足 `i - j` 为同一个常数的所有格子。

**示例：**

```text
输入：mat = [[3,3,1,1],
             [2,2,1,2],
             [1,1,1,2]]
输出：     [[1,1,1,1],
             [1,2,2,2],
             [1,2,3,3]]

输入：mat = [[1,1,1,1],
             [1,1,1,1],
             [1,1,1,1],
             [1,1,1,1]]
输出：     [[1,1,1,1],
             [1,1,1,1],
             [1,1,1,1],
             [1,1,1,1]]
```

**约束：** `m == mat.length`，`n == mat[i].length`，`1 <= m, n <= 100`，`1 <= mat[i][j] <= 100`。

### 思路：先找到每条对角线的「起点」

关键观察只有一句话：

> 同一条左上→右下的对角线，所有格子的 `i - j` 相等；反过来，`i - j` 相同就意味着在同一条对角线上。

对 `3 × 4` 的矩阵，`i - j` 的分布是这样的：

```text
        j=0  j=1  j=2  j=3
i=0      0   -1   -2   -3
i=1      1    0   -1   -2
i=2      2    1    0   -1
```

要让每条对角线都被**恰好遍历一次**，不需要枚举 `i - j` 的每个取值，只要枚举每条对角线的**起点**：

- 第一列的每个格子 `(i, 0)`（`i = 0..m-1`）都是一条对角线的起点；
- 第一行除 `(0, 0)` 外的每个格子 `(0, j)`（`j = 1..n-1`）也是一条对角线的起点。

一共 `m + n - 1` 条对角线。从起点出发，每次 `(i, j) → (i+1, j+1)`，直到越界，就正好走完这条线。

于是算法非常直白：**读出这条对角线的所有数 → 排序 → 按原顺序写回**。

### 过程图解

以示例 1 为例，标出各格子的 `i - j`：

```text
mat = [[3, 3, 1, 1],        i-j = [[ 0, -1, -2, -3],
       [2, 2, 1, 2],                [ 1,  0, -1, -2],
       [1, 1, 1, 2]]                [ 2,  1,  0, -1]]

按 i-j 分组：
  0: (0,0)=3, (1,1)=2, (2,2)=1   → 排序 [1,2,3]
 -1: (0,1)=3, (1,2)=1, (2,3)=2   → 排序 [1,2,3]
 -2: (0,2)=1, (1,3)=2            → 排序 [1,2]
 -3: (0,3)=1                     → 排序 [1]
  1: (1,0)=2, (2,1)=1            → 排序 [1,2]
  2: (2,0)=1                     → 排序 [1]

写回后：
[[1, 1, 1, 1],
 [1, 2, 2, 2],
 [1, 2, 3, 3]]  ✔
```

### 代码实现

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>

static int cmpInt(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);          /* 用减法可能溢出，这样写更稳 */
}

/* 排序从 (r, c) 出发、朝右下延伸的那条对角线 */
static void sortDiagonal(int **mat, int m, int n, int r, int c) {
    int len = 0;
    while (r + len < m && c + len < n) len++;      /* 这条对角线的长度 */

    int *buf = (int *)malloc(sizeof(int) * len);
    for (int k = 0; k < len; k++) buf[k] = mat[r + k][c + k];

    qsort(buf, len, sizeof(int), cmpInt);

    for (int k = 0; k < len; k++) mat[r + k][c + k] = buf[k];

    free(buf);
}

void diagonalSort(int **mat, int m, int n) {
    for (int i = 0; i < m; i++) sortDiagonal(mat, m, n, i, 0);  /* 第一列出发 */
    for (int j = 1; j < n; j++) sortDiagonal(mat, m, n, 0, j);  /* 第一行出发 */
}
```

```cpp title="C++"
#include <algorithm>
#include <vector>
using namespace std;

class Solution {
public:
    vector<vector<int>> diagonalSort(vector<vector<int>>& mat) {
        int m = (int)mat.size();
        int n = (int)mat[0].size();

        for (int i = 0; i < m; ++i) sortDiagonal(mat, i, 0);  // 第一列出发
        for (int j = 1; j < n; ++j) sortDiagonal(mat, 0, j);  // 第一行出发（跳过 (0,0)）

        return mat;
    }

private:
    // 读出 (r, c) 这条对角线 -> 排序 -> 写回
    void sortDiagonal(vector<vector<int>>& mat, int r, int c) {
        int m = (int)mat.size();
        int n = (int)mat[0].size();

        vector<int> diag;
        for (int i = r, j = c; i < m && j < n; ++i, ++j) diag.push_back(mat[i][j]);
        sort(diag.begin(), diag.end());

        int k = 0;
        for (int i = r, j = c; i < m && j < n; ++i, ++j) mat[i][j] = diag[k++];
    }
};
```

```js title="JavaScript"
function diagonalSort(mat) {
  const m = mat.length;
  const n = mat[0].length;

  // 读出 (r, c) 这条对角线 -> 排序 -> 写回
  const sortDiagonal = (r, c) => {
    const diag = [];
    for (let i = r, j = c; i < m && j < n; i++, j++) diag.push(mat[i][j]);
    diag.sort((a, b) => a - b);
    let k = 0;
    for (let i = r, j = c; i < m && j < n; i++, j++) mat[i][j] = diag[k++];
  };

  for (let i = 0; i < m; i++) sortDiagonal(i, 0);   // 第一列出发
  for (let j = 1; j < n; j++) sortDiagonal(0, j);   // 第一行出发（跳过 (0,0)）

  return mat;
}
```
:::

### 复杂度

设 `L = min(m, n)`：

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(m·n·log L)** — 每条对角线排序 O(len · log len)，所有对角线长度之和是 m·n |
| 空间复杂度 | **O(L)** — 一条对角线最长 L 个元素，用作排序缓冲 |

### 易错点

1. **起点的选取。** 第一列要包含 `(0, 0)`，第一行不要包含 `(0, 0)`，否则主对角线会被排序两次（虽然排序两遍结果不变，但白跑一趟）。
2. **`(i, j)` 的推进方向。** 本题的对角线是左上→右下，所以是 `i++, j++`；若写成 `i++, j--` 就变成反对角线了。
3. **非方阵的对角线长度不一致。** `m ≠ n` 时长度从 1 到 `min(m, n)` 不等，缓冲区要按实际长度分配，不能固定成 `m` 或 `n`。
4. **别忘了 `i - j` 可以为负。** 如果改用「按 `i - j` 分组」的写法，在 C 中不能直接拿负下标当数组索引。

### 扩展：不用额外缓冲的原地写法

同一条对角线本身就被连续存放在矩阵里（只是斜着），所以可以直接在对角线上做插入排序，把缓冲降到 O(1)：

```cpp
// 沿对角线做插入排序：把每个元素向前插到该对角线的已排序前缀中
void sortDiagonalInPlace(vector<vector<int>>& mat, int r, int c) {
    int m = (int)mat.size(), n = (int)mat[0].size();

    for (int i = r + 1, j = c + 1; i < m && j < n; ++i, ++j) {
        int x = mat[i][j];
        int p = i - 1, q = j - 1;
        while (p >= r && q >= c && mat[p][q] > x) {   // 比 x 大的都往后挪一格
            mat[p + 1][q + 1] = mat[p][q];
            --p;
            --q;
        }
        mat[p + 1][q + 1] = x;
    }
}
```

最坏情况（整块矩阵同一条对角线很长且逆序）时间复杂度是 O(m·n·min(m, n))，但额外空间是 O(1)，且在近乎有序的输入上很快。

---

## 2. 二维网格迁移（LeetCode 1260）

### 题目描述

给你一个 `m` 行 `n` 列的二维网格 `grid` 和一个整数 `k`。你需要将 `grid` 迁移 `k` 次。每次「迁移」操作：

- `grid[i][j]` 的元素将会移动到 `grid[i][j + 1]`；
- `grid[i][n - 1]` 的元素将会移动到 `grid[i + 1][0]`；
- `grid[m - 1][n - 1]` 的元素将会移动到 `grid[0][0]`。

请你返回 `k` 次迁移操作后最终得到的二维网格。

**示例：**

```text
输入：grid = [[1,2,3],
              [4,5,6],
              [7,8,9]], k = 1
输出：     [[9,1,2],
              [3,4,5],
              [6,7,8]]

输入：grid = [[3,8,1,9],
              [19,7,2,5],
              [4,6,11,10],
              [12,0,21,13]], k = 4
输出：     [[12,0,21,13],
              [3,8,1,9],
              [19,7,2,5],
              [4,6,11,10]]
         （每个元素正好移动一整行，等价于整体下移一行）

输入：grid = [[1,2,3],[4,5,6],[7,8,9]], k = 9
输出：[[1,2,3],[4,5,6],[7,8,9]]   （9 次正好绕回原样）
```

**约束：** `1 <= m, n <= 50`，`-1000 <= grid[i][j] <= 1000`，`0 <= k <= 100`。

### 思路一：展平后整体循环移动

矩阵的「蛇形绕回」规则听起来很绕，但把二维按下标 `p = i * n + j` **行优先展平**成一维数组后，一切都简单了：

```text
grid = [[1,2,3],        展平 →  [1,2,3,4,5,6,7,8,9]
        [4,5,6],
        [7,8,9]]
```

规则里的三条移动，在一维视角下其实是同一件事：**每个元素往后移动一位，最后一个绕回开头**。所以迁移 `k` 次 = 把展平数组整体**向右循环移动 k 位**。于是原位置 `p` 的元素，新位置就是：

```text
q = (p + k) mod (m * n)
```

再按 `q / n` 和 `q % n` 反算出行列下标写回即可。

注意 `k` 可以先对 `m * n` 取模：迁移 `m * n` 次元素全部回到原位。

### 过程图解

```text
grid = [[1,2,3],[4,5,6],[7,8,9]]   k = 1

展平： 下标  0  1  2  3  4  5  6  7  8
       值    1  2  3  4  5  6  7  8  9

每个元素 q = (p + 1) % 9：
  1(0) → 1    2(1) → 2    3(2) → 3
  4(3) → 4    5(4) → 5    6(5) → 6
  7(6) → 7    8(7) → 8    9(8) → 0   ← 9 绕回开头

新的一维： 9  1  2  3  4  5  6  7  8
按每行 3 个切分：
[[9,1,2],
 [3,4,5],
 [6,7,8]]  ✔
```

### 思路二：三次反转（原地，O(1) 额外空间）

「向右循环移动 k 位」有一个经典的双指针解法：**三次反转**。设数组长度为 `total`：

1. 反转整个数组 `[0, total-1]`；
2. 反转前 `k` 个 `[0, k-1]`；
3. 反转剩下的 `[k, total-1]`。

每次反转都用左右指针向中间夹逼交换。用 `[1..9]、k = 3` 验算：

```text
原始     1 2 3 4 5 6 7 8 9
反转全部 9 8 7 6 5 4 3 2 1
反转前3  7 8 9 6 5 4 3 2 1
反转其余 7 8 9 1 2 3 4 5 6   ✔ 正好是右移 3 位
```

只要肯把二维矩阵在下标层面当成一维数组（`p ↔ (p / n, p % n)`），这个算法就能原地套用，额外空间降到 O(1)。

### 代码实现

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>

int **shiftGrid(int **grid, int m, int n, int k) {
    int total = m * n;
    k %= total;                                    /* 迁移 total 次等于没动 */

    int **res = (int **)malloc(sizeof(int *) * m);
    for (int i = 0; i < m; i++) res[i] = (int *)malloc(sizeof(int) * n);

    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            int p = i * n + j;                     /* 展平后的下标 */
            int q = (p + k) % total;               /* 迁移 k 次后的下标 */
            res[q / n][q % n] = grid[i][j];
        }
    }
    return res;
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class Solution {
public:
    vector<vector<int>> shiftGrid(vector<vector<int>>& grid, int k) {
        int m = (int)grid.size();
        int n = (int)grid[0].size();
        int total = m * n;
        k %= total;                                // 迁移 total 次等于没动

        vector<vector<int>> res(m, vector<int>(n));
        for (int i = 0; i < m; ++i) {
            for (int j = 0; j < n; ++j) {
                int q = (i * n + j + k) % total;   // 展平后向后移动 k 位
                res[q / n][q % n] = grid[i][j];
            }
        }
        return res;
    }

    // 思路二：三次反转，原地完成
    vector<vector<int>> shiftGridReverse(vector<vector<int>> grid, int k) {
        int m = (int)grid.size(), n = (int)grid[0].size(), total = m * n;
        k %= total;

        // 把二维矩阵当成行优先的一维数组，翻转 [lo, hi]
        auto rev = [&](int lo, int hi) {
            while (lo < hi) {
                swap(grid[lo / n][lo % n], grid[hi / n][hi % n]);
                ++lo;
                --hi;
            }
        };

        rev(0, total - 1);
        rev(0, k - 1);
        rev(k, total - 1);
        return grid;
    }
};
```

```js title="JavaScript"
function shiftGrid(grid, k) {
  const m = grid.length;
  const n = grid[0].length;
  const total = m * n;
  k %= total;                                  // 迁移 total 次等于没动

  const res = Array.from({ length: m }, () => new Array(n));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const q = (i * n + j + k) % total;       // 展平后向后移动 k 位
      res[Math.floor(q / n)][q % n] = grid[i][j];
    }
  }
  return res;
}
```
:::

### 复杂度

| 解法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 索引映射 | O(m·n) | O(m·n) | 每个元素算一次新位置，最直观 |
| 三次反转 | O(m·n) | **O(1)** | 原地完成，代价是下标换算略绕 |

### 易错点

1. **先取模再计算。** `k` 可能远大于 `m * n`（本题 `k <= 100` 而已，但通用写法要 `k %= total`）。反过来说，**忘了 `k = 0` 的情形**也是常见疏漏——此时 `rev(0, -1)` 这种空区间必须安全跳过（`while (lo < hi)` 天然满足）。
2. **迁移方向别搞反。** 题目是每个元素**向右/向后**移动（`(p + k) % total`）；如果写成 `(p - k + total) % total` 就变成了向左迁移。
3. **行优先展平。** 用的是 `p = i * n + j`（先横着边走完一行）；如果用列优先展平，绕回顺序就和题目描述不一致了。
4. **`k` 与 `total` 的关系要想清楚再动手。** 示例 3 的 `k = 9`、`total = 9` 就是在提醒你取模。

---

## 3. 转置矩阵（LeetCode 867）

### 题目描述

给你一个二维整数数组 `matrix`，返回 `matrix` 的**转置矩阵**。

矩阵的转置是指将矩阵的主对角线翻转，交换矩阵的行索引与列索引。

**示例：**

```text
输入：matrix = [[1,2,3],
                [4,5,6],
                [7,8,9]]
输出：         [[1,4,7],
                [2,5,8],
                [3,6,9]]

输入：matrix = [[1,2,3],
                [4,5,6]]
输出：         [[1,4],
                [2,5],
                [3,6]]
```

**约束：** `m == matrix.length`，`n == matrix[i].length`，`1 <= m, n <= 1000`，`1 <= m * n <= 10^5`，`-10^9 <= matrix[i][j] <= 10^9`。

### 思路：一次坐标互换

转置的定义就是「交换行索引与列索引」，所以直接按映射搬：

```text
res[j][i] = matrix[i][j]
```

原矩阵是 `m × n`，转置后是 `n × m`：原来的第 `i` 行变成第 `i` 列。

**当且仅当矩阵是方阵时，可以原地转置**——因为此时输入输出的形状相同。原地做法的关键是把遍历范围**砍掉一半**：只处理上三角 `i < j`，把 `mat[i][j]` 与 `mat[j][i]` 交换；对角线上的 `i == j` 元素不用动。

为什么必须砍掉一半？下面这张表说明了问题：如果 `i`、`j` 都跑满整个矩阵，每个对称对会被交换**两次**，等于没换。

```text
只走上三角 (i < j)              i、j 都跑满
  (0,1) (0,2)                    每个 (i,j) 都被访问一次
  (1,2)                          (0,1) 换一次 → (1,0) 又换一次 → 还原

访问次数：   3 对                 访问次数：9 个格子，实际交换 4 对（重复）
```

### 过程图解

非方阵 `2 × 3 → 3 × 2`：

```text
matrix          res[j][i] = matrix[i][j]
[1, 2, 3]       res[0][0]=1  res[1][0]=2  res[2][0]=3
[4, 5, 6]       res[0][1]=4  res[1][1]=5  res[2][1]=6

res = [[1, 4],
       [2, 5],
       [3, 6]]  ✔
```

方阵原地转置：

```text
[1, 2, 3]                [1, 4, 7]
[4, 5, 6]   ──上三角交换──► [2, 5, 8]
[7, 8, 9]                [3, 6, 9]

交换的 3 对：(0,1)↔(1,0)、(0,2)↔(2,0)、(1,2)↔(2,1)
对角线 (0,0)、(1,1)、(2,2) 不动 ✔
```

### 代码实现

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>

/* 非方阵：结果是一个新的 n×m 矩阵 */
int **transpose(int **mat, int m, int n) {
    int **res = (int **)malloc(sizeof(int *) * n);
    for (int j = 0; j < n; j++) res[j] = (int *)malloc(sizeof(int) * m);

    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++)
            res[j][i] = mat[i][j];

    return res;
}

/* 方阵可以原地转置：只处理上三角 (i < j)，对角线不动 */
void transposeInPlace(int **mat, int m) {
    for (int i = 0; i < m; i++)
        for (int j = i + 1; j < m; j++) {
            int t = mat[i][j];
            mat[i][j] = mat[j][i];
            mat[j][i] = t;
        }
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class Solution {
public:
    vector<vector<int>> transpose(vector<vector<int>>& matrix) {
        int m = (int)matrix.size();
        int n = (int)matrix[0].size();
        vector<vector<int>> res(n, vector<int>(m));

        for (int i = 0; i < m; ++i)
            for (int j = 0; j < n; ++j)
                res[j][i] = matrix[i][j];

        return res;
    }

    // 方阵可以原地转置：只处理上三角
    void transposeInPlace(vector<vector<int>>& matrix) {
        int m = (int)matrix.size();
        for (int i = 0; i < m; ++i)
            for (int j = i + 1; j < m; ++j)
                swap(matrix[i][j], matrix[j][i]);
    }
};
```

```js title="JavaScript"
function transpose(matrix) {
  const m = matrix.length;
  const n = matrix[0].length;
  const res = Array.from({ length: n }, () => new Array(m));

  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) res[j][i] = matrix[i][j];

  return res;
}

// 方阵可以原地转置：只处理上三角
function transposeInPlace(matrix) {
  const m = matrix.length;
  for (let i = 0; i < m; i++)
    for (let j = i + 1; j < m; j++) {
      [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
    }
}
```
:::

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(m·n)** — 每个元素访问一次 |
| 空间复杂度 | **O(m·n)** — 非方阵必须新开数组（输出形状就不同） |
| 方阵原地版 | O(1) 额外空间，只需 m(m-1)/2 次交换 |

### 易错点

1. **非方阵不能原地转置。** `2 × 3` 变成 `3 × 2`，形状变了，必须开新数组。只有方阵才有「原地」可言。
2. **原地转置时 `j` 必须从 `i + 1` 开始。** 从 0 开始会让每个元素被换两次，最终结果和原矩阵一模一样——这是一个「看起来对、跑起来悄悄错」的经典 bug。
3. **别把两个下标写反。** 结果矩阵是 `n × m`（行数是原来的列数），先开对形状再填。

---

## 4. 最长公共前缀（LeetCode 14）

### 题目描述

编写一个函数来查找字符串数组中的最长公共前缀。如果不存在公共前缀，返回空字符串 `""`。

**示例：**

```text
输入：strs = ["flower","flow","flight"]
输出："fl"

输入：strs = ["dog","racecar","car"]
输出：""
解释：输入不存在公共前缀。

输入：strs = ["a"]
输出："a"
```

**约束：** `1 <= strs.length <= 200`，`0 <= strs[i].length <= 200`，`strs[i]` 仅由小写英文字母组成。

### 思路：纵向扫描，两根「指针」

前几节的指针都是数字下标，这道题的指针一个是**列**、一个是**行**：

- **列指针 `j`**：沿基准字符串 `strs[0]` 从第 0 个字符向右推进；
- **行指针 `i`**：对每个 `j`，横向扫过 `strs[1]`、`strs[2]`……逐一比较第 `j` 个字符。

规则是：

1. 公共前缀不可能比 `strs[0]` 更长，所以 `j` 只在 `strs[0]` 的范围内推进；
2. 对当前 `j`，如果某个字符串的第 `j` 个字符与 `strs[0][j]` 不同，或者该字符串已经结束（长度不足 `j + 1`），说明公共前缀到此为止——答案就是 `strs[0]` 的前 `j` 个字符；
3. 如果所有字符串都顺利走完 `strs[0]`，那么 `strs[0]` 本身就是公共前缀。

> 为什么「不同」和「结束」可以一起判断？因为在 C 语言里，访问字符串的第 `len` 个位置得到的正是终止符 `'\0'`，而 `strs[i][j] == '\0'` 显然不等于 `strs[0][j]`。C++ / JavaScript 则需要显式比较长度。

### 过程图解

```text
strs = ["flower", "flow", "flight"]
                  ↑ 基准串

j=0: strs[1][0]='f'='f'  strs[2][0]='f'='f'  → 全通过
j=1: strs[1][1]='l'='l'  strs[2][1]='l'='l'  → 全通过
j=2: strs[1][2]='o'='o'  strs[2][2]='i'!='o' → 冲突！

返回 strs[0] 的前 2 个字符 = "fl" ✔
```

反例 `["dog","racecar","car"]`：`j=0` 时 `'a' != 'd'`，立刻返回 `""` ✔

### 代码实现

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>
#include <string.h>

char *longestCommonPrefix(char **strs, int strsSize) {
    int len = (int)strlen(strs[0]);        /* 公共前缀不可能比基准串更长 */

    for (int j = 0; j < len; j++) {        /* j：沿基准串前进的列指针 */
        char c = strs[0][j];
        for (int i = 1; i < strsSize; i++) {   /* i：横向比较其余字符串 */
            /* 该字符串在此处已经结束（读到 '\0'），或字符不相等 */
            if (strs[i][j] == '\0' || strs[i][j] != c) {
                char *cut = (char *)malloc(j + 1);
                memcpy(cut, strs[0], j);
                cut[j] = '\0';
                return cut;
            }
        }
    }

    char *whole = (char *)malloc(len + 1);
    memcpy(whole, strs[0], len + 1);
    return whole;
}
```

```cpp title="C++"
#include <string>
#include <vector>
using namespace std;

class Solution {
public:
    string longestCommonPrefix(vector<string>& strs) {
        const string& base = strs[0];                   // 基准串

        for (int j = 0; j < (int)base.size(); ++j) {     // j：列指针
            char c = base[j];
            for (int i = 1; i < (int)strs.size(); ++i) { // i：行指针
                // 该字符串已经结束，或第 j 个字符不相等
                if (j >= (int)strs[i].size() || strs[i][j] != c) {
                    return base.substr(0, j);
                }
            }
        }
        return base;
    }
};
```

```js title="JavaScript"
function longestCommonPrefix(strs) {
  const base = strs[0];                    // 基准串

  for (let j = 0; j < base.length; j++) {         // j：列指针
    const c = base[j];
    for (let i = 1; i < strs.length; i++) {       // i：行指针
      // 该字符串已经结束，或第 j 个字符不相等
      if (j >= strs[i].length || strs[i][j] !== c) {
        return base.slice(0, j);
      }
    }
  }
  return base;
}
```
:::

### 复杂度

设 `S` 为所有字符串的字符总数，`L` 为最短字符串的长度：

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(S)** 最坏情况（所有串都比到最后一个字符）；更精确地上界是 O(n · L) |
| 空间复杂度 | **O(1)** — 只用了两个下标（返回的字符串不计） |

### 易错点

1. **基准串要选对。** 选 `strs[0]` 最方便，因为答案一定是它的前缀。若随便选一个串做基准，长度上界就不好控。
2. **空字符串的处理。** `strs` 里只要有 `""`，答案立刻是 `""`——上面代码里它会在 `j = 0` 那一轮被 `strs[i][j] == '\0'` 或长度判断拦住。
3. **C 里的越界不再发生，是因为比较顺序。** 逐个 `j` 递增地比较时，「更短的串」一定先在自己的终止符处被拦住，所以不会跳过终止符读到缓冲区之外。这是这类纵向扫描能在 C 中安全实现的隐含前提。
4. **`strs[i]` 全为空、或 `strs` 只有一个元素** 都是合法输入，前者返回 `""`，后者返回 `strs[0]` 本身。

### 其他解法

**分治**：把字符串数组一分为二，分别求左右两半的公共前缀，再把这两个前缀求一次公共前缀。时间 O(S)，空间 O(m·L) 递归栈。适合展示分治模板，但本题没有性能优势。

**排序后只比首尾**：把 `strs` 排序，公共前缀一定等于「字典序最小串」与「字典序最大串」的公共前缀。排序 O(n log n · L)，但两两比较的实现特别短：

```cpp
string longestCommonPrefixSorted(vector<string>& strs) {
    sort(strs.begin(), strs.end());
    const string& first = strs.front();
    const string& last = strs.back();
    int i = 0;
    while (i < (int)first.size() && i < (int)last.size() && first[i] == last[i]) ++i;
    return first.substr(0, i);
}
```

这个写法虽然不是双指针，但「只比首尾两个」的想法很值得记住。

---

## 小结

| 题目 | 二维 → 一维的桥梁 | 时间 | 空间 |
|------|-----------------|------|------|
| 将矩阵按对角线排序 | `i - j` 相同即同一条对角线 | O(m·n·log min(m,n)) | O(min(m,n)) |
| 二维网格迁移 | `p = i * n + j` 行优先展平 | O(m·n) | O(m·n) / 三次反转 O(1) |
| 转置矩阵 | `res[j][i] = mat[i][j]` | O(m·n) | O(m·n)，方阵可 O(1) |
| 最长公共前缀 | 字符串的第 `j` 个字符看成「列」 | O(S) | O(1) |

处理矩阵时反复出现的三个套路：

1. **找不变量来标识一组格子。** `i - j` 标识对角线、`i * n + j` 标识展平位置——先在二维坐标上找到一个「一维编号」，问题通常就变成了一维问题。
2. **先问「形状变了吗」。** 输出形状和输入一致（方阵转置）才有原地的可能；形状变了（非方阵转置、对角线排序）就必须开新数组或接受额外的缓冲区。
3. **原地操作只走一半。** 对称的操作（转置、成对比较）只处理一半坐标，否则会把结果再还原回去——转置题里 `j` 从 `i + 1` 开始就是这个道理。

## 相关文章

- [数组双指针经典习题（一）：一维数组与字符串](/technology/two-pointers-exercises-1d/) — 上一篇，快慢指针、左右指针与荷兰国旗
- [滑动窗口核心代码模板：三个问题搞定所有子串、子数组题](/technology/sliding-window-template/) — 两个指针都只向右走时的特例，一套骨架覆盖四道真题
- [二维数组：矩阵操作与 TypeScript 实战](/technology/two-d-array/) — 矩阵遍历、方向数组与二维前缀和
- [数组双指针：从 O(n²) 到 O(n) 的优化利器](/technology/two-pointers-array/) — 四种指针模式的总体框架
- [寻找重复数：二分查找与快慢指针](/technology/find-duplicate-number/) — 同属「数组 + 双指针」的进阶题
