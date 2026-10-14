---
title: DNS 工作原理与常见问题排查
published: 2026-08-26
description: '从根域名服务器到本地缓存，图解一次域名解析的完整链路，并用 dig 与 Node.js 实战排查 NXDOMAIN、SERVFAIL、TTL 不生效等经典故障。'
image: ''
tags: [DNS, 网络协议, 运维, 故障排查, 互联网]
category: '互联网'
draft: false
lang: ''
---

## 引言：那个「永远是 DNS 的问题」的梗

运维圈有一句流传已久的自嘲：*It's always DNS*（永远是 DNS 的锅）。服务挂了、部署上线后访问不通、CDN 切换后一半用户报错——排查一圈下来，罪魁祸首往往是这个我们平时几乎不会注意的系统。

DNS 之所以频繁「背锅」，是因为它是整个互联网访问链路的第一环，却又是缓存层级最多、状态最难观测的一环。这篇文章从解析链路讲起，把 DNS 的工作机制拆开，再落到具体的排查手法上。

## 一、DNS 到底是什么

DNS（Domain Name System）本质上是一个**全球分布式的键值数据库**，把人类可读的域名映射成机器可路由的 IP 地址。它的设计有两个关键点：

**1. 树状层级结构**

域名从右往左读，是一棵倒置的树：

```
                    . (根域)
                 /     |     \
             com      org     cn
            /   \             |
       google  example      com
                  |           |
                www         baidu
```

`www.example.com.` 末尾那个点代表根域，平时被浏览器省略了。每一层由不同的机构管理：根域由 13 组根服务器（`a.root-servers.net` 到 `m.root-servers.net`）负责，`.com` 由 Verisign 管理，`example.com` 则由你自己的域名服务商托管。

**2. 授权与委派**

上一级并不存储下一级的全部记录，只存储「谁负责下一级」的指针（NS 记录）。这种委派机制让 DNS 能承载数十亿域名而不需要任何单点保存全量数据。

## 二、一次完整解析的链路

假设你在浏览器输入 `www.example.com`，背后发生的事情按顺序是：

```
浏览器缓存 → 操作系统缓存(hosts + stub resolver)
    → 递归解析器(通常是运营商 DNS 或 8.8.8.8)
        → 根服务器：「.com 归这些 NS 管」
        → .com TLD 服务器：「example.com 归这些 NS 管」
        → example.com 权威服务器：「www 的 A 记录是 93.184.216.34」
    ← 逐层返回并缓存
```

这里有个容易混淆的概念：**递归查询 vs 迭代查询**。

- 你的设备向递归解析器发的是**递归查询**：「你负责给我最终答案，别让我自己找」。
- 递归解析器向各级权威服务器发的是**迭代查询**：「你知道就给答案，不知道就告诉我该问谁」。

真正干活跑遍全球的是递归解析器，你的设备只发了一个包。

## 三、常见记录类型速查

| 类型 | 作用 | 示例值 |
|------|------|--------|
| `A` | 域名 → IPv4 | `93.184.216.34` |
| `AAAA` | 域名 → IPv6 | `2606:2800:220:1:248:1893::` |
| `CNAME` | 域名 → 另一个域名（别名） | `cdn.example.net.` |
| `NS` | 指定该域的权威服务器 | `ns1.example.com.` |
| `MX` | 邮件服务器（带优先级） | `10 mail.example.com.` |
| `TXT` | 任意文本，常用于域名验证、SPF | `"v=spf1 include:_spf.google.com ~all"` |
| `SOA` | 该域的起始授权信息，含 negative TTL | — |
| `CAA` | 限定哪些 CA 可以为该域签发证书 | `0 issue "letsencrypt.org"` |

## 四、TTL 与缓存：故障的高发区

每条 DNS 记录都带一个 TTL（Time To Live），单位是秒，告诉下游「这个答案你可以缓存多久」。TTL 是 DNS 里最反直觉的部分——**你改了记录，不代表用户立刻能看到**。

一次 DNS 变更真正全网生效，需要等待链路上**所有**缓存层过期：

```
权威服务器(立即生效)
  → 递归解析器缓存(等 TTL)
    → 操作系统缓存(等 TTL)
      → 浏览器缓存(Chrome 默认约 60s，且不总是尊重 TTL)
```

所以正确的切换姿势是：**提前 24~48 小时把 TTL 降到 60 秒，切换完成、观察稳定后再调回 3600**。很多人在切换当天才想起改 TTL，那时旧的高 TTL 已经被缓存出去了，为时已晚。

还有一个坑是 **negative caching**（负缓存）：当解析失败返回 NXDOMAIN 时，这个「不存在」的结论同样会被缓存，时长由 SOA 记录的最后一个字段决定。这就是为什么「记录明明加上了，还是解析不到」——你在添加记录之前的那次失败查询，把 NXDOMAIN 缓存住了。

## 五、实战排查：dig 才是正确工具

`ping` 只能告诉你通不通，`nslookup` 输出信息太少。排查 DNS 请直接用 `dig`。

**基础查询：**

```bash
# 查 A 记录
dig example.com A +short
# 93.184.216.34

# 完整输出，看 TTL 和响应来源
dig example.com A
```

关注输出中的三个关键点：

```
;; ANSWER SECTION:
example.com.    3600    IN    A    93.184.216.34
                 ↑ 剩余 TTL，每次查询递减说明命中了缓存

;; SERVER: 8.8.8.8#53      ← 实际应答的解析器
;; flags: qr rd ra;        ← ra 表示该服务器支持递归
```

**绕过缓存，直接问权威服务器：**

这是判断「是记录没配好，还是缓存没过期」的决定性手段：

```bash
# 1. 先找出权威服务器
dig example.com NS +short
# ns1.example.com.

# 2. 直接向它查询，绕开所有递归缓存
dig @ns1.example.com example.com A
```

如果权威服务器返回了正确结果，而 `8.8.8.8` 没有，那就是纯粹的缓存问题，等 TTL 即可。

**逐级追踪完整委派链：**

```bash
dig example.com +trace
```

这条命令会从根服务器开始，把每一级委派完整打印出来。当你怀疑 NS 记录配错、或者域名在注册商和 DNS 服务商之间「脱节」时，`+trace` 能立刻定位断在哪一层。

**对比不同解析器（排查 DNS 污染 / 分区解析）：**

```bash
for s in 8.8.8.8 1.1.1.1 223.5.5.5 114.114.114.114; do
  echo -n "$s => "
  dig @$s example.com A +short | head -1
done
```

## 六、四类经典故障对照表

| 现象 | 大概率原因 | 验证方法 |
|------|-----------|---------|
| `NXDOMAIN` | 记录不存在，或负缓存未过期 | `dig @权威NS` 直查确认记录是否真的存在 |
| `SERVFAIL` | 权威服务器不可达 / DNSSEC 校验失败 | `dig +cd`（关闭校验）再试，通了就是 DNSSEC 问题 |
| 改了记录不生效 | TTL 未过期 | 看 `ANSWER SECTION` 的 TTL 剩余值 |
| 部分用户能访问 | 不同递归解析器缓存不一致 | 用上面的多解析器对比脚本 |

另外一个高频陷阱：**根域（apex domain）不能配 CNAME**。RFC 1034 规定 CNAME 记录不能与其他记录共存，而根域必须有 SOA 和 NS 记录，因此 `example.com` 本身无法配 CNAME，只有 `www.example.com` 可以。想让根域指向 CDN，需要用云厂商提供的 `ALIAS` / `ANAME` / `CNAME flattening` 这类非标准扩展。

## 七、写一个诊断脚本

Node.js 的 `dns` 模块内置了两套 API：`dns.lookup()` 走操作系统解析（会读 hosts 文件），`dns.resolve*()` 直接发 DNS 查询。排查时必须用后者，否则你测的是系统缓存而不是 DNS。

```javascript
import { Resolver } from 'node:dns/promises';

const RESOLVERS = {
  Google: '8.8.8.8',
  Cloudflare: '1.1.1.1',
  AliDNS: '223.5.5.5',
};

async function diagnose(domain) {
  console.log(`\n=== 诊断 ${domain} ===\n`);

  // 1. 查权威服务器
  const base = new Resolver();
  base.setServers(['8.8.8.8']);
  let authNS = [];
  try {
    authNS = await base.resolveNs(domain);
    console.log(`权威服务器: ${authNS.join(', ')}`);
  } catch (err) {
    console.log(`NS 查询失败: ${err.code}`);
  }

  // 2. 多解析器交叉对比，检测结果是否一致
  const results = new Map();
  for (const [name, ip] of Object.entries(RESOLVERS)) {
    const r = new Resolver({ timeout: 3000, tries: 2 });
    r.setServers([ip]);
    try {
      const addrs = await r.resolve4(domain, { ttl: true });
      const line = addrs.map((a) => `${a.address}(ttl=${a.ttl}s)`).join(' ');
      results.set(name, addrs.map((a) => a.address).sort().join(','));
      console.log(`${name.padEnd(11)} ✓ ${line}`);
    } catch (err) {
      // ENOTFOUND=NXDOMAIN, ESERVFAIL=服务端故障, ETIMEOUT=不可达
      console.log(`${name.padEnd(11)} ✗ ${err.code}`);
    }
  }

  // 3. 判断是否存在解析不一致
  const unique = new Set(results.values());
  if (unique.size > 1) {
    console.log('\n⚠️  各解析器返回结果不一致，可能是缓存未同步或分区解析');
  } else if (unique.size === 1) {
    console.log('\n✓ 各解析器结果一致');
  }
}

await diagnose(process.argv[2] ?? 'example.com');
```

运行 `node dns-check.mjs example.com`，就能一次性看到 TTL 剩余量和跨解析器的一致性——这两个信息覆盖了日常八成的 DNS 故障判断。

## 八、加密 DNS：DoH 与 DoT

传统 DNS 查询走 UDP 53 端口，**完全明文**。这意味着链路上任何一跳都能看到你访问了哪些域名，甚至伪造响应（这正是 DNS 劫持与污染的技术基础）。

两种主流加密方案：

- **DoT（DNS over TLS，RFC 7858）**：走 853 端口，在 TLS 隧道里跑标准 DNS 协议。端口独立，便于网络管理员统一管控。
- **DoH（DNS over HTTPS，RFC 8484）**：把查询封装成 HTTPS 请求走 443 端口，与普通网页流量混在一起，难以被识别和阻断。

DoH 可以直接用 curl 验证：

```bash
curl -s -H 'accept: application/dns-json' \
  'https://cloudflare-dns.com/dns-query?name=example.com&type=A' | jq
```

需要注意的是，加密 DNS 解决的是**传输链路**的隐私与完整性，不解决**解析器本身**是否可信——你的查询记录依然完整暴露给了那家 DoH 服务商。这是一个信任转移，而不是信任消除。

## 结语

DNS 的复杂性不在协议本身——它的报文格式几十年没大改过——而在于那条横跨浏览器、操作系统、递归解析器、权威服务器的多级缓存链路。排查时记住一条主线就够了：

> **从权威服务器往回查。** 先用 `dig @权威NS` 确认源头数据对不对，再逐层往下判断是哪一级缓存拖住了。

搞清楚这一点，「It's always DNS」就从玄学变成了三条命令能定位的日常问题。

---

## 参考来源

- [RFC 1034 - Domain Names: Concepts and Facilities](https://datatracker.ietf.org/doc/html/rfc1034)
- [RFC 1035 - Domain Names: Implementation and Specification](https://datatracker.ietf.org/doc/html/rfc1035)
- [RFC 2308 - Negative Caching of DNS Queries](https://datatracker.ietf.org/doc/html/rfc2308)
- [RFC 8484 - DNS Queries over HTTPS (DoH)](https://datatracker.ietf.org/doc/html/rfc8484)
- [Cloudflare Learning - What is DNS?](https://www.cloudflare.com/learning/dns/what-is-dns/)
- [Node.js DNS 模块官方文档](https://nodejs.org/api/dns.html)
