---
title: 历史上的著名 Bug：从千年虫到 Cloudflare 宕机
published: 2026-08-08
description: '盘点那些让程序员哭笑不得、让公司损失惨重的经典 Bug 故事'
image: ''
tags: [Bug, 历史, 编程趣闻]
category: '前端'
draft: false
lang: ''
---

程序员可能是这个世界上唯一一个既害怕 Bug，又忍不住津津乐道地传颂 Bug 的群体。有些 Bug 的传奇程度，甚至超越了它们所寄宿的软件本身。今天我们就来盘点几个写入计算机历史的"名场面"。

## Y2K：一个两位数引发的全球恐慌

上世纪六七十年代，存储和内存极其昂贵。为了省钱，程序员们用两位数来表示年份——`1970` 存成 `70`。这在当时无可厚非：谁会想到这些 COBOL 程序能活到 2000 年？

```cobol
01  CURRENT-DATE.
    05  YY  PIC 99.   *> 只存了两位数的年份
```

结果 1999 年临近时，全世界恐慌了：当 1999 年翻到 2000 年时，年份会变成 `00`，计算年龄会得出 `00-70 = -70` 岁，贷款利息会从 1900 年开始算，核电站的监控系统可能误判停机时间……

全球花了约 **3000 亿美元**来修复这个问题。但有意思的是，俄罗斯、韩国等"行动较慢"的国家几乎没做什么修复——结果也确实没出什么大事[1]。千年虫到底是惊天大 Bug，还是咨询公司的一场营销盛宴？至今仍有争议。

但有一个 bug 修复，确实真实地留到了今天：2000 年之后出生的人刷卡、填表时，偶尔会发现系统里自己的出生年份是 `1900`。

## Cloudflare 的"死亡超链接"

2017 年 2 月，Cloudflare 的一个 HTML 解析器出了个匪夷所思的 bug。

```cpp
// 简化示意：解析器在遇到不平衡的 HTML 标签时
// 会把后续内存中的敏感数据当作 HTML 内容输出
if (tag == "script" && !findClosingTag()) {
    // 哦不，继续读内存直到找到 </script>
    outputRawDataFromMemory(); // 🫠
}
```

这个 bug 的触发条件极其刁钻：需要网页中包含不平衡的 HTML 标签（如 `<script` 缺少闭合），解析器就会疯狂地从内存中读取数据补到页面上。后果是：用户的密码、API 密钥、会话令牌、甚至其他网站的 HTTPS 请求内容，都被泄露到了随机网页的 HTML 源码中[2]。

搜索引擎爬虫又把含这些泄露数据的页面缓存了下来。Tavis Ormandy 发现这个 bug 时，Google 爬虫的缓存里还存着 Uber 用户的乘车记录和 OKCupid 的私信。Bug 存在了 5 个月，影响范围横跨数百万个网站，堪称**互联网史上最安静的灾难**。

Cloudflare CTO John Graham-Cumming 事后写道："一个 `==` 被写成 `>=` 就能干出这种事。"

## Knight Capital：45 分钟损失 4.4 亿美元

2012 年 8 月 1 日，Knight Capital 部署了一套新的交易算法。但服务器上有个旧版本的代码没删干净，部署脚本也没把新代码部署到所有 8 台服务器上——其中一台运行的还是旧代码。

开盘后 45 分钟内，这台"叛逆"的服务器以每分钟 400 万美元的速度疯狂买卖，累计执行了 4 百万笔交易，最终亏损 **4.4 亿美元**。一家成立 17 年的公司，因为一个部署脚本的疏忽，45 分钟之后就不复存在了[3]。

```python
# 部署脚本（伪代码）
deploy_to_servers([s1, s2, s3, s4, s5, s6, s7])
# 咦，s8 呢？
# 算了，上周五赶着下班，周一再说吧（这段是虚构的）
```

## 结语

这些故事告诉我们一个朴素的道理：**Bug 的大小和技术复杂度不成正比**。Y2K 只是两位数问题，Cloudflare 只是一个边界条件，Knight Capital 只差了一台服务器。

但就是这些"小"问题，导致了人类历史上最昂贵的修复账单。所以下次你面对一段"看起来问题不大"的代码时，不妨想想 Cloudflare CTO 那句名言——有时候，一个字符就能干出大事。

---

**参考来源：**

[1] Robert L. Mitchell, "Y2K: The good, the bad and the ugly", Computerworld (2009)  
[2] Cloudflare, "Incident report on memory leak caused by Cloudflare parser bug", Cloudflare Blog (2017), https://blog.cloudflare.com/incident-report-on-memory-leak-caused-by-cloudflare-parser-bug/  
[3] U.S. Securities and Exchange Commission, "In the Matter of Knight Capital Americas LLC", SEC Release No. 70694 (2013), https://www.sec.gov/litigation/admin/2013/34-70694.pdf

> 周末愉快，愿你的代码里只有 0 个 bug（如果有，希望不在生产环境）。
