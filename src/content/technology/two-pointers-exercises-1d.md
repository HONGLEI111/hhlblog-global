---
title: 'Classic Two-Pointer Array Problems (Part 1): One-Dimensional Arrays and Strings'
published: 2026-09-29
description: 'A walkthrough of the first five problems in LeetCode''s "Array and Two Pointers" introductory plan: removing duplicates from a sorted array, validating a palindrome, sorting colors, merging two sorted arrays, and squaring a sorted array. Each problem includes pointer invariants, step-by-step diagrams, common pitfalls, and implementations in C, C++, and JavaScript.'
image: ''
tags: [Two Pointers, Arrays, Strings, LeetCode, Fast and Slow Pointers, Dutch National Flag, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Introduction

[Array Two Pointers: An Optimization Tool from O(n²) to O(n)](/technology/two-pointers-array/) covered four pointer patterns. This article begins applying those patterns to real problems.

The nine problems come from LeetCode's "Array and Two Pointers" introductory plan, split into two articles by theme:

| Article | Content | Core Technique |
|------|------|---------|
| **This article (Part 1)** | Remove Duplicates from Sorted Array, Valid Palindrome, Sort Colors, Merge Sorted Array, Squares of a Sorted Array | Pointer movement on one-dimensional arrays |
| [(Part 2) Matrices and Strings](/technology/two-pointers-exercises-matrix/) | Sort Matrix by Diagonals, Shift 2D Grid, Transpose Matrix, Longest Common Prefix | Index mapping and vertical scanning |

These five problems share a common trait: **the answer's determination depends only on the relationship between the two ends or adjacent positions**. Whether it's "duplicates must be adjacent" (Problem 1), "the first and last must be symmetric" (Problem 2), "only three values allow in-place partitioning" (Problem 3), "two sequences are each sorted" (Problem 4), or "the maximum squared value must be at one of the two ends" (Problem 5), each pointer movement can safely eliminate a batch of candidates, compressing what would otherwise be O(n²) enumeration down to O(n).

### Quick Pointer Reference for the Five Problems

| Problem | Pointer Pattern | Pointer Meaning | In One Sentence |
|------|---------|---------|--------|
| Remove Duplicates from Sorted Array | Fast-slow pointers (same direction) | `slow` end of written range, `fast` scans | Write new values after `slow` |
| Valid Palindrome | Left-right pointers (converging) | `i` left end, `j` right end | Skip non-alphanumeric then compare |
| Sort Colors | Three-pointer partitioning | `p0` collects 0s, `p2` collects 2s, `i` scans | After swapping to `p2`, `i` does not advance |
| Merge Sorted Array | Reverse two pointers | `p1`, `p2` each at their end | Fill from back to front, avoiding overwrites |
| Squares of a Sorted Array | Left-right pointers + reverse filling | `i` left end, `j` right end | The maximum must be at one of the two ends |

> **About the Code**
> Each problem provides implementations in C / C++ / JavaScript. The code is fully equivalent; switch tabs to view.
> The C version omits the return parameter management from LeetCode's official signature that isn't used here (such as `returnColumnSizes`), in order to focus on the pointer logic.

---

## 1. Remove Duplicates from Sorted Array (LeetCode 26)

### Problem Description

Given an array `nums` arranged in **non-strictly increasing** order, **in-place** remove the duplicate elements so that each element appears only once, and return the new length of the array after removal. The relative order of the elements should be kept the same.

Since the array's length cannot be changed in some languages, the result must be placed in the first part of the array `nums`. More formally, if there are `k` elements after removing duplicates, then the first `k` elements of `nums` should hold the final result. Return `k`; whatever is placed beyond position `k` doesn't matter.

**Example:**

```text
输入：nums = [1,1,2]
输出：2, nums = [1,2,_]

输入：nums = [0,0,1,1,1,2,2,3,3,4]
输出：5, nums = [0,1,2,3,4,_,_,_,_,_]
```

**Constraints:** `1 <= nums.length <= 3 * 10^4`, `-100 <= nums[i] <= 100`, `nums` is sorted in non-decreasing order.

### Approach: Fast-Slow Pointers Maintaining a "Deduplicated Prefix"

A sorted array means **equal elements must be adjacent**. So we can divide the array into two segments:

- `[0, slow]`: the deduplicated result prefix, where `nums[slow]` is the last element in it;
- `[fast, n-1]`: the part not yet checked.

`fast` starts at 1 and scans rightward:

- If `nums[fast] != nums[slow]`, it means a **new value** has been encountered (since duplicates are necessarily adjacent), so increment `slow` and write the new value to `nums[slow]`;
- Otherwise, this value is the same as the last value already written, so skip it.

When the loop ends, `slow` is the index of the last element of the result, and the length is `slow + 1`.

### Process Illustration

Taking `nums = [0,0,1,1,1,2,2,3,3,4]` as an example:

```text
下标   0  1  2  3  4  5  6  7  8  9
nums   0  0  1  1  1  2  2  3  3  4
       ↑  ↑
     slow fast

fast=1: nums[1]=0 == nums[0]=0  → 重复，跳过
fast=2: nums[2]=1 != nums[0]=0  → slow=1, nums[1]=1
fast=3: nums[3]=1 == nums[1]=1  → 跳过
fast=4: nums[4]=1 == nums[1]=1  → 跳过
fast=5: nums[5]=2 != nums[1]=1  → slow=2, nums[2]=2
fast=6: nums[6]=2 == nums[2]=2  → 跳过
fast=7: nums[7]=3 != nums[2]=2  → slow=3, nums[3]=3
fast=8: nums[8]=3 == nums[3]=3  → 跳过
fast=9: nums[9]=4 != nums[3]=3  → slow=4, nums[4]=4

返回 slow + 1 = 5 → nums 前五位 [0,1,2,3,4] ✔
```

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
int removeDuplicates(int *nums, int numsSize) {
    if (numsSize == 0) return 0;

    int slow = 0;                        /* [0, slow] 是已去重的前缀 */
    for (int fast = 1; fast < numsSize; fast++) {
        if (nums[fast] != nums[slow]) {  /* 发现新值 */
            slow++;
            nums[slow] = nums[fast];
        }
    }
    return slow + 1;                     /* 长度 = 最后下标 + 1 */
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class Solution {
public:
    int removeDuplicates(vector<int>& nums) {
        if (nums.empty()) return 0;

        int slow = 0;                       // [0, slow] 是已去重的前缀
        for (int fast = 1; fast < (int)nums.size(); ++fast) {
            if (nums[fast] != nums[slow]) { // 发现新值
                ++slow;
                nums[slow] = nums[fast];
            }
        }
        return slow + 1;
    }
};
```

```js title="JavaScript"
function removeDuplicates(nums) {
  if (nums.length === 0) return 0;

  let slow = 0;                        // [0, slow] 是已去重的前缀
  for (let fast = 1; fast < nums.length; fast++) {
    if (nums[fast] !== nums[slow]) {   // 发现新值
      slow++;
      nums[slow] = nums[fast];
    }
  }
  return slow + 1;
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time Complexity | **O(n)** — `fast` traverses once |
| Space Complexity | **O(1)** — only two index variables used |
| In-place | **Yes** — only reads and writes within `nums` |

### Common Pitfalls

1. **Return `slow + 1`, not `slow`.** `slow` is an index; the length needs a plus one. An empty array must return 0 separately, otherwise `slow + 1` would return 1.
2. **Compare against `nums[slow]`, not `nums[fast - 1]`.** Both give the same result for this problem, but using `slow` naturally generalizes to "each element may be kept at most k times."
3. **Don't also move `slow` when a duplicate is found.** `slow` only advances when a new value is written.

### Extension: Keep Each Element at Most k Times (LeetCode 80)

Change "compare with the previous written value" to "compare with the previous k written values," and the template generalizes directly:

```cpp
// 有序数组去重，每个元素最多保留 k 个（k = 1 就是本题，k = 2 是 LeetCode 80）
int removeDuplicatesAtMostK(vector<int>& nums, int k) {
    int slow = 0;
    for (int fast = 0; fast < (int)nums.size(); ++fast) {
        // slow < k 时还不够 k 个元素，直接写入；
        // 否则只有当 nums[fast] 与「k 个之前写入的值」不同时，才说明第 k+1 个重复出现了
        if (slow < k || nums[fast] != nums[slow - k]) nums[slow++] = nums[fast];
    }
    return slow;
}
```

---
## 2. Valid Palindrome (LeetCode 125)

### Problem Description

A phrase is considered a **palindrome** if, after converting all uppercase characters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward. Letters and digits are both alphanumeric characters.

Given a string `s`, return `true` if it is a palindrome; otherwise, return `false`.

**Example:**

```text
输入：s = "A man, a plan, a canal: Panama"
输出：true
解释："amanaplanacanalpanama" 是回文串

输入：s = "race a car"
输出：false
解释："raceacar" 不是回文串

输入：s = " "
输出：true
解释：移除非字母数字字符后得到空字符串 ""，空字符串正着反着读都一样
```

**Constraints:** `1 <= s.length <= 2 * 10^5`, `s` consists only of printable ASCII characters.

### Approach: Two Pointers Skipping "Invalid Characters"

If in-place operation is not allowed, the most intuitive approach is to first filter the string into pure alphanumeric characters, then reverse and compare—but that requires O(n) extra space.

The definition of a palindrome only cares about whether the two ends are symmetric, so using two pointers converging from both ends toward the middle is sufficient: `i` moves from left to right, `j` moves from right to left, each skipping non-alphanumeric characters, then comparing the two positions (converting to lowercase uniformly).

Only one pass is needed, and no new string needs to be constructed.

### Process Illustration

```text
s = "A man, a plan, a canal: Panama"
     i                           j

i='A', j='a' → 转小写都是 'a'，相等 → i++, j--

i 前进时跳过 ' '、',' → 'm'；j 回退时跳过 'l'、'a' 等 …… 逐对比较
……

最终 i >= j，全部对称 → true ✔

反例 "race a car"：
i='r', j='r' 相等 → i='a', j='a' 相等 → i='c', j='c' 相等
→ i='e' 跳过空格,j='a' → 'e' != 'a' → false ✘
```

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <ctype.h>
#include <string.h>

int isPalindrome(char *s) {
    int i = 0;
    int j = (int)strlen(s) - 1;

    while (i < j) {
        /* 跳过非字母数字字符，注意内层循环也要检查 i < j */
        while (i < j && !isalnum((unsigned char)s[i])) i++;
        while (i < j && !isalnum((unsigned char)s[j])) j--;

        if (tolower((unsigned char)s[i]) != tolower((unsigned char)s[j])) return 0; /* false */
        i++;
        j--;
    }
    return 1; /* true */
}
```

```cpp title="C++"
#include <cctype>
#include <string>
using namespace std;

class Solution {
public:
    bool isPalindrome(string s) {
        int i = 0;
        int j = (int)s.size() - 1;

        while (i < j) {
            // 跳过非字母数字字符，注意内层循环也要检查 i < j
            while (i < j && !isalnum((unsigned char)s[i])) ++i;
            while (i < j && !isalnum((unsigned char)s[j])) --j;

            if (tolower((unsigned char)s[i]) != tolower((unsigned char)s[j])) return false;
            ++i;
            --j;
        }
        return true;
    }
};
```

```js title="JavaScript"
function isPalindrome(s) {
  const isAlnum = (ch) => /[0-9a-zA-Z]/.test(ch);

  let i = 0;
  let j = s.length - 1;

  while (i < j) {
    // 跳过非字母数字字符，注意内层循环也要检查 i < j
    while (i < j && !isAlnum(s[i])) i++;
    while (i < j && !isAlnum(s[j])) j--;

    if (s[i].toLowerCase() !== s[j].toLowerCase()) return false;
    i++;
    j--;
  }
  return true;
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time Complexity | **O(n)** — `i` only increases, `j` only decreases, totaling n moves |
| Space Complexity | **O(1)** — no new filtered string is constructed |

### Common Pitfalls

1. **The inner `while` must include `i < j`.** Otherwise, when the entire string consists of non-alphanumeric characters (such as `" "`, `"...."`), `i` will keep advancing past `j`, and `j` will retreat past `-1`, with both sides reading and writing outside the array bounds—in C this is undefined behavior, and running with AddressSanitizer will directly report `stack-buffer-overflow`.
2. **C / C++ `isalnum`, `tolower` parameters must be cast to `unsigned char`.** These two functions accept `int` and require values that are `unsigned char` or `EOF`; when passing `char` directly, if the character byte is negative (which is the case for subsequent bytes of UTF-8 multi-byte characters), it is undefined behavior.
3. **`"0P"` is `false`, `"0P0"` is `true`.** Digits must also participate in the comparison; don't only check for letters.
4. **Both `" "` and `""` return `true`.** The loop condition `i < j` ensures that an empty string or a single character is directly judged as successful.

---
## 3. Sort Colors (LeetCode 75)

### Problem Description

Given an array `nums` of `n` elements containing red, white, and blue, **sort them in-place** so that elements of the same color are adjacent, arranged in the order red, white, and blue. We use the integers `0`, `1`, and `2` to represent red, white, and blue respectively.

You must solve this problem without using the library's built-in `sort` function.

**Example:**

```text
输入：nums = [2,0,2,1,1,0]
输出：[0,0,1,1,2,2]

输入：nums = [2,0,1]
输出：[0,1,2]
```

**Constraints:** `n == nums.length`, `1 <= n <= 300`, `nums[i]` is `0`, `1`, or `2`.

**Follow-up:** Could you come up with a one-pass algorithm using only constant extra space?

### Approach: Dutch National Flag Problem, Three Pointers

There are only three possible values, so no real sorting is needed—just **partition the elements into three regions**. Use three pointers to maintain three zones:

```text
[0, p0)  全是 0        p0：下一个 0 该放的位置
[p0, i)  全是 1        i ：当前正在检查的位置
[i, p2]  还没处理      p2：下一个 2 该放的位置
(p2, n)  全是 2
```

At each step, look at `nums[i]` (the leftmost element of the "unprocessed region"):

- `nums[i] == 0`: It belongs on the left, so swap it with `nums[p0]`. After the swap, position `p0` becomes 0, and `p0` moves right by one; the element swapped into position `i` is the original `nums[p0]`—since the `[p0, i)` range is all 1s, the swapped-in element can only be 0 or 1, **its placement is already determined**, so `i` can also move right.
- `nums[i] == 2`: It belongs on the right, so swap it with `nums[p2]`. The element swapped into position `i` is **taken from the tail of the unprocessed region**, which hasn't been examined yet, so `p2` moves left by one but **`i` stays put**, and the next iteration re-examines this position.
- `nums[i] == 1`: It already belongs in the middle, so `i` simply moves right.

When `i > p2`, the unprocessed region is empty and sorting is complete.

### Walkthrough Diagram

Using `nums = [2,0,2,1,1,0]` as an example:

```text
初始：p0=0  i=0                    p2=5
nums   [2, 0, 2, 1, 1, 0]

i=0: nums[0]=2 → 和 nums[5]=0 交换 → p2=4
nums   [0, 0, 2, 1, 1, 2]
i=0: nums[0]=0 → 和 nums[0] 交换（原地） → p0=1, i=1
nums   [0, 0, 2, 1, 1, 2]
i=1: nums[1]=0 → 和 nums[1] 交换（原地） → p0=2, i=2
nums   [0, 0, 2, 1, 1, 2]
i=2: nums[2]=2 → 和 nums[4]=1 交换 → p2=3（i 不动！）
nums   [0, 0, 1, 1, 2, 2]
i=2: nums[2]=1 → i=3
i=3: nums[3]=1 → i=4
i=4 > p2=3 → 结束 ✔
```

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
static void swapInt(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

void sortColors(int *nums, int numsSize) {
    int p0 = 0;                   /* 下一个 0 要放的位置 */
    int i = 0;                    /* 当前扫描位置 */
    int p2 = numsSize - 1;        /* 下一个 2 要放的位置 */

    while (i <= p2) {
        if (nums[i] == 0) {
            swapInt(&nums[i], &nums[p0]);
            p0++;
            i++;                  /* 换过来的一定是 0 或 1，可以跳过 */
        } else if (nums[i] == 2) {
            swapInt(&nums[i], &nums[p2]);
            p2--;                 /* 换过来的是未处理元素，i 不能前进 */
        } else {
            i++;                  /* 1 留在原地 */
        }
    }
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class Solution {
public:
    void sortColors(vector<int>& nums) {
        int p0 = 0;                          // 下一个 0 要放的位置
        int i = 0;                           // 当前扫描位置
        int p2 = (int)nums.size() - 1;       // 下一个 2 要放的位置

        while (i <= p2) {
            if (nums[i] == 0) {
                swap(nums[i], nums[p0]);
                ++p0;
                ++i;                         // 换过来的一定是 0 或 1
            } else if (nums[i] == 2) {
                swap(nums[i], nums[p2]);
                --p2;                        // 换过来的是未处理元素，i 不能前进
            } else {
                ++i;                         // 1 留在原地
            }
        }
    }
};
```

```js title="JavaScript"
function sortColors(nums) {
  let p0 = 0;                  // 下一个 0 要放的位置
  let i = 0;                   // 当前扫描位置
  let p2 = nums.length - 1;    // 下一个 2 要放的位置

  while (i <= p2) {
    if (nums[i] === 0) {
      [nums[i], nums[p0]] = [nums[p0], nums[i]];
      p0++;
      i++;                     // 换过来的一定是 0 或 1，可以跳过
    } else if (nums[i] === 2) {
      [nums[i], nums[p2]] = [nums[p2], nums[i]];
      p2--;                    // 换过来的是未处理元素，i 不能前进
    } else {
      i++;                     // 1 留在原地
    }
  }
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time Complexity | **O(n)** — Each element is swapped at most once; `i` and `p2` together advance n steps |
| Space Complexity | **O(1)** — Only three index variables |
| Number of Passes | **1 pass** — Meets the follow-up requirement |

### Common Pitfalls

1. **After handling a 2, `i` must absolutely not advance.** The element swapped in from the tail hasn't been examined yet—it could be a 0. This is the easiest place to make a mistake in this problem.
2. **The loop condition must be `i <= p2`, not `i < p2`.** When `i == p2`, that position still holds an unprocessed element and must still be checked. Writing `i < p2` will skip a middle element: for example, `nums = [1,0,2,0,1]`, the correct result is `[0,0,1,1,2]`, but `i < p2` will output `[0,1,1,0,2]`.
3. **Don't take the shortcut of "two-pass counting sort."** Counting the number of 0s/1s/2s and then filling them back in is also O(n) time and O(1) space, but it requires two passes and doesn't demonstrate the pointer-partitioning idea.

---
## 4. Merge Two Sorted Arrays (LeetCode 88)

### Problem Description

You are given two integer arrays `nums1` and `nums2` arranged in **non-decreasing order**, along with two integers `m` and `n`, which represent the number of elements in `nums1` and `nums2` respectively.

Please **merge** `nums2` into `nums1` so that the merged array is also arranged in non-decreasing order.

**Note:** The final merged array should not be returned by the function, but stored in array `nums1`. To accommodate this, the initial length of `nums1` is `m + n`, where the first `m` elements represent the elements to be merged, and the last `n` elements are `0` (placeholders) that should be ignored.

**Example:**

```text
输入：nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3
输出：[1,2,2,3,5,6]

输入：nums1 = [1], m = 1, nums2 = [], n = 0
输出：[1]
```

**Constraints:** `nums1.length == m + n`, `nums2.length == n`, `0 <= m, n <= 200`.

### Approach: Write from Back to Front, Not Front to Back

If you merge from front to back, the first `nums2` element written into `nums1[0]` will **overwrite `nums1` elements that haven't been processed yet**, unless you first move all of `nums1` elsewhere (which degrades to O(m+n) extra space).

But notice that the last `n` positions of `nums1` are already empty! So reverse the direction: **fill from the end of the array backward**, each time taking the larger of `nums1` and `nums2`'s remaining parts and placing it at the rightmost position. At this point:

- The write position `tail` is always to the right of `p1` and `p2`, writing into empty slots that have already been read, so it's impossible to overwrite unprocessed elements;
- When `nums2` has been fully moved (`p2 < 0`), the loop ends — at this point the remaining elements of `nums1` are already in their correct positions and don't need to be touched.

### Process Diagram

```text
nums1 = [1,2,3,0,0,0]  m=3      nums2 = [2,5,6]  n=3
          p1=2   tail=5                    p2=2

比较 nums1[2]=3 与 nums2[2]=6 → 6 大 → nums1[5]=6, p2=1, tail=4
          [1,2,3,0,0,6]
比较 3 与 nums2[1]=5 → 5 大 → nums1[4]=5, p2=0, tail=3
          [1,2,3,0,5,6]
比较 3 与 nums2[0]=2 → 3 大 → nums1[3]=3, p1=1, tail=2
          [1,2,3,3,5,6]
比较 nums1[1]=2 与 2 → 相等，取 nums2 → nums1[2]=2, p2=-1, tail=1
          [1,2,2,3,5,6]
p2 < 0 → 结束，nums1 前 m+n 位就是答案 ✔
```

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
void merge(int *nums1, int m, int *nums2, int n) {
    int p1 = m - 1;               /* nums1 中待合并的最后一个元素 */
    int p2 = n - 1;               /* nums2 中待合并的最后一个元素 */
    int tail = m + n - 1;         /* 写入位置，从后往前 */

    while (p2 >= 0) {
        /* p1 可能已经是 -1，必须先判断 p1 >= 0（利用 && 短路） */
        if (p1 >= 0 && nums1[p1] > nums2[p2]) {
            nums1[tail--] = nums1[p1--];
        } else {
            nums1[tail--] = nums2[p2--];
        }
    }
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class Solution {
public:
    void merge(vector<int>& nums1, int m, vector<int>& nums2, int n) {
        int p1 = m - 1;                       // nums1 中待合并的最后一个元素
        int p2 = n - 1;                       // nums2 中待合并的最后一个元素
        int tail = m + n - 1;                 // 写入位置，从后往前

        while (p2 >= 0) {
            // p1 可能已经是 -1，必须先判断 p1 >= 0（利用 && 短路）
            if (p1 >= 0 && nums1[p1] > nums2[p2]) {
                nums1[tail--] = nums1[p1--];
            } else {
                nums1[tail--] = nums2[p2--];
            }
        }
    }
};
```

```js title="JavaScript"
function merge(nums1, m, nums2, n) {
  let p1 = m - 1;              // nums1 中待合并的最后一个元素
  let p2 = n - 1;              // nums2 中待合并的最后一个元素
  let tail = m + n - 1;        // 写入位置，从后往前

  while (p2 >= 0) {
    // p1 可能已经是 -1，必须先判断 p1 >= 0（利用 && 短路）
    if (p1 >= 0 && nums1[p1] > nums2[p2]) {
      nums1[tail--] = nums1[p1--];
    } else {
      nums1[tail--] = nums2[p2--];
    }
  }
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time Complexity | **O(m + n)** — each element is written at most once |
| Space Complexity | **O(1)** — no new array allocated, only three indices used |
| In-place | **Yes** |

### Common Pitfalls

1. **`p1 >= 0` must be written before `nums1[p1] > nums2[p2]`.** Rely on `&&`'s short-circuit evaluation to prevent out-of-bounds access to `nums1[-1]`.
2. **The loop condition can only be `p2 >= 0`.** Don't write it as `p1 >= 0 && p2 >= 0`: when `nums2` is exhausted first, the remaining elements of `nums1` are already in their correct positions and it's indeed safe to stop; but when `nums1` is exhausted first, you must continue moving the remaining elements of `nums2` over (at this point `nums1[p1]` doesn't exist, and the `p1 >= 0` branch automatically takes `else`).
3. **Boundary cases of `m = 0` or `n = 0`.** When `n = 0`, the loop doesn't execute even once, and `nums1` is returned as-is; when `m = 0`, all elements are taken from `nums2`.
4. **Don't first copy `nums2` to the tail of `nums1` and then sort.** That discards the premise that "both arrays are individually sorted," degrading the time to O((m+n)log(m+n)).

---
## 5. Squares of a Sorted Array (LeetCode 977)

### Problem Description

Given an integer array `nums` sorted in **non-decreasing order**, return a new array consisting of the squares of each number, also sorted in **non-decreasing order**.

**Example:**

```text
输入：nums = [-4,-1,0,3,10]
输出：[0,1,9,16,100]
解释：平方后得到 [16,1,0,9,100]，排序后为 [0,1,9,16,100]

输入：nums = [-7,-3,2,3,11]
输出：[4,9,9,49,121]
```

**Constraints:** `1 <= nums.length <= 10^4`, `-10^4 <= nums[i] <= 10^4`, `nums` is sorted in non-decreasing order.

### Approach: The Maximum Value Can Only Appear at Either End

When the array contains negative numbers, the order after squaring no longer matches the original order — `-4` is to the left of `-1`, but after squaring `16 > 1`. However, there is a key property:

> The **maximum value** after squaring must come from either the leftmost end of the array (the negative number with the largest absolute value) or the rightmost end (the largest positive number); it cannot come from the middle.

Because `nums` is monotonically increasing, `|nums[i]|` is monotonically decreasing on the left half and monotonically increasing on the right half, so the maximum value of `|nums[i]|` must be at one of the two ends of the interval.

Therefore, we can generate the result **from largest to smallest**: use two pointers `i` and `j` pointing to the two ends respectively, compare `nums[i]²` with `nums[j]²` each time, fill the larger one into the **end** of the result array, then move the corresponding pointer inward. Filling from back to front this way, the final result is in ascending order.

### Process Illustration

```text
nums = [-4,-1,0,3,10]             res = [ , , , , ]
        i          j
        16   vs   100   → 100 大 → res[4]=100, j=3
[-4,-1,0,3,10]                    res = [ , , , ,100]
  i     j
   16  vs  9         → 16 大  → res[3]=16,  i=1
[-4,-1,0,3,10]                    res = [ , , ,16,100]
     i  j
    1  vs  9         → 9 大   → res[2]=9,   j=2
[-4,-1,0,3,10]                    res = [ , ,9,16,100]
     i=j
    0  vs  0         → i == j，取 0 → res[0]=0

res = [0,1,9,16,100] ✔
```

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>

int *sortedSquares(int *nums, int numsSize, int *returnSize) {
    int *res = (int *)malloc(sizeof(int) * numsSize);
    int i = 0;
    int j = numsSize - 1;
    int k = numsSize - 1;         /* 从结果数组末尾往前填 */

    while (i <= j) {
        int left = nums[i] * nums[i];
        int right = nums[j] * nums[j];
        if (left > right) {
            res[k--] = left;
            i++;
        } else {
            res[k--] = right;
            j--;
        }
    }

    *returnSize = numsSize;
    return res;
}
```

```cpp title="C++"
#include <cmath>
#include <vector>
using namespace std;

class Solution {
public:
    vector<int> sortedSquares(vector<int>& nums) {
        int n = (int)nums.size();
        vector<int> res(n);
        int i = 0, j = n - 1;

        for (int k = n - 1; k >= 0; --k) {
            // 对整数而言 |x| > |y| 等价于 x² > y²
            if (abs(nums[i]) > abs(nums[j])) {
                res[k] = nums[i] * nums[i];
                ++i;
            } else {
                res[k] = nums[j] * nums[j];
                --j;
            }
        }
        return res;
    }
};
```

```js title="JavaScript"
function sortedSquares(nums) {
  const n = nums.length;
  const res = new Array(n);
  let i = 0;
  let j = n - 1;

  for (let k = n - 1; k >= 0; k--) {
    // 对整数而言 |x| > |y| 等价于 x² > y²
    if (Math.abs(nums[i]) > Math.abs(nums[j])) {
      res[k] = nums[i] * nums[i];
      i++;
    } else {
      res[k] = nums[j] * nums[j];
      j--;
    }
  }
  return res;
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time Complexity | **O(n)** — the two pointers together move n times |
| Space Complexity | **O(n)** — the new array returned (this is necessary; in-place output is not possible) |

### Common Pitfalls

1. **The result array must be filled from back to front.** We can only determine the maximum value first; filling from front to back would reverse the order.
2. **`i <= j` instead of `i < j`.** For odd lengths, the middlemost element must also be written in.
3. **Watch out for squaring overflow.** In this problem `|nums[i]| <= 10^4`, the maximum square is 10^8, which `int` can hold; but if the problem were relaxed to `10^5` (square 10^10), C / C++ would have to switch to `long long`.
4. **Don't fool yourself with the square-then-sort approach.** That requires O(n log n), wasting the information that "the array is sorted."

---

## Summary

| Problem | Pointer Pattern | Movement Rule | Time | Space |
|------|---------|---------|------|------|
| Remove Duplicates from Sorted Array | Fast-slow pointers (same direction) | `fast` always advances; `slow` moves only when a new value is found | O(n) | O(1) |
| Valid Palindrome | Left-right pointers (converging) | Skip invalid characters first, then move inward in sync | O(n) | O(1) |
| Sort Colors | Three-pointer partitioning | On 0, both pointers advance together; **on 2, only `p2` moves** | O(n) | O(1) |
| Merge Sorted Array | Reverse two pointers | Compare sizes, the larger one takes `tail` | O(m+n) | O(1) |
| Squares of a Sorted Array | Left-right pointers + reverse filling | Compare squares (absolute values), the larger one fills the end | O(n) | O(n) |

The three movement rhythms that appear across these five problems are worth remembering:

1. **Same-direction fast-slow**: one pointer is responsible for "scanning," one for "writing," and the write pointer only advances when a condition is met (Problem 1).
2. **Converging squeeze**: both ends close in toward the middle, and each step eliminates a batch of impossible states (Problems 2 and 5).
3. **Partition swapping**: multiple boundary pointers cut the array into a confirmed region and an unprocessed region; after swapping, you must judge whether the newly arrived element's belonging has been determined (Problem 3).

Each rhythm must be able to answer the same question: **When I move the pointer this time, why won't I miss the answer?** If you can answer that, you won't write the code wrong.

## Related Articles

- [Classic Array Two-Pointer Exercises (Part 2): Matrices and Strings](/technology/two-pointers-exercises-matrix/) — Next up, index mapping for 2D matrices and longest common prefix
- [Sliding Window Core Code Template: Three Questions to Master All Substring and Subarray Problems](/technology/sliding-window-template/) — When both pointers only move right and the interval they squeeze out has a clear meaning, two pointers level up into a sliding window
- [Array Two Pointers: The Optimization Tool from O(n²) to O(n)](/technology/two-pointers-array/) — The overall framework of the four pointer patterns
- [Linked List Two Pointers: The Elegant Application of Fast-Slow Pointers in Linked Lists](/technology/linked-list-two-pointers/) — The same pattern, transferred to linked lists
- [Binary Search: From Beginner to Boundary Handling Mastery](/technology/binary-search/) — Another means of turning sortedness into O(log n)