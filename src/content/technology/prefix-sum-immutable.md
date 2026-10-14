---
title: 'Prefix Sums in Practice: Range Queries on Immutable Arrays and Immutable Matrices, and the Problems They Can''t Solve'
published: 2026-10-13
description: 'Converge LeetCode 303 and 304, both "Immutable" problems, onto a single "one extra slot" template: how 1D pre[r+1] - pre[l] and the 2D inclusion-exclusion four corners work, with implementations in C, C++, and JavaScript. Then look at four kinds of problems prefix sums can''t handle (dynamic updates, operations without inverses, overflow, and lost internal structure) and what structures to use instead.'
image: ''
tags: [Prefix Sum, LeetCode, Array, Matrix, Inclusion-Exclusion Principle, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Why Write a Separate Article

The [Prefix Sum: Reducing Range Sum Queries from O(n) to O(1)](/technology/prefix-sum/) article covered the **principles**: why prefix sums are fast, and how to use a hash map for subarrays that sum to K. This article tackles a different class of problems—**the two LeetCode problems literally named "Immutable"**:

- **303. Range Sum Query - Immutable** (immutable array)
- **304. Range Sum Query 2D - Immutable** (immutable matrix)

Their common trait is right there in the title: **the array/matrix itself never changes; what changes is the query**. This is exactly the scenario prefix sums excel at, and it's the "standard answer" for both the 1D and 2D templates. The word "Immutable" in the title also exposes prefix sums' Achilles' heel—**once elements can change, this preprocessing falls apart**.

So this article has three parts: the 1D template, the 2D template, and finally a dedicated section on **the limitations of prefix sums**—under what conditions they hold, and what to switch to when those conditions aren't met.

> **About the code**
>
> Both problems provide implementations in C / C++ / JavaScript. The logic is completely equivalent; switch tabs to view.
> Both templates uniformly adopt the **extra-slot (ring)** approach: 1D `pre` has length `n + 1`, 2D `pre` is `(m + 1) × (n + 1)`. The extra slot is 0, specifically used to eliminate boundary special-casing.

---

## 1. Abstracting the Problem into a Single Sentence

Strip away the context, and both problems are the same problem:

> **Preprocess once, then every query for "the sum of some contiguous region" must be O(1).**

| | 303 Immutable Array | 304 Immutable Matrix |
|---|---|---|
| Preprocessing | 1D prefix sum | 2D prefix sum |
| Query target | 1D interval `[l, r]` | 2D rectangle `(r1, c1) ~ (r2, c2)` |
| Preprocessing complexity | O(n) | O(m·n) |
| Single query | O(1) | O(1) |
| Space | O(n) | O(m·n) |

There's only one core action: **decompose the "region sum" into addition/subtraction of "two (or four) prefix sums starting from the origin"**. All the difficulty lies in the "extra ring" and "how many ± terms there are"—let's break them down one by one.

---

## 2. Immutable Array (LeetCode 303)

### Problem Description

Given an integer array `nums`, call `sumRange(left, right)` multiple times, returning the sum of elements from index `left` to `right` (inclusive). **The array itself is never modified**.

**Example:**

```text
nums = [-2, 0, 3, -5, 2, -1]

sumRange(0, 2) → 1      // -2 + 0 + 3
sumRange(2, 5) → -1     // 3 + (-5) + 2 + (-1)
sumRange(0, 5) → -3     // 整个数组
```

**Constraints:** `0 <= nums.length <= 10^4`, `sumRange` is called at most `10^4` times.

### Why the Naive Solution Doesn't Pass

Each `sumRange` accumulates from `left` to `right`, O(n) per call. In the worst case (querying the entire array each time), total complexity is O(n·q), and `n = q = 10^4` means 10⁸ additions—rough. And this bottleneck **must be paid anew on every query**.

The value of prefix sums is "**pay once, use forever**": construction scans once in O(n), and afterward each query touches the array only twice—**O(1)**.

### The Key: One Extra Slot Makes the Semantics Clean

Define the prefix array `pre` with length **`n + 1`**:

```text
pre[0] = 0
pre[i] = nums[0] + nums[1] + ... + nums[i-1]     (1 ≤ i ≤ n)
```

That is, **`pre[i]` represents "the sum of the first i elements"**, a cumulative value over a **left-closed, right-open** interval `[0, i)`. The extra slot `pre[0] = 0` is the glue for the whole approach—it gives the "empty interval" a prefix sum too, so boundaries need no special-casing.

Thus the sum over interval `[left, right]` (closed interval) can be written as **the difference of two prefixes**:

```text
sum(left, right) = nums[left] + ... + nums[right]
                 = pre[right + 1] - pre[left]
```

Why `right + 1`? Because `pre[right + 1]` just barely includes up to `nums[right]` (the first `right + 1` elements = indices 0..right), while `pre[left]` is exactly the part before `left`. **Head and tail line up.**

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

### The Three-Part Template

Prefix sum code is always three parts: **build table → query table → (C only) free**.

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

### Complexity

| Dimension | Analysis |
|------|------|
| Construction | **O(n)** — one pass over the array |
| Single query | **O(1)** — one subtraction |
| Space | **O(n)** — one extra array of length `n + 1` |

### Common Pitfalls

1. **Forgetting to allocate one extra slot in `pre`.** Allocating only `n` in length means `pre[right + 1]` goes out of bounds when `right == n - 1`. The extra slot isn't "waste"—it's the precondition for writing `sumRange(0, x)` as a unified formula.
2. **Off-by-one in indices.** Remember this semantics and you can't go wrong: **`pre[i]` corresponds to "the first i elements", and the query is `pre[right + 1] - pre[left]`**. `right` wants `+1`, `left` doesn't, because the left-closed, right-open interval `[left, right+1)` is exactly the closed interval `[left, right]`.
3. **Confusing the indices of `nums[i]` and `pre[i]`.** The build-table line is `pre[i + 1] = pre[i] + nums[i]`—**`pre` is shifted by one relative to `nums`**. Writing `pre[i] += nums[i]` throws everything off.
4. **The problem doesn't guarantee the interval is non-empty but does guarantee `left ≤ right`.** When `left == right`, the formula yields `nums[left]` itself, which is naturally correct—no special-casing needed.

---
## 3. Immutable Matrix (LeetCode 304)

### Problem Description

Given a 2D matrix `matrix`, call `sumRegion(row1, col1, row2, col2)` multiple times, returning the sum of elements within the **rectangular region** formed from the top-left corner `(row1, col1)` to the bottom-right corner `(row2, col2)` (all four corners inclusive). **The matrix itself will not be modified.**

**Example:**

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

**Constraints:** `m, n <= 200`, `sumRegion` will be called at most `10^4` times.

### From 1D to 2D: Allocate an Extra "Ring"

In 1D we allocate one extra position (`pre[0] = 0`); in 2D we **allocate one extra row and one extra column**: `pre` of size `(m + 1) × (n + 1)`, with row 0 and column 0 all filled with 0.

Definition:

```text
pre[i][j] = 矩阵中左上角 (0,0) 到右下角 (i-1, j-1) 的子矩阵之和
```

That is, `pre[i][j]` represents the rectangle sum formed by "**the first i rows and the first j columns**." The extra row 0 / column 0 is the 2D version of `pre[0] = 0`—it lets queries that "hug the top or left boundary" avoid special-case handling.

### Recurrence: One Cell Derived from Three Cells

The rectangle covered by `pre[i][j]` can be decomposed into three known regions plus the current cell `matrix[i-1][j-1]`:

```text
① pre[i-1][j]     正上方的矩形（前 i-1 行、前 j 列）
② pre[i][j-1]     正左方的矩形（前 i 行、前 j-1 列）
③ pre[i-1][j-1]   左上角重叠部分 —— 被 ①② 各算了一次，要减掉
④ matrix[i-1][j-1] 当前格子本身

pre[i][j] = pre[i-1][j] + pre[i][j-1] - pre[i-1][j-1] + matrix[i-1][j-1]
            └────①────┘ └────②────┘ └─────③─────┘ └──────④──────┘
```

**Why subtract `pre[i-1][j-1]`?** Both ① and ② cover the top-left block "the first i-1 rows and the first j-1 columns," which gets added twice, so we compensate with one subtraction—this is the **inclusion-exclusion principle**.

```text
      前 j-1 列   第 j 列
    ┌──────────┬─────┐
前  ┌──────────┬─────┐
i-1 │    ③     │  ① │
行  ├──────────┼─────┤
第  │    ②     │  ④ │
i行 └──────────┴─────┘
```

### Query: Four Corners, Two Subtractions and One Addition

The sum of rectangle `(r1, c1) ~ (r2, c2)` is computed using inclusion-exclusion over four "from origin to some corner" prefix sums:

```text
sum(r1, c1, r2, c2)
  =   pre[r2 + 1][c2 + 1]     /* 大矩形：到右下角 */
    - pre[r1][c2 + 1]         /* 减：上方多出来的 */
    - pre[r2 + 1][c1]         /* 减：左方多出来的 */
    + pre[r1][c1]             /* 加：左上被减了两次，补回来 */
```

**Positions of the four corners** (note each is a prefix-sum index after `±1`):

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

**Mnemonic: bottom-right `+1`, top-left no addition; what was subtracted twice gets added back once.** That is, at `r2` and `c2` take `+1`, at `r1` and `c1` keep as-is, and the signs from left to right are `+ − − +`.

### Three-Part Template

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

### Complexity

| Dimension | Analysis |
|------|------|
| Construction | **O(m·n)** — constant number of operations per cell |
| Single query | **O(1)** — four lookups, three additions/subtractions |
| Space | **O(m·n)** — one extra row and column |

### Common Pitfalls

1. **Mixing up the four corners.** When stuck, don't memorize the formula—go back to the inclusion-exclusion diagram above: the big rectangle minus the top strip, minus the left strip; the top-left block was subtracted twice so add it back. **Sign order `+ − − +`**, only `r2` and `c2` carry `+1`.
2. **Row 0 / column 0 of `pre` not set to 0.** In C, `malloc` does not zero-initialize—you must use `calloc` (or memset) to explicitly zero the extra ring, otherwise you read garbage values when hugging the top/left boundary.
3. **`matrix[i-1][j-1]` written as `matrix[i][j]`.** The table-building loop starts from 1, and the index of `pre` is 1 larger than that of `matrix`, so when accessing the original matrix element you must **subtract it back**.
4. **Empty rows or columns.** The matrix has at least 1 row and 1 column (guaranteed by the problem constraints), so the C version can safely take `matrixColSize[0]` directly; but if you wrap it in a general-purpose function yourself, empty matrices need a separate guard.

---
## 4. Two Templates Side by Side

| | One-dimensional (immutable array) | Two-dimensional (immutable matrix) |
|---|---|---|
| `pre` Size | `n + 1` | `(m + 1) × (n + 1)` |
| Semantics of `pre` | Sum of the first `i` elements | Rectangular sum of the first `i` rows and first `j` columns |
| Table-building recurrence | `pre[i] = pre[i-1] + nums[i-1]` | `pre[i][j] = pre[i-1][j] + pre[i][j-1] − pre[i-1][j-1] + M[i-1][j-1]` |
| Number of inclusion-exclusion terms | 2 terms (two ends) | 4 terms (four corners) |
| Query formula | `pre[r+1] − pre[l]` | `pre[r2+1][c2+1] − pre[r1][c2+1] − pre[r2+1][c1] + pre[r1][c1]` |
| Sign pattern | `−` | `+ − − +` |
| Build / Query / Space | O(n) / O(1) / O(n) | O(m·n) / O(1) / O(m·n) |

In one sentence: **One dimension is "allocate one extra slot," two dimensions is "allocate one extra ring"; the number of terms goes from 2 to 4 because a rectangle's boundary has one more dimension than a line segment.** Once you understand two-dimensional inclusion-exclusion, three and four dimensions are just exponential growth in the number of terms—but they're almost never used in engineering, and understanding up to this level is enough.

---

## 5. Limitations of Prefix Sums

The previous two sections went smoothly because the problem wrote its most demanding condition right in the title: **Immutable**. This section lays out the hidden premise: **prefix sums are not a universal accelerator—they are a static technique that trades preprocessing for queries, and once the premise breaks, they stop working.**

### Limitation 1: No support for dynamic modification

Prefix sums are a **compute-once, read-only** structure. If even a single element `nums[i]` in the original array changes, every `pre[i]` from `i` onward is invalidated, and **rebuilding is O(n)**.

```text
nums: [ 1, 2, 3, 4, 5 ]        把 nums[0] 改成 100
pre:  [ 0, 1, 3, 6, 10, 15 ]   →  pre[1..5] 全部要重算，O(n)
```

Therefore:

| Requirement | Prefix sums | Should switch to |
|---|---|---|
| **Query only, no modification** | ✅ Optimal | —— |
| **Batch range modifications, then a single final query** | ❌ | [Difference array](/technology/difference-array/), modification O(1), final O(n) to restore |
| **Point modification + range query, alternating** | ❌ O(n) | **Binary Indexed Tree (BIT) / Segment tree**, both O(log n) |

This is why the problem repeatedly emphasizes "Immutable"—**once it's mutable, prefix sums are no longer the right answer**. Binary Indexed Trees and segment trees are essentially upgraded versions that "let prefix sums be incrementally updated too," but that's another topic.

### Limitation 2: Only works for operations with an inverse

The one-dimensional range-sum formula `pre[r+1] - pre[l]` is essentially **using subtraction to remove the part outside the range**. So prefix sums only work for **operations that have an inverse element**:

| Operation | Has inverse? | Can range queries use prefix sums? | Notes |
|---|---|---|---|
| Addition `+` | ✅ Subtraction | **Yes** | Range sum `= pre[r+1] - pre[l]` |
| XOR `^` | ✅ XOR is its own inverse | **Yes** | Range XOR `= pre[r+1] ^ pre[l]` |
| Multiplication under a modulus | ✅ Modular inverse | Yes (when modulus is prime) | Requires computing inverses, and **breaks down on 0** |
| `min` / `max` | ❌ | **No** | Prefix minimum and range minimum have no subtraction relationship |
| `gcd` / `lcm` | ❌ | **No** | Same reasoning—can't "divide out" the part outside the range |
| Ordinary multiplication | ❌ | **No** | Once there's a 0 in the array there's no inverse; even without one, watch out for precision |

```text
区间最小值 ≠ prefixMin[r+1] - prefixMin[l]     ← 完全错误，前缀 min 减不出来
```

When you need **range min / max / gcd**, the weapons to switch to are:

| Requirement | Structure | Per-query cost |
|---|---|---|
| Static range min/max | **Sparse Table (ST table)** | O(1) query, O(n log n) preprocessing |
| Dynamic range min/max | **Segment tree** | O(log n) |
| **Sliding window** min/max | **Monotonic queue** | O(1) amortized |

> **One-line criterion: only when you can write a "subtract/cancel" relationship like `区间结果 = f(前缀, 前缀)` is it prefix sums' turn.**

### Limitation 3: Accumulation overflows and loses precision

Prefix sums are **accumulated quantities**, much larger in magnitude than the original array, so the overflow risk is on a different scale entirely.

- **Integer overflow**: summing `10^5` numbers on the order of `10^9` can reach `10^14`—**32-bit `int` blows up long before that**. When building prefix sums you **must use `long long` (C / C++) / `BigInt` (JS)**, even if the problem's original array is `int`.
- **Floating-point error**: `pre[r+1] - pre[l]` is the subtraction of two large numbers, and **subtracting large numbers causes loss of significant digits**. If the array elements are floating-point, subtracting long prefixes can yield noticeably biased results, and precision-sensitive scenarios need a different approach.
- **Two dimensions amplify faster**: in the immutable matrix, each cell of `pre` is a rectangular sum, totaling the sum of `m·n` elements—**the overflow threshold is even lower than in one dimension**, so wide types are even more essential.

```cpp
// ❌ 原数组是 int，但前缀和一定是 long long
vector<int> pre(n + 1, 0);
pre[i + 1] = pre[i] + nums[i];          // 10^9 量级累加几万次就溢出

// ✅
vector<long long> pre(n + 1, 0);
pre[i + 1] = pre[i] + nums[i];
```

### Limitation 4: Loses the internal structure of the range

Prefix sums only remember "the cumulative value up to some point," trading for O(1) queries at the cost of **being unable to see the distribution inside the range**. Two classes of problems are therefore out of reach:

- **Those needing internal extrema**: range maximum, longest consecutive subsegment... the answers to internal-information questions can't be derived from "the difference of two prefixes" (see Limitation 2).
- **Those relying on monotonicity**: prefix sums are monotonic **only when all elements are non-negative**. Once there are negative numbers in the array, `pre` is no longer monotonic, and tricks like "binary search on prefix sums to find the answer" fail on the spot—for example, **subarrays summing to K**: when elements include negatives, you can't rely on two pointers / binary search, and must honestly use a **hash map + prefix sums** to count occurrences (see the [Principles article](/technology/prefix-sum/) for details).

```text
nums = [1, -1, 1, -1]     pre = [0, 1, 0, 1, 0]   ← 上下反复，不单调
nums = [1,  2, 3,  4]     pre = [0, 1, 3, 6, 10]  ← 单调递增
```

### Limitations summary

| What prefix sums can answer | What prefix sums can't, and what to switch to |
|---|---|
| Any range sum of a static array/matrix | Elements mutable → Binary Indexed Tree / Segment tree |
| Static range XOR, modular multiplication | Range min / max / gcd → Sparse table / Segment tree / Monotonic queue |
| All non-negative + sum-finding / binary-search-type problems | Contains negatives + binary search → Hash map prefix-sum counting |
| —— | Values too large → Wide types / BigInt; floating-point → switch approach |

**Remember prefix sums' positioning: it's a specialized accelerator for "static, invertible range aggregation," not a general-purpose data structure.** Before using it, ask three questions—**Will the data change? Is the operation invertible? Will the values overflow?** Only when all three pass should you bring out prefix sums.

---

## Related Articles

- [Prefix Sums: Bringing Range Sum from O(n) down to O(1)](/technology/prefix-sum/) — Principles, subarrays summing to K, prefix products, and other variants
- [Difference Arrays: Bringing Range Modification from O(n) down to O(1)](/technology/difference-array/) — The inverse operation of prefix sums, a sharp tool for batch range modifications
- [Two-Dimensional Arrays: From Matrix Traversal to In-Place Transformation](/technology/two-d-array/) — Matrix invariants, in-place rotation, and two-dimensional index derivation
- [Binary Search Framework: One Template for Element Search and Left/Right Boundaries](/technology/binary-search-template/) — Also in the spirit of "one template converging a class of problems"