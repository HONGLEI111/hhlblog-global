---
title: How DNS Works and Troubleshooting Common Issues
published: 2026-08-26
description: A visual walkthrough of the full domain resolution path from root servers to local caches, plus hands-on troubleshooting of classic failures like NXDOMAIN, SERVFAIL, and TTL not taking effect using dig and Node.js.
image: ''
tags: [DNS, Network Protocols, Operations, Troubleshooting, Internet]
category: Internet
draft: false
---
## Introduction: The "It's Always DNS" Meme

In ops circles, there's a long-running self-deprecating joke: *It's always DNS*. A service goes down, a deployment becomes unreachable, half your users report errors after a CDN switch—and after a full round of troubleshooting, the culprit is usually this system we almost never pay attention to.

DNS gets "blamed" so often because it's the first link in the entire internet access chain, yet it's also the link with the most cache layers and the hardest-to-observe state. This article starts from the resolution chain, takes apart how DNS works, and then lands on concrete troubleshooting techniques.

## 1. What Exactly Is DNS

DNS (Domain Name System) is essentially a **globally distributed key-value database** that maps human-readable domain names to machine-routable IP addresses. Its design has two key points:

**1. Tree-like hierarchical structure**

Domain names are read from right to left, forming an inverted tree:

```
                    . (根域)
                 /     |     \
             com      org     cn
            /   \             |
       google  example      com
                  |           |
                www         baidu
```

`www.example.com.` The trailing dot represents the root domain, which browsers normally omit. Each level is managed by a different organization: the root domain is handled by 13 sets of root servers (`a.root-servers.net` to `m.root-servers.net`), `.com` is managed by Verisign, and `example.com` is hosted by your own domain registrar.

**2. Authorization and delegation**

Each level doesn't store all records of the level below it—it only stores a pointer (NS record) to "who is responsible for the next level." This delegation mechanism allows DNS to carry billions of domain names without any single point holding the full dataset.

## 2. The Chain of a Complete Resolution

Suppose you type `www.example.com` into your browser. What happens behind the scenes, in order, is:

```
浏览器缓存 → 操作系统缓存(hosts + stub resolver)
    → 递归解析器(通常是运营商 DNS 或 8.8.8.8)
        → 根服务器：「.com 归这些 NS 管」
        → .com TLD 服务器：「example.com 归这些 NS 管」
        → example.com 权威服务器：「www 的 A 记录是 93.184.216.34」
    ← 逐层返回并缓存
```

There's an easily confused concept here: **recursive query vs. iterative query**.

- What your device sends to the recursive resolver is a **recursive query**: "You're responsible for giving me the final answer, don't make me look it up myself."
- What the recursive resolver sends to authoritative servers at each level is an **iterative query**: "If you know, give me the answer; if not, tell me who to ask."

The one actually doing the work and traversing the globe is the recursive resolver—your device only sent a single packet.

## 3. Common Record Types Quick Reference

| Type | Purpose | Example Value |
|------|------|--------|
| `A` | Domain → IPv4 | `93.184.216.34` |
| `AAAA` | Domain → IPv6 | `2606:2800:220:1:248:1893::` |
| `CNAME` | Domain → another domain (alias) | `cdn.example.net.` |
| `NS` | Specifies the authoritative servers for the domain | `ns1.example.com.` |
| `MX` | Mail server (with priority) | `10 mail.example.com.` |
| `TXT` | Arbitrary text, often used for domain verification, SPF | `"v=spf1 include:_spf.google.com ~all"` |
| `SOA` | Start of authority info for the domain, including negative TTL | — |
| `CAA` | Restricts which CAs can issue certificates for the domain | `0 issue "letsencrypt.org"` |

## 4. TTL and Caching: The High-Risk Zone for Failures

Every DNS record carries a TTL (Time To Live) in seconds, telling downstream "how long you may cache this answer." TTL is the most counterintuitive part of DNS—**just because you changed a record doesn't mean users will see it immediately**.

For a DNS change to truly take effect across the internet, you need to wait for **all** cache layers along the chain to expire:

```
权威服务器(立即生效)
  → 递归解析器缓存(等 TTL)
    → 操作系统缓存(等 TTL)
      → 浏览器缓存(Chrome 默认约 60s，且不总是尊重 TTL)
```

So the correct switching approach is: **lower the TTL to 60 seconds 24–48 hours in advance, and after the switch is complete and observed to be stable, set it back to 3600**. Many people only remember to change the TTL on the day of the switch—by then the old high TTL has already been cached out, and it's too late.

Another pitfall is **negative caching**: when resolution fails and returns NXDOMAIN, this "does not exist" conclusion is also cached, for a duration determined by the last field of the SOA record. This is why "the record is clearly added, but it still won't resolve"—the failed query you made before adding the record cached the NXDOMAIN.

## 5. Hands-On Troubleshooting: dig Is the Right Tool

`ping` can only tell you whether it's reachable, and `nslookup` outputs too little information. For DNS troubleshooting, go straight to `dig`.

**Basic query:**

```bash
# 查 A 记录
dig example.com A +short
# 93.184.216.34

# 完整输出，看 TTL 和响应来源
dig example.com A
```

Pay attention to three key points in the output:

```
;; ANSWER SECTION:
example.com.    3600    IN    A    93.184.216.34
                 ↑ 剩余 TTL，每次查询递减说明命中了缓存

;; SERVER: 8.8.8.8#53      ← 实际应答的解析器
;; flags: qr rd ra;        ← ra 表示该服务器支持递归
```

**Bypass the cache and ask the authoritative server directly:**

This is the decisive method for determining "is the record misconfigured, or has the cache not expired":

```bash
# 1. 先找出权威服务器
dig example.com NS +short
# ns1.example.com.

# 2. 直接向它查询，绕开所有递归缓存
dig @ns1.example.com example.com A
```

If the authoritative server returns the correct result but `8.8.8.8` doesn't, then it's purely a caching issue—just wait for the TTL.

**Trace the complete delegation chain level by level:**

```bash
dig example.com +trace
```

This command starts from the root servers and prints out every level of delegation in full. When you suspect the NS records are misconfigured, or the domain is "disconnected" between the registrar and the DNS provider, `+trace` can immediately pinpoint which layer the break is at.

**Compare different resolvers (troubleshoot DNS poisoning / split-horizon resolution):**

```bash
for s in 8.8.8.8 1.1.1.1 223.5.5.5 114.114.114.114; do
  echo -n "$s => "
  dig @$s example.com A +short | head -1
done
```

## 6. Four Classic Failure Types Comparison Table

| Symptom | Most Likely Cause | Verification Method |
|------|-----------|---------|
| `NXDOMAIN` | Record doesn't exist, or negative cache hasn't expired | `dig @权威NS` direct query to confirm whether the record actually exists |
| `SERVFAIL` | Authoritative server unreachable / DNSSEC validation failure | `dig +cd` (disable validation) and retry; if it works, it's a DNSSEC issue |
| Changed record doesn't take effect | TTL hasn't expired | Check the remaining TTL value of `ANSWER SECTION` |
| Some users can access, others can't | Different recursive resolvers have inconsistent caches | Use the multi-resolver comparison script above |

Another high-frequency trap: **the apex domain cannot have a CNAME**. RFC 1034 stipulates that a CNAME record cannot coexist with other records, and the apex domain must have SOA and NS records. Therefore `example.com` itself cannot have a CNAME—only `www.example.com` can. To point the apex domain at a CDN, you need non-standard extensions like `ALIAS` / `ANAME` / `CNAME flattening` provided by cloud vendors.
## 7. Write a Diagnostic Script

Node.js's `dns` module has two built-in sets of APIs: `dns.lookup()` goes through the operating system resolver (it reads the hosts file), while `dns.resolve*()` sends DNS queries directly. When troubleshooting, you must use the latter, otherwise you're testing the system cache rather than DNS.

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

Run `node dns-check.mjs example.com`, and you can see at a glance both the remaining TTL and consistency across resolvers—these two pieces of information cover eighty percent of everyday DNS fault diagnosis.

## 8. Encrypted DNS: DoH and DoT

Traditional DNS queries go over UDP port 53, **completely in plaintext**. This means any hop along the path can see which domains you're visiting, and can even forge responses (this is precisely the technical basis for DNS hijacking and poisoning).

Two mainstream encryption schemes:

- **DoT (DNS over TLS, RFC 7858)**: uses port 853, running the standard DNS protocol inside a TLS tunnel. The dedicated port makes it easy for network administrators to manage and control uniformly.
- **DoH (DNS over HTTPS, RFC 8484)**: encapsulates queries as HTTPS requests over port 443, blending in with ordinary web traffic, making it hard to identify and block.

DoH can be verified directly with curl:

```bash
curl -s -H 'accept: application/dns-json' \
  'https://cloudflare-dns.com/dns-query?name=example.com&type=A' | jq
```

It's worth noting that encrypted DNS solves the privacy and integrity of the **transmission link**, but does not solve whether the **resolver itself** is trustworthy—your query records are still fully exposed to that DoH provider. This is a transfer of trust, not an elimination of trust.

## Conclusion

DNS's complexity doesn't lie in the protocol itself—its message format hasn't changed much in decades—but in the multi-level cache chain spanning browsers, operating systems, recursive resolvers, and authoritative servers. When troubleshooting, just remember one main thread:

> **Query backward from the authoritative server.** First use `dig @权威NS` to confirm whether the source data is correct, then work down layer by layer to determine which level of cache is holding things up.

Once you understand this, "It's always DNS" goes from being mysticism to an everyday problem that three commands can pinpoint.

---

## References

- [RFC 1034 - Domain Names: Concepts and Facilities](https://datatracker.ietf.org/doc/html/rfc1034)
- [RFC 1035 - Domain Names: Implementation and Specification](https://datatracker.ietf.org/doc/html/rfc1035)
- [RFC 2308 - Negative Caching of DNS Queries](https://datatracker.ietf.org/doc/html/rfc2308)
- [RFC 8484 - DNS Queries over HTTPS (DoH)](https://datatracker.ietf.org/doc/html/rfc8484)
- [Cloudflare Learning - What is DNS?](https://www.cloudflare.com/learning/dns/what-is-dns/)
- [Node.js DNS Module Official Documentation](https://nodejs.org/api/dns.html)