---
title: 'TLS 1.3 Handshake Explained: The Secret of a Single Round Trip'
published: 2026-08-19
description: From TLS 1.2's two round trips to TLS 1.3's single handshake, this guide illustrates key negotiation, certificate verification, and 0-RTT with packet capture examples using OpenSSL.
image: ''
tags: [TLS, HTTPS, Security, Network Protocols, Encryption]
category: Internet
draft: false
---
## Introduction: The Invisible Protocol Behind HTTPS

We use HTTPS to visit websites every day, but few people truly understand what happens behind that "little green lock." The encryption layer of HTTPS is handled by the TLS (Transport Layer Security) protocol, whose core task is to allow a client and server to securely negotiate a session key—known only to the two parties—over an untrusted network.

In 2018, TLS 1.3 (RFC 8446) was officially released. Compared with its predecessor TLS 1.2, TLS 1.3 accomplished something that seemed impossible: **compressing the handshake from two round trips (2-RTT) to one round trip (1-RTT)**. This means the time to establish an HTTPS connection is nearly halved, and pages load faster.

This article doesn't pile on cryptographic jargon. Instead, it uses diagrams and packet captures to explain exactly what happens during a TLS 1.3 handshake.

## Why the Handshake Matters So Much

Before understanding TLS 1.3, consider a question: the client and server have never met before—how can they negotiate a key without being eavesdropped on?

This is the classic "chicken-and-egg" problem—secure communication requires a key, but transmitting the key requires secure communication. TLS breaks this deadlock with a combination of **asymmetric encryption + symmetric encryption**:

1. Use asymmetric encryption (public/private keys) to securely negotiate a temporary key
2. Subsequent data transmission switches to symmetric encryption (such as AES-GCM), which is fast and secure

The handshake is the "negotiation" process of step 1.

## TLS 1.2's Two Round Trips

First, let's look at the TLS 1.2 handshake flow to understand what exactly TLS 1.3 optimized:

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

A full TLS 1.2 handshake requires **2 RTTs**, plus 1 RTT for the TCP three-way handshake, meaning users actually have to wait **3 RTTs** before sending the first HTTP request. On high-latency networks (such as mobile networks with 100ms latency), the handshake alone wastes 300ms.

Worse still, TLS 1.2 supports a whole pile of outdated and dangerous algorithms—RSA key exchange, CBC mode encryption, SHA-1 hashing, and so on. These historical burdens are the breeding ground for famous attacks such as BEAST, POODLE, and FREAK.

## TLS 1.3: One Round Trip by Cutting the Clutter

The TLS 1.3 handshake has been streamlined into the following:

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

Note the curly braces `{}`: after ServerHello, **all of the server's messages are already encrypted**. This is a key improvement of TLS 1.3—the handshake itself exposes as little plaintext as possible.

The entire process takes only **1 RTT**, plus 1 RTT for TCP, for a total of **2 RTTs** before an HTTP request can be sent—a full one-third faster than TLS 1.2.

### Key Improvement One: Keep Only Secure Key Exchange

TLS 1.3 removes RSA key exchange and static DH, keeping only **(EC)DHE with Forward Secrecy**. This means that even if the server's private key is leaked in the future, historical traffic cannot be decrypted—this is the most fundamental security improvement of TLS 1.3.

### Key Improvement Two: Guess with key_share

This is the core trick behind 1-RTT. The client directly includes its guessed key exchange parameters (such as an X25519 public key) in the ClientHello, rather than waiting for the server to select an algorithm before exchanging, as in TLS 1.2:

```
ClientHello:
  cipher_suites: [TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384, ...]
  key_share:     (X25519, 客户端的临时公钥)   ← 提前猜！

ServerHello:
  cipher_suite:  TLS_AES_128_GCM_SHA256
  key_share:     (X25519, 服务端的临时公钥)   ← 直接响应
```

If the client guesses the algorithm correctly, both sides can immediately compute the shared key, saving a round trip. If the guess is wrong, the server sends a `HelloRetryRequest` to let the client retry—this is an extremely rare case.

## The Three "Locks" of the Handshake

The TLS 1.3 handshake actually accomplishes three things:

1. **Key negotiation**: Compute the shared key `shared_secret` via (EC)DHE
2. **Identity authentication**: The server uses a certificate to prove "I am example.com"
3. **Key derivation**: Derive multiple keys for different purposes from `shared_secret`

Among these, key derivation is the most easily overlooked, yet it best reflects the design philosophy of TLS 1.3. It uses **HKDF (HMAC-based Key Derivation Function)** to derive four keys with different purposes from a single master key:

| Key | Purpose |
|------|------|
| `client_handshake_traffic_secret` | Client handshake traffic encryption |
| `server_handshake_traffic_secret` | Server handshake traffic encryption |
| `client_application_traffic_secret` | Client application data encryption |
| `server_application_traffic_secret` | Server application data encryption |

The principle of "one key, one use" ensures that the leakage of one key will not affect other purposes.

## Hands-On: Observing the 1-RTT Handshake with OpenSSL

Now that the theory is covered, let's verify it in practice. OpenSSL has supported TLS 1.3 since 1.1.1, and you can intuitively see the handshake process with a single command.

**1. Check whether the server supports TLS 1.3:**

```bash
# Force TLS 1.3 connections
echo | openssl s_client -connect www.cloudflare.com:443 -tls1_3 2>&1 | grep -E "Protocol|Cipher"

# Example output:
# Protocol  : TLSv1.3
# Cipher    : TLS_AES_256_GCM_SHA384
```

**2. View the complete handshake messages:**

```bash
echo | openssl s_client -connect www.cloudflare.com:443 -tls1_3 -msg 2>&1 | head -40
```

The `-msg` parameter prints the hexadecimal contents of each handshake message frame. You will see:

```
>>> TLS 1.3, Handshake [length 0231], ClientHello
<<< TLS 1.3, Handshake [length 007a], ServerHello
<<< TLS 1.3, ChangeCipherSpec [length 0001]
<<< TLS 1.3, Application Data [length 00ea]   ← 加密后的握手消息
```

Key observation: **What immediately follows ServerHello is not a plaintext Certificate, but encrypted Application Data**. This is precisely the evidence that TLS 1.3 stuffs the certificate and signature entirely into the encrypted channel.

**3. Generate a self-signed certificate to test a local server:**

```bash
# Generate private key and self-signed certificate
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
  -keyout server.key -out server.crt -days 365 -nodes \
  -subj "/CN=localhost"
```

## Hands-On: Building a TLS 1.3 Server with Node.js

Below, we use Node.js's `tls` module to create a server that enforces TLS 1.3, intuitively demonstrating the protocol configuration:

```js
import tls from 'node:tls';
import { readFileSync } from 'node:fs';

const options = {
  key: readFileSync('./server.key'),
  cert: readFileSync('./server.crt'),
  // Allow only TLS 1.3
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

Verify with a browser or curl:

```bash
curl --tlsv1.3 -k https://localhost:8443
# Output: Hello TLS 1.3!
```

`--tlsv1.3` forces the client to use TLS 1.3, and `-k` skips self-signed certificate verification (for local testing only—never use this in production).
## 0-RTT: The Ultimate Form of Session Resumption

If the client and server have handshaked before, TLS 1.3 also supports an **even more extreme 0-RTT**—the client directly includes application data in the first round trip:

```
客户端 ── ClientHello + 0-RTT 应用数据 ──────→ 服务端
客户端 ←── ServerHello + {Finished} ────────── 服务端
```

0-RTT relies on a "pre-shared key" (PSK, i.e., the key saved from the previous session), and is suitable for scenarios that require extremely low latency. But it has a well-known security cost: **0-RTT data cannot be guaranteed to be replay-proof**. An attacker can intercept and replay 0-RTT requests. Therefore, 0-RTT should only be used for **idempotent** requests (such as GET), and must never be used for operations with side effects such as transfers or placing orders.

## Summary

The core idea of TLS 1.3 can be condensed into one sentence: **cut out all insecure algorithms, and move everything that can be moved earlier to be earlier**. The benefits it brings are twofold:

- **Performance**: the handshake drops from 2-RTT to 1-RTT, and 0-RTT goes even further
- **Security**: RSA key exchange and CBC mode are deprecated, forward secrecy is enforced, and encryption begins immediately after the handshake

According to Cloudflare's data, after TLS 1.3 was deployed, the average time to establish a connection decreased by about 100ms. As of 2026, TLS 1.3 already covers more than 95% of global HTTPS traffic—it completed the transition from "new standard" to "default configuration" in an extremely short time.

Understanding the TLS 1.3 handshake is not only about being able to read the output of packet capture tools, but also an excellent entry point for understanding modern internet security design: **good protocol design has always been about finding the most elegant balance between security and performance**.

---

**References:**

- [RFC 8446 — The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446)
- [Cloudflare — A Detailed Look at the TLS 1.3 Handshake](https://blog.cloudflare.com/rfc-8446-aka-tls-1-3/)
- [The Illustrated TLS 1.3 Connection](https://tls13.xargs.org/)
- [MDN — Transport Layer Security](https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security)