---
title: TLS 1.3 握手过程详解：一次往返的秘密
published: 2026-08-19
description: '从 TLS 1.2 的两次往返到 TLS 1.3 的单次握手，图解密钥协商、证书验证与 0-RTT 的完整过程，附带 OpenSSL 抓包实战。'
image: ''
tags: [TLS, HTTPS, 安全, 网络协议, 加密]
category: '互联网'
draft: false
lang: ''
---

## 引言：HTTPS 背后的隐形协议

我们每天都在用 HTTPS 访问网站，但很少有人真正理解「那个绿色小锁」背后发生了什么。HTTPS 的加密层由 TLS（Transport Layer Security）协议负责，它的核心任务是在一条不可信的网络上，让客户端和服务端安全地协商出一把只有双方知道的会话密钥。

2018 年，TLS 1.3（RFC 8446）正式发布。与它的前任 TLS 1.2 相比，TLS 1.3 做了一件看似不可能的事：**把握手从两次往返（2-RTT）压缩到一次往返（1-RTT）**。这意味着建立 HTTPS 连接的时间几乎减半，页面加载更快。

本文不堆砌密码学术语，而是用图解和抓包的方式，讲清楚 TLS 1.3 握手到底发生了什么。

## 为什么握手如此重要

在理解 TLS 1.3 之前，先想一个问题：客户端和服务端从未见过面，如何在不被窃听的情况下协商出一把密钥？

这正是经典的「鸡生蛋」难题——要安全通信就需要密钥，但要传递密钥又需要安全通信。TLS 用**非对称加密 + 对称加密**的组合破解了这个死循环：

1. 用非对称加密（公钥/私钥）安全地协商出一把临时密钥
2. 之后的数据传输改用对称加密（如 AES-GCM），快且安全

握手，就是第 1 步的「协商」过程。

## TLS 1.2 的两次往返

先看 TLS 1.2 的握手流程，理解 TLS 1.3 到底优化了什么：

```
客户端                    服务端
  │  ── ClientHello ──────→  │
  │  ←─ ServerHello ───────  │
  │  ←─ Certificate ───────  │
  │  ←─ ServerHelloDone ───  │   (第 1 个 RTT)
  │                          │
  │  ── ClientKeyExchange ─→ │
  │  ── [ChangeCipherSpec] ─→│
  │  ── Finished ──────────→ │
  │  ←─ [ChangeCipherSpec] ─ │
  │  ←─ Finished ──────────  │   (第 2 个 RTT)
  │                          │
  │  ── 应用数据 ──────────→ │   (第 3 个 RTT 才能发数据)
```

TLS 1.2 完整握手需要 **2 个 RTT**，加上 TCP 三次握手的 1 个 RTT，用户实际要等 **3 个 RTT** 才能发出第一个 HTTP 请求。在高延迟网络（如移动网络 100ms 延迟）下，仅握手就浪费了 300ms。

更糟的是，TLS 1.2 支持一大堆过时且危险的算法——RSA 密钥交换、CBC 模式加密、SHA-1 哈希等。这些历史包袱是 BEAST、POODLE、FREAK 等著名攻击的温床。

## TLS 1.3：删繁就简的一次往返

TLS 1.3 的握手被精简成下面这样：

```
客户端                    服务端
  │  ── ClientHello ──────→ │   (携带 key_share 猜测)
  │  ←─ ServerHello ───────  │   (选定算法，返回 key_share)
  │  ←─ {EncryptedExtensions}│
  │  ←─ {Certificate} ─────  │
  │  ←─ {CertificateVerify}─ │
  │  ←─ {Finished} ────────  │   (第 1 个 RTT)
  │                          │
  │  ── {Finished} ────────→ │
  │  ── 应用数据 ──────────→ │   (第 1 个 RTT 即可发数据!)
```

注意花括号 `{}`：从 ServerHello 之后，服务端的**所有消息都已经被加密了**。这是 TLS 1.3 的一个关键改进——握手本身尽可能少地暴露明文。

整个过程只有 **1 个 RTT**，加上 TCP 的 1 个 RTT，总共 **2 个 RTT** 就能发送 HTTP 请求，比 TLS 1.2 快了整整三分之一。

### 关键改进一：只保留安全的密钥交换

TLS 1.3 砍掉了 RSA 密钥交换和静态 DH，只保留**带前向保密（Forward Secrecy）的 (EC)DHE**。这意味着即使服务器的私钥将来泄露，历史流量也无法被解密——这是 TLS 1.3 最本质的安全提升。

### 关键改进二：key_share 猜一把

这是 1-RTT 的核心技巧。客户端在 ClientHello 里直接带上自己猜测的密钥交换参数（如 X25519 公钥），而不是像 TLS 1.2 那样等服务端选定算法后再交换：

```
ClientHello:
  cipher_suites: [TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384, ...]
  key_share:     (X25519, 客户端的临时公钥)   ← 提前猜！

ServerHello:
  cipher_suite:  TLS_AES_128_GCM_SHA256
  key_share:     (X25519, 服务端的临时公钥)   ← 直接响应
```

如果客户端猜对了算法，双方立刻就能计算出共享密钥，省掉一次往返。如果猜错了，服务端会发一个 `HelloRetryRequest` 让客户端重试——这是极少数情况。

## 握手的三把「锁」

TLS 1.3 的握手实际上完成了三件事：

1. **密钥协商**：通过 (EC)DHE 计算出共享密钥 `shared_secret`
2. **身份认证**：服务端用证书证明「我就是 example.com」
3. **密钥派生**：从 `shared_secret` 派生出多个用途不同的密钥

其中密钥派生最容易被忽视，却最能体现 TLS 1.3 的设计哲学。它使用 **HKDF（HMAC-based Key Derivation Function）**，从一份主密钥派生出四把用途各异的密钥：

| 密钥 | 用途 |
|------|------|
| `client_handshake_traffic_secret` | 客户端握手流量加密 |
| `server_handshake_traffic_secret` | 服务端握手流量加密 |
| `client_application_traffic_secret` | 客户端应用数据加密 |
| `server_application_traffic_secret` | 服务端应用数据加密 |

「一钥一用」的原则确保某一把密钥泄露不会波及其他用途。

## 实战：用 OpenSSL 观察 1-RTT 握手

理论讲完了，我们动手验证。OpenSSL 自 1.1.1 起支持 TLS 1.3，可以用一条命令直观看到握手过程。

**1. 查看服务端是否支持 TLS 1.3：**

```bash
# 强制使用 TLS 1.3 连接
echo | openssl s_client -connect www.cloudflare.com:443 -tls1_3 2>&1 | grep -E "Protocol|Cipher"

# 输出示例：
# Protocol  : TLSv1.3
# Cipher    : TLS_AES_256_GCM_SHA384
```

**2. 查看完整的握手消息：**

```bash
echo | openssl s_client -connect www.cloudflare.com:443 -tls1_3 -msg 2>&1 | head -40
```

`-msg` 参数会打印每一帧握手消息的十六进制内容。你会看到：

```
>>> TLS 1.3, Handshake [length 0231], ClientHello
<<< TLS 1.3, Handshake [length 007a], ServerHello
<<< TLS 1.3, ChangeCipherSpec [length 0001]
<<< TLS 1.3, Application Data [length 00ea]   ← 加密后的握手消息
```

关键观察点：**ServerHello 之后紧跟的不是明文 Certificate，而是加密的 Application Data**。这正是 TLS 1.3 把证书、签名全部塞进加密通道的证据。

**3. 生成自签名证书测试本地服务端：**

```bash
# 生成私钥和自签名证书
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
  -keyout server.key -out server.crt -days 365 -nodes \
  -subj "/CN=localhost"
```

## 实战：Node.js 构建 TLS 1.3 服务端

下面用 Node.js 的 `tls` 模块创建一个强制 TLS 1.3 的服务端，直观展示协议配置：

```js
import tls from 'node:tls';
import { readFileSync } from 'node:fs';

const options = {
  key: readFileSync('./server.key'),
  cert: readFileSync('./server.crt'),
  // 只允许 TLS 1.3
  minVersion: 'TLSv1.3',
  maxVersion: 'TLSv1.3',
};

const server = tls.createServer(options, (socket) => {
  console.log('客户端已连接，协议版本:', socket.getProtocol());
  console.log('协商的密码套件:', socket.getCipher());

  socket.on('data', () => {
    socket.end(
      'HTTP/1.1 200 OK\r\n' +
      'Content-Type: text/plain\r\n' +
      'Connection: close\r\n\r\n' +
      'Hello TLS 1.3!\n'
    );
  });
});

server.listen(8443, () => {
  console.log('TLS 1.3 服务端监听在 https://localhost:8443');
});
```

用浏览器或 curl 验证：

```bash
curl --tlsv1.3 -k https://localhost:8443
# 输出: Hello TLS 1.3!
```

`--tlsv1.3` 强制客户端使用 TLS 1.3，`-k` 跳过自签名证书校验（仅本地测试用，生产环境切勿使用）。

## 0-RTT：会话恢复的终极形态

如果客户端和服务端之前握过手，TLS 1.3 还支持**更极致的 0-RTT**——客户端在第一次往返中直接带上应用数据：

```
客户端 ── ClientHello + 0-RTT 应用数据 ──────→ 服务端
客户端 ←── ServerHello + {Finished} ────────── 服务端
```

0-RTT 依赖「预共享密钥」（PSK，即上次会话保存的密钥），适用于需要极低延迟的场景。但它有一个著名的安全代价：**0-RTT 数据无法保证防重放（Replay）**。攻击者可以截获并重放 0-RTT 请求。因此 0-RTT 只应被用于**幂等**的请求（如 GET），绝不要用于转账、下单等有副作用的操作。

## 总结

TLS 1.3 的核心思想可以浓缩为一句话：**砍掉所有不安全的算法，把能提前的东西都提前**。它带来的收益是双重的：

- **性能**：握手从 2-RTT 降到 1-RTT，0-RTT 更进一步
- **安全**：废弃 RSA 密钥交换和 CBC 模式，强制前向保密，握手后立即加密

根据 Cloudflare 的数据，TLS 1.3 部署后，建立连接的平均时间减少了约 100ms。截至 2026 年，TLS 1.3 已经覆盖了超过 95% 的全球 HTTPS 流量——它在极短的时间内完成了从「新标准」到「默认配置」的转变。

理解 TLS 1.3 握手，不仅是为了读懂抓包工具的输出，更是理解现代互联网安全设计的一个绝佳入口：**好的协议设计，从来都是在安全与性能之间找到最优雅的平衡点**。

---

**参考来源：**

- [RFC 8446 — The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446)
- [Cloudflare — A Detailed Look at the TLS 1.3 Handshake](https://blog.cloudflare.com/rfc-8446-aka-tls-1-3/)
- [The Illustrated TLS 1.3 Connection](https://tls13.xargs.org/)
- [MDN — Transport Layer Security](https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security)
