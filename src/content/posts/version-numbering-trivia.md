---
title: 版本号命名的趣事：从 1.0 到 114.0
published: 2026-09-12
description: '语义化版本本该是三条数字，结果 TeX 收敛到圆周率、Firefox 一年跳五个大版本、Chrome 把手底下的数字偷偷抹成 0.0.0——聊聊版本号这出荒诞剧。'
image: ''
tags: [版本号, 语义化版本, 程序员笑话]
category: '其他'
draft: false
lang: ''
---

先说一个几乎人人都写过的 bug：

```js
console.log('1.10.0' > '1.9.0'); // false
```

字符串比较逐位进行，第一个字符都是 `1`，第二个 `.` 与 `.` 也相同，于是比到第三位：`'1' < '9'`，判负。十个 minor 版本的迭代成果，被一次字典序比较轻松抹平。这行代码之所以好笑，是因为它暴露了一个真相：**版本号本来是给机器读的，但我们从来把它当人话用。**

## 三条数字的乌托邦

[Semantic Versioning](https://semver.org/) 给出的承诺很干净：`MAJOR.MINOR.PATCH`。破坏兼容就抬 MAJOR，加功能抬 MINOR，修 bug 抬 PATCH。规则清楚到可以写进合同，唯一的毛病是没人真的遵守。现实里 MAJOR 的抬升往往由市场部而非 `git log` 决定——「下季度我们发 2.0」，然后提交记录里躺着一次按钮圆角调整。

于是出现了那句行业格言：**1.0 是你羞于示人的版本，2.0 是你不敢示人的版本。**

## TeX：向圆周率收敛

在所有版本号方案里，最浪漫的属于 Donald Knuth。TeX 从 3.0 开始，每修一个 bug 就在小数末尾追加一位数字，让版本号无限逼近 π：3.14 → 3.141 → 3.1415……目前的正式版本是 `3.141592653`。姊妹程序 METAFONT 则向自然常数 e 收敛。Knuth 说得很明白：这串数字本身就是声明——程序只是在**趋向**完成，而非抵达完成。他还立下遗嘱，版本的「最后一次修改」将在其身后进行，届时 TeX 的版本号被钉死为 π，从此「按定义完全无错」。顺带一提，他给 bug 设的赏金是 2.56 美元（一个十六进制美元），逐年翻倍，上限 327.68 美元。

## Firefox：一年跳五个大版本

2011 年是版本号的通胀元年。Mozilla 改用快速发布，那年 Firefox 的轨迹是：4 月发 Firefox 4，6 月 21 日 5，8 月 16 日 6，9 月 27 日 7，11 月 8 日 8，12 月 20 日 9。而当时的 Chrome 已经走到 16，Firefox 才刚从 3.6 上岸。批评者说这是纯粹的「数字游戏」，免得用户觉得版本号小就是落后；支持者则辩称每次发布确实可能不兼容上一个版本，抬 MAJOR 在技术上说得通。

无论哪边有理，它都说明了一件事：**版本号一旦被当成营销指标，就和代码的真实变化脱钩了。**

## Chrome：把数字抹成 0.0.0

最能印证上面这句的，恰恰是当年逼得 Firefox 追版本的 Chrome。为了对抗浏览器指纹追踪，Chrome 推行了 UA 缩减，User-Agent 里的版本号只保留主版本，minor、build、patch 一律归零，于是你看到的是 `Chrome/114.0.0.0` 这种荒唐的组合。

绕了一圈：版本号先被拿来炫技，又被当作指纹，最后被主动打码。数字还在，信息没了。

## Windows 9 为什么不叫 Windows 9

流传最广的说法是一个前缀判断惹的祸。大量老程序这样识别 95/98：

```c
if (version.StartsWith("Windows 9")) { /* 95 或 98 */ }
```

那么一旦新系统叫「Windows 9」，它会落进这个分支，被当成十五年前的老古董，兼容模式当场错乱。于是微软跳过 9，直接叫 Windows 10。

故事讲到这里很完整，但它**并未得到微软官方证实**。反对方指出，Windows 的版本号从来不是字符串，而是 `OSVERSIONINFO` 这类结构体里的主次版本对——Windows 95 是 4.0，98 是 4.1，ME 是 4.9，内部压根没有「9」。所以这个段子更可能是事后附会的都市传说，真实原因大概是市场部觉得 8 的口碑太差，需要离远一点。

这反而是整篇里最好笑的部分：**一个关于「错误的版本判断」的故事，本身可能就是一次错误的版本判断。**

## 那些还在坚持讲人话的

- **Ubuntu** 用 `YY.MM`：`24.04` 就是 2024 年 4 月，不需要任何解释。
- **Node.js** 用奇偶区分稳定性：奇数版本是当前版，偶数版本才进 LTS。
- **Linux 内核** 干脆承认自己放弃了：Linus 说过 3.0 这个数字「没有意义」。

所以下次你要发 2.0 的时候，不妨先想清楚：是接口真的破了，还是只是想让下载页看起来精神一点。

## 参考来源

- [Semantic Versioning 2.0.0 规范](https://semver.org/)
- [TeX is probably bug free but also very conservative — LWN.net](https://lwn.net/Articles/726429/)
- [Why has Firefox jumped so many major version numbers? — Mozilla Support](https://support.mozilla.org/en-US/questions/885485)
- [User-Agent Client Hints — Chrome for Developers](https://developer.chrome.com/docs/privacy-security/user-agent-client-hints)
- [Why "Windows 10" wasn't chosen because of developers checking "Windows 9" — GitHub Gist](https://gist.github.com/sixlettervariables/5571cecb5a9d04b41d03)
