---
title: 'Classic Sliding Window Algorithm Problems (Part 1): Sum, Product, and Counting Within a Window'
published: 2026-09-30
description: 'A detailed walkthrough of four variable-length window problems: Minimum Size Subarray Sum, Subarray Product Less Than K, Max Consecutive Ones III, and Longest Repeating Character Replacement. Each problem includes answers to three key questions, step-by-step diagrams, common pitfalls, and implementations in C, C++, and JavaScript.'
image: ''
tags: [Sliding Window, Two Pointers, Array, LeetCode, Subarray, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Introduction

[Sliding Window Core Code Template: Three Questions to Solve All Substring and Subarray Problems](/technology/sliding-window-template/) condenses substring and subarray problems into a single skeleton, while [Sliding Window: A General Approach to Subarray/Substring Problems](/technology/sliding-window/) covers the classification. This article begins applying the skeleton to real problems.

The eight problems are split into two articles based on "what state is maintained in the window":

| Article | Problems | Window State |
|------|------|---------|
| **This article (Part 1)** | Minimum Size Subarray Sum, Subarray Product Less Than K, Max Consecutive Ones III, Longest Repeating Character Replacement | All involve **adding/subtracting a single number** on the window (sum, product, count of 0s, frequency), with the shrink condition being a single inequality |
| [(Part 2) Changing State, Reverse Transformation, and Enumerating Dimensions](/technology/sliding-window-exercises-2/) | Contains Duplicate II, Contains Duplicate III, Minimum Operations to Reduce X to Zero, Longest Substring with At Least K Repeating Characters | State switches to hash maps, bucketing, plus two variants: "asking in reverse" and "enumerating an extra dimension" |

These four problems share a common trait: **the window's validity can be determined by a single quantity that changes monotonically with the window** — the sum, product, count of 0s, or the frequency of the most frequent character. So the four blanks ②③④⑤ in the template are all "add/subtract a number + compare an inequality," with no additional data structures needed. The only thing that truly requires thought is: **when is this quantity used to decide shrinking, and when is it used to record the answer.**

### Three-Question Quick Reference for the Four Problems

| Problem | ② Maintain on add | ③ Shrink condition | ④ Update result | What is the answer |
|------|------------|-----------|-----------|-----------|
| [Minimum Size Subarray Sum](#1-minimum-size-subarray-sum-leetcode-209) | `sum += nums[right]` | `sum >= target` (shrink when satisfied) | **Before** shrinking | Minimum length |
| [Subarray Product Less Than K](#2-subarrays-with-product-less-than-k-leetcode-713) | `prod *= nums[right]` | `prod >= k` (shrink when violated) | **After** shrinking, counted by `right - left` | Number of subarrays |
| [Max Consecutive Ones III](#3-max-consecutive-ones-iii-leetcode-1004) | `zeros += (nums[right] == 0)` | `zeros > k` (shrink when violated) | **After** shrinking | Maximum length |
| [Longest Repeating Character Replacement](#4-longest-repeating-character-replacement-leetcode-424) | `cnt[c]++`, maintain `maxCnt` | `right - left - maxCnt > k` (shrink when violated) | **After** shrinking | Maximum length |

> **About the code**
> Each problem provides implementations in C / C++ / JavaScript. The three versions are logically equivalent; switch tabs to view them.
> The window is always written as left-closed, right-open `[left, right)`, so the length is always `right - left`, `nums[right]` is the element that just entered the window, and `nums[left]` is the element about to leave the window.

---
## 1. Minimum Size Subarray Sum (LeetCode 209)

### Problem Description

Given an array `nums` of `n` **positive integers** and a positive integer `target`, find the minimum length of a subarray whose sum is **greater than or equal to** `target`, and return its length. If no such subarray exists, return `0`.

**Example:**

```text
输入：target = 7, nums = [2,3,1,2,4,3]
输出：2
解释：子数组 [4,3] 是该条件下的长度最小的子数组。

输入：target = 4, nums = [1,4,4]          输出：1
输入：target = 11, nums = [1,1,1,1,1,1,1,1]  输出：0
```

**Constraints:** `1 <= target <= 10^9`, `1 <= nums.length <= 10^5`, `1 <= nums[i] <= 10^4`.

### Approach: Shrink Once the Sum Is Enough, Record Before Shrinking

The window state is just a single `sum`. Because the array is **all positive numbers**, `sum` increases monotonically when expanding right and `sum` decreases monotonically when shrinking left. This gives two properties:

1. **As soon as `sum >= target`, you should shrink immediately** — continuing to expand only makes the window longer, never better. This is the classic "shrink when satisfied" pattern (Style A).
2. **Shrinking will definitely break the "already enough" state**, so the answer must be recorded **before** removing `left` — that is, "record first, then break."

Fill in the four blanks following the template: ② when adding, `sum += nums[right]`; ③ the shrink condition is `sum >= target`; ④ record `right - left` on the first line of the shrink loop; ⑤ when removing, `sum -= nums[left]`.

### Walkthrough

Using `target = 7`, `nums = [2,3,1,2,4,3]` as an example:

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

Note two things: `left` will never exceed `right` (the window is always valid); and **each round of shrinking must record first, then remove** — reversing the order will record a window whose "sum is already less than `target`," giving a length that is too small and actually invalid. On this problem, the length obtained for this reason happens to be the same, so it's easy to get away with it; a different dataset will expose the bug (see pitfall 4 below).

### Code Implementation

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

### Complexity

| Dimension | Analysis |
|------|------|
| Time complexity | **O(n)** — `right` and `left` each traverse the entire array in one direction; each element enters the window at most once and leaves at most once |
| Space complexity | **O(1)** — only `sum`, `best`, and two pointers are used |

### Pitfalls

1. **Using `long long` for `sum` is safer.** The upper bound of the window sum is the sum of the entire array `n × nums[i] = 10^5 × 10^4 = 10^9`, and `int` just barely fits it (upper limit around `2.1 × 10^9`); but `target` in the problem itself is given as `10^9`, so if the data scale goes up one more notch it will overflow. Writing `long long` costs nothing.
2. **Return `0` when no answer is found, not the initial value of `best`.** So the initial value should be a sentinel like `n + 1` that can never equal any valid length, and a final check is needed.
3. **The shrink condition uses `>=`, not `>`.** The problem asks for "greater than or equal to `target`"; writing `>` will miss windows whose sum is exactly `target`.
4. **The inner loop must be `while`, not `if`.** In some problems the shrink is "at most one step per round," but not here: when `sum >= target`, you may need to shrink several steps in a row to bring `sum` down. Counterexample: `target = 10, nums = [1,1,1,10]`, the correct answer is 1 (subarray `[10]`). Using `while` will shrink all the way to `[10]`; switching to `if` shrinks only one step, `left` stops at 1, and the answer will be wrongly reported as 4.

> **Extension**: This problem also has an O(n log n) solution — prefix sum + binary search on the answer (fix a length `L`, check whether there exists a window of length `L` with sum ≥ `target`; the check function is monotonic in `L`). Because the array is all positive, the sliding window is already optimal, but this "binary search + prefix sum" technique is very useful for problems where "the window state is hard to maintain."

---
## 2. Subarrays with Product Less Than K (LeetCode 713)

### Problem Description

Given an integer array `nums` and an integer `k`, return the number of contiguous subarrays where the product of all elements in the subarray is **strictly less than** `k`.

**Example:**

```text
输入：nums = [10,5,2,6], k = 100
输出：8
解释：8 个乘积小于 100 的子数组分别为：
      [10]、[5]、[2]、[6]、[10,5]、[5,2]、[2,6]、[5,2,6]。
      注意 [10,5,2] 的乘积是 100，不小于 100，不算。

输入：nums = [1,2,3], k = 0   输出：0
```

**Constraints:** `1 <= nums.length <= 3 * 10^4`, `1 <= nums[i] <= 1000`, `0 <= k <= 10^6`.

### Approach: Each Right Endpoint Contributes `right - left` Subarrays

The window state is `prod`. This problem has the same flavor as the previous one—all positive numbers, `prod` increases monotonically as the window expands and decreases monotonically as it shrinks—but **the shape of the answer is different**:

- The previous problem asked for "the shortest window that satisfies the condition," which is a **window itself**;
- This problem asks for **the number of subarrays**, so you need to know how to count.

The counting method is: fix the right endpoint `right - 1` and ask "how many valid subarrays end at this position." Since the array is all positive numbers, the product only increases as the window grows, so **the valid subarrays ending at `right - 1` have starting points that form exactly the contiguous range `left, left+1, …, right-1`**, giving `right - left` in total. Summing up the contribution of each right endpoint gives the answer.

So the four blanks: ② `prod *= nums[right]`; ③ the shrink condition is `prod >= k` (**shrink when violated**, style B—the smaller `prod` is, the more valid); ④ only **after** shrinking is there a `right - left` to count, so accumulate after the shrink loop; ⑤ `prod /= nums[left]`.

### Walkthrough

Taking `nums = [10,5,2,6]`, `k = 100` as an example:

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

Note the round with `prod = 100`: the problem requires **strictly less than** `k`, so `prod >= k` must shrink; after shrinking to `prod = 10`, the window is `[5,2]`, and the monotonic decrease of `prod` guarantees that "shrinking further only makes it smaller," so no solutions are missed.

### Code Implementation

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

### Complexity

| Dimension | Analysis |
|------|------|
| Time Complexity | **O(n)** — each element enters and leaves the window once, `count += right - left` is O(1) |
| Space Complexity | **O(1)** |

### Common Pitfalls

1. **The shrink loop must include the condition `left < right`.** When `k <= 1` (`nums[i] >= 1`, the product of any non-empty subarray is ≥ 1), `prod >= k` will always hold, and the loop will push `left` to `right`. At this point, if you still try to `prod /= nums[left]`, you will read elements outside the window or even divide by 0. With `left < right` added, it automatically stops when the window is empty, and `count += right - left` contributes exactly 0.
2. **`count += right - left` goes outside the shrink loop.** Putting it inside will double-count multiple windows in the same round.
3. **`count` can be very large.** When `n = 3 × 10^4` and all elements are 1 and `k` is very large, the answer is `n(n+1)/2 = 4.5 × 10^8`, which is still within the `int` range; but if you apply the same template to larger data, remember to switch to 64-bit.
4. **`prod` needs headroom in C / C++.** Shrinking is "shrink when exceeded," so the peak of `prod` is `k × nums[right] ≈ 10^6 × 1000 = 10^9`; `int` is barely enough, but writing `long long` is safer.

---
## 3. Max Consecutive Ones III (LeetCode 1004)

### Problem Description

Given a binary array `nums` and an integer `k`, assuming at most `k` `0` can be flipped, return the maximum number of consecutive `1` in the array after performing the operation.

**Example:**

```text
输入：nums = [1,1,1,0,0,0,1,1,1,1,0], k = 2
输出：6
解释：把下标 3、4 的两个 0 翻转成 1，得到 [1,1,1,1,1,1,0,1,1,1,1,0]，前 6 位是连续的 1；
      把下标 5、10 两个 0 翻转则是后 6 位连续为 1。

输入：nums = [0,0,1,1,0,0,1,1,1,0,1,1,0,0,0,1,1,1,1], k = 3
输出：10
```

**Constraints:** `1 <= nums.length <= 10^5`, `nums[i]` is either `0` or `1`, `0 <= k <= nums.length`.

### Approach: Treat "how many 0s are in the window" as the violation count

"Flip at most `k` 0s" is equivalent to: **find the longest window where the number of 0s in the window does not exceed `k`**. Because after all the `0` in the window are flipped to `1`, the window becomes one continuous stretch of `1`; and the `0` outside the window don't matter.

So the window state is `zeros` (the number of 0s in the window):

- ② When adding `nums[right]`, if it is 0 then `zeros++`;
- ③ The shrink condition is `zeros > k`, which is "shrink on violation" (style B);
- ④ The window is only valid **after** shrinking, and only then do we record `right - left`;
- ⑤ When removing `nums[left]`, if it is 0 then `zeros--`.

This problem is the cleanest example of "shrink on violation": the violation metric corresponds one-to-one with the window contents, with no tricks at all. What is truly worth noting is the position of ④ — **it must be written after the shrink loop**.

### Walkthrough Diagram

Taking `nums = [1,1,1,0,0,0,1,1,1,1,0]`, `k = 2` as an example:

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

Look clearly at the relationship between ③ and ④: **a violating window can never contribute to the score**. The purpose of the shrink loop is to repair the window back to `zeros <= k`, and only after it is repaired do we measure its length.

### Code Implementation

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

### Complexity

| Dimension | Analysis |
|------|------|
| Time Complexity | **O(n)** |
| Space Complexity | **O(1)** |

### Common Pitfalls

1. **`k = 0` is a valid input.** In this case the window cannot contain a single 0, and the answer may be 0 (for example, `nums = [0,0]`), so initializing `best` to 0 is correct; do not use `-1` or `n + 1`.
2. **Record the answer after the shrink loop.** Putting it inside will record a `zeros > k` window, making the answer too large.
3. **Do not actually write the "flips" onto the array.** This problem only asks for the count; the 0s in the window can simply be treated as flippable, and there is no need to actually modify `nums` — once `nums` is modified, all subsequent window statistics will be thrown off.
4. **`zeros > k`, not `zeros >= k`.** At most `k` can be flipped, so `zeros == k` is valid.

---
## 4. Longest Repeating Character Replacement (LeetCode 424)

### Problem Description

You are given a string `s` and an integer `k`. You can choose any character in the string and change it to any other uppercase English letter, and this operation can be performed at most `k` times. Return the length of the longest substring containing the same letter after performing the above operations.

**Example:**

```text
输入：s = "ABAB", k = 2     输出：4
输入：s = "AABABBA", k = 1  输出：4
解释：把中间的 'A' 替换为 'B'，得到 "AABBBBA"，其中子串 "BBBB" 有最长重复字母，长度为 4。
```

**Constraints:** `1 <= s.length <= 10^5`, `s` consists only of uppercase English letters, `0 <= k <= s.length`.

### Approach: Window length − count of the most frequent character in the window ≤ k

This problem and the previous one are **the same problem in different clothing**:

| | 1004 | 424 |
|---|---|---|
| Characters that can be "operated on" | 0 (flip to 1) | Non-most-frequent characters (change to the most frequent character) |
| Window validity condition | `count of 0s in the window <= k` | `window length - count of the most frequent character in the window <= k` |

The reasoning is: to make an entire window into the same letter, the cheapest modification is to "keep the letter that appears most often in the window and change all the rest," so the number of characters to replace is `window length - count of the most frequent character`. If it does not exceed `k`, the window is feasible.

The state we maintain is `cnt[26]` and `maxCnt` (how many times the most frequent character in the window appears). The ③ shrink condition is `right - left - maxCnt > k`.

There is a **key detail** here: `maxCnt` is only updated when a character is added, and **never decreases when a character is removed**. In other words, it records "the maximum frequency ever seen in history," not "the maximum frequency in the current window." Writing it this way has two benefits: the window length becomes monotonically non-decreasing, and shrinking degrades from `while` to `if` (at most one step per round); at the same time, the true answer will not be miscalculated. For why this works, see the pitfalls below.

### Walkthrough

Taking `s = "AABABBA"`, `k = 1` as an example:

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

Note that in the last three rounds, `maxCnt = 3` is already **no longer the true maximum frequency of the current window** (in `[3,7)`, `A` and `B` each appear 2 times), but the window length is held steady at 4, and `best` also stops at 4—and 4 is indeed the correct answer.

### Code Implementation

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

### Complexity

| Dimension | Analysis |
|------|------|
| Time complexity | **O(n)** — each character enters and leaves the window once, and `cnt` has only 26 slots |
| Space complexity | **O(1)** — a fixed-length count array of size 26 |

### Pitfalls

1. **`maxCnt` is not "the maximum frequency of the current window," but "the historical maximum frequency."** It only increases and never decreases, so `length - maxCnt <= k` can only be used to control the window length and cannot be understood as "the current window is definitely valid." Pairing it with `if` (at most one shrink per round, window length monotonically non-decreasing) is the mainstream formulation; if you change it to `while`, you must recompute the true maximum frequency within the window when shrinking, otherwise the judgment condition is no longer equivalent to "the window is valid." (By the way: the claim circulating online that "`while` + a `maxCnt` that only increases and never decreases is definitely wrong" is something I could not verify—I ran both versions on 640,000 exhaustive test cases (118,092 three-letter strings of length ≤ 9 + 524,280 two-letter strings of length ≤ 16), and the results were completely identical. To be safe, still use the `if` version.)
2. **The index for `cnt` must subtract `'A'` (65); do not directly use the character as an index.** In C / C++, `cnt[c]` will go out of bounds; in JS, `cnt[c]` will become `undefined`, and after `++` comes `NaN`, silently producing wrong results all the way.
3. **Shrinking must be written before updating the answer.** As with 1004, an invalid window must not participate in scoring.
4. **Only keep the "lowest-cost" letter in the window as the retained character.** That is, the one with the highest occurrence count—do not enumerate "which letter to keep"; `maxCnt` has already chosen it for you.

---
## Comparison Table of the Four Problems

```text
题目                          ② 加入时维护               ③ 收缩条件                 ④ 更新结果           流派
209  长度最小的子数组        sum += nums[right]        sum >= target              收缩循环内、移出前    满足就缩
713  乘积小于 K 的子数组      prod *= nums[right]       prod >= k                  收缩循环后            违规就缩
1004 最大连续 1 的个数 III    zeros += nums[right]==0   zeros > k                  收缩循环后            违规就缩
424  替换后的最长重复字符      cnt[c]++、更新 maxCnt     right-left-maxCnt > k      收缩循环后            违规就缩
```

Three sentences to summarize:

1. **On arrays of all positive numbers, window states like "sum / product" are naturally monotonic**: expanding makes them larger, shrinking makes them smaller. So the shrink condition is simply "it has crossed some threshold," and the validity of the answer is entirely determined by this inequality.
2. **"Shortest" type problems (209) belong to school A**: once the window satisfies the condition, continuing to expand only makes things worse, so shrink in place, and you must **record the satisfying window before shrinking**.
3. **"Longest" type problems (1004, 424) belong to school B**: once the window violates the condition, shrink first to fix it, and only **after shrinking** is it eligible to measure length. 713 is also school B, except what it records is not length, but "the number of valid windows ending at the current right endpoint."

Looking back at the three questions of the template, the answer to "when to update the result" is reflected most directly here: **will the state you want be destroyed by shrinking? If it will be destroyed, record it in advance; if it won't be destroyed, record it after shrinking.**

## Related Articles

- [Sliding Window Core Code Template: Three Questions to Master All Substring and Subarray Problems](/technology/sliding-window-template/) — The skeleton, three questions, and left-closed right-open interval used in this article
- [Classic Sliding Window Algorithm Exercises (Part 2): Changing State, Reverse Transformation, and Enumeration Dimensions](/technology/sliding-window-exercises-2/) — Hash tables, bucketing, reverse transformation, and enumeration dimensions
- [Sliding Window: A General Approach to Subarray/Substring Problems](/technology/sliding-window/) — Classification of fixed-length, variable-length, and covering windows
- [Array Two Pointers: The Optimization Tool from O(n²) to O(n)](/technology/two-pointers-array/) — The two-pointer idea behind sliding windows