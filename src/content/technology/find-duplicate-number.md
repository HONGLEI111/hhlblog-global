---
title: 'Find the Duplicate Number: Binary Search and Fast/Slow Pointers (No Array Modification, O(1) Space)'
published: 2026-09-01
description: Given n+1 integers in the range [1,n], find the unique duplicate without modifying the array and using only O(1) extra space. Solve it with value-range binary search and Floyd's cycle detection (fast/slow pointers), with implementations in C, C++, and JavaScript.
image: ''
tags: [Array, Binary Search, Fast and Slow Pointers, Floyd's Cycle Detection, Two Pointers, Pigeonhole Principle, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Problem Description

Given an array `n + 1` containing `nums` integers, where the numbers are all in the range `[1, n]` (inclusive of 1 and n), it is known that at least one duplicate integer exists.

Assuming that `nums` contains **only one** duplicate integer, return this duplicate number.

Your designed solution must **not modify** the array `nums`, and must use only constant-level **O(1)** extra space.

**Example 1:**

```
输入：nums = [1,3,4,2,2]
输出：2
```

**Example 2:**

```
输入：nums = [3,1,3,4,2]
输出：3
```

**Example 3:**

```
输入：nums = [3,3,3,3,3]
输出：3
```

**Hints and Constraints:**

- `1 <= n <= 10^5`
- `nums.length == n + 1`
- `1 <= nums[i] <= n`
- `nums` contains only one integer that appears twice or more, and all other integers appear only once

## Why at least one duplicate must exist

This is a direct application of the **pigeonhole principle** (drawer principle):

> Place `n + 1` "pigeons" into `n` "nests"; at least one nest must contain two pigeons.

In this problem, the "pigeons" are the `n + 1` elements in the array, and the "nests" are the `n` numbers in the value range `1..n`. The number of elements is one more than the number of possible values, so some number must appear at least twice—the duplicate is guaranteed to exist.

## Solution 1: Binary search on the value range (O(n log n) time / O(1) space)

### Core insight

Intuitively, binary search requires a "sorted array"; but the key to this problem is: **we are not binary searching over array indices, but over the value range `[1, n]`**.

For any candidate value `mid ∈ [1, n]`, count the number of elements in `nums` satisfying `≤ mid`, denoted as `cnt`:

- If `cnt > mid`: this means the range `[1, mid]` "contains more elements than the range itself." By the pigeonhole principle, the duplicate must lie in `[1, mid]`, so tighten the right boundary to `mid`.
- If `cnt <= mid`: this means the duplicate is not in `[1, mid]`, but in `[mid + 1, n]`, so advance the left boundary to `mid + 1`.

> Why must `cnt > mid` contain a duplicate? Because the range `[1, mid]` has only `mid` distinct numbers in total; if each of them appeared at most once, then `≤ mid` would contain at most `mid` elements; now `cnt > mid`, which means some number must appear more than once.

Keep binary searching, and the final converged `left` is the duplicate number.

### Step-by-step illustration

Take `nums = [1,3,4,2,2]`, `n = 4` as an example (value range `[1,4]`):

```text
初始：left=1, right=4

mid = 2，统计 ≤ 2 的元素：[1,2,2] → cnt = 3
3 > 2 → 重复数在 [1,2]，right = 2

mid = 1，统计 ≤ 1 的元素：[1] → cnt = 1
1 > 1 不成立 → 重复数在 [2,2]，left = 2

left == right == 2 → 返回 2 ✔
```

### Complexity

| Dimension | Analysis |
|------|------|
| Time complexity | **O(n log n)** — binary search takes O(log n) rounds in total, each round scans the entire array O(n) |
| Space complexity | **O(1)** — only a few counting variables are used |
| Whether the array is modified | **No** — read-only throughout |

## Solution 2: Fast and slow pointers / Floyd cycle detection (O(n) time / O(1) space)

### Core insight: treat the array as a linked list

This is the most ingenious step in this problem—**treat the array as a linked list**:

- Treat each index `i` as a "node" of the linked list;
- The `next` pointer of node `i` points to `nums[i]`, i.e., `i → nums[i]`.

Since all element values are in `[1, n]`, and the array length is `n + 1`, therefore:

- **No node points to index `0`** (all values are ≥ 1);
- Starting from index `0` and following `next`, one must eventually enter a "cycle."

And the **entrance of this cycle is exactly the duplicate number**—because the duplicate number `d` is pointed to by at least two different indices simultaneously, forming "two paths merging into the same node," which is precisely the characteristic of a cycle entrance.

Thus "finding the duplicate number" is transformed into the familiar problem of "**finding the entrance of a cycle in a linked list**," and we can directly apply **Floyd cycle detection**.

### Two-phase algorithm

- **Phase 1: Find the meeting point inside the cycle.** `slow` moves one step at a time (`slow = nums[slow]`), `fast` moves two steps at a time (`fast = nums[nums[fast]]`), until the two meet.
- **Phase 2: Find the cycle entrance.** Reset `slow` back to index `0`, then `slow` and `fast` advance **at the same speed** (one step at a time); the node where they meet again is the cycle entrance, which is the duplicate number.

### Mathematical proof (brief)

Let the distance from the starting point of the linked list to the cycle entrance be `a`, the distance from the cycle entrance to the first meeting point be `b`, and the cycle length be `L`; then the remaining distance from the meeting point to the cycle entrance is `c = L - b`.

At the first meeting, `slow` has walked `a + b` steps, and `fast` has walked `a + b + k·L` steps (having gone around k extra loops). Since `fast`'s speed is twice `slow`'s:

```text
2(a + b) = a + b + k·L
   a + b = k·L
       a = (k-1)·L + (L - b) = (k-1)·L + c
```

In other words: **the distance from the starting point to the cycle entrance after walking `a` steps equals the distance from the meeting point to the cycle entrance after walking `c` steps (possibly with a few extra loops)**. Therefore, letting `slow` start from the starting point and `fast` start from the meeting point and advance at the same speed, they will definitely meet at the cycle entrance.

> For the complete derivation details, refer to the article "Detecting a cycle in a singly linked list and finding the cycle start" at the end of this post.

### Step-by-step illustration

Take `nums = [1,3,4,2,2]` as an example; the linked list structure is `0 → 1 → 3 → 2 ⇄ 4`:

```text
下标： 0  1  2  3  4
值：   1  3  4  2  2

链表：0 → 1 → 3 → 2 ⇄ 4   （2 和 4 构成环，环入口是 2）

第一阶段（找相遇点）：
slow=0, fast=0
  slow=nums[0]=1, fast=nums[nums[0]]=nums[1]=3
  slow=nums[1]=3, fast=nums[nums[3]]=nums[2]=4
  slow=nums[3]=2, fast=nums[nums[4]]=nums[2]=4
  slow=nums[2]=4, fast=nums[nums[4]]=nums[2]=4  ← 在 4 相遇

第二阶段（找环入口）：
slow 重置到 0，fast 留在 4
  slow=nums[0]=1, fast=nums[4]=2
  slow=nums[1]=3, fast=nums[2]=4
  slow=nums[3]=2, fast=nums[4]=2  ← 在 2 相遇
返回 2 ✔
```

### Complexity

| Dimension | Analysis |
|------|------|
| Time complexity | **O(n)** — each of the two phases performs a linear scan |
| Space complexity | **O(1)** — only two pointers are used |
| Whether the array is modified | **No** — read-only throughout |
## Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdio.h>

/* Approach 1: Binary search on the value range */
int findDuplicateBinarySearch(int *nums, int numsSize) {
    int left = 1, right = numsSize - 1; /* The value range is [1, n], n = numsSize - 1 */

    while (left < right) {
        int mid = left + (right - left) / 2;
        int cnt = 0;
        for (int i = 0; i < numsSize; i++) {
            if (nums[i] <= mid) cnt++;
        }
        if (cnt > mid) {
            right = mid;    /* The duplicate is in [left, mid] */
        } else {
            left = mid + 1; /* The duplicate is in [mid+1, right] */
        }
    }
    return left;
}

/* Approach 2: Fast and slow pointers (Floyd's cycle detection) */
int findDuplicateFloyd(int *nums, int numsSize) {
    (void)numsSize;
    int slow = 0, fast = 0;

    /* Phase 1: Find the meeting point inside the cycle */
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow != fast);

    /* Phase 2: Find the cycle entrance (i.e., the duplicate) */
    slow = 0;
    while (slow != fast) {
        slow = nums[slow];
        fast = nums[fast];
    }
    return slow;
}
```

```cpp title="C++"
#include <vector>
using namespace std;

class Solution {
public:
    /* Approach 1: Binary search on the value range */
    int findDuplicateBinarySearch(vector<int>& nums) {
        int n = nums.size() - 1;
        int left = 1, right = n;

        while (left < right) {
            int mid = left + (right - left) / 2;
            int cnt = 0;
            for (int x : nums) {
                if (x <= mid) cnt++;
            }
            if (cnt > mid) {
                right = mid;    // The duplicate is in [left, mid]
            } else {
                left = mid + 1; // The duplicate is in [mid+1, right]
            }
        }
        return left;
    }

    /* Approach 2: Fast and slow pointers (Floyd's cycle detection) */
    int findDuplicateFloyd(vector<int>& nums) {
        int slow = 0, fast = 0;

        // Phase 1: Find the meeting point inside the cycle
        do {
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);

        // Phase 2: Find the cycle entrance (i.e., the duplicate)
        slow = 0;
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[fast];
        }
        return slow;
    }
};
```

```js title="JavaScript"
/* Approach 1: Binary search on the value range */
function findDuplicateBinarySearch(nums) {
    let left = 1;
    let right = nums.length - 1;

    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        let cnt = 0;
        for (const x of nums) {
            if (x <= mid) cnt++;
        }
        if (cnt > mid) {
            right = mid;    // The duplicate is in [left, mid]
        } else {
            left = mid + 1; // The duplicate is in [mid+1, right]
        }
    }
    return left;
}

/* Approach 2: Fast and slow pointers (Floyd's cycle detection) */
function findDuplicateFloyd(nums) {
    let slow = 0;
    let fast = 0;

    // Phase 1: Find the meeting point inside the cycle
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow !== fast);

    // Phase 2: Find the cycle entrance (i.e., the duplicate)
    slow = 0;
    while (slow !== fast) {
        slow = nums[slow];
        fast = nums[fast];
    }
    return slow;
}
```
:::

## Solution Comparison

| Solution | Time Complexity | Space Complexity | Modifies Array | Core Idea |
|------|-----------|-----------|---------|---------|
| Binary search on value range | O(n log n) | O(1) | No | Binary search on value range + pigeonhole principle counting |
| Fast and slow pointers | **O(n)** | O(1) | No | Model the array as a linked list + Floyd's cycle detection |

- **Binary search** is more general: it applies as long as there exists a property of "counting by threshold satisfies monotonicity," and does not depend on the special value range of `[1, n]`; the cost is being one notch slower (an extra log n).
- **Fast and slow pointers** is the linear optimal solution, but it is highly technique-dependent: it relies on the precise structure of "value range `[1, n]`, length `n + 1`" to perfectly model the array as a linked list with a cycle.

## Key Points

1. **The pigeonhole principle is the foundation of correctness**: the binary search solution's "`cnt > mid` means the duplicate is on the left side" is precisely another formulation of the pigeonhole principle.
2. **Binary search does not necessarily mean binary searching indices**: this problem demonstrates the important variant of "binary searching on the value range," turning "finding a number" into "finding the first position that satisfies `cnt > mid`."
3. **Treating the array as a linked list is a stroke of genius**: the modeling of `i → nums[i]` brings "finding the duplicate number" back to the familiar problem of "finding the cycle entrance."
4. **Both naturally satisfy the constraints**: the entire process only reads the array and uses only O(1) space, with no need for sorting, hash tables, or marking.

## Extended Thoughts

- If **modifying the array is allowed**, there is a more intuitive approach: during traversal, negate the value at the position corresponding to `nums[i]` as a "mark," and when a negative value is encountered again, the duplicate is found (negation marking method, O(n) time).
- If **O(n) extra space is allowed**, simply use a hash table to count occurrences, which is the most straightforward baseline for comparison.
- The linked list modeling in this problem relies on "the value range being exactly `[1, n]`." If the value range is broken (for example, containing 0), can it still be modeled as a linked list? Hint: index 0 needs a property of "never being pointed to."

## Related Articles

- [Detecting a Cycle in a Singly Linked List and Finding the Cycle Entrance](/technology/linked-list-cycle/) — the standard version of Floyd's cycle detection on linked lists, with complete mathematical derivation
- [Binary Search: From Beginner to Mastery of Boundary Handling](/technology/binary-search/) — the fundamentals of binary search on value ranges and boundary handling
- [Array Two Pointers](/technology/two-pointers-array/) — an overview of two-pointer patterns such as fast and slow pointers