---
title: 滑动窗口核心代码模板：三个问题搞定所有子串、子数组题
published: 2026-09-29
description: '从最小覆盖子串、字符串的排列、找到所有字母异位词、无重复字符的最长子串四道真题中提炼出一套统一的滑动窗口模板，回答「何时扩张、何时收缩、何时更新结果」三个问题，并解释窗口区间为什么推荐写成左闭右开。附 C / C++ / JavaScript 三语言实现。'
image: ''
tags: [滑动窗口, 双指针, 字符串, 力扣, 模板, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 为什么先要一套模板

[滑动窗口：子数组/子串问题的通用解法](/technology/sliding-window/) 那篇讲的是**分类**：定长窗口、变长窗口、覆盖窗口各自长什么样。这篇要解决的是另一个问题——**真正动手写的时候，我不知道该在哪一行下笔**。

子串、子数组类题目的代码骨架其实是同一套，差别只在几个「填空处」。只要在动笔前回答清楚三个问题，剩下的就是把模板抄下来：

> **三个问题**
>
> 1. 什么时候应该移动 `right` 扩大窗口？窗口加入字符时，应该更新哪些数据？
> 2. 什么时候窗口应该暂停扩大、开始移动 `left` 缩小窗口？从窗口移出字符时，应该更新哪些数据？
> 3. 什么时候应该更新结果？

这篇先用四道真题（最小覆盖子串、字符串的排列、找到所有字母异位词、无重复字符的最长子串）提炼出模板，再逐题把这三个问题的答案写出来对比。你会发现第三问的答案分成了两派，而这正是最容易写错的地方。

---

## 模板总览

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

骨架里只有三个「填空处」是题目相关的：**③ 收缩条件**、**④ 更新答案的位置**、以及**② 和 ⑤ 维护的状态**。①②⑤ 的手脚顺序是固定的，不需要每次重新推导。

关于 ② 和 ⑤ 维护的状态，常见的就这么几类：

| 状态 | 加入 `c` 时 | 移出 `d` 时 | 用在哪 |
|------|------------|------------|--------|
| 计数 `win[c]` | `win[c]++` | `win[d]--` | 覆盖、异位词、去重 |
| 达标种类数 `valid` | 恰好达标时 `valid++` | 即将不达标时 `valid--` | 覆盖类 |
| 区间和 `sum` | `sum += c` | `sum -= d` | 子数组和、平均数 |
| 去重计数 | `win[c]++` | `win[d]--` | 最长无重复子串 |

其中 `valid` 这个变量值得单独说一句：它记录「**有多少种字符的数量已经达标**」。没有它，每次都要把 `win` 和 `need` 整表比一遍，判断窗口是否满足条件就成了 O(字符集大小)；有了它，判断退化成一句 `valid == need.size()`，是 O(1)。这是模板里唯一一个「为了性能而引入」的状态。

---

## 问题一：什么时候移动 `right`？

**答案几乎永远是无条件移动。**

再看一眼骨架：`while (right < n)` 就是扩张的时机——只要没走到字符串尽头，就一直往右扩。滑动窗口不需要判断「现在该不该扩张」，因为扩张是它的默认动作。

所以第一问真正要回答的是**后半句**：加入一个字符时，我要更新哪些数据？这取决于题目在「记录」什么：

- 最小覆盖子串、字符串的排列、字母异位词：维护 `win[c]` 计数 + `valid` 达标种类数；
- 最长无重复子串：维护 `win[c]` 计数，用来发现重复；
- 长度最小的子数组：维护 `sum`。

一个容易踩的坑是**把状态更新写漏**。模板里 `right++` 之后立刻就要更新状态，中间不要插入任何 `continue` 之类的分支——一旦某条路径跳过了更新，`win` 和实际窗口内容就不同步了，后面所有判断都会跟着错。

---

## 问题二：什么时候收缩 `left`？

**答案分两个流派，这是滑动窗口真正的分水岭。**

判断方法是问自己一句：**窗口的「合法状态」，是在缩小之后达到的，还是在缩小之前达到的？**

### 流派 A：已经满足条件，再大就多余 → 满足就缩

代表题目：最小覆盖子串（已覆盖 `t`）、字符串的排列 / 字母异位词（长度已达到 `|s1|`）。

```text
while (valid == need.size())      // 窗口已经覆盖目标，继续扩张只会变长
while (right - left >= len1)      // 窗口长度已经达到模式串长度，再长就不可能是排列
```

这类题的窗口是「**越大越容易满足**」的：窗口越宽，覆盖目标字符的机会越多。所以一旦满足，就说明「当前的右边界不需要再往外，只需考虑能否让左边界再收一点」，于是立刻开始收缩。

后两个条件 `right - left >= len1` 其实就是**定长窗口**：长度到了就收，保证窗口长度恒等于 `len1`。这也是为什么「字符串的排列」和「字母异位词」本质上是同一道题——都是用定长窗口 + 计数校验。

### 流派 B：已经不满足条件 → 违规就缩

代表题目：最长无重复子串。

```text
while (win[c] > 1)                // 新加入的 c 在窗口里重复了，必须缩到不重复
```

这类题的窗口是「**越小越容易满足**」的：窗口越窄，越不可能出现重复。所以扩张之后要先检查是否违规，一旦违规就一路收缩到恢复合法为止。

两个流派的条件写在同一个 `while` 里，但语义完全相反：一个是「**已经好了，试着少要一点**」，一个是「**已经坏了，缩到好为止**」。写代码前先想清楚这道题属于哪一派，收缩条件就自然写出来了。

---

## 问题三：什么时候更新结果？

**答案也分两派，而且与第二问的选择直接相关。**

| 你要的窗口状态 | 出现在哪一刻 | 更新代码写在哪 |
|---------------|-------------|---------------|
| 「恰好覆盖」「长度恰好为 k」 | **收缩之前** | 收缩循环内部，且**在移出 `left` 之前** |
| 「合法（例如无重复）」 | **收缩之后** | 收缩循环之后 |

- **最小覆盖子串**要的是「最短的、恰好覆盖 `t` 的窗口」。窗口一旦被收缩，就可能失去覆盖性——所以要用的状态出现在收缩**之前**。因此记录答案必须放在收缩循环的第一行，顺序是「先记录、再破坏」。
- **字符串的排列 / 字母异位词**同理：命中判定必须写在移出 `left` 之前。
- **最长无重复子串**要的是「无重复的窗口」。扩张之后窗口可能违规，违规状态下记录答案就是错的——所以要先把窗口修好，再去记录。顺序是「先修复、再记录」。

> 一句话总结第三问：**「收缩前记录」还是「收缩后记录」，取决于你要的状态是不是收缩会破坏掉的状态。**

把顺序写反的后果很典型：在最小覆盖子串里把记录写在移出之后，会把「已经不再覆盖 `t` 的窗口」当成答案，得到的长度偏小、内容不合法；在最长无重复子串里把记录写在收缩之前，会统计到含重复字符的窗口，得到的答案偏大。

---

## 窗口区间为什么推荐写成左闭右开

看遍所有题解，窗口几乎都写成 `[left, right)`（左闭右开），而不是 `[left, right]`（左闭右闭）。这不是风格偏好，而是它能消掉三类常见错误：

| 对比项 | 左闭右开 `[left, right)` | 左闭右闭 `[left, right]` |
|--------|------------------------|------------------------|
| 空窗口怎么表示 | `left == right`，初始 `0, 0` 就是空窗口 | `right = left - 1`，初始值会出现 `-1` |
| 窗口长度 | `right - left` | `right - left + 1`，多一处 `±1` |
| 加入一个字符 | `c = s[right]; right++` | `right++; c = s[right]`（先移后取） |
| 移出一个字符 | `d = s[left]; left++` | `d = s[left]; left++`（先取后移） |

四个好处：

1. **长度就是 `right - left`。** 定长窗口的收缩条件因此可以直接写成 `right - left >= k`，不用在 `> k` 和 `>= k + 1` 之间反复推敲；判断「窗口是否为空」就是 `left == right`。
2. **初始状态天然自洽。** 空窗口就是 `0, 0`，第一轮循环里 `s[right]` 是第一个字符、`right` 是第一个待加入的位置，逻辑没有特例。
3. **加入和移出两个动作完全对称。** 加入永远是「取 `s[right]`，再 `right++`」；移出永远是「取 `s[left]`，再 `left++`」。都遵循「**先取字符，再移动指针**」。换成左闭右闭，加入变成了「先 `right++` 再取」，和移出的手势相反——这就是 `right - left + 1` 之类 off-by-one 错误的温床。
4. **不变量表述更干净。** 「`[left, right)` 内的元素恰好是当前窗口」这句话在每次迭代结束、循环开始、循环结束时都成立，不需要为 `right` 的特殊含义（最后一个元素 vs 下一个待加入位置）做额外说明。

模板里 `s[right - 1]` 就是「刚加入的那个字符」、`s[left]` 就是「即将移出的那个字符」——这些便利都来自左闭右开。

---

## 例题一：最小覆盖子串（LeetCode 76）

### 题目描述

给你一个字符串 `s`、一个字符串 `t`。返回 `s` 中涵盖 `t` 所有字符的最小子串。如果 `s` 中不存在涵盖 `t` 所有字符的子串，则返回空字符串 `""`。

注意：对于 `t` 中重复字符，我们寻找的子字符串中该字符数量必须不少于 `t` 中该字符数量。

**示例：**

```text
输入：s = "ADOBECODEBANC", t = "ABC"
输出："BANC"
解释：最小覆盖子串 "BANC" 包含来自字符串 t 的 'A'、'B' 和 'C'。

输入：s = "a", t = "a"     输出："a"
输入：s = "a", t = "aa"    输出：""
```

**约束：** `1 <= m, n <= 10^5`（`m == s.length`，`n == t.length`），`s` 和 `t` 由大小写英文字母组成，测试用例保证答案唯一。

### 三问

:::tip[本题的三个答案]
1. **何时扩张 `right`**：无条件扩张。加入 `c` 时，若 `c` 属于 `t` 就把 `win[c]` 加一；当 `win[c]` 恰好等于 `need[c]` 时把 `valid` 加一（表示又有一种字符达标了）。
2. **何时收缩 `left`**：`valid == need.size()` 时开始收缩，也就是「窗口已经覆盖了 `t` 的全部字符」。移出 `d` 时，若 `d` 恰好从「达标」掉下来（`win[d] == need[d]`），先把 `valid` 减一，再把 `win[d]` 减一。
3. **何时更新结果**：在收缩循环**内部、移出之前**——此时窗口正好「恰好覆盖 `t`」，这正是我们要的最短候选。顺序必须是**先记录、再移出**。
:::

### 过程图解

以 `s = "ADOBECODEBANC"`、`t = "ABC"` 为例（`need: A=1, B=1, C=1`，`need.size() == 3`）：

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

注意第二步里出现了一个细节：窗口 `[3,11) = "BECODEBA"` 中 `B` 出现了两次，`win[B] = 2 > need[B] = 1`。此时移出一个 `B` 后 `win[B]` 降到 1，**仍然达标**，所以 `valid` 不该变。代码里判断的是 `win[d] == need[d]`（移出后才不达标）而不是 `win[d] <= need[d]`，正是为了处理这种情况。

### 代码实现

:::code-tabs{default="cpp"}
```c title="C"
#include <stdlib.h>
#include <string.h>

char *minWindow(char *s, char *t) {
    int need[128] = {0}, win[128] = {0};   /* need：目标计数；win：窗口计数 */
    int needKinds = 0;                     /* 目标里有多少种字符 */
    for (int i = 0; t[i] != '\0'; i++) {
        if (need[(unsigned char)t[i]] == 0) needKinds++;
        need[(unsigned char)t[i]]++;
    }

    int left = 0, right = 0;
    int valid = 0;                         /* 已有多少种字符的数量「达标」 */
    int start = 0, minLen = -1;
    int n = (int)strlen(s);

    while (right < n) {
        char c = s[right];                 /* 1. 将要移入窗口的字符 */
        right++;                           /* 2. 右移窗口 */
        if (need[(unsigned char)c] > 0) {  /* 3. 更新窗口内数据 */
            win[(unsigned char)c]++;
            if (win[(unsigned char)c] == need[(unsigned char)c]) valid++;
        }

        while (valid == needKinds) {       /* 4. 窗口已覆盖 t，开始收缩 */
            if (minLen == -1 || right - left < minLen) {   /* 先记录答案，再移出 */
                start = left;
                minLen = right - left;
            }
            char d = s[left];              /* 5. 移出 left */
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
        int need[128] = {0}, win[128] = {0};   // need：目标计数；win：窗口计数
        int needKinds = 0;                      // 目标里有多少种字符
        for (char c : t) {
            if (need[(unsigned char)c] == 0) ++needKinds;
            ++need[(unsigned char)c];
        }

        int left = 0, right = 0;
        int valid = 0;                          // 已有多少种字符的数量「达标」
        int start = 0, minLen = -1;

        while (right < (int)s.size()) {
            char c = s[right];                  // 1. 将要移入窗口的字符
            ++right;                            // 2. 右移窗口
            if (need[(unsigned char)c] > 0) {   // 3. 更新窗口内数据
                ++win[(unsigned char)c];
                if (win[(unsigned char)c] == need[(unsigned char)c]) ++valid;
            }

            while (valid == needKinds) {        // 4. 窗口已覆盖 t，开始收缩
                if (minLen == -1 || right - left < minLen) {   // 先记录答案
                    start = left;
                    minLen = right - left;
                }
                char d = s[left];               // 5. 移出 left
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
  const need = new Map();                 // need：目标计数
  for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);

  const win = new Map();                  // win：窗口计数
  let left = 0;
  let right = 0;
  let valid = 0;                          // 已有多少种字符的数量「达标」
  let start = 0;
  let minLen = Infinity;

  while (right < s.length) {
    const c = s[right];                   // 1. 将要移入窗口的字符
    right++;                              // 2. 右移窗口
    if (need.has(c)) {                    // 3. 更新窗口内数据
      win.set(c, (win.get(c) ?? 0) + 1);
      if (win.get(c) === need.get(c)) valid++;
    }

    while (valid === need.size) {         // 4. 窗口已覆盖 t，开始收缩
      if (right - left < minLen) {        // 先记录答案，再移出
        start = left;
        minLen = right - left;
      }
      const d = s[left];                  // 5. 移出 left
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

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(m + n)** — `right` 和 `left` 各单向走完全程，每个字符最多进窗一次、出窗一次 |
| 空间复杂度 | **O(1)** — C / C++ 用的是 128 大小的定长数组；JS 的 Map 最多存 52 种字母 |

### 易错点

1. **记录答案必须在移出 `left` 之前。** 放进循环的第二行就会记录到不再覆盖 `t` 的窗口。
2. **`valid` 的判断要用 `win[d] == need[d]`，不能用 `<=`。** 窗口里某个字符可能超额（比如上面追踪里的两个 `B`），从超额降到恰好达标时 `valid` 不应该变化。
3. **`t` 里重复字符要按个数算。** `s = "a", t = "aa"` 必须返回 `""`，这靠 `win[c] == need[c]` 的精确比较来保证。
4. **用定长数组代替哈希表能省常数。** `s`、`t` 只含大小写字母（52 种），`int[128]` 完全够用，比 Map 快且省内存。

---

## 例题二：字符串的排列（LeetCode 567）

### 题目描述

给你两个字符串 `s1` 和 `s2`，写一个函数来判断 `s2` 是否包含 `s1` 的排列。如果是，返回 `true`；否则返回 `false`。换句话说，`s1` 的排列之一是 `s2` 的子串。

**示例：**

```text
输入：s1 = "ab", s2 = "eidbaooo"      输出：true
解释：s2 包含 s1 的排列之一 ("ba")

输入：s1 = "ab", s2 = "eidboaoo"      输出：false
```

**约束：** `1 <= s1.length, s2.length <= 10^4`，`s1`、`s2` 仅包含小写字母。

### 三问

:::tip[本题的三个答案]
1. **何时扩张 `right`**：无条件扩张。维护的数据与上一题完全一样：`win[c]` 与 `valid`。
2. **何时收缩 `left`**：`right - left >= s1.size()` 时收缩——窗口长度已经达到 `|s1|`，再长就绝对不可能是排列。这就是**定长窗口**。
3. **何时更新结果**：命中就返回。判定写在收缩循环**内部、移出之前**：此刻窗口长度恰好是 `|s1|`，只要 `valid == need.size()`，就说明窗口里的字符计数与 `s1` 完全一致。
:::

### 过程图解

以 `s1 = "ab"`、`s2 = "eidbaooo"` 为例：

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

窗口长度被 `right - left >= s1.size()` 严格钉在 2，所以每一轮检查的都是一个「长度恰好为 `|s1|`」的窗口，这正是定长窗口的写法。

### 代码实现

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

        while (right - left >= len1) {     /* 窗口不能再长了 */
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

            while (right - left >= (int)s1.size()) {   // 窗口不能再长了
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

    while (right - left >= s1.length) {   // 窗口不能再长了
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

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(len2)** — 窗口长度恒定，每个字符进出各一次 |
| 空间复杂度 | **O(1)** — 计数表大小与字符集有关（小写字母 26 种） |

### 易错点

1. **收缩条件是 `>=` 而不是 `==`。** 用 `while` 而不是 `if`，保证窗口长度严格不超过 `|s1|`；写成 `==` 在某些输入下会漏掉收缩。
2. **命中判定放在收缩循环里、移出之前。** 一旦先移出，窗口长度就不再是 `|s1|` 了。
3. **别去求 `s1` 的全排列。** `|s1| = 10^4` 时排列数量是天文数字，必须用「计数相等」代替「枚举排列」。
4. **`s1` 比 `s2` 长时直接为 `false`。** 这个边界上面代码能自动处理（循环条件一开始就不成立），但要确认自己没有在循环外做越界访问。

---

## 例题三：找到字符串中所有字母异位词（LeetCode 438）

### 题目描述

给定两个字符串 `s` 和 `p`，找到 `s` 中所有 `p` 的**异位词**的子串，返回这些子串的起始索引。不考虑答案输出的顺序。

异位词指由相同字母重排列形成的字符串（包括相同的字符串）。

**示例：**

```text
输入：s = "cbaebabacd", p = "abc"
输出：[0,6]
解释：
起始索引等于 0 的子串是 "cba"，它是 "abc" 的异位词。
起始索引等于 6 的子串是 "bac"，它是 "abc" 的异位词。

输入：s = "abab", p = "ab"
输出：[0,1,2]
```

**约束：** `1 <= s.length, p.length <= 3 * 10^4`，`s` 和 `p` 仅包含小写字母。

### 三问

:::tip[本题的三个答案]
1. **何时扩张 `right`**：无条件扩张，维护 `win[c]` 与 `valid`——和前面两题一字不差。
2. **何时收缩 `left`**：同样是定长窗口，`right - left >= p.size()` 时收缩。
3. **何时更新结果**：命中不返回，而是**收集**当前的 `left`。位置依旧在收缩循环**内部、移出之前**，此时窗口长度恰好是 `|p|` 且 `valid == need.size()`。
:::

也就是说，**这一题和第 567 题只差一个动作**：567 命中就 `return true`，438 命中就 `res.push(left)` 然后继续往后扫。把两道题的代码并排放，除了这一行几乎完全相同——这正是「模板」存在的意义：认出一类题，就能复用整份骨架。

### 过程图解

以 `s = "cbaebabacd"`、`p = "abc"` 为例（`need: a=1, b=1, c=1`，`kinds = 3`）：

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

### 代码实现

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

    int *res = (int *)malloc(sizeof(int) * (n + 1));   /* 最多 n 个答案 */
    *returnSize = 0;

    while (right < n) {
        char c = s[right];
        right++;
        if (need[(unsigned char)c] > 0) {
            win[(unsigned char)c]++;
            if (win[(unsigned char)c] == need[(unsigned char)c]) valid++;
        }

        while (right - left >= lenP) {
            if (valid == needKinds) res[(*returnSize)++] = left;   /* 收集起点 */
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

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — 每个字符进出窗口各一次 |
| 空间复杂度 | **O(1)** — 计数表；答案数组最多 O(n)，不计入额外空间 |

### 易错点

1. **收集的是 `left` 而不是 `right`。** 窗口是 `[left, right)`，起始下标是 `left`。
2. **收集之后不能提前退出。** 这是和 567 唯一的区别：567 只需要判断存在性，438 要枚举全部。
3. **答案重复与顺序。** 同一个起点只会被检查一次；题目不要求顺序，`push` 出来的天然是升序。

---

## 例题四：无重复字符的最长子串（LeetCode 3）

### 题目描述

给定一个字符串 `s`，请你找出其中不含有重复字符的**最长子串**的长度。

**示例：**

```text
输入：s = "abcabcbb"    输出：3
解释：因为无重复字符的最长子串是 "abc"，所以其长度为 3。

输入：s = "bbbbb"       输出：1
解释：因为无重复字符的最长子串是 "b"，所以其长度为 1。

输入：s = "pwwkew"      输出：3
解释：因为无重复字符的最长子串是 "wke"，所以其长度为 3。
     注意答案必须是子串，"pwke" 是子序列而非子串。
```

**约束：** `0 <= s.length <= 5 * 10^4`，`s` 由英文字母、数字、符号和空格组成。

### 三问

:::tip[本题的三个答案]
1. **何时扩张 `right`**：无条件扩张。加入 `c` 后只需维护一个状态：`win[c]` 计数（用来发现重复）。
2. **何时收缩 `left`**：`win[c] > 1` 时收缩，一直缩到 `win[c] == 1`。这里的窗口是**越小越容易合法**，属于「违规就缩」那一派。
3. **何时更新结果**：在收缩循环**之后**。此时窗口 `[left, right)` 才是无重复的，用 `right - left` 去更新最大值。
:::

注意第三问和前三题**刚好相反**。前三题要的状态是「恰好覆盖 / 长度恰好为 k」，一旦收缩就被破坏，所以必须在收缩之前记录；这一题要的状态是「无重复」，收缩之前窗口可能仍处于违规状态，所以必须等收缩结束、窗口修好之后才记录。

用错顺序的后果：若把 `best` 更新写在收缩之前，`"abcabcbb"` 会在某个时刻统计到 `"abca"` 这类含重复字符的窗口，得到 4 这个错误答案。

### 过程图解

以 `s = "abcabcbb"` 为例：

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

`while (win[c] > 1)` 里的 `c` 始终是**刚加入的那个字符**：窗口里只有它可能因为新加入而重复，其他字符在上一轮结束时都是不重复的。所以收缩的目标很明确——把多余的 `c` 挤出去。

### 代码实现

:::code-tabs{default="cpp"}
```c title="C"
#include <string.h>

int lengthOfLongestSubstring(char *s) {
    int win[128] = {0};                  /* 窗口内每个字符的出现次数 */
    int left = 0, right = 0, best = 0;
    int n = (int)strlen(s);

    while (right < n) {
        char c = s[right];
        right++;
        win[(unsigned char)c]++;                 /* 3. 更新窗口内数据 */

        while (win[(unsigned char)c] > 1) {      /* 4. 违规：有重复，收缩 */
            char d = s[left];
            left++;
            win[(unsigned char)d]--;
        }

        if (right - left > best) best = right - left;   /* 5. 收缩之后才更新答案 */
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
        int win[128] = {0};          // 窗口内每个字符的出现次数
        int left = 0, right = 0, best = 0;

        while (right < (int)s.size()) {
            char c = s[right];
            ++right;
            ++win[(unsigned char)c];              // 3. 更新窗口内数据

            while (win[(unsigned char)c] > 1) {   // 4. 违规：有重复，收缩
                char d = s[left];
                ++left;
                --win[(unsigned char)d];
            }

            if (right - left > best) best = right - left;   // 5. 收缩之后才更新答案
        }
        return best;
    }
};
```

```js title="JavaScript"
function lengthOfLongestSubstring(s) {
  const win = new Map();                  // 窗口内每个字符的出现次数
  let left = 0;
  let right = 0;
  let best = 0;

  while (right < s.length) {
    const c = s[right];
    right++;
    win.set(c, (win.get(c) ?? 0) + 1);    // 3. 更新窗口内数据

    while (win.get(c) > 1) {              // 4. 违规：有重复，收缩
      const d = s[left];
      left++;
      win.set(d, win.get(d) - 1);
    }

    best = Math.max(best, right - left);  // 5. 收缩之后才更新答案
  }
  return best;
}
```
:::

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — `right` 与 `left` 各自最多走 n 步 |
| 空间复杂度 | **O(1)** — 计数表大小取决于字符集（ASCII 128） |

### 易错点

1. **更新答案的位置。** 必须在 `while` 收缩循环之后，这是本题与前三题最大的差异。
2. **收缩循环里判断的是刚加入的字符 `c`，不是 `s[left]`。** 因为只有 `c` 可能重复。
3. **`s` 可能为空。** `s.length == 0` 时循环不执行，返回 0，不用特判；但初始化 `best = 0` 要写对。
4. **不要用 `s.indexOf(c, left)` 之类的写法直接跳 `left`。** 那种写法虽然更快，但脱离了模板，容易在别的题上失效。模板的价值在于统一，先保证会写模板版，再考虑优化。

---

## 四个例题对照表

同样一套骨架，四道题的填空处对照如下：

| 题目 | ② 加入时维护 | ③ 收缩条件 | ⑤ 移出时维护 | ④ 更新结果的位置 | 结果变量 |
|------|------------|-----------|-------------|-----------------|---------|
| [最小覆盖子串](#例题一最小覆盖子串leetcode-76) | `win[c]++`，达标时 `valid++` | `valid == need.size()`（已覆盖就缩） | 掉出达标时 `valid--`，`win[d]--` | 收缩循环**内、移出前** | 最短窗口 `start/minLen` |
| [字符串的排列](#例题二字符串的排列leetcode-567) | 同上 | `right - left >= strlen(s1)`（定长） | 同上 | 收缩循环**内、移出前**（命中即返回） | `true/false` |
| [字母异位词](#例题三找到字符串中所有字母异位词leetcode-438) | 同上 | `right - left >= strlen(p)`（定长） | 同上 | 收缩循环**内、移出前**（收集 `left`） | `vector<int>` |
| [最长无重复子串](#例题四无重复字符的最长子串leetcode-3) | `win[c]++` | `win[c] > 1`（违规就缩） | `win[d]--` | 收缩循环**之后** | 最长长度 `best` |

三句话概括三个问题：

1. **扩张几乎永远无条件**；要设计的是「加入后维护什么状态」——覆盖类维护 `valid`，其他类只需计数或求和。
2. **收缩条件分两派**：窗口「越大越容易满足」就**满足就缩**；窗口「越小越容易满足」就**违规就缩**。
3. **更新结果的位置由状态存活的时刻决定**：收缩会破坏的状态，就在收缩前记录（先记录、再破坏）；收缩才能修好的状态，就在收缩后记录（先修复、再记录）。

再配上一个左闭右开的 `[left, right)`，长度、空窗口、加入/移出的手势全都变成固定的，剩下的只有题目本身的差异。

## 相关文章

- [滑动窗口：子数组/子串问题的通用解法](/technology/sliding-window/) — 定长、变长、覆盖三类窗口的分类与更多例题
- [数组双指针经典习题（一）：一维数组与字符串](/technology/two-pointers-exercises-1d/) — 双指针在一维数组上的五种移动节奏
- [数组双指针经典习题（二）：矩阵与字符串](/technology/two-pointers-exercises-matrix/) — 下标映射与纵向扫描
- [数组双指针：从 O(n²) 到 O(n) 的优化利器](/technology/two-pointers-array/) — 四种指针模式的总体框架
