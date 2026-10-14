---
title: 'Sliding Window Core Template: Three Questions to Solve Any Substring or Subarray Problem'
published: 2026-09-29
description: 'Distill a unified sliding window template from four classic problems—minimum window substring, permutation in string, find all anagrams in a string, and longest substring without repeating characters—by answering three questions: when to expand, when to shrink, and when to update the result. Also explains why the window interval is best written as left-closed, right-open. Includes implementations in C, C++, and JavaScript.'
image: ''
tags: [Sliding Window, Two Pointers, String, LeetCode, Template, C, C++, JavaScript]
category: Algorithms
draft: false
---
## Why Start with a Template

[Sliding Window: A General Approach to Subarray/Substring Problems](/technology/sliding-window/) was about **classification**: what fixed-length windows, variable-length windows, and covering windows each look like. This article addresses a different problem — **when I actually sit down to write code, I don't know which line to start on**.

The code skeleton for substring and subarray problems is actually the same set of structures; the only differences are a few "fill-in-the-blank" spots. As long as you can clearly answer three questions before you start writing, all that's left is to copy down the template:

> **Three Questions**
>
> 1. When should `right` move to expand the window? When a character is added to the window, what data should be updated?
> 2. When should the window stop expanding and start moving `left` to shrink the window? When a character is removed from the window, what data should be updated?
> 3. When should the result be updated?

This article first distills a template from four real problems (Minimum Window Substring, Permutation in String, Find All Anagrams in a String, Longest Substring Without Repeating Characters), then works through each problem to write out and compare the answers to these three questions. You'll find that the answer to the third question splits into two camps, and that's exactly where mistakes are most likely to happen.

---

## Template Overview

```text
/* 滑动窗口通用骨架：变长窗口，窗口表示为左闭右开区间 [left, right) */
left = 0, right = 0
初始化窗口状态（need / win / valid 等）与答案变量

while (right < n):                    /* right 还没走到尽头，就继续扩张 */
    c = s[right]                      /* ① 即将进入窗口的字符 */
    right++                           /*    区间变成 [left, right)，c 已入窗 */
    更新窗口状态(c)                    /* ② 加入一个字符后要维护哪些数据 */

    while (窗口需要收缩):              /* ③ 收缩条件 —— 每道题不一样 */
        更新答案（可选）                /* ④ 更新时机 —— 每道题不一样，可分两派 */
        d = s[left]                   /*    即将离开窗口的字符 */
        left++                        /*    区间变成 [left+1, right) */
        更新窗口状态(d)                 /* ⑤ 移出一个字符后要维护哪些数据 */

返回答案
```

In the skeleton, only three "fill-in-the-blank" spots are problem-specific: **③ the shrink condition**, **④ where to update the answer**, and **the state maintained in ② and ⑤**. The order of operations for ①②⑤ is fixed and doesn't need to be re-derived each time.

As for the state maintained in ② and ⑤, the common categories are just these:

| State | When adding `c` | When removing `d` | Used in |
|------|------------|------------|--------|
| Count `win[c]` | `win[c]++` | `win[d]--` | Covering, anagrams, deduplication |
| Number of satisfied types `valid` | When exactly satisfied `valid++` | When about to become unsatisfied `valid--` | Covering type |
| Interval sum `sum` | `sum += c` | `sum -= d` | Subarray sum, averages |
| Deduplication count | `win[c]++` | `win[d]--` | Longest substring without repeating characters |

Among these, the variable `valid` deserves a special mention: it records "**how many character types have reached their required count**." Without it, you'd have to compare the entire `win` and `need` tables every time, making the check for whether the window satisfies the condition O(alphabet size); with it, the check degenerates to a single `valid == need.size()`, which is O(1). This is the only state in the template that was "introduced for performance."

---

## Question 1: When should `right` move?

**The answer is almost always: unconditionally.**

Look at the skeleton again: `while (right < n)` is the moment of expansion — as long as you haven't reached the end of the string, keep expanding right. The sliding window doesn't need to judge "whether it should expand now," because expansion is its default action.

So what the first question really needs to answer is the **second half**: when adding a character, what data do I need to update? This depends on what the problem is "tracking":

- Minimum Window Substring, Permutation in String, Find All Anagrams: maintain `win[c]` count + `valid` number of satisfied types;
- Longest Substring Without Repeating Characters: maintain `win[c]` count to detect duplicates;
- Minimum Size Subarray Sum: maintain `sum`.

A common pitfall is **forgetting to update the state**. In the template, state must be updated immediately after `right++` — don't insert any `continue`-style branches in between. Once any path skips the update, `win` and the actual window contents fall out of sync, and all subsequent checks will be wrong.

---

## Question 2: When should `left` shrink?

**The answer splits into two schools — this is the real watershed of sliding window problems.**

The way to decide is to ask yourself: **Is the window's "valid state" reached after shrinking, or before shrinking?**

### School A: Already satisfies the condition, any bigger is redundant → shrink when satisfied

Representative problems: Minimum Window Substring (already covers `t`), Permutation in String / Find All Anagrams (length has reached `|s1|`).

```text
while (valid == need.size())      // 窗口已经覆盖目标，继续扩张只会变长
while (right - left >= len1)      // 窗口长度已经达到模式串长度，再长就不可能是排列
```

The window in these problems is "**the bigger, the easier to satisfy**": the wider the window, the more chances to cover the target characters. So once satisfied, it means "the current right boundary doesn't need to go further; we only need to consider whether the left boundary can tighten a bit more," and shrinking begins immediately.

The latter two conditions `right - left >= len1` are essentially a **fixed-length window**: shrink once the length is reached, ensuring the window length is always exactly `len1`. This is also why "Permutation in String" and "Find All Anagrams" are essentially the same problem — both use a fixed-length window + count verification.

### School B: Already violates the condition → shrink when violated

Representative problem: Longest Substring Without Repeating Characters.

```text
while (win[c] > 1)                // 新加入的 c 在窗口里重复了，必须缩到不重复
```

The window in these problems is "**the smaller, the easier to satisfy**": the narrower the window, the less likely a duplicate appears. So after expanding, you first check whether it violates the condition, and once it does, shrink all the way until it's valid again.

The conditions for both schools are written in the same `while`, but the semantics are completely opposite: one is "**it's already good, try asking for a little less**," and the other is "**it's already broken, shrink until it's good**." Before writing code, figure out which school the problem belongs to, and the shrink condition writes itself.

---

## Question 3: When should the result be updated?

**The answer also splits into two schools, and it's directly related to the choice in Question 2.**

| The window state you want | At which moment it appears | Where to write the update code |
|---------------|-------------|---------------|
| "Exactly covers" / "length exactly k" | **Before shrinking** | Inside the shrink loop, and **before removing `left`** |
| "Valid (e.g., no duplicates)" | **After shrinking** | After the shrink loop |

- **Minimum Window Substring** wants "the shortest window that exactly covers `t`." Once the window is shrunk, it may lose its covering property — so the state you need appears **before** shrinking. Therefore, recording the answer must go on the first line of the shrink loop; the order is "record first, then destroy."
- **Permutation in String / Find All Anagrams** is the same: the hit check must be written before removing `left`.
- **Longest Substring Without Repeating Characters** wants "a window with no duplicates." After expanding, the window may be invalid, and recording the answer in an invalid state would be wrong — so you must fix the window first, then record. The order is "fix first, then record."

> One-sentence summary of Question 3: **"Record before shrinking" or "record after shrinking" depends on whether the state you want is one that shrinking would destroy.**

The consequences of getting the order wrong are typical: in Minimum Window Substring, writing the record after removal would treat "a window that no longer covers `t`" as the answer, yielding a length that's too small and content that's invalid; in Longest Substring Without Repeating Characters, writing the record before shrinking would count windows containing duplicate characters, yielding an answer that's too large.

---

## Why the Window Interval Is Best Written as Left-Closed, Right-Open

Looking through all the solutions, the window is almost always written as `[left, right)` (left-closed, right-open) rather than `[left, right]` (left-closed, right-closed). This isn't a stylistic preference — it eliminates three common categories of errors:

| Comparison | Left-closed, right-open `[left, right)` | Left-closed, right-closed `[left, right]` |
|--------|------------------------|------------------------|
| How to represent an empty window | `left == right`, initial `0, 0` is an empty window | `right = left - 1`, initial value would produce `-1` |
| Window length | `right - left` | `right - left + 1`, one extra `±1` |
| Adding a character | `c = s[right]; right++` | `right++; c = s[right]` (move first, then access) |
| Removing a character | `d = s[left]; left++` | `d = s[left]; left++` (access first, then move) |

Four benefits:

1. **Length is just `right - left`.** The shrink condition for a fixed-length window can therefore be written directly as `right - left >= k`, without going back and forth between `> k` and `>= k + 1`; checking "whether the window is empty" is just `left == right`.
2. **The initial state is naturally self-consistent.** An empty window is just `0, 0`; in the first loop iteration, `s[right]` is the first character and `right` is the first position to be added — no special cases in the logic.
3. **The two actions of adding and removing are perfectly symmetric.** Adding is always "access `s[right]`, then `right++`"; removing is always "access `s[left]`, then `left++`." Both follow "**access the character first, then move the pointer**." Switch to left-closed, right-closed, and adding becomes "`right++` first, then access," which is the opposite gesture from removing — this is a breeding ground for off-by-one errors like `right - left + 1`.
4. **The invariant is stated more cleanly.** The statement "the elements within `[left, right)` are exactly the current window" holds at the end of every iteration, at the start of the loop, and at the end of the loop, without needing extra explanation for the special meaning of `right` (last element vs. next position to be added).

In the template, `s[right - 1]` is "the character just added" and `s[left]` is "the character about to be removed" — all these conveniences come from left-closed, right-open.

---
## Example 1: Minimum Window Substring (LeetCode 76)

### Problem Description

Given a string `s` and a string `t`, return the minimum substring of `s` that covers all characters in `t`. If no substring in `s` covers all characters in `t`, return the empty string `""`.

Note: For duplicate characters in `t`, the count of that character in the substring we seek must be no less than the count of that character in `t`.

**Example:**

```text
输入：s = "ADOBECODEBANC", t = "ABC"
输出："BANC"
解释：最小覆盖子串 "BANC" 包含来自字符串 t 的 'A'、'B' 和 'C'。

输入：s = "a", t = "a"     输出："a"
输入：s = "a", t = "aa"    输出：""
```

**Constraints:** `1 <= m, n <= 10^5` (`m == s.length`, `n == t.length`), `s` and `t` consist of uppercase and lowercase English letters, and the test cases guarantee a unique answer.

### Three Questions

:::tip[The three answers for this problem]
1. **When to expand `right`**: Expand unconditionally. When adding `c`, if `c` belongs to `t`, increment `win[c]`; when `win[c]` exactly equals `need[c]`, increment `valid` (indicating one more character has met the requirement).
2. **When to shrink `left`**: Start shrinking when `valid == need.size()`, that is, "the window has already covered all characters of `t`." When removing `d`, if `d` just drops from "meeting the requirement" (`win[d] == need[d]`), first decrement `valid`, then decrement `win[d]`.
3. **When to update the result**: **Inside** the shrink loop, **before removal** — at this point the window exactly "just covers `t`," which is precisely the shortest candidate we want. The order must be **record first, then remove**.
:::

### Process Walkthrough

Using `s = "ADOBECODEBANC"` and `t = "ABC"` as an example (`need: A=1, B=1, C=1`, `need.size() == 3`):

```text
s = A D O B E C O D E B A N C
    0 1 2 3 4 5 6 7 8 9 10 11 12

加入 A → valid = 1
加入 B → valid = 2
加入 C → valid = 3   ← 窗口 [0,6) = "ADOBEC" 已覆盖 t，进入收缩循环
  ├ 先记录答案：[0,6) 长度 6 → minLen = 6（暂定 "ADOBEC"）
  └ 再移出 s[0]='A' → A 不再达标 → valid = 2 → 退出收缩

…… right 继续扩张到 11（窗口 [1,11)），A 重新达标 → valid = 3
   收缩循环里长度依次是 10、9、8、7、6，都不比 6 更优，所以都不更新答案

加入 C（下标 12）→ valid = 3，窗口 [6,13) = "ODEBANC" 长度 7
  ├ 长度 7 > 6，不更新
  ├ 移出 O（不在 t 中，valid 不变）→ 窗口 [7,13) = "DEBANC" 长度 6，仍不更优
  ├ 再移出 D → 窗口 [8,13) = "EBANC" 长度 5 → 刷新 minLen = 5
  ├ 移出 E → 窗口 [9,13) = "BANC" 长度 4 → 刷新 minLen = 4
  └ 移出 B → B 不再达标 → valid = 2 → 退出收缩

答案 "BANC" ✔
```

Note a detail in the second step: in window `[3,11) = "BECODEBA"`, `B` appears twice, `win[B] = 2 > need[B] = 1`. At this point, after removing one `B`, `win[B]` drops to 1 and **still meets the requirement**, so `valid` should not change. The code checks `win[d] == need[d]` (not meeting the requirement only after removal) rather than `win[d] <= need[d]`, precisely to handle this case.

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>
#include <string.h>

char *minWindow(char *s, char *t) {
    int need[128] = {0}, win[128] = {0};   /* need: target counts; win: window counts */
    int needKinds = 0;                     /* how many distinct characters are in the target */
    for (int i = 0; t[i] != '\0'; i++) {
        if (need[(unsigned char)t[i]] == 0) needKinds++;
        need[(unsigned char)t[i]]++;
    }

    int left = 0, right = 0;
    int valid = 0;                         /* how many distinct characters have reached the required count */
    int start = 0, minLen = -1;
    int n = (int)strlen(s);

    while (right < n) {
        char c = s[right];                 /* 1. character about to enter the window */
        right++;                           /* 2. expand the window to the right */
        if (need[(unsigned char)c] > 0) {  /* 3. update the data inside the window */
            win[(unsigned char)c]++;
            if (win[(unsigned char)c] == need[(unsigned char)c]) valid++;
        }

        while (valid == needKinds) {       /* 4. the window already covers t, start shrinking */
            if (minLen == -1 || right - left < minLen) {   /* record the answer first, then remove */
                start = left;
                minLen = right - left;
            }
            char d = s[left];              /* 5. remove left */
            left++;
            if (need[(unsigned char)d] > 0) {
                if (win[(unsigned char)d] == need[(unsigned char)d]) valid--;
                win[(unsigned char)d]--;
            }
        }
    }

    char *res = (char *)malloc(minLen < 0 ? 1 : minLen + 1);
    if (minLen < 0) {
        res[0] = '\0';
    } else {
        memcpy(res, s + start, minLen);
        res[minLen] = '\0';
    }
    return res;
}
```

```cpp title="C++"
#include <string>
#include <vector>
using namespace std;

class Solution {
public:
    string minWindow(string s, string t) {
        int need[128] = {0}, win[128] = {0};   // need: target counts; win: window counts
        int needKinds = 0;                      // how many distinct characters are in the target
        for (char c : t) {
            if (need[(unsigned char)c] == 0) ++needKinds;
            ++need[(unsigned char)c];
        }

        int left = 0, right = 0;
        int valid = 0;                          // how many distinct characters have reached the required count
        int start = 0, minLen = -1;

        while (right < (int)s.size()) {
            char c = s[right];                  // 1. character about to enter the window
            ++right;                            // 2. expand the window to the right
            if (need[(unsigned char)c] > 0) {   // 3. update the data inside the window
                ++win[(unsigned char)c];
                if (win[(unsigned char)c] == need[(unsigned char)c]) ++valid;
            }

            while (valid == needKinds) {        // 4. the window already covers t, start shrinking
                if (minLen == -1 || right - left < minLen) {   // record the answer first
                    start = left;
                    minLen = right - left;
                }
                char d = s[left];               // 5. remove left
                ++left;
                if (need[(unsigned char)d] > 0) {
                    if (win[(unsigned char)d] == need[(unsigned char)d]) --valid;
                    --win[(unsigned char)d];
                }
            }
        }
        return minLen == -1 ? "" : s.substr(start, minLen);
    }
};
```

```js title="JavaScript"
function minWindow(s, t) {
  const need = new Map();                 // need: target counts
  for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);

  const win = new Map();                  // win: window counts
  let left = 0;
  let right = 0;
  let valid = 0;                          // how many distinct characters have reached the required count
  let start = 0;
  let minLen = Infinity;

  while (right < s.length) {
    const c = s[right];                   // 1. character about to enter the window
    right++;                              // 2. expand the window to the right
    if (need.has(c)) {                    // 3. update the data inside the window
      win.set(c, (win.get(c) ?? 0) + 1);
      if (win.get(c) === need.get(c)) valid++;
    }

    while (valid === need.size) {         // 4. the window already covers t, start shrinking
      if (right - left < minLen) {        // record the answer first, then remove
        start = left;
        minLen = right - left;
      }
      const d = s[left];                  // 5. remove left
      left++;
      if (need.has(d)) {
        if (win.get(d) === need.get(d)) valid--;
        win.set(d, win.get(d) - 1);
      }
    }
  }

  return minLen === Infinity ? "" : s.slice(start, start + minLen);
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time complexity | **O(m + n)** — `right` and `left` each traverse the entire range in one direction, with each character entering and leaving the window at most once |
| Space complexity | **O(1)** — C / C++ uses a fixed-size array of 128; JS's Map stores at most 52 types of letters |

### Common Pitfalls

1. **Recording the answer must happen before removing `left`.** Placing it on the second line of the loop would record a window that no longer covers `t`.
2. **The check for `valid` must use `win[d] == need[d]`, not `<=`.** A character in the window may be in excess (such as the two `B` in the walkthrough above); when dropping from excess to exactly meeting the requirement, `valid` should not change.
3. **Duplicate characters in `t` must be counted by quantity.** `s = "a", t = "aa"` must return `""`, which is guaranteed by the exact comparison of `win[c] == need[c]`.
4. **Using a fixed-size array instead of a hash table saves constants.** `s` and `t` contain only uppercase and lowercase letters (52 types), so `int[128]` is completely sufficient — faster and more memory-efficient than a Map.

---
## Example 2: Permutation in String (LeetCode 567)

### Problem Description

Given two strings `s1` and `s2`, write a function to determine whether `s2` contains a permutation of `s1`. If so, return `true`; otherwise, return `false`. In other words, one of the permutations of `s1` is a substring of `s2`.

**Example:**

```text
输入：s1 = "ab", s2 = "eidbaooo"      输出：true
解释：s2 包含 s1 的排列之一 ("ba")

输入：s1 = "ab", s2 = "eidboaoo"      输出：false
```

**Constraints:** `1 <= s1.length, s2.length <= 10^4`, `s1` and `s2` consist of lowercase English letters only.

### Three Questions

:::tip[The three answers for this problem]
1. **When to expand `right`**: Expand unconditionally. The maintained data is exactly the same as the previous problem: `win[c]` and `valid`.
2. **When to shrink `left`**: Shrink when `right - left >= s1.size()` — the window length has already reached `|s1|`, and any longer would make it absolutely impossible to be a permutation. This is a **fixed-length window**.
3. **When to update the result**: Return as soon as it hits. The check is written **inside** the shrink loop, **before removal**: at this moment the window length is exactly `|s1|`, and as long as `valid == need.size()`, it means the character counts in the window match `s1` exactly.
:::

### Walkthrough

Taking `s1 = "ab"` and `s2 = "eidbaooo"` as an example:

```text
s2 = e i d b a o o o
     0 1 2 3 4 5 6 7      s1 = "ab" → need: a=1, b=1, kinds=2

加入 e → 窗口 [0,1)="e"  valid=0
加入 i → 窗口 [0,2)="ei" valid=0
  长度 2 已达 |s1| → 检查 valid(0) != 2 → 未命中，移出 'e' → 窗口 [1,2)
加入 d → 窗口 [1,3)="id" valid=0 → 检查未命中，移出 'i' → 窗口 [2,3)
加入 b → 窗口 [2,4)="db" valid=1 → 检查未命中，移出 'd' → 窗口 [3,4)
加入 a → 窗口 [3,5)="ba" valid=2 → 检查 valid == kinds 命中 → 返回 true ✔
```

The window length is strictly pinned to 2 by `right - left >= s1.size()`, so each round checks a window of "exactly length `|s1|`" — this is precisely the fixed-length window approach.

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <string.h>

int checkInclusion(char *s1, char *s2) {
    int need[128] = {0}, win[128] = {0};
    int needKinds = 0;
    for (int i = 0; s1[i] != '\0'; i++) {
        if (need[(unsigned char)s1[i]] == 0) needKinds++;
        need[(unsigned char)s1[i]]++;
    }

    int left = 0, right = 0, valid = 0;
    int len1 = (int)strlen(s1), len2 = (int)strlen(s2);

    while (right < len2) {
        char c = s2[right];
        right++;
        if (need[(unsigned char)c] > 0) {
            win[(unsigned char)c]++;
            if (win[(unsigned char)c] == need[(unsigned char)c]) valid++;
        }

        while (right - left >= len1) {     /* the window cannot grow any longer */
            if (valid == needKinds) return 1;
            char d = s2[left];
            left++;
            if (need[(unsigned char)d] > 0) {
                if (win[(unsigned char)d] == need[(unsigned char)d]) valid--;
                win[(unsigned char)d]--;
            }
        }
    }
    return 0;
}
```

```cpp title="C++"
#include <string>
using namespace std;

class Solution {
public:
    bool checkInclusion(string s1, string s2) {
        int need[128] = {0}, win[128] = {0};
        int needKinds = 0;
        for (char c : s1) {
            if (need[(unsigned char)c] == 0) ++needKinds;
            ++need[(unsigned char)c];
        }

        int left = 0, right = 0, valid = 0;

        while (right < (int)s2.size()) {
            char c = s2[right];
            ++right;
            if (need[(unsigned char)c] > 0) {
                ++win[(unsigned char)c];
                if (win[(unsigned char)c] == need[(unsigned char)c]) ++valid;
            }

            while (right - left >= (int)s1.size()) {   // the window cannot grow any longer
                if (valid == needKinds) return true;
                char d = s2[left];
                ++left;
                if (need[(unsigned char)d] > 0) {
                    if (win[(unsigned char)d] == need[(unsigned char)d]) --valid;
                    --win[(unsigned char)d];
                }
            }
        }
        return false;
    }
};
```

```js title="JavaScript"
function checkInclusion(s1, s2) {
  const need = new Map();
  for (const c of s1) need.set(c, (need.get(c) ?? 0) + 1);

  const win = new Map();
  let left = 0;
  let right = 0;
  let valid = 0;

  while (right < s2.length) {
    const c = s2[right];
    right++;
    if (need.has(c)) {
      win.set(c, (win.get(c) ?? 0) + 1);
      if (win.get(c) === need.get(c)) valid++;
    }

    while (right - left >= s1.length) {   // the window cannot grow any longer
      if (valid === need.size) return true;
      const d = s2[left];
      left++;
      if (need.has(d)) {
        if (win.get(d) === need.get(d)) valid--;
        win.set(d, win.get(d) - 1);
      }
    }
  }
  return false;
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time complexity | **O(len2)** — the window length is constant, and each character enters and leaves once |
| Space complexity | **O(1)** — the size of the count table depends on the character set (26 lowercase letters) |

### Common Pitfalls

1. **The shrink condition is `>=`, not `==`.** Use `while` instead of `if` to ensure the window length strictly does not exceed `|s1|`; writing `==` will miss the shrink under certain inputs.
2. **The hit check goes inside the shrink loop, before removal.** Once you remove first, the window length is no longer `|s1|`.
3. **Don't try to enumerate all permutations of `s1`.** When `|s1| = 10^4`, the number of permutations is astronomical; you must replace "enumerating permutations" with "equal counts."
4. **When `s1` is longer than `s2`, return `false` directly.** This boundary case is handled automatically by the code above (the loop condition fails from the start), but make sure you haven't done any out-of-bounds access outside the loop.

---
## Example 3: Find All Anagrams in a String (LeetCode 438)

### Problem Description

Given two strings `s` and `p`, find all substrings in `s` that are **anagrams** of `p`, and return the starting indices of these substrings. The order of the output does not matter.

An anagram is a string formed by rearranging the same letters (including identical strings).

**Example:**

```text
输入：s = "cbaebabacd", p = "abc"
输出：[0,6]
解释：
起始索引等于 0 的子串是 "cba"，它是 "abc" 的异位词。
起始索引等于 6 的子串是 "bac"，它是 "abc" 的异位词。

输入：s = "abab", p = "ab"
输出：[0,1,2]
```

**Constraints:** `1 <= s.length, p.length <= 3 * 10^4`, `s`, and `p` consist of lowercase English letters only.

### Three Questions

:::tip[The three answers for this problem]
1. **When to expand `right`**: Expand unconditionally, maintaining `win[c]` and `valid`—exactly the same as the previous two problems.
2. **When to shrink `left`**: It is also a fixed-length window; shrink when `right - left >= p.size()`.
3. **When to update the result**: On a hit, do not return; instead, **collect** the current `left`. The position is still **inside** the shrink loop, **before removal**, where the window length is exactly `|p|` and `valid == need.size()`.
:::

In other words, **this problem differs from Problem 567 by only one action**: on a hit, 567 does `return true`, while 438 does `res.push(left)` and then continues scanning. Placing the code for both problems side by side, they are nearly identical except for this one line—this is exactly the point of a "template": recognize a class of problems, and you can reuse the entire skeleton.

### Process Walkthrough

Using `s = "cbaebabacd"` and `p = "abc"` as an example (`need: a=1, b=1, c=1`, `kinds = 3`):

```text
s = c b a e b a b a c d
    0 1 2 3 4 5 6 7 8 9

窗口长度恒为 3（right - left >= 3 就收缩），逐个检查：

窗口 [0,3) = "cba" → valid=3 → 收集 left=0 ✔
窗口 [1,4) = "bae" → 'e' 不属于 p，valid < 3 → 跳过
窗口 [2,5) = "aeb" → 跳过
窗口 [3,6) = "eba" → 跳过
窗口 [4,7) = "bab" → b 超额，valid < 3 → 跳过
窗口 [5,8) = "aba" → 跳过
窗口 [6,9) = "bac" → valid=3 → 收集 left=6 ✔
窗口 [7,10) = "acd" → 跳过

返回 [0, 6] ✔
```

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>
#include <string.h>

int *findAnagrams(char *s, char *p, int *returnSize) {
    int need[128] = {0}, win[128] = {0};
    int needKinds = 0;
    for (int i = 0; p[i] != '\0'; i++) {
        if (need[(unsigned char)p[i]] == 0) needKinds++;
        need[(unsigned char)p[i]]++;
    }

    int left = 0, right = 0, valid = 0;
    int n = (int)strlen(s), lenP = (int)strlen(p);

    int *res = (int *)malloc(sizeof(int) * (n + 1));   /* at most n answers */
    *returnSize = 0;

    while (right < n) {
        char c = s[right];
        right++;
        if (need[(unsigned char)c] > 0) {
            win[(unsigned char)c]++;
            if (win[(unsigned char)c] == need[(unsigned char)c]) valid++;
        }

        while (right - left >= lenP) {
            if (valid == needKinds) res[(*returnSize)++] = left;   /* collect the starting point */
            char d = s[left];
            left++;
            if (need[(unsigned char)d] > 0) {
                if (win[(unsigned char)d] == need[(unsigned char)d]) valid--;
                win[(unsigned char)d]--;
            }
        }
    }
    return res;
}
```

```cpp title="C++"
#include <string>
#include <vector>
using namespace std;

class Solution {
public:
    vector<int> findAnagrams(string s, string p) {
        int need[128] = {0}, win[128] = {0};
        int needKinds = 0;
        for (char c : p) {
            if (need[(unsigned char)c] == 0) ++needKinds;
            ++need[(unsigned char)c];
        }

        int left = 0, right = 0, valid = 0;
        vector<int> res;

        while (right < (int)s.size()) {
            char c = s[right];
            ++right;
            if (need[(unsigned char)c] > 0) {
                ++win[(unsigned char)c];
                if (win[(unsigned char)c] == need[(unsigned char)c]) ++valid;
            }

            while (right - left >= (int)p.size()) {
                if (valid == needKinds) res.push_back(left);
                char d = s[left];
                ++left;
                if (need[(unsigned char)d] > 0) {
                    if (win[(unsigned char)d] == need[(unsigned char)d]) --valid;
                    --win[(unsigned char)d];
                }
            }
        }
        return res;
    }
};
```

```js title="JavaScript"
function findAnagrams(s, p) {
  const need = new Map();
  for (const c of p) need.set(c, (need.get(c) ?? 0) + 1);

  const win = new Map();
  const res = [];
  let left = 0;
  let right = 0;
  let valid = 0;

  while (right < s.length) {
    const c = s[right];
    right++;
    if (need.has(c)) {
      win.set(c, (win.get(c) ?? 0) + 1);
      if (win.get(c) === need.get(c)) valid++;
    }

    while (right - left >= p.length) {
      if (valid === need.size) res.push(left);
      const d = s[left];
      left++;
      if (need.has(d)) {
        if (win.get(d) === need.get(d)) valid--;
        win.set(d, win.get(d) - 1);
      }
    }
  }
  return res;
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time complexity | **O(n)** — each character enters and leaves the window once |
| Space complexity | **O(1)** — counting table; the answer array is at most O(n), not counted as extra space |

### Common Pitfalls

1. **Collect `left`, not `right`.** The window is `[left, right)`, and the starting index is `left`.
2. **Do not exit early after collecting.** This is the only difference from 567: 567 only needs to determine existence, while 438 must enumerate all.
3. **Duplicate answers and order.** The same starting point is only checked once; the problem does not require order, and `push` naturally produces ascending order.

---
## Example 4: Longest Substring Without Repeating Characters (LeetCode 3)

### Problem Description

Given a string `s`, find the length of the **longest substring** that does not contain repeating characters.

**Example:**

```text
输入：s = "abcabcbb"    输出：3
解释：因为无重复字符的最长子串是 "abc"，所以其长度为 3。

输入：s = "bbbbb"       输出：1
解释：因为无重复字符的最长子串是 "b"，所以其长度为 1。

输入：s = "pwwkew"      输出：3
解释：因为无重复字符的最长子串是 "wke"，所以其长度为 3。
     注意答案必须是子串，"pwke" 是子序列而非子串。
```

**Constraints:** `0 <= s.length <= 5 * 10^4`, `s` consists of English letters, digits, symbols, and spaces.

### Three Questions

:::tip[The three answers for this problem]
1. **When to expand `right`**: Expand unconditionally. After adding `c`, only one piece of state needs to be maintained: the `win[c]` count (used to detect duplicates).
2. **When to shrink `left`**: Shrink when `win[c] > 1`, and keep shrinking until `win[c] == 1`. Here the window is **easier to keep valid the smaller it is**, so this belongs to the "shrink on violation" camp.
3. **When to update the result**: **After** the shrink loop. At that point the window `[left, right)` is duplicate-free, so use `right - left` to update the maximum.
:::

Note that the third question is **exactly the opposite** of the previous three problems. The state needed in the previous three is "exactly covers / length exactly k," which is destroyed as soon as you shrink, so you must record before shrinking; the state needed here is "no duplicates," and before shrinking the window may still be in a violating state, so you must wait until shrinking ends and the window is fixed before recording.

The consequence of using the wrong order: if you put the `best` update before shrinking, `"abcabcbb"` will at some point count a window like `"abca"` that contains duplicate characters, yielding the wrong answer of 4.

### Process Walkthrough

Taking `s = "abcabcbb"` as an example:

```text
s = a b c a b c b b
    0 1 2 3 4 5 6 7

加入 a（下标 0）→ 窗口 [0,1) = "a"     无违规 → best = 1
加入 b（下标 1）→ 窗口 [0,2) = "ab"    无违规 → best = 2
加入 c（下标 2）→ 窗口 [0,3) = "abc"   无违规 → best = 3
加入 a（下标 3）→ 窗口 [0,4) = "abca"  a 出现 2 次 → 移出 'a' → 窗口 [1,4) = "bca" 长度 3，不更优
加入 b（下标 4）→ 窗口 [1,5) = "bcab"  b 出现 2 次 → 移出 'b' → 窗口 [2,5) = "cab" 长度 3，不更优
加入 c（下标 5）→ 窗口 [2,6) = "cabc"  c 出现 2 次 → 移出 'c' → 窗口 [3,6) = "abc" 长度 3，不更优
加入 b（下标 6）→ 窗口 [3,7) = "abcb"  b 出现 2 次
   → 移出 'a' → 窗口 [4,7) = "bcb"，b 仍重复
   → 移出 'b' → 窗口 [5,7) = "cb"  长度 2，不更优
加入 b（下标 7）→ 窗口 [5,8) = "cbb"  b 出现 2 次
   → 移出 'c' → 窗口 [6,8) = "bb"，b 仍重复
   → 移出 'b' → 窗口 [7,8) = "b"   长度 1，不更优

答案 = 3 ✔
```

The `c` in `while (win[c] > 1)` is always **the character just added**: within the window, only it can become duplicated due to the new addition; all other characters were duplicate-free at the end of the previous round. So the shrink target is very clear — squeeze out the extra `c`.

### Code Implementation

:::code-tabs{default="cpp"}
```c title="C"
#include <string.h>

int lengthOfLongestSubstring(char *s) {
    int win[128] = {0};                  /* occurrence count of each character in the window */
    int left = 0, right = 0, best = 0;
    int n = (int)strlen(s);

    while (right < n) {
        char c = s[right];
        right++;
        win[(unsigned char)c]++;                 /* 3. update the data inside the window */

        while (win[(unsigned char)c] > 1) {      /* 4. violation: there is a duplicate, shrink */
            char d = s[left];
            left++;
            win[(unsigned char)d]--;
        }

        if (right - left > best) best = right - left;   /* 5. update the answer only after shrinking */
    }
    return best;
}
```

```cpp title="C++"
#include <string>
using namespace std;

class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        int win[128] = {0};          // occurrence count of each character in the window
        int left = 0, right = 0, best = 0;

        while (right < (int)s.size()) {
            char c = s[right];
            ++right;
            ++win[(unsigned char)c];              // 3. update the data inside the window

            while (win[(unsigned char)c] > 1) {   // 4. violation: there is a duplicate, shrink
                char d = s[left];
                ++left;
                --win[(unsigned char)d];
            }

            if (right - left > best) best = right - left;   // 5. update the answer only after shrinking
        }
        return best;
    }
};
```

```js title="JavaScript"
function lengthOfLongestSubstring(s) {
  const win = new Map();                  // occurrence count of each character in the window
  let left = 0;
  let right = 0;
  let best = 0;

  while (right < s.length) {
    const c = s[right];
    right++;
    win.set(c, (win.get(c) ?? 0) + 1);    // 3. update the data inside the window

    while (win.get(c) > 1) {              // 4. violation: there is a duplicate, shrink
      const d = s[left];
      left++;
      win.set(d, win.get(d) - 1);
    }

    best = Math.max(best, right - left);  // 5. update the answer only after shrinking
  }
  return best;
}
```
:::

### Complexity

| Dimension | Analysis |
|------|------|
| Time complexity | **O(n)** — `right` and `left` each take at most n steps |
| Space complexity | **O(1)** — the count table size depends on the character set (ASCII 128) |

### Common Pitfalls

1. **The position of the answer update.** It must be after the `while` shrink loop; this is the biggest difference between this problem and the previous three.
2. **The shrink loop checks the character just added, `c`, not `s[left]`.** Because only `c` can be duplicated.
3. **`s` may be empty.** When `s.length == 0`, the loop does not execute and returns 0, so no special handling is needed; but the initialization of `best = 0` must be written correctly.
4. **Do not use something like `s.indexOf(c, left)` to jump `left` directly.** Although that approach is faster, it departs from the template and easily fails on other problems. The value of the template lies in uniformity; first make sure you can write the template version, then consider optimizing.

---

## Comparison Table of the Four Examples

With the same skeleton, the blanks for the four problems compare as follows:

| Problem | ② Maintain on add | ③ Shrink condition | ⑤ Maintain on remove | ④ Position of result update | Result variable |
|------|------------|-----------|-------------|-----------------|---------|
| [Minimum Window Substring](#example-1-minimum-window-substring-leetcode-76) | `win[c]++`, `valid++` when qualified | `valid == need.size()` (shrink once covered) | `valid--`, `win[d]--` when falling out of qualification | **Inside** the shrink loop, **before removal** | Shortest window `start/minLen` |
| [Permutation in String](#example-2-permutation-in-string-leetcode-567) | Same as above | `right - left >= strlen(s1)` (fixed length) | Same as above | **Inside** the shrink loop, **before removal** (return on hit) | `true/false` |
| [Find All Anagrams](#example-3-find-all-anagrams-in-a-string-leetcode-438) | Same as above | `right - left >= strlen(p)` (fixed length) | Same as above | **Inside** the shrink loop, **before removal** (collect `left`) | `vector<int>` |
| [Longest Substring Without Repeating Characters](#example-4-longest-substring-without-repeating-characters-leetcode-3) | `win[c]++` | `win[c] > 1` (shrink on violation) | `win[d]--` | **After** the shrink loop | Longest length `best` |

Three sentences summarize the three questions:

1. **Expansion is almost always unconditional**; what you need to design is "what state to maintain after adding" — coverage-type maintains `valid`, other types only need counting or summing.
2. **Shrink conditions fall into two camps**: if the window is "easier to satisfy the larger it is," then **shrink once satisfied**; if the window is "easier to satisfy the smaller it is," then **shrink on violation**.
3. **The position of the result update is determined by when the state is alive**: a state that shrinking would destroy should be recorded before shrinking (record first, then destroy); a state that only shrinking can fix should be recorded after shrinking (fix first, then record).

Pair this with a left-closed, right-open `[left, right)`, and the length, empty window, and add/remove gestures all become fixed; the only thing left is the difference of the problem itself.
## Related Articles

- [Sliding Window: A General Approach to Subarray/Substring Problems](/technology/sliding-window/) — Classification of fixed-length, variable-length, and covering windows, with more examples
- [Classic Two-Pointer Array Exercises (Part 1): One-Dimensional Arrays and Strings](/technology/two-pointers-exercises-1d/) — Five movement rhythms of two pointers on one-dimensional arrays
- [Classic Two-Pointer Array Exercises (Part 2): Matrices and Strings](/technology/two-pointers-exercises-matrix/) — Index mapping and vertical scanning
- [Two Pointers on Arrays: The Optimization Tool from O(n²) to O(n)](/technology/two-pointers-array/) — The overall framework of four pointer patterns