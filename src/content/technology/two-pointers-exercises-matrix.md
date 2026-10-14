---
title: 'Classic Two-Pointer Array Problems (Part 2): Matrices and Strings'
published: 2026-09-29
description: 'A detailed walkthrough of the last four problems in LeetCode''s "Array and Two Pointers" introductory plan: sorting a matrix diagonally, shifting a 2D grid, transposing a matrix, and finding the longest common prefix. Covers techniques such as identifying diagonals with i - j, flattening with index mapping, triple reversal, and vertical scanning, with implementations in C, C++, and JavaScript.'
image: ''
tags: [Two Pointers, 2D Arrays, Matrix, String, LeetCode, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Introduction

The five problems in [the previous post](/technology/two-pointers-exercises-1d/) all revolved around one-dimensional arrays and strings. This post moves the battlefield to two-dimensional matrices, plus one classic string problem.

Look closely and you'll notice that the two pointers in matrix problems often **aren't two indices moving—it's one index moving along a "diagonal"**—folding the 2D coordinate `(i, j)` into some kind of 1D ordinal, and the two-pointer intuition immediately comes back. This is exactly the throughline of this post:

| Problem | How 2D is folded into 1D | Pointer/index technique |
|------|---------------------|--------------|
| Sort Matrix Diagonally | `i - j` (same value = same diagonal) | Start from each diagonal's starting point, walk along the diagonal |
| 2D Grid Migration | `i * n + j` (row-major flattening) | After flattening, cyclically shift the whole thing by k positions |
| Transpose Matrix | `res[j][i] = mat[i][j]` (swap rows and columns) | For a square matrix, do it in place, visiting only half the coordinates |
| Longest Common Prefix | The `j`-th character of a string | Column pointer scans vertically, row pointer compares horizontally |

> **About the code**
> All four problems likewise come with implementations in C / C++ / JavaScript.
> To focus on the core logic, the C versions are given as "core functions that take in `m`, `n`," omitting the management of return parameters like `returnSize`, `returnColumnSizes` in LeetCode's official signatures.

---
## 1. Sort the Matrix Diagonally (LeetCode 1329)

### Problem Description

Given an `m × n` integer matrix `mat`, sort the elements on each **diagonal** in ascending order and return the sorted matrix.

The diagonal here refers to the line going **from top-left to bottom-right**, i.e., all cells whose coordinates satisfy `i - j` being the same constant.

**Example:**

```text
Input: mat = [[3,3,1,1],
             [2,2,1,2],
             [1,1,1,2]]
Output:     [[1,1,1,1],
             [1,2,2,2],
             [1,2,3,3]]

Input: mat = [[1,1,1,1],
             [1,1,1,1],
             [1,1,1,1],
             [1,1,1,1]]
Output:     [[1,1,1,1],
             [1,1,1,1],
             [1,1,1,1],
             [1,1,1,1]]
```

**Constraints:** `m == mat.length`, `n == mat[i].length`, `1 <= m, n <= 100`, `1 <= mat[i][j] <= 100`.

### Approach: First Find the "Starting Point" of Each Diagonal

The key observation is just one sentence:

> On the same top-left → bottom-right diagonal, all cells have equal `i - j`; conversely, equal `i - j` means they are on the same diagonal.

For an `3 × 4` matrix, the distribution of `i - j` looks like this:

```text
        j=0  j=1  j=2  j=3
i=0      0   -1   -2   -3
i=1      1    0   -1   -2
i=2      2    1    0   -1
```

To traverse each diagonal **exactly once**, there is no need to enumerate every value of `i - j`; it suffices to enumerate the **starting point** of each diagonal:

- Every cell in the first column `(i, 0)` (`i = 0..m-1`) is the starting point of a diagonal;
- Every cell in the first row except `(0, 0)`, i.e., `(0, j)` (`j = 1..n-1`), is also the starting point of a diagonal.

There are `m + n - 1` diagonals in total. Starting from the starting point and moving `(i, j) → (i+1, j+1)` each time until going out of bounds, you will traverse exactly that line.

So the algorithm is very straightforward: **read out all the numbers on this diagonal → sort → write them back in their original order**.

### Process Illustration

Taking Example 1 as an example, label the `i - j` of each cell:

```text
mat = [[3, 3, 1, 1],        i-j = [[ 0, -1, -2, -3],
       [2, 2, 1, 2],                [ 1,  0, -1, -2],
       [1, 1, 1, 2]]                [ 2,  1,  0, -1]]

Group by i-j:
  0: (0,0)=3, (1,1)=2, (2,2)=1   → sort [1,2,3]
 -1: (0,1)=3, (1,2)=1, (2,3)=2   → sort [1,2,3]
 -2: (0,2)=1, (1,3)=2            → sort [1,2]
 -3: (0,3)=1                     → sort [1]
  1: (1,0)=2, (2,1)=1            → sort [1,2]
  2: (2,0)=1                     → sort [1]

After writing back:
[[1, 1, 1, 1],
 [1, 2, 2, 2],
 [1, 2, 3, 3]]  ✔
```

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>

static int cmpInt(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);          /* Subtraction may overflow, so this is safer */
}

/* Sort the diagonal starting at (r, c) and extending down-right */
static void sortDiagonal(int **mat, int m, int n, int r, int c) {
    int len = 0;
    while (r + len < m && c + len < n) len++;      /* Length of this diagonal */

    int *buf = (int *)malloc(sizeof(int) * len);
    for (int k = 0; k < len; k++) buf[k] = mat[r + k][c + k];

    qsort(buf, len, sizeof(int), cmpInt);

    for (int k = 0; k < len; k++) mat[r + k][c + k] = buf[k];

    free(buf);
}

void diagonalSort(int **mat, int m, int n) {
    for (int i = 0; i < m; i++) sortDiagonal(mat, m, n, i, 0);  /* Starting from the first column */
    for (int j = 1; j < n; j++) sortDiagonal(mat, m, n, 0, j);  /* Starting from the first row */
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

        for (int i = 0; i < m; ++i) sortDiagonal(mat, i, 0);  // Starting from the first column
        for (int j = 1; j < n; ++j) sortDiagonal(mat, 0, j);  // Starting from the first row (skip (0,0))

        return mat;
    }

private:
    // Read out the diagonal at (r, c) -> sort -> write back
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

  // Read out the diagonal at (r, c) -> sort -> write back
  const sortDiagonal = (r, c) => {
    const diag = [];
    for (let i = r, j = c; i < m && j < n; i++, j++) diag.push(mat[i][j]);
    diag.sort((a, b) => a - b);
    let k = 0;
    for (let i = r, j = c; i < m && j < n; i++, j++) mat[i][j] = diag[k++];
  };

  for (let i = 0; i < m; i++) sortDiagonal(i, 0);   // Starting from the first column
  for (let j = 1; j < n; j++) sortDiagonal(0, j);   // Starting from the first row (skip (0,0))

  return mat;
}
```
:::

### Complexity

Let `L = min(m, n)`:

| Dimension | Analysis |
|------|------|
| Time complexity | **O(m·n·log L)** — sorting each diagonal takes O(len · log len), and the sum of all diagonal lengths is m·n |
| Space complexity | **O(L)** — a diagonal has at most L elements, used as the sorting buffer |

### Common Pitfalls

1. **Selection of starting points.** The first column must include `(0, 0)`, and the first row must not include `(0, 0)`; otherwise the main diagonal will be sorted twice (although sorting twice does not change the result, it is a wasted pass).
2. **Direction of `(i, j)` advancement.** The diagonals in this problem go from top-left to bottom-right, so it is `i++, j++`; if written as `i++, j--`, it becomes an anti-diagonal.
3. **Diagonal lengths are inconsistent for non-square matrices.** When `m ≠ n`, lengths range from 1 to `min(m, n)`, so the buffer must be allocated according to the actual length and cannot be fixed at `m` or `n`.
4. **Don't forget that `i - j` can be negative.** If you switch to the approach of "grouping by `i - j`", in C you cannot directly use a negative index as an array subscript.

### Extension: In-Place Approach Without Extra Buffer

A diagonal itself is stored contiguously in the matrix (just diagonally), so you can directly perform insertion sort on the diagonal, reducing the buffer to O(1):

```cpp
// Insertion sort along the diagonal: insert each element forward into the sorted prefix of that diagonal
void sortDiagonalInPlace(vector<vector<int>>& mat, int r, int c) {
    int m = (int)mat.size(), n = (int)mat[0].size();

    for (int i = r + 1, j = c + 1; i < m && j < n; ++i, ++j) {
        int x = mat[i][j];
        int p = i - 1, q = j - 1;
        while (p >= r && q >= c && mat[p][q] > x) {   // Shift everything greater than x back by one
            mat[p + 1][q + 1] = mat[p][q];
            --p;
            --q;
        }
        mat[p + 1][q + 1] = x;
    }
}
```

The worst-case time complexity (when the whole matrix has a very long diagonal in reverse order) is O(m·n·min(m, n)), but the extra space is O(1), and it is very fast on nearly sorted input.

---
## 2. 2D Grid Migration (LeetCode 1260)

### Problem Description

You are given a 2D grid `grid` with `m` rows and `n` columns, and an integer `k`. You need to migrate `grid` `k` times. Each "migration" operation:

- The element at `grid[i][j]` will move to `grid[i][j + 1]`;
- The element at `grid[i][n - 1]` will move to `grid[i + 1][0]`;
- The element at `grid[m - 1][n - 1]` will move to `grid[0][0]`.

Return the final 2D grid obtained after `k` migration operations.

**Example:**

```text
Input: grid = [[1,2,3],
              [4,5,6],
              [7,8,9]], k = 1
Output:     [[9,1,2],
              [3,4,5],
              [6,7,8]]

Input: grid = [[3,8,1,9],
              [19,7,2,5],
              [4,6,11,10],
              [12,0,21,13]], k = 4
Output:     [[12,0,21,13],
              [3,8,1,9],
              [19,7,2,5],
              [4,6,11,10]]
         (Each element moves exactly one full row, equivalent to shifting the whole thing down by one row)

Input: grid = [[1,2,3],[4,5,6],[7,8,9]], k = 9
Output: [[1,2,3],[4,5,6],[7,8,9]]   (9 times wraps exactly back to the original)
```

**Constraints:** `1 <= m, n <= 50`, `-1000 <= grid[i][j] <= 1000`, `0 <= k <= 100`.

### Approach 1: Flatten Then Cyclically Shift as a Whole

The "snake-like wrap-around" rule of the matrix sounds convoluted, but once you flatten the 2D grid into a 1D array using **row-major order** by index `p = i * n + j`, everything becomes simple:

```text
grid = [[1,2,3],        flatten →  [1,2,3,4,5,6,7,8,9]
        [4,5,6],
        [7,8,9]]
```

The three movement rules, from the 1D perspective, are actually the same thing: **each element moves one position forward, and the last one wraps back to the beginning**. So migrating `k` times = cyclically shifting the flattened array **right by k positions** as a whole. Thus, the element originally at position `p` will have its new position at:

```text
q = (p + k) mod (m * n)
```

Then convert back to row and column indices using `q / n` and `q % n` and write them back.

Note that `k` can first be taken modulo `m * n`: after `m * n` migrations, all elements return to their original positions.

### Process Illustration

```text
grid = [[1,2,3],[4,5,6],[7,8,9]]   k = 1

Flatten: index  0  1  2  3  4  5  6  7  8
       value    1  2  3  4  5  6  7  8  9

Each element q = (p + 1) % 9:
  1(0) → 1    2(1) → 2    3(2) → 3
  4(3) → 4    5(4) → 5    6(5) → 6
  7(6) → 7    8(7) → 8    9(8) → 0   ← 9 wraps back to the beginning

The new 1D array: 9  1  2  3  4  5  6  7  8
Split into groups of 3 per row:
[[9,1,2],
 [3,4,5],
 [6,7,8]]  ✔
```

### Approach 2: Triple Reversal (In-Place, O(1) Extra Space)

"Cyclically shifting right by k positions" has a classic two-pointer solution: **triple reversal**. Let the array length be `total`:

1. Reverse the entire array `[0, total-1]`;
2. Reverse the first `k` elements `[0, k-1]`;
3. Reverse the remaining `[k, total-1]`.

Each reversal uses left and right pointers converging toward the middle and swapping. Verify with `[1..9]、k = 3`:

```text
Original     1 2 3 4 5 6 7 8 9
Reverse all 9 8 7 6 5 4 3 2 1
Reverse first 3  7 8 9 6 5 4 3 2 1
Reverse the rest 7 8 9 1 2 3 4 5 6   ✔ exactly a right rotation by 3
```

As long as you're willing to treat the 2D matrix as a 1D array at the index level (`p ↔ (p / n, p % n)`), this algorithm can be applied in-place, reducing extra space to O(1).

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>

int **shiftGrid(int **grid, int m, int n, int k) {
    int total = m * n;
    k %= total;                                    /* Shifting total times is a no-op */

    int **res = (int **)malloc(sizeof(int *) * m);
    for (int i = 0; i < m; i++) res[i] = (int *)malloc(sizeof(int) * n);

    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            int p = i * n + j;                     /* Flattened index */
            int q = (p + k) % total;               /* Index after k shifts */
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
        k %= total;                                // Shifting total times is a no-op

        vector<vector<int>> res(m, vector<int>(n));
        for (int i = 0; i < m; ++i) {
            for (int j = 0; j < n; ++j) {
                int q = (i * n + j + k) % total;   // Shift forward k positions after flattening
                res[q / n][q % n] = grid[i][j];
            }
        }
        return res;
    }

    // Approach 2: three reversals, done in place
    vector<vector<int>> shiftGridReverse(vector<vector<int>> grid, int k) {
        int m = (int)grid.size(), n = (int)grid[0].size(), total = m * n;
        k %= total;

        // Treat the 2D matrix as a row-major 1D array, reverse [lo, hi]
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
  k %= total;                                  // Shifting total times is a no-op

  const res = Array.from({ length: m }, () => new Array(n));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const q = (i * n + j + k) % total;       // Shift forward k positions after flattening
      res[Math.floor(q / n)][q % n] = grid[i][j];
    }
  }
  return res;
}
```
:::

### Complexity

| Solution | Time Complexity | Space Complexity | Notes |
|------|-----------|-----------|------|
| Index Mapping | O(m·n) | O(m·n) | Compute new position for each element, most intuitive |
| Triple Reversal | O(m·n) | **O(1)** | Done in-place, at the cost of slightly trickier index conversion |

### Common Pitfalls

1. **Take modulo before computing.** `k` may be much larger than `m * n` (in this problem `k <= 100` is small, but a general solution needs `k %= total`). Conversely, **forgetting the case of `k = 0`** is also a common oversight—in that case, empty intervals like `rev(0, -1)` must be safely skipped (`while (lo < hi)` naturally satisfies this).
2. **Don't get the migration direction wrong.** The problem states each element moves **right/forward** (`(p + k) % total`); if you write `(p - k + total) % total`, it becomes a leftward migration.
3. **Row-major flattening.** Use `p = i * n + j` (traverse a full row horizontally first); if you use column-major flattening, the wrap-around order won't match the problem description.
4. **Think clearly about the relationship between `k` and `total` before starting.** Examples 3's `k = 9` and `total = 9` are reminders about taking modulo.

---
## 3. Transpose Matrix (LeetCode 867)

### Problem Description

Given a 2D integer array `matrix`, return the **transpose** of `matrix`.

The transpose of a matrix is obtained by flipping the matrix over its main diagonal, swapping the row index and column index of the matrix.

**Example:**

```text
Input: matrix = [[1,2,3],
                [4,5,6],
                [7,8,9]]
Output:        [[1,4,7],
                [2,5,8],
                [3,6,9]]

Input: matrix = [[1,2,3],
                [4,5,6]]
Output:        [[1,4],
                [2,5],
                [3,6]]
```

**Constraints:** `m == matrix.length`, `n == matrix[i].length`, `1 <= m, n <= 1000`, `1 <= m * n <= 10^5`, `-10^9 <= matrix[i][j] <= 10^9`.

### Approach: Swap Coordinates Once

The definition of transpose is exactly "swap the row index and column index," so just map directly:

```text
res[j][i] = matrix[i][j]
```

The original matrix is `m × n`, and after transposing it becomes `n × m`: the original `i`-th row becomes the `i`-th column.

**In-place transposition is possible if and only if the matrix is square**—because in that case the input and output shapes are the same. The key to the in-place approach is to **cut the traversal range in half**: only process the upper triangle `i < j`, swapping `mat[i][j]` with `mat[j][i]`; the diagonal elements `i == j` don't need to move.

Why must we cut it in half? The table below illustrates the problem: if both `i` and `j` run over the entire matrix, each symmetric pair gets swapped **twice**, which amounts to no swap at all.

```text
Only traverse the upper triangle (i < j)             i and j both run through the full range
  (0,1) (0,2)                    each (i,j) is visited once
  (1,2)                          (0,1) swapped once → (1,0) swapped again → restored

Number of visits:   3 pairs                 Number of visits: 9 cells, actually 4 pairs swapped (duplicates)
```

### Process Walkthrough

Non-square `2 × 3 → 3 × 2`:

```text
matrix          res[j][i] = matrix[i][j]
[1, 2, 3]       res[0][0]=1  res[1][0]=2  res[2][0]=3
[4, 5, 6]       res[0][1]=4  res[1][1]=5  res[2][1]=6

res = [[1, 4],
       [2, 5],
       [3, 6]]  ✔
```

In-place transpose of a square matrix:

```text
[1, 2, 3]                [1, 4, 7]
[4, 5, 6]   ──upper triangle swap──► [2, 5, 8]
[7, 8, 9]                [3, 6, 9]

3 pairs swapped: (0,1)↔(1,0), (0,2)↔(2,0), (1,2)↔(2,1)
Diagonal (0,0), (1,1), (2,2) stay unchanged ✔
```

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>

/* Non-square: the result is a new n×m matrix */
int **transpose(int **mat, int m, int n) {
    int **res = (int **)malloc(sizeof(int *) * n);
    for (int j = 0; j < n; j++) res[j] = (int *)malloc(sizeof(int) * m);

    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++)
            res[j][i] = mat[i][j];

    return res;
}

/* A square matrix can be transposed in place: only process the upper triangle (i < j), the diagonal stays put */
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

    // A square matrix can be transposed in place: only process the upper triangle
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

// A square matrix can be transposed in place: only process the upper triangle
function transposeInPlace(matrix) {
  const m = matrix.length;
  for (let i = 0; i < m; i++)
    for (let j = i + 1; j < m; j++) {
      [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
    }
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time complexity | **O(m·n)** — each element is visited once |
| Space complexity | **O(m·n)** — a non-square matrix requires a new array (the output shape is different) |
| Square in-place version | O(1) extra space, only m(m-1)/2 swaps needed |

### Common Pitfalls

1. **A non-square matrix cannot be transposed in place.** `2 × 3` becomes `3 × 2`, the shape changes, so a new array must be allocated. Only a square matrix can be "in-place."
2. **For in-place transposition, `j` must start from `i + 1`.** Starting from 0 causes each element to be swapped twice, and the final result ends up identical to the original matrix—this is a classic bug that "looks correct but silently fails at runtime."
3. **Don't swap the two indices.** The result matrix is `n × m` (the number of rows is the original number of columns), so allocate the correct shape first before filling it in.

---
## 4. Longest Common Prefix (LeetCode 14)

### Problem Description

Write a function to find the longest common prefix among an array of strings. If there is no common prefix, return the empty string `""`.

**Example:**

```text
Input: strs = ["flower","flow","flight"]
Output: "fl"

Input: strs = ["dog","racecar","car"]
Output: ""
Explanation: There is no common prefix in the input.

Input: strs = ["a"]
Output: "a"
```

**Constraints:** `1 <= strs.length <= 200`, `0 <= strs[i].length <= 200`, `strs[i]` consist only of lowercase English letters.

### Approach: Vertical Scanning, Two "Pointers"

The pointers in previous sections were all numeric indices, but the pointers in this problem are one **column** and one **row**:

- **Column pointer `j`**: advances along the reference string `strs[0]` from character 0 to the right;
- **Row pointer `i`**: for each `j`, scans horizontally across `strs[1]`, `strs[2]`, … comparing the `j`-th character one by one.

The rules are:

1. The common prefix cannot be longer than `strs[0]`, so `j` only advances within the range of `strs[0]`;
2. For the current `j`, if the `j`-th character of some string differs from `strs[0][j]`, or that string has already ended (length less than `j + 1`), then the common prefix ends here—the answer is the first `j` characters of `strs[0]`;
3. If all strings successfully make it through `strs[0]`, then `strs[0]` itself is the common prefix.

> Why can "different" and "ended" be checked together? Because in C, accessing the `len`-th position of a string yields exactly the terminator `'\0'`, and `strs[i][j] == '\0'` is obviously not equal to `strs[0][j]`. C++ / JavaScript, however, require an explicit length comparison.

### Process Illustration

```text
strs = ["flower", "flow", "flight"]
                  ↑ baseline string

j=0: strs[1][0]='f'='f'  strs[2][0]='f'='f'  → all pass
j=1: strs[1][1]='l'='l'  strs[2][1]='l'='l'  → all pass
j=2: strs[1][2]='o'='o'  strs[2][2]='i'!='o' → conflict!

return the first 2 characters of strs[0] = "fl" ✔
```

Counter-example `["dog","racecar","car"]`: when `j=0`, `'a' != 'd'`, immediately return `""` ✔

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>
#include <string.h>

char *longestCommonPrefix(char **strs, int strsSize) {
    int len = (int)strlen(strs[0]);        /* The common prefix cannot be longer than the base string */

    for (int j = 0; j < len; j++) {        /* j: column pointer advancing along the base string */
        char c = strs[0][j];
        for (int i = 1; i < strsSize; i++) {   /* i: comparing the remaining strings horizontally */
            /* This string has already ended here (read '\0'), or the characters are not equal */
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
        const string& base = strs[0];                   // Base string

        for (int j = 0; j < (int)base.size(); ++j) {     // j: column pointer
            char c = base[j];
            for (int i = 1; i < (int)strs.size(); ++i) { // i: row pointer
                // This string has already ended, or the j-th character is not equal
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
  const base = strs[0];                    // Base string

  for (let j = 0; j < base.length; j++) {         // j: column pointer
    const c = base[j];
    for (let i = 1; i < strs.length; i++) {       // i: row pointer
      // This string has already ended, or the j-th character is not equal
      if (j >= strs[i].length || strs[i][j] !== c) {
        return base.slice(0, j);
      }
    }
  }
  return base;
}
```
:::

### Complexity

Let `S` be the total number of characters across all strings, and `L` be the length of the shortest string:

| Dimension | Analysis |
|------|------|
| Time Complexity | **O(S)** worst case (all strings compared up to the last character); a more precise upper bound is O(n · L) |
| Space Complexity | **O(1)** — only two indices are used (the returned string is not counted) |

### Common Pitfalls

1. **Choose the right reference string.** Choosing `strs[0]` is most convenient, because the answer must be a prefix of it. If you arbitrarily pick a string as the reference, the length upper bound becomes hard to control.
2. **Handling empty strings.** If there is any `""` in `strs`, the answer is immediately `""`—in the code above, it will be caught by `strs[i][j] == '\0'` or the length check during the `j = 0` round.
3. **Out-of-bounds access no longer occurs in C because of the comparison order.** When comparing incrementally with `j` increasing one by one, the "shorter string" will always be stopped at its own terminator first, so it will not skip past the terminator and read beyond the buffer. This is the implicit precondition that allows this kind of vertical scanning to be safely implemented in C.
4. **`strs[i]` all empty, or `strs` having only one element** are both valid inputs; the former returns `""`, the latter returns `strs[0]` itself.

### Other Solutions

**Divide and conquer**: Split the string array in two, find the common prefix of the left and right halves respectively, then find the common prefix of these two prefixes. Time O(S), space O(m·L) for the recursion stack. Good for demonstrating the divide-and-conquer template, but offers no performance advantage for this problem.

**Sort then compare only first and last**: Sort `strs`; the common prefix must equal the common prefix of the "lexicographically smallest string" and the "lexicographically largest string." Sorting is O(n log n · L), but the pairwise comparison implementation is especially short:

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

Although this approach is not two pointers, the idea of "comparing only the first and last" is well worth remembering.

---

## Summary

| Problem | Bridge from 2D → 1D | Time | Space |
|------|-----------------|------|------|
| Sort Matrix by Diagonals | Same `i - j` means same diagonal | O(m·n·log min(m,n)) | O(min(m,n)) |
| 2D Grid Migration | `p = i * n + j` row-major flattening | O(m·n) | O(m·n) / three reversals O(1) |
| Transpose Matrix | `res[j][i] = mat[i][j]` | O(m·n) | O(m·n), O(1) for square matrices |
| Longest Common Prefix | The `j`-th character of a string viewed as a "column" | O(S) | O(1) |

Three recurring patterns when working with matrices:

1. **Find an invariant to identify a group of cells.** `i - j` identifies diagonals, `i * n + j` identifies flattened positions—once you find a "1D number" on the 2D coordinates, the problem usually becomes a 1D problem.
2. **First ask "has the shape changed."** Only when the output shape matches the input (square matrix transpose) is in-place possible; if the shape changes (non-square transpose, diagonal sorting), you must allocate a new array or accept an extra buffer.
3. **In-place operations only go halfway.** Symmetric operations (transpose, pairwise comparison) only process half the coordinates, otherwise the result gets reverted—in the transpose problem, `j` starting from `i + 1` is exactly this principle.
## Related Articles

- [Classic Array Two-Pointer Exercises (Part 1): One-Dimensional Arrays and Strings](/technology/two-pointers-exercises-1d/) — Previous article, fast and slow pointers, left and right pointers, and the Dutch national flag
- [Sliding Window Core Code Template: Three Questions to Master All Substring and Subarray Problems](/technology/sliding-window-template/) — A special case where both pointers only move right, one skeleton covering four real problems
- [Two-Dimensional Arrays: Matrix Operations and TypeScript in Practice](/technology/two-d-array/) — Matrix traversal, direction arrays, and 2D prefix sums
- [Array Two-Pointers: The Optimization Tool from O(n²) to O(n)](/technology/two-pointers-array/) — The overall framework of four pointer patterns
- [Finding the Duplicate Number: Binary Search and Fast-Slow Pointers](/technology/find-duplicate-number/) — An advanced problem also belonging to "array + two pointers"