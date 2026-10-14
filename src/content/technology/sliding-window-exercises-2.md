---
title: 'Classic Sliding Window Problems (Part 2): Changing State, Reverse Transformation, and Enumerating Dimensions'
published: 2026-10-01
description: 'A deep dive into four advanced sliding window problems: Contains Duplicate II, Contains Duplicate III, Minimum Operations to Reduce X to Zero, and Longest Substring with At Least K Repeating Characters. Each demonstrates a different variation—swapping window state for hash maps and bucketing, reversing the problem, and enumerating dimensions—with C / C++ / JavaScript implementations.'
image: ''
tags: [Sliding Window, Two Pointers, Hash Table, LeetCode, Bucketing, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Introduction

The three skeletons in [Sliding Window Core Code Template: Three Questions to Master All Substring and Subarray Problems](/technology/sliding-window-template/) and the "add/subtract one number + compare one inequality" approach in [Classic Sliding Window Algorithm Exercises (Part 1)](/technology/sliding-window-exercises-1/) handle problems where the window state can be expressed clearly with one or two integers. The four problems in this article still use the same skeleton, but each requires a transformation first:

| Article | Problems | Transformation |
|------|------|------|
| [(Part 1) Sum, Product, and Counting Within a Window](/technology/sliding-window-exercises-1/) | Minimum Size Subarray Sum, Subarray Product Less Than K, Max Consecutive Ones III, Longest Repeating Character Replacement | Window state is "add/subtract one number" |
| **This article (Part 2)** | Contains Duplicate II, Contains Duplicate III, Minimum Operations to Reduce X to Zero, Longest Substring with At Least K Repeating Characters | **Change the state** (hash map, bucketing), **reverse transformation**, **enumerate one more dimension** |

The challenge of each of the four problems:

1. **Contains Duplicate II**: The condition is "values are equal" rather than "count meets a threshold," so the window state must change from a count to a **hash map**;
2. **Contains Duplicate III**: "Values are equal" is relaxed to "values differ by at most `t`," a hash map is no longer sufficient, and we need to **bucket by value range**;
3. **Minimum Operations to Reduce X to Zero**: The problem statement says to delete from both ends, which cannot be done directly with a sliding window, so we need a **reverse transformation** into "a segment left in the middle";
4. **Longest Substring with At Least K Repeating Characters**: A direct sliding window does not work (extending or shrinking the window may both break the condition), so we need to **enumerate the dimension of "how many distinct characters are in the window,"** splitting one problem into 26 sliding-window-able problems.

> **About the code**
> Each problem provides implementations in C / C++ / JavaScript. The three versions are logically equivalent; switch tabs to view them.
> The window is still written as left-closed, right-open `[left, right)`.

### Comparison Table of the Four Problems

| Problem | Window State | Shrink Condition | Key Action |
|------|---------|---------|---------|
| [Contains Duplicate II](#1-contains-duplicate-ii-leetcode-219) | Hash map "value → most recent index" | No shrinking needed | Compare index distance on a hit |
| [Contains Duplicate III](#2-contains-duplicate-iii-leetcode-220) | Hash map "bucket number → elements in the bucket" | Remove buckets with expired indices | Bucket width is `t + 1` |
| [Minimum Operations to Reduce X to Zero](#3-minimum-operations-to-reduce-x-to-zero-leetcode-1658) | `sum` of the middle segment | `sum > total - x` | Reverse the problem statement first |
| [Longest Substring with At Least K Repeating Characters](#4-longest-substring-with-at-least-k-repeating-characters-leetcode-395) | `cnt[26]` + `distinct` + `reached` | `distinct > types` | Enumerate `types` in the outer loop |

---
## 1. Contains Duplicate II (LeetCode 219)

### Problem Description

Given an integer array `nums` and an integer `k`, determine whether there exist two **different indices** `i` and `j` in the array such that `nums[i] == nums[j]` and `abs(i - j) <= k`. If they exist, return `true`; otherwise, return `false`.

**Example:**

```text
Input: nums = [1,2,3,1], k = 3        Output: true    (indices 0 and 3, distance 3)
Input: nums = [1,0,1,1], k = 1        Output: true    (indices 2 and 3, distance 1)
Input: nums = [1,2,3,1,2,3], k = 2    Output: false
```

**Constraints:** `1 <= nums.length <= 10^5`, `-10^9 <= nums[i] <= 10^9`, `0 <= k <= 10^5`.

### Approach: Replace the "window" with "the most recent occurrence of each value"

The condition in this problem can also be translated into window language: **there exists a window of length at most `k + 1` that contains a duplicate value**. Writing it directly according to the template means "the window contains at most `k + 1` elements + a hash set records which values have appeared in the window," adding to the window with `add` and removing from the window with `remove`.

But there is a simpler way to write it: **don't maintain a window, just record the "most recent index" of each value**.

- When scanning to index `i` with value `v`, look up the table to get the previous occurrence index `j` of `v`;
- If `j` exists and `i - j <= k`, return `true` directly;
- Otherwise, update the record for `v` to `i`.

Why is there no need to explicitly remove from the window? Because the validity period of the "same value" condition is inherently very short: as soon as a new element with the same value arrives, the old index becomes useless (the distance can only grow larger). Therefore, **overwriting the old record with the "latest index" is equivalent to removing the old record from the window**. Step ⑤ is omitted, but it doesn't disappear—it is simply merged into the "update" step.

Filling in the template step by step: ② when adding, "look up the table + overwrite"; ③ there is no shrink condition (not every variable-length window problem needs shrinking—the window in this problem is automatically maintained through "overwriting"); ④ return immediately when the table lookup hits; ⑤ no maintenance needed.

### Process Illustration

Taking `nums = [1,0,1,1]` and `k = 1` as an example (the table stores "value → latest index"):

```text
Subscript  0  1  2  3
nums  1  0  1  1
```

```text
i=0  v=1  not in the table        → record {1: 0}
i=1  v=0  not in the table        → record {1: 0, 0: 1}
i=2  v=1  1 is in the table, j=0     → distance 2 - 0 = 2 > k=1 → not counted, overwrite to {1: 2}
i=3  v=1  1 is in the table, j=2     → distance 3 - 2 = 1 ≤ k=1 → return true ✔
```

Now look at another example that returns `false`: `nums = [1,2,3,1,2,3]`, `k = 2`:

```text
i=3  v=1  in the table {1: 0}  → distance 3 > 2 → overwrite as {1: 3}
i=4  v=2  in the table {2: 1}  → distance 3 > 2 → overwrite as {2: 4}
i=5  v=3  in the table {3: 2}  → distance 3 > 2 → overwrite as {3: 5}
After scanning through, there is still no pair of identical values with distance ≤ 2 → return false ✔
```

Note the round for `i=3`: `1` appeared at index 0, and the distance condition was not satisfied, so **the old record is discarded**. Even if `1` appears again later, the comparison is with index 3 rather than index 0—this is exactly what "the old record automatically leaves the window" means.

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdbool.h>
#include <limits.h>

/* value → index of its most recent occurrence. Open addressing + linear probing, keep only the latest index for each value,
   所以整张表只写不删，不需要墓碑。 */
#define CAP (1u << 18)                       /* power of two: & (CAP-1) instead of modulo */
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
            h = (h + 1) & (CAP - 1);         /* linear probing to find a slot */

        if (key2[h] == v) {
            if (i - pos2[h] <= k) return true;   /* close enough, hit */
            pos2[h] = i;                          /* otherwise update to the latest index */
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
        unordered_map<int, int> last;   // value → index of its most recent occurrence

        for (int i = 0; i < (int)nums.size(); i++) {
            auto it = last.find(nums[i]);
            if (it != last.end() && i - it->second <= k) return true;
            last[nums[i]] = i;          // keep only the latest index per value, which naturally handles "leaving the window"
        }
        return false;
    }
};
```

```js title="JavaScript"
function containsNearbyDuplicate(nums, k) {
  const last = new Map();          // value → index of its most recent occurrence

  for (let i = 0; i < nums.length; i++) {
    const j = last.get(nums[i]);
    if (j !== undefined && i - j <= k) return true;
    last.set(nums[i], i);          // keep only the latest index per value, which naturally handles "leaving the window"
  }
  return false;
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time complexity | **O(n)** — the C version is amortized O(1) (open addressing), and the C++ / JS versions have amortized O(1) hash tables |
| Space complexity | **O(d)** — `d` is the number of distinct values in the array (≤ `n`); records only grow and never shrink, but the same value always occupies only one entry |

### Common Pitfalls

1. **`i - j <= k` is not `i - j < k`.** The problem requires the **absolute value of the index difference to be at most `k`**. `k = 0` is also a valid input; in that case, only `i == j` satisfies the distance condition, but the problem requires two different indices, so the answer must be `false`.
2. **When there is a hit but the distance exceeds the limit, "overwrite" rather than "skip."** If you forget to overwrite, the old index will remain in the table forever, and when the same value is encountered again later, it will still be compared against the old index and will never hit.
3. **The C version must handle negative numbers and collisions in `LLONG_MIN`.** `nums[i]` can be negative (lower bound `-10^9`). The hash function first converts `long long` to `unsigned long long` and then mixes it, so negative numbers can still be spread normally; the empty-slot marker uses `LLONG_MIN` because it falls outside the value range of `nums[i]`.
4. **In JS, use `=== undefined` to check for absence, not falsy checks.** `last.get(nums[i])` may return index `0`, and `if (j)` would treat index 0 as "has not appeared."
5. **If the interviewer asks you to "write it with a window,"** the equivalent version is "maintain a set of size at most `k + 1`: add to the window with `add`, and when the set size exceeds `k + 1`, delete `nums[i - k]`," which is the full set of actions ②③⑤ in the template. Both versions are O(n) in time, but the set version stores only the most recent `k + 1` elements, so its space is O(min(n, k)), which is more economical than "recording all distinct values"; conversely, the approach in this article does not need to actually maintain a window, so the code is shorter.

---
## 2. Contains Duplicate III (LeetCode 220)

### Problem Description

Given an integer array `nums` and two integers `indexDiff` and `valueDiff`, find an index pair `(i, j)` that satisfies the following conditions: `i != j`, `abs(i - j) <= indexDiff`, `abs(nums[i] - nums[j]) <= valueDiff`. Return `true` if it exists.

> **About parameter names**: This problem has had two versions of the statement on LeetCode — the current statement (`220. 存在重复元素 III`) writes the two parameters as `indexDiff` (index distance upper bound) and `valueDiff` (value difference upper bound), while the earlier statement wrote them as `k` and `t`, with different value upper bounds as well. The two differ only in naming; the meaning and solution are completely identical. Below we uniformly use the shorter `k` and `t`.

**Example:**

```text
Input: nums = [1,2,3,1], k = 3, t = 0        Output: true    (indices 0 and 3, both values are 1)
Input: nums = [1,5,9,1,5,9], k = 2, t = 3    Output: false
Input: nums = [-3,3], k = 2, t = 4           Output: false
Input: nums = [-2147483648, 2147483647], k = 1, t = 0   Output: false
```

**Constraints:** The current statement is `2 <= nums.length <= 10^5`, `-10^9 <= nums[i] <= 10^9`, `1 <= k <= nums.length`, `0 <= t <= 10^9`; the earlier statement is `1 <= nums.length <= 2 * 10^4`, `-2^31 <= nums[i] <= 2^31 - 1`, `0 <= k <= 10^4`, `0 <= t <= 2^31 - 1` (the last example above comes from that version). The code below considers the union of both for boundaries: values uniformly use 64 bits, negatives use floor division, and the hash table is sized according to the upper bound of array length 10^5.

### Approach: Bucketing by Value Range

The previous problem only needed to determine "values are equal," so a hash table sufficed. This problem needs to determine "**values differ by no more than `t`**" — that is, "is there a number in the window that falls within the interval `[v - t, v + t]`." A hash table cannot query intervals; we need a window structure that is **ordered by value**.

Two common approaches:

- **Window + ordered set**: Maintain an ordered set of elements in the window, each time using binary search to find the smallest element `>= v - t`, and check whether it is `<= v + t`. In C++, use `std::set` + `lower_bound`, with complexity O(n log k).
- **Window + bucketing**: Divide the value range into buckets of width `t + 1`, where the bucket number is `floor(v / (t + 1))`. Any two numbers in the same bucket **must differ by no more than** `t`, so we only need to check three buckets: its own bucket, the left neighbor bucket, and the right neighbor bucket. Each bucket holds at most one element, giving amortized O(1).

Below we write it using bucketing. Why "each bucket holds at most one element"? Because once a bucket already has an element and a new element falls into the same bucket, their difference is `<= t`, and we can immediately return `true` — so the single element in the bucket is the bucket's current content when "no success has been determined yet."

The template has four blanks: ② When adding `nums[i]`, compute the bucket number and check neighboring buckets; ③ The shrink condition becomes "**delete the bucket of the expired index**" — the bucket containing `nums[i - k]` (the element whose distance already exceeds `k`) must be removed from the table; ④ Return on hit; ⑤ is the bucket deletion step.

There is a pitfall here: **integer division in C / C++ truncates toward zero, not toward negative infinity**. `floor(-1 / 5)` mathematically equals `-1`, while `-1 / 5` in C equals `0`, causing bucket misalignment. So negatives need a manual correction by one.

### Process Illustration

Taking `nums = [1,5,9,1,5,9]`, `k = 2`, `t = 3` as an example, with bucket width `w = t + 1 = 4`:

```text
Index    0   1   2   3   4   5
nums    1   5   9   1   5   9
Bucket no.    0   1   2   0   1   2      (Bucket no. = floor(value / 4))
```

```text
i=0  v=1  bucket number 0 → buckets 0, -1, 1 are all empty → write "bucket0 = 1 (index 0)"
i=1  v=5  bucket number 1 → the left neighboring bucket 0 contains 1: 5 - 1 = 4 > 3, no match → write "bucket1 = 5 (index 1)"
i=2  v=9  bucket number 2 → the left neighboring bucket 1 contains 5: 9 - 5 = 4 > 3, no match → write "bucket2 = 9 (index 2)"
                  i - k = 0 ≥ 0 → delete bucket 0 where nums[0] = 1 is located
i=3  v=1  bucket number 0 → bucket 0 has already been deleted (that element's distance 3 > k = 2, it should have been deleted)
                  left neighboring bucket -1 is empty, right neighboring bucket 1 contains 5: 4 > 3, no match → write "bucket0 = 1 (index 3)"
                  i - k = 1 → delete bucket 1 where nums[1] = 5 is located
i=4  v=5  bucket number 1 → bucket 1 has already been deleted; left neighboring bucket 0 contains 1 (index 3): 4 > 3, no match
                  right neighboring bucket 2 contains 9: 4 > 3, no match → write "bucket1 = 5 (index 4)"
                  i - k = 2 → delete bucket 2 where nums[2] = 9 is located
i=5  v=9  bucket number 2 → bucket 2 has already been deleted (that 9 is at index 2, distance 3 > 2)
                  left neighboring bucket 1 contains 5: 4 > 3, no match → write "bucket2 = 9 (index 5)"

Finished scanning with no hit → return false ✔
```

Pay special attention to `i=5`: **the 9 at index 2 is exactly equal to the current value**. If you forget to delete expired buckets, this will falsely report `true` — but their index distance is 3, which exceeds `k = 2`. The sliding window's "exit" action is no trivial matter in this problem.

Let's verify Example 1 again: when `nums = [1,2,3,1], k = 3, t = 0` with bucket width `w = 1`, each integer forms its own bucket; at `i=3`, `v = 1` falls back into bucket 1, and bucket 1 still holds index 0 (`i - k = 0` has just not expired) → hit, return `true` ✔.

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdbool.h>
#include <stdlib.h>

/* bucket number → the value of the element in that bucket. Bucket width w = t+1, any two numbers in the same bucket differ by ≤ t,
   所以每个桶最多只需要留一个元素（要是有两个，早就返回 true 了）。
   元素滑出窗口时要删掉它所在的桶，所以这里用墓碑标记删除。 */
#define CAP3 (1u << 18)                      /* at most k+1 buckets in the window, 2^18 leaves plenty of margin */
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

static long long floorDiv(long long a, long long b) {   /* floor division when b > 0 */
    long long q = a / b;
    if (a % b != 0 && a < 0) q--;                      /* C division truncates toward zero, negatives need correction */
    return q;
}

static long long get3(long long key) {
    unsigned long long h = hash3(key) & (CAP3 - 1);
    while (key3[h] != EMPTY3) {                        /* tombstone, keep searching forward */
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
    val3[h] = val;                                     /* tombstone slot can be reused */
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

    long long w = (long long)t + 1;      /* t max is 2^31-1, cast to long long first then add one */
    clear3();

    for (int i = 0; i < numsSize; i++) {
        long long v = nums[i];
        long long id = floorDiv(v, w);

        if (get3(id) != EMPTY3) return true;            /* same bucket, difference is necessarily ≤ t */

        long long a = get3(id - 1);                     /* left neighbor bucket */
        if (a != EMPTY3 && llabs(v - a) <= t) return true;

        long long b = get3(id + 1);                     /* right neighbor bucket */
        if (b != EMPTY3 && llabs(v - b) <= t) return true;

        put3(id, v);

        if (i - k >= 0)                                 /* index slides out of the window, delete its bucket */
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

        long long w = (long long)t + 1;     // bucket width: any two numbers in the same bucket differ by ≤ t
        unordered_map<long long, long long> bucket;   // bucket number → the number in that bucket

        // C++ integer division truncates toward zero, negatives need manual correction to "floor"
        auto floorDiv = [](long long a, long long b) {
            long long q = a / b;
            if (a % b != 0 && a < 0) q--;
            return q;
        };

        for (int i = 0; i < (int)nums.size(); i++) {
            long long v = nums[i];
            long long id = floorDiv(v, w);

            if (bucket.count(id)) return true;          // same bucket, difference is necessarily ≤ t

            auto lo = bucket.find(id - 1);              // left neighbor bucket
            if (lo != bucket.end() && v - lo->second <= t) return true;

            auto hi = bucket.find(id + 1);              // right neighbor bucket
            if (hi != bucket.end() && hi->second - v <= t) return true;

            bucket[id] = v;

            if (i - k >= 0)                             // index slides out of the window, delete its bucket
                bucket.erase(floorDiv(nums[i - k], w));
        }
        return false;
    }
};
```

```js title="JavaScript"
function containsNearbyAlmostDuplicate(nums, k, t) {
  const w = t + 1;                 // bucket width: any two numbers in the same bucket differ by ≤ t
  const bucket = new Map();        // bucket number → the index in that bucket (delete when the index slides out of the window)
  const idOf = (v) => Math.floor(v / w);   // Math.floor also floors for negatives

  for (let i = 0; i < nums.length; i++) {
    const id = idOf(nums[i]);

    if (bucket.has(id)) return true;                 // same bucket, difference is necessarily ≤ t

    const lo = bucket.get(id - 1);                   // left neighbor bucket
    if (lo !== undefined && nums[i] - nums[lo] <= t) return true;

    const hi = bucket.get(id + 1);                   // right neighbor bucket
    if (hi !== undefined && nums[hi] - nums[i] <= t) return true;

    bucket.set(id, i);

    if (i - k >= 0) bucket.delete(idOf(nums[i - k]));   // move out of the window
  }
  return false;
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time complexity | **O(n)** — each element checks 3 buckets, writes 1 bucket, deletes 1 bucket, amortized O(1) (the ordered set solution is O(n log k)) |
| Space complexity | **O(k)** — the number of buckets simultaneously present in the table does not exceed the window length `k + 1` |

### Common Pitfalls

1. **Negatives must use floor division.** `-1 / 5` in C / C++ equals `0`, while `floor(-1/5) = -1`. After bucket misalignment, the invariant "same bucket ⇒ satisfied" no longer holds. In C / C++, correct it like `floorDiv`; JS's `Math.floor` is naturally floor division, so no need to worry.
2. **Bucket width is `t + 1`, not `t`.** Only with bucket width `t + 1` can we guarantee "same bucket ⇒ difference ≤ t"; using `t` will miss a pair that differs by exactly `t`. Also note that `t + 1` itself may overflow: in the earlier statement, the upper bound of `t` is `2^31 - 1`, and adding one in `int` overflows, so you must first convert to 64 bits before adding (the C version writes `(long long)t + 1` for this reason; the current statement's `t` upper bound is `10^9`, and adding one won't overflow, but uniformly handling as 64 bits is the most worry-free).
3. **Bucket deletion must delete the bucket of "the index outside the window," and the order is "check first, write next, delete last."** Deleting too early discards elements still usable; deleting too late falsely reports `true` using expired elements (in the `i=5` example above, the two 9s differ by just one "forgotten deletion").
4. **Same bucket directly returns `true`; neighboring buckets must actually compare the difference once.** Any two numbers in a neighboring bucket may differ by up to `2t + 1`, so neighboring buckets cannot just check "existence."
5. **The bucket of an expired index can only delete itself.** What is deleted is the bucket occupied by the element `nums[i - k]` — note it is not `nums[i - k - 1]`, because at this moment the window should contain elements with distance not exceeding `k`, i.e., the index interval `[i - k, i - 1]`.
6. **The C version's hash table needs "tombstone" deletion.** An open-addressing table cannot directly set a slot to empty (it would break the probe chain); a `TOMB3` marker must be used; when searching, encountering a tombstone requires continuing forward, and only on insertion can the tombstone position be reused.

---
## 3. Minimum Operations to Reduce x to Zero (LeetCode 1658)

### Problem Description

You are given an integer array `nums` and an integer `x`. In one operation, you should remove the leftmost or rightmost element of the array `nums`, then subtract that element's value from `x`. If it is possible to reduce `x` to **exactly** `0`, return the **minimum number of operations**; otherwise, return `-1`.

**Example:**

```text
Input: nums = [1,1,4,2,3], x = 5
Output: 2
Explanation: After removing the last two elements [2,3], 2 + 3 = 5, for a total of 2 operations.

Input: nums = [5,6,7,8,9], x = 4        Output: -1
Input: nums = [3,2,20,1,1,3], x = 10    Output: 5   (remove the last three + the first two)
```

**Constraints:** `1 <= nums.length <= 10^5`, `1 <= nums[i] <= 10^4`, `1 <= x <= 10^9`.

### Approach: Flip the Question — What's Deleted from Both Ends Equals What's Left Behind

Deleting elements from both ends looks like "two pointers closing in toward the middle," but those are **two independent variables** (how many deleted from the left, how many from the right), while a sliding window has only one `left`, so the template doesn't fit. The genuinely useful move is to **flip the question around**:

> The elements deleted from both ends together are exactly "a prefix + a suffix" of `nums`; therefore, **the segment in the middle that isn't deleted must be a contiguous subarray**.

Let the total sum of the array be `total`. The sum of deleted elements must equal `x`, which is equivalent to:

```text
The remaining segment and 0 = total - x
```

And minimizing the number of operations is equivalent to **maximizing the length of the segment left behind**. So the problem becomes a standard variable-length window problem:

- In `nums`, which is all positive numbers, find the **longest subarray whose sum equals exactly** `total - x`;
- Answer = `n - 这个长度`.

The window state is `sum`. On ② adding, `sum += nums[right]`; ③ the shrink condition is `sum > target` (shrink when it exceeds); ④ after shrinking, check `sum == target` and record the length; ⑤ `sum -= nums[left]`.

Two edge cases need to be handled first: when `total < x`, no matter how you delete, you can't make `x`, so return `-1` directly; when `total == x`, `target = 0`, and at this point the "longest subarray with sum 0" is the **empty array** (length 0), so return `n` — that is, delete the entire array, which is exactly `n` operations.

### Process Walkthrough

Taking `nums = [1,1,4,2,3]`, `x = 5` as an example: `total = 11`, `target = 11 - 5 = 6`.

```text
Subscript  0  1  2  3  4
nums  1  1  4  2  3
```

```text
right=1: window [0,1)=[1], sum=1        ≠ 6
right=2: window [0,2)=[1,1], sum=2      ≠ 6
right=3: window [0,3)=[1,1,4], sum=6    = 6 → best = 3 (this segment is at most 3)
right=4: window [0,4)=[1,1,4,2], sum=8  > 6 ← shrink
  ├ remove 1 → sum=7, window [1,4)=[1,4,2], still > 6
  ├ remove 1 → sum=6, window [2,4)=[4,2], stop shrinking
  └ sum = 6 but length 2 < 3, do not update best
right=5: window [2,5)=[4,2,3], sum=9    > 6 ← shrink
  ├ remove 4 → sum=5, window [3,5)=[2,3], stop shrinking
  └ sum = 5 ≠ 6, do not record

best = 3 → minimum number of operations = 5 - 3 = 2 ✔ (delete the last two elements [2,3])
```

Cross-check with the problem statement: the retained `[1,1,4]` has sum 6, and what's deleted is the last two elements `[2,3]`, with sum 5 = `x`, two operations ✔.

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
int minOperations(int *nums, int numsSize, int x) {
    long long total = 0;
    for (int i = 0; i < numsSize; i++) total += nums[i];
    if (total < x) return -1;

    /* sum of elements removed from both ends = x, equivalent to "the middle segment left behind has sum = total - x";
       操作数最少 = 中间这一段最长。 */
    long long target = total - x;
    long long sum = 0;
    int left = 0, right = 0, best = -1;

    while (right < numsSize) {
        sum += nums[right];              /* ① right boundary enters the window */
        right++;

        while (sum > target) {           /* ③ all positive, so if we exceed we can always shrink back down */
            sum -= nums[left];
            left++;
        }
        if (sum == target && right - left > best)
            best = right - left;         /* ④ record after shrinking: the longer this segment, the fewer operations */
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

        // sum of elements removed from both ends = x, equivalent to "the middle segment left behind has sum = total - x";
        // minimum operations = longest middle segment
        long long target = total - x;
        long long sum = 0;
        int left = 0, right = 0, best = -1;

        while (right < (int)nums.size()) {
            sum += nums[right];              // ① right boundary enters the window
            right++;

            while (sum > target) {           // ③ all positive, so if we exceed we can shrink back down
                sum -= nums[left];
                left++;
            }
            if (sum == target && right - left > best)
                best = right - left;         // ④ record after shrinking: the longer this segment, the fewer operations
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

  // sum of elements removed from both ends = x, equivalent to "the middle segment left behind has sum = total - x";
  // minimum operations = longest middle segment
  const target = total - x;
  let sum = 0;
  let left = 0, right = 0, best = -1;

  while (right < nums.length) {
    sum += nums[right];              // ① right boundary enters the window
    right++;

    while (sum > target) {           // ③ all positive, so if we exceed we can shrink back down
      sum -= nums[left];
      left++;
    }
    if (sum === target && right - left > best)
      best = right - left;           // ④ record after shrinking: the longer this segment, the fewer operations
  }
  return best < 0 ? -1 : nums.length - best;
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time Complexity | **O(n)** — one pass to compute `total`, one pass for the sliding window |
| Space Complexity | **O(1)** |

### Common Pitfalls

1. **When `total == x`, return `n`, not `0` and not `-1`.** At this point `target = 0`, and the "longest subarray with sum 0" is the empty array (length 0), so the answer is `n - 0 = n`. In code, `best = -1` is used to mean "not found," while `best = 0` is a valid result — the two must not be conflated (hence the condition is `best < 0`).
2. **The sliding window in this problem only holds for positive numbers.** "Shrink when it exceeds" relies on `sum` increasing monotonically with `right` — which only holds when `nums[i]` is all positive integers. If negative numbers were allowed in `nums`, you'd have to use **prefix sum + hash map** to enumerate combinations of "prefix sum + suffix sum = x," and the sliding window would fail.
3. **Use 64-bit for `sum` and `target`.** `n × nums[i] = 10^9` and `x` can also reach `10^9`, and computing intermediate values for `int` easily overflows.
4. **Don't actually simulate "deleting from both ends."** That requires maintaining two deletion pointers simultaneously and handling the boundary where "the left deletion meets the right deletion," resulting in far more code and a much higher chance of bugs. After converting to "the segment left behind," it's just an ordinary sliding window problem.
5. **The condition for recording the answer is `sum == target`, not `sum <= target`.** The problem requires reducing to 0 **exactly**.

---
## 4. Longest Substring with At Least K Repeating Characters (LeetCode 395)

### Problem Description

Given a string `s` and an integer `k`, find the longest substring of `s` such that **every character in that substring appears at least `k` times**. Return the length of this substring; if none exists, return `0`.

**Example:**

```text
Input: s = "aaabb", k = 3     Output: 3    (longest substring "aaa")
Input: s = "ababbc", k = 2    Output: 5    (longest substring "ababb", 'a' appears 2 times, 'b' appears 3 times)
Input: s = "abc", k = 2       Output: 0
```

**Constraints:** `1 <= s.length <= 10^4`, `s` consists only of lowercase English letters, `1 <= k <= 10^5`.

### Approach: First enumerate "how many distinct characters are in the window", then slide the window

This problem **cannot** be solved by directly applying the sliding window technique. The reason is that the condition lacks monotonicity: when the window grows, a new character might break the "every character appears ≥ k times" property; when the window shrinks, some character's count drops below `k`, which also breaks it. So neither the "shorter is easier to satisfy" nor the "longer is easier to satisfy" camp holds, and there's no way to write a shrink condition.

However, the problem has a very special property: **the character set is only 26 lowercase letters**. So we can **enumerate one extra dimension** — enumerate "the window contains exactly `types` distinct characters", with `types` ranging from 1 to 26:

- Once `types` is fixed, "how many distinct characters are in the window" becomes monotonic again: moving the right boundary right can only increase or keep the distinct count the same, and moving the left boundary right can only decrease it or keep it the same;
- Thus "shrink when `distinct > types`" becomes a valid shrink condition (camp B), and the window can slide;
- Within a window of `distinct == types`, count "how many distinct characters already have a frequency ≥ k" (denoted `reached`); when `reached == types`, it means every character in this window meets the requirement, so we can measure the length.

Put simply: **turn a problem that lacks monotonicity into 26 problems that each satisfy monotonicity**, and take the best one. The `26n` complexity is more than sufficient for `n = 10^4`.

The template's four blanks: ② when adding `c`, `cnt[c]++`; if `c` is newly appeared (`cnt[c]` goes from 0 to 1) then `distinct++`; if `cnt[c]` happens to equal `k` then `reached++`; ③ the shrink condition is `distinct > types`; ④ after shrinking, check `distinct == types && reached == types` then record; ⑤ when removing `d`, if `cnt[d]` drops from `k` then `reached--`, and if it reaches zero then `distinct--`.

### Walkthrough Diagram

Taking the round with `s = "ababbc"`, `k = 2`, `types = 2` as an example:

```text
Index  0  1  2  3  4  5
s     a  b  a  b  b  c
```

```text
right=1: window [0,1)=a       cnt[a]=1  distinct=1  reached=0
right=2: window [0,2)=ab      cnt[a]=1 cnt[b]=1  distinct=2  reached=0
right=3: window [0,3)=aba     cnt[a]=2 ← exactly reaches k, reached=1   distinct=2
right=4: window [0,4)=abab    cnt[b]=2 ← exactly reaches k, reached=2
         distinct == types and reached == types → window [0,4) every character appears ≥ 2 times → best = 4
right=5: window [0,5)=ababb   cnt[b]=3  distinct=2  reached=2 → best = 5
right=6: window [0,6)=ababbc  cnt[c]=1 → distinct=3 > types=2 ← shrink
  ├ remove s[0]='a': cnt[a] drops from 2 to 1, `cnt[d]-- == k` holds → reached=1; cnt[a] ≠ 0 → distinct is still 3
  ├ remove s[1]='b': cnt[b] drops from 3 to 2, `cnt[d]-- == k` does not hold (3 ≠ 2) → reached unchanged; cnt[b] ≠ 0 → distinct is still 3
  ├ remove s[2]='a': cnt[a] drops from 1 to 0 → distinct=2, stop shrinking
  └ window [3,6)="bbc": distinct=2 = types, but reached=1 ≠ 2 ('c' appears only 1 time) → do not record

The best result for this round is best = 5 ✔ (when types is 1 it can also get 2, but when types is 3 it cannot—'c' appears only 1 time)
```

Note the two removals in the `right=6` round: whether `reached` should be decremented is judged by "was this character's count exactly `k` **before** removal" (written as `cnt[d]-- == k`, compare first then decrement). Because dropping from `k` to `k - 1` counts as falling out of compliance, while dropping from `k + 1` to `k` is still compliant.

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <string.h>

int longestSubstring(char *s, int k) {
    int n = (int)strlen(s);
    int cnt[26], best = 0;

    for (int types = 1; types <= 26; types++) {   /* enumerate how many distinct characters are in the window */
        memset(cnt, 0, sizeof(cnt));
        int left = 0, right = 0;
        int distinct = 0;      /* how many distinct characters are in the window */
        int reached = 0;       /* how many of them have occurrence count already ≥ k */

        while (right < n) {
            int c = s[right] - 'a';                /* ① right boundary enters the window */
            if (cnt[c]++ == 0) distinct++;
            if (cnt[c] == k) reached++;
            right++;

            while (distinct > types) {             /* ③ too many distinct types, shrink */
                int d = s[left] - 'a';
                if (cnt[d]-- == k) reached--;
                if (cnt[d] == 0) distinct--;
                left++;
            }
            if (distinct == types && reached == types && right - left > best)
                best = right - left;               /* ④ every character in the window appears ≥ k times */
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

        for (int types = 1; types <= 26; types++) {   // enumerate how many distinct characters are in the window
            int cnt[26] = {0};
            int left = 0, right = 0;
            int distinct = 0;    // how many distinct characters are in the window
            int reached = 0;     // how many of them have occurrence count already ≥ k

            while (right < n) {
                int c = s[right] - 'a';               // ① right boundary enters the window
                if (cnt[c]++ == 0) distinct++;
                if (cnt[c] == k) reached++;
                right++;

                while (distinct > types) {            // ③ too many distinct types, shrink
                    int d = s[left] - 'a';
                    if (cnt[d]-- == k) reached--;
                    if (cnt[d] == 0) distinct--;
                    left++;
                }
                if (distinct == types && reached == types && right - left > best)
                    best = right - left;              // ④ every character in the window appears ≥ k times
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

  for (let types = 1; types <= 26; types++) {   // enumerate how many distinct characters are in the window
    cnt.fill(0);
    let left = 0, right = 0;
    let distinct = 0;    // how many distinct characters are in the window
    let reached = 0;     // how many of them have occurrence count already ≥ k

    while (right < s.length) {
      const c = s.charCodeAt(right) - 97;       // ① right boundary enters the window
      if (cnt[c]++ === 0) distinct++;
      if (cnt[c] === k) reached++;
      right++;

      while (distinct > types) {                // ③ too many distinct types, shrink
        const d = s.charCodeAt(left) - 97;
        if (cnt[d]-- === k) reached--;
        if (cnt[d] === 0) distinct--;
        left++;
      }
      if (distinct === types && reached === types && right - left > best)
        best = right - left;                    // ④ every character in the window appears ≥ k times
    }
  }
  return best;
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time complexity | **O(26n)** — 26 outer rounds, each round slides the window in O(n); the character set is fixed, so it can be viewed as O(n) |
| Space complexity | **O(1)** — a count array of size 26 |

### Common Pitfalls

1. **The criterion for `reached` is "whether it was exactly equal to `k` before removal".** Writing it as `cnt[d] == k` (decrement first, then compare) will incorrectly `reached--` when "dropping from `k+1` to `k`".
2. **The criteria for `distinct` are `cnt[c]++ == 0` (previously absent) and `cnt[d] == 0` (reaches zero after decrementing), both being the boundary value "0".** This problem has more state than the previous ones; it's recommended to write it by mapping each of the template's ②③④⑤ one by one, rather than improvising.
3. **When `k == 1`, the answer is just `n`.** The round where `types` enumerates up to the total number of distinct characters will naturally cover the entire string.
4. **`k` can be greater than `n`.** The upper bound for `k` given in the problem is `10^5`, while `n` is only `10^4`; in this case no character can reach `k`, and the answer is `0` — no special handling is needed in the code, since `reached` will never equal `types`.
5. **Don't expect "the longer the window, the better".** The native form of this problem does not have the two-segment property; it only becomes monotonic after `types` is fixed — figure out why first, then write the code.
6. **`types` only needs to enumerate up to 26 (or the actual number of distinct characters appearing in `s`).** Enumerating up to 26 is so that the code doesn't need to first deduplicate and count; the cost of a few extra rounds is negligible.

> **Extension**: The more common official solution to this problem is **divide and conquer**: first count the frequency of each character in the entire interval, find a character whose occurrence count is less than `k` — it must not belong to any valid substring, so split the interval at that character and recurse; if no such character exists in the interval, the entire interval is the answer. Both solutions are on the order of O(26n); divide and conquer has shorter code, while sliding window fits the theme of this article better.

---
## Comparison Table of the Four Problems

```text
Problem                        Reason sliding window can't be done directly   Transformation
219 Contains Duplicate II              The condition is "equal values" rather than "count"   Switch to a hash map "value → latest index"
220 Contains Duplicate III             "Value difference ≤ t" is a range query              Bucket by value range, bucket width t+1
1658 Minimum Operations to Reduce X to Zero    Deleting elements from both ends has two degrees of freedom   Reverse transformation: the remaining contiguous subarray
395 Longest Substring with At Least K Repeating Characters   The condition has no monotonicity, so the shrink condition can't be written   Enumerate the dimension "how many distinct characters are in the window"
```

The four problems can be summarized in three sentences:

1. **The window state can be replaced with any structure that supports "enter window / exit window / query."** Problem 219 replaces "count" with a hash map of "value → latest index," and exiting the window is absorbed by "overwriting the old record"; Problem 220 then replaces the hash map with buckets divided by value range, and exiting the window becomes "deleting the bucket containing the expired index." What changes is only the state and the way the window exit is written; the division of labor among ①②③④⑤ remains the same—whichever step is omitted, you must be able to explain clearly where it was merged into.
2. **When a problem asks about "operations at both ends," first think about whether you can instead ask "what remains in the middle."** The sliding window in Problem 1658 is derived through a "reverse transformation"; if it couldn't be transformed, this problem would require managing two pointers simultaneously.
3. **When the condition is not monotonic, see whether there is another dimension you can enumerate.** Problem 395 uses the inconspicuous constraint "number of character types ≤ 26" to split a problem that does not satisfy the two-segment property into 26 problems that do—this idea of "enumerating one dimension in exchange for monotonicity" is also very common elsewhere.

## Related Articles

- [Sliding Window Core Code Template: Three Questions to Solve All Substring and Subarray Problems](/technology/sliding-window-template/) — The skeleton, three questions, and half-open interval used in this article
- [Classic Sliding Window Algorithm Exercises (Part 1): Sum, Product, and Count Within the Window](/technology/sliding-window-exercises-1/) — Four problems where the window state only requires adding or subtracting a single number
- [Hash Tables: TypeScript in Practice from Set to HashMap](/technology/hash/) — The "value → index" mapping used in Problem 219, plus the principles and trade-offs of hash tables
- [Sliding Window: A General Approach to Subarray/Substring Problems](/technology/sliding-window/) — Classification of fixed-length, variable-length, and covering windows