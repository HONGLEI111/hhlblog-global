---
title: 'Difference Arrays in Practice: One Template for Range Addition, Flight Bookings, and Car Pooling, Plus Four Extensions'
published: 2026-10-13
description: 'LeetCode 370 Range Addition, 1109 Corporate Flight Bookings, and 1094 Car Pooling all reduce to the same "mark both endpoints + prefix-sum restore" template: how to write it with an extra slot, how to convert 1-indexed input, and why the end is right-open, with implementations in C, C++, and JavaScript. The post then extends to 2D difference arrays, tree difference, sweep-line thinking, and structure selection.'
image: ''
tags: [Difference Array, LeetCode, Array, Range Update, 2D Difference Array, Tree Difference, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Why Write a Separate Article

[Difference Arrays: Reducing Range Updates from O(n) to O(1)](/technology/difference-array/) covered the **principles**: the definition of difference arrays, why `diff[left] += delta` / `diff[right+1] -= delta` hold, and the trade-offs between offline and online approaches.

This article addresses a different kind of question — **when you actually sit down at the screen, how do you write these three problems**:

- **370. Range Addition**
- **1109. Corporate Flight Bookings**
- **1094. Car Pooling**

What they share: **repeatedly applying "add the same value to an entire range" over a bunch of intervals, and finally needing a batch of results**. All three problems share one code skeleton; the differences lie only in **whether indices start at 0 or 1**, **whether the right endpoint is open or closed**, and **whether you restore everything at the end or check while restoring**. This article converges all three problems into a single template, then points out the "tiny differences" one by one, and finally spends a section on where difference arrays can extend — 2D difference arrays, tree difference, sweep line, and how they divide labor with Fenwick trees / segment trees.

> **About the Code**
>
> All three problems provide implementations in C / C++ / JavaScript. The logic is completely equivalent; switch tabs to view.
> All three templates uniformly use **an extra slot in the `diff`** (length `n + 1`): the extra last slot is dedicated to catching `right + 1`, eliminating the entire class of boundary bugs related to "out-of-bounds checks."

---

## 1. One Template: Mark Both Ends, Restore with Prefix Sum

### Definition of Difference Arrays

For an array `nums`, define the **difference array**:

```text
diff[0] = nums[0]
diff[i] = nums[i] - nums[i-1]        (i ≥ 1)
```

In other words, `diff[i]` records **the difference between two adjacent elements** — **the value itself doesn't matter; how much the value "changed" is what matters**.

Conversely, accumulating `diff` from the start (doing one prefix sum) restores `nums`:

```text
nums[i] = diff[0] + diff[1] + ... + diff[i]
```

`diff` and `nums` have an **inverse relationship between prefix sums and difference arrays**: `nums` is the prefix sum of `diff`, and `diff` is the difference array of `nums`. One handles "accumulation," the other handles "change."

### Why Range Addition Only Touches Two Endpoints

Adding `delta` to **every element** in the range `[left, right]` is equivalent to performing two point updates on `diff`:

```text
diff[left]     += delta        /* 从 left 开始，整体抬高 delta */
diff[right + 1] -= delta       /* 从 right+1 开始，把抬高撤销 */
```

The monotone-looking `diff` might be hard to grasp, but it becomes intuitive when drawn out. Taking `nums = [1, 2, 3, 4, 5]` and adding `2` to `[1, 3]` as an example:

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

The principle in one sentence: **a difference array records the "rate of change."** Adding a step at `left` raises all prefix sums from `left` onward; then subtracting the same step at `right+1` restores things after `right`. Between the two steps is exactly `[left, right]`.

### The Three-Stage Template

Difference array problems always have three stages, **regardless of which problem, the structure is fixed**:

```text
① 打点：对每个操作 [left, right, delta]：
            diff[left]     += delta
            diff[right+1]  -= delta
② 还原：running = 0
        for i in 0..n-1:  running += diff[i];  ans[i] = running
③ 判/取：需要全局判断的（如拼车是否超载），在 ② 里边扫边判
```

The reason `diff` has length **`n + 1`** is precisely for the `right + 1` in stage ① — when `right == n - 1`, it falls at index `n`, and the extra slot catches it exactly, **so you never need to write `if (right + 1 < n)`**. This slot doesn't participate in the accumulation in stage ②; it's purely a "trash bin."

### Complexity: Why It's Fast

| | Brute Force (element-by-element) | Difference Array |
|---|---|---|
| Single range addition | O(length) | **O(1)** |
| `m` range additions | O(n·m) | **O(m)** |
| Final restoration | O(1) | O(n) |
| Total | O(n·m) | **O(n + m)** |

A single range addition goes from "traversing the entire range" to "modifying two numbers," at the cost of **queries being deferred until a final restoration**. This is the pricing of difference arrays for speed: **it sells "batch modifications" and charges "deferred queries."**

---
## 2. Example 1: Range Addition (LeetCode 370)

### Problem Description

Given an all-zero array of length `length`, and several operations `updates[i] = [startIdx, endIdx, inc]`. Each operation means **adding `inc` to every element in the index range `[startIdx, endIdx]` (inclusive of both ends)**. Return the array after all operations have been executed.

**Example:**

```text
length = 5
updates = [[1, 3, 2], [2, 4, 3], [0, 2, -2]]

结果 = [-2, 0, 3, 5, 3]
```

**Constraints:** `0 <= length <= 10^5`, `0 <= updates.length <= 10^4`.

### Approach: Initially all zeros, so we can even skip building the table

In this problem the initial array is **all 0s**, so `diff` is also initially all 0s — **the first step of building the difference array is skipped entirely**. We just need to allocate an all-zero array of length `length + 1`, mark each operation as two points, and finally restore via prefix sums.

This is the cleanest kind of difference-array problem: **no initial values → no build phase → three segments become two.**

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>

int *getModifiedArray(int length, int **updates, int updatesSize,
                      int *updatesColSize, int *returnSize) {
    int *diff = (int *)calloc(length + 1, sizeof(int));   /* allocate one extra slot to cover end+1 */
    for (int i = 0; i < updatesSize; i++) {
        int start = updates[i][0], end = updates[i][1], inc = updates[i][2];
        diff[start]     += inc;         /* raise the left endpoint of the range */
        diff[end + 1]   -= inc;         /* undo after the right endpoint */
    }

    int *res = (int *)malloc(length * sizeof(int));
    int running = 0;
    for (int i = 0; i < length; i++) {
        running    += diff[i];          /* restore the prefix sum */
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
        vector<int> diff(length + 1, 0);          // allocate one extra slot to cover end + 1
        for (auto& u : updates) {
            diff[u[0]]     += u[2];               // raise the left endpoint of the range
            diff[u[1] + 1] -= u[2];               // undo after the right endpoint
        }

        vector<int> res(length);
        int running = 0;
        for (int i = 0; i < length; i++)
            res[i] = (running += diff[i]);        // restore the prefix sum
        return res;
    }
};
```

```js title="JavaScript"
function getModifiedArray(length, updates) {
  const diff = new Array(length + 1).fill(0); // allocate one extra slot to cover end + 1
  for (const [start, end, inc] of updates) {
    diff[start] += inc; // raise the left endpoint of the range
    diff[end + 1] -= inc; // undo after the right endpoint
  }

  const res = new Array(length).fill(0);
  let running = 0;
  for (let i = 0; i < length; i++) {
    running += diff[i]; // restore the prefix sum
    res[i] = running;
  }
  return res;
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time | **O(length + updates.length)** — marking points O(m), restoration O(n) |
| Space | **O(n)** — one `diff` plus one `res`; `res` is the output required by the problem |

### Common Pitfalls

1. **`diff` is only allocated `length`.** Then when `end == length - 1`, writing `diff[end + 1]` as `diff[length]` will go **out of bounds**. Allocating one extra slot is the easiest fix for this problem, cleaner than checking `end + 1 < length` every time.
2. **`diff[end + 1]` was written as `diff[end]`.** This shifts the "undo" one position earlier, causing the element at index `end` to **undo itself as well**, which is equivalent to only adding the value to `[start, end-1]` — the result is off by one at the boundary.
3. **Merging the "marking phase" and the "restoration phase".** Some people think "update the answer array immediately after each operation", but that degenerates into an O(n·m) brute force, wasting the difference array. **You must first mark all `m` operations as points, then restore all at once at the end.**

---
## 3. Example Two: Flight Booking Statistics (LeetCode 1109)

### Problem Description

There are `n` flights, numbered **from 1 to n**. Given booking records `bookings[i] = [first_i, last_i, seats_i]`, representing **`seats_i` seats booked from the `first_i`-th to the `last_i`-th flight (inclusive)**. Return an array `answer` of length `n`, where `answer[i]` is the **total number of seats booked on the `i + 1`-th flight**.

**Example:**

```text
bookings = [[1, 2, 10], [2, 3, 20], [2, 5, 25]], n = 5
结果 = [10, 55, 45, 25, 25]
```

**Constraints:** `1 <= n <= 2 · 10^4`, the numbering range of `bookings[i]` is `1 <= first <= last <= n`.

### Approach: This problem is just 370, only the coordinate system has changed

Compared to Example One, 1109 has **two "translations"** to make, both at the index level:

1. **1-indexed → 0-indexed**: The flight numbers in the problem are `1..n`, while array indices are `0..n-1`. The left endpoint `first` of the interval should be written as `diff[first - 1]`.
2. **The semantics of the right endpoint**: This is a **closed interval** `[first, last]`, but according to the difference array formula, the cancellation point should fall at `last + 1` (1-indexed). Converting to a 0-indexed array, `last + 1` happens to equal `last`—so **what's written in the code is `diff[last] -= seats`, which looks like forgetting `+1`, but it's actually correct**.

Let's verify point 2: `[1, 2, 10]` means flights 1 and 2 each get 10 added. Using `diff[0] += 10` and `diff[2] -= 10`, when reconstructing, `diff[0]` and `diff[1]` receive 10, and cancellation starts from `diff[2]`—hitting indices 0 and 1, **which are exactly flights 1 and 2**. ✓

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

Note that `last = 5` of the last booking equals `n`, and the cancellation point `diff[5]` falls exactly on **the extra slot** (the trash bin position)—it doesn't participate in the output, it only ensures that "no one after flight 5 gets anything." This also confirms why `diff` needs to be allocated with size `n + 1`.

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>

int *corpFlightBookings(int **bookings, int bookingsSize, int *bookingsColSize,
                        int n, int *returnSize) {
    int *diff = (int *)calloc(n + 1, sizeof(int));   /* allocate one extra slot to cover last */
    for (int i = 0; i < bookingsSize; i++) {
        int first = bookings[i][0], last = bookings[i][1], seats = bookings[i][2];
        diff[first - 1] += seats;    /* 1-indexed → 0-indexed */
        diff[last]      -= seats;    /* after +1 on the closed-interval right endpoint, it lands exactly on last, right-open */
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
        vector<int> diff(n + 1, 0);              // allocate one extra slot to cover last
        for (auto& b : bookings) {
            diff[b[0] - 1] += b[2];              // 1-indexed → 0-indexed
            diff[b[1]]     -= b[2];              // after +1 on the closed-interval right endpoint, it lands exactly on b[1]
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
  const diff = new Array(n + 1).fill(0); // allocate one extra slot to cover last
  for (const [first, last, seats] of bookings) {
    diff[first - 1] += seats; // 1-indexed → 0-indexed
    diff[last] -= seats; // after +1 on the closed-interval right endpoint, it lands exactly on last
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

### Complexity

| Dimension | Analysis |
|------|------|
| Time | **O(n + bookings.length)** |
| Space | **O(n)** |

### Common Pitfalls

1. **Forgetting the 1-indexed conversion.** The `first` and `last` in the problem are **flight numbers (starting from 1)**. Using them directly as array indices shifts the entire result right by one and drops one at the end. **The left endpoint must be written as `first - 1`.**
2. **Adding one to `last` on your own.** This is the most counterintuitive point in this problem: the "cancellation point" in the difference array formula is `right + 1`, but that's `last + 1` under 1-indexed; converting to a 0-indexed array, index `last + 1` subtracts 1 again, **and the net result is `diff[last]`**. So **in the code, `last` does not carry `+1`**. Mnemonic: **The input is already a 1-based "right-open position"—use it directly as a 0-based cancellation point.**
3. **Allocating only `n` slots for `diff`.** The maximum value of `last` is `n`, and `diff[n]` needs to exist—allocating one extra slot (`n + 1`) is safe; otherwise, if the last booking covers flight `n`, you'll write out of bounds.
4. **Writing the reconstruction range as `n + 1`.** The extra slot is a trash bin, **the output has only `n` numbers**, and the loop upper bound is `n`.

---
## 4. Example 3: Car Pooling (LeetCode 1094)

### Problem Description

A car has a **capacity of `capacity`** and can only drive in one direction. Given trips `trips[i] = [numPassengers_i, from_i, to_i]`, representing **picking up `numPassengers_i` people at stop `from_i` and dropping them off at stop `to_i`**. Determine whether this car can handle all trips **in one go** (i.e., **the number of people in the car never exceeds `capacity` at any moment**).

**Example:**

```text
trips = [[2,1,5], [3,3,7]], capacity = 4      → false
   // 站点 3 到 5 之间，车上同时有 2 + 3 = 5 人 > 4

trips = [[2,1,5], [3,3,7]], capacity = 5      → true
```

**Constraints:** `1 <= trips.length <= 1000`, `0 <= from_i < to_i <= 1000`.

### Approach: Range Addition, but What's Being "Added" Is the Number of People

Treat each trip `[from, to)` as an interval and add `numPassengers` people to it — **range addition again!** Except this time, what we want is not "the exact number of people at each stop," but rather "**whether the peak during the process exceeds capacity**."

So the second part of the template (restoration) needs to be changed to **accumulate and check simultaneously**: `running` is "the number of people in the car after each stop," and as soon as it exceeds `capacity`, immediately return `false`.

**Note that the interval is right-open `[from, to)`**: passengers **get off** at stop `to`, so stop `to` is **not counted** toward this trip's occupancy. Written with difference arrays, this is `diff[from] += num`, `diff[to] -= num` — **the cancellation point falls on `to` itself, with no extra plus one**, because `to` is exactly the first position that is "not included."

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
    int diff[1001] = {0};                /* station coordinates ≤ 1000, a static array is enough */
    for (int i = 0; i < tripsSize; i++) {
        int num = trips[i][0], from = trips[i][1], to = trips[i][2];
        diff[from] += num;               /* board at station from */
        diff[to]   -= num;               /* alight at station to: the range is right-open [from, to) */
    }

    int current = 0;
    for (int i = 0; i <= 1000; i++) {
        current += diff[i];              /* number of people on board after this station */
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
        vector<int> diff(1001, 0);       // station coordinates ≤ 1000
        for (auto& t : trips) {
            diff[t[1]] += t[0];          // board at station from
            diff[t[2]] -= t[0];          // alight at station to: the range is [from, to)
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
  const diff = new Array(1001).fill(0); // station coordinates ≤ 1000
  for (const [num, from, to] of trips) {
    diff[from] += num; // board at station from
    diff[to] -= num; // alight at station to: the range is [from, to)
  }

  let current = 0;
  for (const change of diff) {
    current += change; // number of people on board after this station
    if (current > capacity) return false;
  }
  return true;
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time | **O(trips.length + 1000)** — the coordinate upper bound is fixed, equivalent to O(n + C) |
| Space | **O(C)** — `C = 1000` is the coordinate range, constant level |

### Common Pitfalls

1. **Writing stop `to` as `diff[to + 1] -= num`.** This causes passengers to **not get off** at stop `to`, occupying one extra stop, which may be misjudged as overcapacity. **`to` is the "drop-off" position, equivalent to the endpoint of a right-open interval, with no plus one.**
2. **Reversing the interval endpoints.** Some people are used to writing closed intervals, so they write `diff[from] += num; diff[to + 1] -= num` — if the problem statement really says "occupying a seat at stop `to`," then that's correct; but this problem explicitly states that `to` is drop-off, so it's right-open. **First confirm the problem's definition of endpoints, then decide whether to add one.**
3. **Timing of the overcapacity check.** It must be checked **immediately after accumulating at each stop** — this problem asks for "any moment during the process," not "the final total." If it exceeds capacity halfway through accumulation, you can exit early with `return false`.
4. **No sorting, no simulating people at each stop.** A common mistake is sorting by `from` and then simulating pickups and drop-offs. The difference array naturally gives "the net change at each stop" — **just scan through without moving**, and sorting is unnecessary overhead.
5. **Coordinate range.** `to` can be as large as `1000`, so `diff` needs to be at least `1001` long; writing `new Array(1000)` will cause an out-of-bounds at the maximum stop.

---

## 5. Comparing the Three Problems: Where the Tiny Differences Lie

The skeleton of all three problems is **identical**; the differences lie only in the following cells:

| | 370 Range Addition | 1109 Corporate Flight Bookings | 1094 Car Pooling |
|---|---|---|---|
| Has initial array | All zeros (no build phase) | All zeros (no build phase) | All zeros (no build phase) |
| Index base | 0-indexed | **1-indexed, needs conversion** | 0-indexed |
| Problem interval semantics | Closed interval `[start, end]` | Closed interval `[first, last]` | **Right-open `[from, to)`** |
| Marking notation | `diff[s] += inc` / `diff[e+1] -= inc` | `diff[f-1] += seats` / `diff[last] -= seats` | `diff[from] += num` / `diff[to] -= num` |
| Coordinate upper bound | `length` | `n` | `1000` |
| Output form | **The entire array** | **The entire array** | **A single boolean** |
| When to evaluate | Take the array after full restoration | Take the array after full restoration | **Evaluate while restoring**, can exit early |

**One-sentence summary:**

> Difference array problems have only one variable — **translating the interval given by the problem into two points on `diff`**. When translating, just watch two things: **where the left endpoint lands in the array** (whether to `-1`), and **whether the right endpoint's "cancellation point" is `right + 1` or `right`** (depending on whether the right end is open or closed). The rest — marking, restoring, and evaluating — all three problems share the same set of code.

---
## 6. Extensions: How Far Can Difference Arrays Go?

The previous three problems were "one-dimensional, offline, add-only." This section pushes the boundary outward in four steps.

### 6.1 2D Difference: Adding the Same Value to an Entire Submatrix

One dimension is "range add, mark two endpoints"; two dimensions is "**submatrix add, mark four corners**." To add `v` to an entire rectangular region `(r1, c1) ~ (r2, c2)` of a matrix (all four corners inclusive):

```text
diff[r1][c1]         += v      /* 从左上角开始，整个右下区域抬高 */
diff[r1][c2 + 1]     -= v      /* 撤销：右边界之后 */
diff[r2 + 1][c1]     -= v      /* 撤销：下边界之后 */
diff[r2 + 1][c2 + 1] += v      /* 补回：右下角被减了两次，加回来 */
```

Does this look familiar? **The sign order at the four corners, `+ − − +`, is the same set as the inclusion-exclusion formula for [2D prefix sum queries](/technology/prefix-sum/).** This is no coincidence—**2D prefix sum and 2D difference are inverse operations of each other**:

```text
打点（用差分记录变化）  ── 二维前缀和 ──▶  还原出真正的矩阵
```

To restore, perform a **2D prefix sum** on `diff` (accumulate in place):

```text
for i in 0..m-1:
    for j in 0..n-1:
        if i > 0:      diff[i][j] += diff[i-1][j]        /* 上方 */
        if j > 0:      diff[i][j] += diff[i][j-1]        /* 左方 */
        if i>0 && j>0: diff[i][j] -= diff[i-1][j-1]      /* 左上被加两次 */
        /* 此时 diff[i][j] 就是最终矩阵在 (i, j) 的值 */
```

A typical problem is **LeetCode 2536. Increment Submatrices by One** (add 1 to the submatrix of each query). C++ skeleton:

```cpp
vector<vector<int>> rangeAddQueries(int n, vector<vector<int>>& queries) {
    vector<vector<int>> diff(n + 1, vector<int>(n + 1, 0));   // allocate one extra ring
    for (auto& q : queries) {
        int r1 = q[0], c1 = q[1], r2 = q[2], c2 = q[3];
        diff[r1][c1]++;
        diff[r1][c2 + 1]--;
        diff[r2 + 1][c1]--;
        diff[r2 + 1][c2 + 1]++;
    }
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) {                         // in-place 2D prefix sum
            if (i) diff[i][j] += diff[i - 1][j];
            if (j) diff[i][j] += diff[i][j - 1];
            if (i && j) diff[i][j] -= diff[i - 1][j - 1];
        }
    diff.resize(n);                                            // discard that extra ring
    for (auto& row : diff) row.resize(n);
    return diff;
}
```

Just like in one dimension: **"allocating one extra ring" is to catch `+1`**, and you simply discard it at the end.

### 6.2 Tree Difference: Adding to an Entire Path

One dimension is a "segment," two dimensions is a "rectangle," and **on a tree it's a "path"**: add `x` to every vertex on the simple path from `u → v` in the tree. The approach is to move the difference onto the tree's **subtree prefix sum**—mark four points, then do one final DFS to compute subtree sums and restore:

| Scenario | Marking (using vertex weights as an example, `t = LCA(u, v)`, `p = t 的父节点`) |
|---|---|
| Vertex-weight path add | `val[u] += x`, `val[v] += x`, `val[t] -= x`, `val[p] -= x` |
| Edge-weight path add | `val[u] += x`, `val[v] += x`, `val[t] -= 2x` (edge weights are stored on the "child") |

To restore, compute subtree sums via **post-order traversal**: `val[u] += Σ val[child]`, in O(n) time. The essence is still that old saying—**"record changes where they happen"**: a path add = the superposition of two "upward adds," which cancel each other out at the LCA.

### 6.3 Generalization: The Sweep-Line Idea

The essence of difference arrays is not an array trick, but a more general idea:

> **Don't record the value at every position—only record the positions where "the value changes," then sweep from left to right and accumulate them.**

Problem 1094 Car Pooling is a live example—**we never simulated "someone boards at some stop, someone alights at some stop" from start to finish**; we only recorded the **net change** in passenger count at each stop, and a single sweep gives us the number of passengers on board at any moment. The same idea under a different name is:

- **Sweep-line algorithm**: split intervals into two events, "enter +1, leave −1," sort them, and sweep once (compare with area union, interval coverage counting).
- **Event-timeline statistics**: in booking systems and logging systems, record increments/decrements only at "start/end" moments, rather than maintaining state second by second.

**1D difference = the sweep line specialized to "intervals on the number line."** Once you recognize this layer, difference arrays are no longer about "memorizing formulas," but about "keeping accounts at the points of change."

### 6.4 Selection and Pitfalls: When Not to Use Difference Arrays

Difference arrays are a specialized tool for **"batch range modifications."** As soon as the requirement involves "modify while querying," they're no longer sufficient:

| Requirement | What to use | Complexity |
|---|---|---|
| Multiple **range adds** + **one final** query (the three problems in this article) | **Difference array** | modify O(1), restore O(n) |
| Multiple **range adds** + multiple **point queries** | **Difference array** (each query is just one prefix sum) or a Fenwick tree | depends on queries |
| Multiple **range adds** + multiple **range sums**, alternating | **Segment tree** (with lazy propagation) or **two Fenwick trees** | O(log n) per operation |
| Multiple **range adds** + multiple **range min/max** | **Segment tree** | O(log n) per operation |
| **2D** matrix range adds | **2D difference** (see 6.1) | mark O(1), restore O(m·n) |

> **An easily confused name**: **Difference Constraints** have **nothing to do** with the difference arrays in this article—they are a class of "systems of inequalities of the form `x_j − x_i ≤ c`," solved using shortest paths / SPFA. Both have "difference" in the name, but one is an array trick and the other is a graph-theoretic model—don't mix them up.

---

## Related Articles

- [Difference Arrays: Reducing Range Modifications from O(n) to O(1)](/technology/difference-array/) — principles, step-by-step diagrams, and more variants
- [Prefix Sums: Reducing Range Sums from O(n) to O(1)](/technology/prefix-sum/) — the inverse operation of difference arrays, a prerequisite for 2D inclusion-exclusion
- [2D Arrays: From Matrix Traversal to In-Place Transformation](/technology/two-d-array/) — 2D index derivation and the general pattern of "allocating one extra ring"
- [Sliding Window Core Code Template: Three Problems to Master All Substring and Subarray Problems](/technology/sliding-window-template/) — another approach that converges a class of problems onto the same skeleton