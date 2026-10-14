---
title: 数组双指针经典习题（一）：一维数组与字符串
published: 2026-09-29
description: '力扣「数组和双指针」入门计划前五题精讲：删除有序数组中的重复项、验证回文串、颜色分类、合并两个有序数组、有序数组的平方。每题给出指针不变量、过程图解、易错点和 C / C++ / JavaScript 三语言实现。'
image: ''
tags: [双指针, 数组, 字符串, 力扣, 快慢指针, 荷兰国旗, C, C++, JavaScript]
category: '算法'
draft: false
lang: ''
---

## 导读

[数组双指针：从 O(n²) 到 O(n) 的优化利器](/technology/two-pointers-array/) 讲的是四种指针模式。本篇开始把模式落到真题上。

九道题来自力扣「数组和双指针」入门计划，按主题拆成两篇：

| 篇目 | 内容 | 核心技巧 |
|------|------|---------|
| **本篇（一）** | 删除有序数组中的重复项、验证回文串、颜色分类、合并两个有序数组、有序数组的平方 | 一维数组上的指针移动 |
| [（二）矩阵与字符串](/technology/two-pointers-exercises-matrix/) | 将矩阵按对角线排序、二维网格迁移、转置矩阵、最长公共前缀 | 下标映射与纵向扫描 |

这五道题有个共同点：**答案的判定只依赖两端或相邻位置的关系**。无论是「重复值必然相邻」（题 1）、「首尾必须对称」（题 2）、「只有三种取值可以就地分区」（题 3）、「两个序列各自有序」（题 4），还是「平方后的最大值必在两端」（题 5），都让每次指针移动都能安全排除一批候选，从而把原本 O(n²) 的枚举压到 O(n)。

### 五道题的指针速查

| 题目 | 指针模式 | 指针含义 | 一句话 |
|------|---------|---------|--------|
| 删除有序数组中的重复项 | 快慢指针（同向） | `slow` 已写区间末尾，`fast` 扫描 | 把新值写到 `slow` 后面 |
| 验证回文串 | 左右指针（相向） | `i` 左端，`j` 右端 | 跳过非字母数字再比较 |
| 颜色分类 | 三指针分区 | `p0` 收 0，`p2` 收 2，`i` 扫描 | 换到 `p2` 后 `i` 不前进 |
| 合并两个有序数组 | 逆向双指针 | `p1`、`p2` 各自末尾 | 从后往前填，避免覆盖 |
| 有序数组的平方 | 左右指针 + 逆序填充 | `i` 左端，`j` 右端 | 最大值必在两端之一 |

> **关于代码**
> 每题给出 C / C++ / JavaScript 三语言实现，代码完全等价，可切换标签查看。
> C 版本为了聚焦指针逻辑，省略了力扣官方签名中这里用不到的返回参数管理（如 `returnColumnSizes`）。

---

## 1. 删除有序数组中的重复项（LeetCode 26）

### 题目描述

给你一个**非严格递增**排列的数组 `nums`，请你**原地**删除重复出现的元素，使每个元素只出现一次，返回删除后数组的新长度。元素的相对顺序应该保持一致。

由于在某些语言中无法改变数组的长度，所以必须将结果放在数组 `nums` 的前部分。更规范地说，如果在删除重复项之后有 `k` 个元素，那么 `nums` 的前 `k` 个元素应该保存最终结果。返回 `k` 即可，超出 `k` 的位置填什么都无所谓。

**示例：**

```text
输入：nums = [1,1,2]
输出：2, nums = [1,2,_]

输入：nums = [0,0,1,1,1,2,2,3,3,4]
输出：5, nums = [0,1,2,3,4,_,_,_,_,_]
```

**约束：** `1 <= nums.length <= 3 * 10^4`，`-100 <= nums[i] <= 100`，`nums` 已按非递减顺序排列。

### 思路：快慢指针维护「已去重前缀」

数组有序意味着**相等的元素一定相邻**。于是我们可以把数组分成两段：

- `[0, slow]`：已经去重的结果前缀，`nums[slow]` 是其中最后一个元素；
- `[fast, n-1]`：还没检查的部分。

`fast` 从 1 开始一路向右扫：

- 若 `nums[fast] != nums[slow]`，说明遇到一个**新值**（因为重复值必然紧挨在一起），就把 `slow` 加一，把新值写到 `nums[slow]`；
- 否则说明这个值和已写下的最后一个值相同，跳过。

循环结束时 `slow` 是结果最后一个元素的下标，长度就是 `slow + 1`。

### 过程图解

以 `nums = [0,0,1,1,1,2,2,3,3,4]` 为例：

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

### 代码实现

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

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — `fast` 走一遍 |
| 空间复杂度 | **O(1)** — 只用了两个下标变量 |
| 原地 | **是** — 只在 `nums` 内部读写 |

### 易错点

1. **返回 `slow + 1` 而不是 `slow`。** `slow` 是下标，长度要加一。空数组要单独返回 0，否则 `slow + 1` 会返回 1。
2. **比较对象是 `nums[slow]` 而不是 `nums[fast - 1]`。** 两者在这道题里结果相同，但用 `slow` 才能自然推广到「每个元素最多保留 k 个」。
3. **不要在发现重复时也移动 `slow`。** `slow` 只在写入新值时才前进。

### 扩展：每个元素最多保留 k 个（LeetCode 80）

把「和前一个写入值比较」改成「和前 k 个写入值比较」，模板可以直接推广：

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

## 2. 验证回文串（LeetCode 125）

### 题目描述

如果在将所有大写字符转换为小写字符、并移除所有非字母数字字符之后，短语正着读和反着读都一样，则可以认为该短语是一个**回文串**。字母和数字都属于字母数字字符。

给你一个字符串 `s`，如果它是回文串，返回 `true`；否则返回 `false`。

**示例：**

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

**约束：** `1 <= s.length <= 2 * 10^5`，`s` 仅由可打印的 ASCII 字符组成。

### 思路：左右指针跳过「无效字符」

如果不允许原地操作，最直观的做法是先把字符串过滤成纯字母数字、再翻转比较——但那需要 O(n) 额外空间。

回文的定义只关心「首尾是否对称」，所以用两个指针从两端向中间夹逼就够了：`i` 从左往右、`j` 从右往左，各自跳过非字母数字字符，然后比较这两个位置（统一转小写）。

只遍历一遍，不需要构造新字符串。

### 过程图解

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

### 代码实现

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

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — `i` 只增、`j` 只减，合计移动 n 次 |
| 空间复杂度 | **O(1)** — 不构造新的过滤字符串 |

### 易错点

1. **内层 `while` 必须带 `i < j`。** 否则当整个字符串都是非字母数字（如 `" "`、`"...."`）时，`i` 会一路越过 `j` 继续前进、`j` 会退到 `-1`，两边都在数组边界外读写——在 C 里这是未定义行为，用 AddressSanitizer 跑会直接报 `stack-buffer-overflow`。
2. **C / C++ 的 `isalnum`、`tolower` 参数要转 `unsigned char`。** 这两个函数接受的是 `int` 且要求是 `unsigned char` 的值或 `EOF`；直接传 `char` 时，若字符字节为负数（UTF-8 多字节字符的后续字节就是这样），属于未定义行为。
3. **`"0P"` 是 `false`，`"0P0"` 是 `true`。** 数字也要参与比较，别只判断字母。
4. **`" "` 和 `""` 都返回 `true`。** 循环条件 `i < j` 保证空串或单字符直接判定成功。

---

## 3. 颜色分类（LeetCode 75）

### 题目描述

给定一个包含红色、白色和蓝色、共 `n` 个元素的数组 `nums`，**原地**对它们进行排序，使得相同颜色的元素相邻，并按照红色、白色、蓝色顺序排列。我们使用整数 `0`、`1` 和 `2` 分别表示红色、白色和蓝色。

必须在不使用库内置的 `sort` 函数的情况下解决这个问题。

**示例：**

```text
输入：nums = [2,0,2,1,1,0]
输出：[0,0,1,1,2,2]

输入：nums = [2,0,1]
输出：[0,1,2]
```

**约束：** `n == nums.length`，`1 <= n <= 300`，`nums[i]` 为 `0`、`1` 或 `2`。

**进阶：** 你能想出一个仅使用常数空间的一趟扫描算法吗？

### 思路：荷兰国旗问题，三个指针

只有三种取值，所以不需要真正的排序——只要把元素**分到三个区**里。用三个指针维护三块区域：

```text
[0, p0)  全是 0        p0：下一个 0 该放的位置
[p0, i)  全是 1        i ：当前正在检查的位置
[i, p2]  还没处理      p2：下一个 2 该放的位置
(p2, n)  全是 2
```

每一步看 `nums[i]`（也就是「未处理区」的最左元素）：

- `nums[i] == 0`：它属于左边，和 `nums[p0]` 交换。交换后 `p0` 处变成 0，`p0` 右移一位；换到 `i` 位置上的是原来的 `nums[p0]`——因为 `[p0, i)` 区间全是 1，所以换过来的只可能是 0 或 1，**已经确定归属**，于是 `i` 也可以右移。
- `nums[i] == 2`：它属于右边，和 `nums[p2]` 交换。换到 `i` 位置上的是**从未处理区尾部拿来的元素**，还没看过，所以 `p2` 左移一位但 **`i` 不动**，下一轮重新检查这个位置。
- `nums[i] == 1`：它本来就该在中间，`i` 直接右移。

当 `i > p2` 时，未处理区为空，排序完成。

### 过程图解

以 `nums = [2,0,2,1,1,0]` 为例：

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

### 代码实现

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

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — 每个元素最多被交换一次，`i` 与 `p2` 合计前进 n 步 |
| 空间复杂度 | **O(1)** — 只有三个下标变量 |
| 扫描趟数 | **1 趟** — 满足进阶要求 |

### 易错点

1. **处理 2 之后 `i` 绝对不能前进。** 从尾部换过来的元素还没被检查过，它可能是 0。这是本题最容易写错的地方。
2. **循环条件必须是 `i <= p2`，不能写 `i < p2`。** 当 `i == p2` 时那个位置还是未处理元素，仍需检查。写成 `i < p2` 会漏掉中间的一个元素：例如 `nums = [1,0,2,0,1]`，正确结果是 `[0,0,1,1,2]`，而 `i < p2` 会输出 `[0,1,1,0,2]`。
3. **不要用「遍历两次计数排序」偷懒。** 统计 0/1/2 的个数再回填虽然也是 O(n) 时间 O(1) 空间，但要扫两趟，且没有展示指针分区的思想。

---

## 4. 合并两个有序数组（LeetCode 88）

### 题目描述

给你两个按**非递减顺序**排列的整数数组 `nums1` 和 `nums2`，另有两个整数 `m` 和 `n`，分别表示 `nums1` 和 `nums2` 中的元素数目。

请你**合并** `nums2` 到 `nums1` 中，使合并后的数组同样按非递减顺序排列。

**注意：** 最终合并后数组不应由函数返回，而是存储在数组 `nums1` 中。为了应对这种情况，`nums1` 的初始长度为 `m + n`，其中前 `m` 个元素表示应合并的元素，后 `n` 个元素为 `0`（占位符），应忽略。

**示例：**

```text
输入：nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3
输出：[1,2,2,3,5,6]

输入：nums1 = [1], m = 1, nums2 = [], n = 0
输出：[1]
```

**约束：** `nums1.length == m + n`，`nums2.length == n`，`0 <= m, n <= 200`。

### 思路：从后往前写，而不是从前往后

如果从前往后合并，第一个 `nums2` 的元素写进 `nums1[0]` 就会**覆盖掉还没处理的 `nums1` 元素**，除非先把 `nums1` 整体搬到别处（那就退化成 O(m+n) 额外空间）。

但注意 `nums1` 的后 `n` 个位置本来就是空的！所以把方向反过来：**从数组末尾往前填**，每次取 `nums1` 和 `nums2` 剩余部分的较大者放到最右边。此时：

- 写入位置 `tail` 永远在 `p1`、`p2` 的右边，写的都是已经被读过的空位，不可能覆盖未处理元素；
- 当 `nums2` 全部搬完（`p2 < 0`）时循环结束——此刻 `nums1` 剩下的元素本来就在正确位置上，不需要再动。

### 过程图解

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

### 代码实现

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

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(m + n)** — 每个元素最多被写入一次 |
| 空间复杂度 | **O(1)** — 没有开新数组，只用了三个下标 |
| 原地 | **是** |

### 易错点

1. **`p1 >= 0` 必须写在 `nums1[p1] > nums2[p2]` 前面。** 靠 `&&` 的短路求值来防止 `nums1[-1]` 越界访问。
2. **循环条件只能是 `p2 >= 0`。** 不要写成 `p1 >= 0 && p2 >= 0`：`nums2` 先耗尽时 `nums1` 剩余元素已在正确位置、确实可以停；但 `nums1` 先耗尽时还必须继续把 `nums2` 剩下的搬过去（此时 `nums1[p1]` 不存在，靠 `p1 >= 0` 分支自动走 `else` 即可）。
3. **`m = 0` 或 `n = 0` 的边界。** `n = 0` 时循环一次都不执行，`nums1` 原样返回；`m = 0` 时全部取 `nums2`。
4. **别先把 `nums2` 复制到 `nums1` 尾部再排序。** 那样丢掉了「两个数组各自有序」这个前提，时间退化成 O((m+n)log(m+n))。

---

## 5. 有序数组的平方（LeetCode 977）

### 题目描述

给你一个按**非递减顺序**排序的整数数组 `nums`，返回每个数字的平方组成的新数组，要求也按**非递减顺序**排序。

**示例：**

```text
输入：nums = [-4,-1,0,3,10]
输出：[0,1,9,16,100]
解释：平方后得到 [16,1,0,9,100]，排序后为 [0,1,9,16,100]

输入：nums = [-7,-3,2,3,11]
输出：[4,9,9,49,121]
```

**约束：** `1 <= nums.length <= 10^4`，`-10^4 <= nums[i] <= 10^4`，`nums` 已按非递减顺序排序。

### 思路：最大值只可能出现在两端

数组里有负数时，平方后的顺序和原顺序不再一致——`-4` 在 `-1` 左边，但平方后 `16 > 1`。不过有一个关键性质：

> 平方后的**最大值**，一定来自数组的最左端（绝对值最大的负数）或最右端（最大的正数），不可能来自中间。

因为 `nums` 是单调递增的，`|nums[i]|` 在左半段单调递减、右半段单调递增，所以 `|nums[i]|` 的最大值必定在区间两端。

于是可以「**从大到小**地生成结果」：用 `i`、`j` 两个指针分别指向两端，每次比较 `nums[i]²` 与 `nums[j]²`，把较大者填入结果数组的**末尾**，然后把对应指针向内移动。这样从后往前填，最终得到的就是升序结果。

### 过程图解

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

### 代码实现

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

### 复杂度

| 维度 | 分析 |
|------|------|
| 时间复杂度 | **O(n)** — 两端指针合计移动 n 次 |
| 空间复杂度 | **O(n)** — 返回的新数组（这是必须的，无法原地输出） |

### 易错点

1. **结果数组要从后往前填。** 我们只能先确定最大值，从前往后填会把顺序搞反。
2. **`i <= j` 而不是 `i < j`。** 奇数长度时最中间那个元素也要写进去。
3. **注意平方溢出。** 本题 `|nums[i]| <= 10^4`，平方最大 10^8，`int` 装得下；但如果题目放宽到 `10^5`（平方 10^10），C / C++ 必须改用 `long long`。
4. **别用先平方再排序的写法骗自己。** 那需要 O(n log n)，浪费了「数组有序」这一信息。

---

## 小结

| 题目 | 指针模式 | 移动规则 | 时间 | 空间 |
|------|---------|---------|------|------|
| 删除有序数组中的重复项 | 快慢指针（同向） | `fast` 总是前进；发现新值才移动 `slow` | O(n) | O(1) |
| 验证回文串 | 左右指针（相向） | 先跳过无效字符，再同步内收 | O(n) | O(1) |
| 颜色分类 | 三指针分区 | 遇 0 双指针同行；**遇 2 只动 `p2`** | O(n) | O(1) |
| 合并两个有序数组 | 逆向双指针 | 比大小，较大者占 `tail` | O(m+n) | O(1) |
| 有序数组的平方 | 左右指针 + 逆序填充 | 比平方（绝对值），较大者填末尾 | O(n) | O(n) |

五道题里出现的三种移动节奏值得记住：

1. **同向快慢**：一个指针负责「扫」，一个指针负责「写」，写指针只在满足条件时前进（题 1）。
2. **相向夹逼**：两端向中间靠拢，每一步都能排除掉一批不可能的状态（题 2、题 5）。
3. **分区交换**：多个边界指针把数组切成已确定区与未处理区，交换后要判断新来的元素是否已确定归属（题 3）。

每种节奏都要能回答同一个问题：**我这次移动指针，为什么不会漏掉答案？** 答得上来，代码就不会写错。

## 相关文章

- [数组双指针经典习题（二）：矩阵与字符串](/technology/two-pointers-exercises-matrix/) — 下一篇，二维矩阵的下标映射与最长公共前缀
- [滑动窗口核心代码模板：三个问题搞定所有子串、子数组题](/technology/sliding-window-template/) — 当两个指针都只向右走、夹出的区间有明确含义时，双指针就升级成了滑动窗口
- [数组双指针：从 O(n²) 到 O(n) 的优化利器](/technology/two-pointers-array/) — 四种指针模式的总体框架
- [链表双指针：快慢指针在链表中的精妙应用](/technology/linked-list-two-pointers/) — 同样的模式，换到链表上
- [二分搜索：从入门到边界处理精通](/technology/binary-search/) — 另一种把有序性变成 O(log n) 的手段
