---
title: OAuth 2.0 授权流程完全图解
published: 2026-09-09
description: '从授权码到 PKCE，用「谁在向谁要什么」的视角图解 OAuth 2.0 四种授权流程，并附可直接运行的代码示例与选型建议。'
image: ''
tags: [OAuth2, 授权, 安全, Web, 互联网]
category: '互联网'
draft: false
lang: ''
---

## 引言：OAuth 2.0 到底解决了什么问题

你的网站想帮用户「用 GitHub 登录」，前提是拿到用户 GitHub 账号的读取权限。但用户凭什么把 GitHub 密码交给你？OAuth 2.0 的回答是：**不交密码，交令牌**。

它的核心思路可以压缩成一句话：**授权服务器（GitHub）给第三方应用（你的网站）发一个限定权限、限定时间、可单独吊销的令牌（Access Token），而不是把账号密码交出去。** 理解这一点后，四种授权流程的区别就只是「这个令牌是通过哪种方式、在什么场景下换来的」。

## 四个角色，先分清谁是谁

任何 OAuth 流程都围绕四个角色展开：

| 角色 | 举例 | 一句话职责 |
|------|------|-----------|
| 资源所有者（Resource Owner） | 用户 | 拥有数据、能批准授权的人 |
| 客户端（Client） | 你的网站 | 想访问用户数据的第三方应用 |
| 授权服务器（Authorization Server） | GitHub 的登录页 | 验证用户身份、颁发令牌 |
| 资源服务器（Resource Server） | GitHub API | 校验令牌、提供数据 |

最常见的误解是把「授权服务器」和「资源服务器」当成一个东西——很多场景下它们确实是同一个服务（GitHub 两者都是），但概念上必须分开：一个是发令牌的，一个是验令牌给数据的。

## 授权码模式（Authorization Code）：Web 应用的标准答案

这是最常用也最安全的流程，因为它保证 **Access Token 只经过后端，永不进入浏览器**。

### 时序

```
用户 ──① 点击「用 GitHub 登录」──▶ 客户端(你的后端)
用户 ◀──② 302 重定向到 GitHub 授权页── 客户端
用户 ──③ 输入账号密码、点授权──▶ GitHub 授权服务器
用户 ◀──④ 302 重定向回回调地址，URL 带 ?code=xxxx── GitHub
客户端 ──⑤ 后端用 code + client_secret 换取 token──▶ GitHub
客户端 ◀──⑥ 返回 access_token + refresh_token── GitHub
客户端 ──⑦ 携带 access_token 请求 API──▶ GitHub API
```

① 前端引导用户访问授权端点：

```
https://github.com/login/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://your-app.com/callback
  &scope=user:email
  &state=random-string
```

`state` 参数是防 CSRF 的关键：回调时必须校验它和发起时一致，否则攻击者可以诱导用户完成一个你并不知情的授权。

② 授权服务器验证用户身份后，302 重定向回你的回调地址，并携带一次性 `code`。

③ **关键一步**：只有你的后端拿到 `code` 后，用 `client_id + client_secret` 去换令牌。因为 `client_secret` 只存在服务器上，浏览器里的任何脚本都无法伪造这一步：

```bash
curl -X POST https://github.com/login/oauth/access_token \
  -H "Accept: application/json" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=THE_ONE_TIME_CODE" \
  -d "redirect_uri=https://your-app.com/callback"
```

```js
// 用 Node 写出来的后端换令牌逻辑（示意）
const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET,
    code, // 来自回调 URL 的一次性授权码
    redirect_uri: 'https://your-app.com/callback',
  }),
});
const { access_token } = await tokenRes.json();
```

### 为什么 `code` 是一次性的

`code` 的有效期通常只有几十秒到几分钟，且使用一次即失效。即使它在回调 URL 的传输过程中被泄露，攻击者也拿不到 `client_secret`，无法把它兑换成令牌——这层「两条腿走路」的设计，是授权码模式安全的根基。

## PKCE：没有 client_secret 的授权码（原生应用 / SPA）

移动 App 或纯前端 SPA 里没法安全保存 `client_secret`。PKCE（RFC 7636）的解法是：客户端自己生成一个随机密钥（`code_verifier`），把它的哈希（`code_challenge`）在授权时发给授权服务器，换令牌时再交出原始值——只有发起授权的那个客户端知道这个值，中间人截获 `code` 也没用。

```js
// 生成 code_verifier 与 code_challenge
const verifier = crypto.randomBytes(32).toString('base64url');
const challenge = crypto
  .createHash('sha256')
  .update(verifier)
  .digest('base64url');

// 授权时带上 challenge
// ?client_id=...&code_challenge=${challenge}&code_challenge_method=S256
// 换令牌时带上 verifier，授权服务器验证哈希一致才发令牌
```

如今 GitHub、Google、Auth0 都要求或强烈建议走 PKCE，即使你的应用是传统 Web 后端，加上 PKCE 也只有好处。

## 其他三种流程：认识它们，为了避开它们

- **隐式授权（Implicit）**：早期为纯前端设计的流程，Access Token 直接出现在浏览器地址栏里，泄露面极大，RFC 6749 已在 2019 年被 RFC 8252/9700 明确标记为**不建议使用**。SPA 请用「授权码 + PKCE」替代。
- **资源所有者密码凭证（ROPC）**：客户端直接收集用户名密码去换令牌。这等于把密码交给了第三方应用，OAuth 2.1 草案中已被移除。仅适合**同一公司内部的高信任迁移场景**。
- **客户端凭证（Client Credentials）**：没有用户参与，客户端用 `client_secret` 直接换属于自己的令牌，用于 **服务间（M2M）通信**，比如你的后端调用内部 API：

```bash
curl -X POST https://auth.example.com/token \
  -d "grant_type=client_credentials" \
  -d "client_id=SERVICE_A" \
  -d "client_secret=SECRET" \
  -d "scope=internal:read"
```

## 选型速查表

| 应用类型 | 推荐流程 | 原因 |
|---------|---------|------|
| 传统 Web 应用（有后端） | 授权码（可加 PKCE） | token 不进浏览器 |
| SPA / 原生 App | 授权码 + PKCE | 无法安全存 secret |
| 服务间调用 | 客户端凭证 | 无用户、机器身份 |
| 第一方高信任应用 | ROPC（尽量不用） | 兼容旧系统 |
| 纯前端老应用 | ~~隐式~~ | 已废弃，勿用 |

## 结语

OAuth 2.0 的四种流程看着复杂，本质只是三个问题的不同答案：**谁在授权（用户还是机器）？客户端能不能安全保存密钥？令牌最远能到哪一层？** 新手期记住「优先授权码 + PKCE，M2M 用客户端凭证」这一条，就已经避开了 90% 的坑。剩下那 10%，等你真的遇到刷新令牌轮换、令牌吊销和 scope 最小化时，再回来翻规范也不迟。

---

## 参考来源

- [RFC 6749 — The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636 — Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 9700 — Best Current Practice for OAuth 2.0（明确建议弃用 Implicit 与 ROPC）](https://datatracker.ietf.org/doc/html/rfc9700)
- [OAuth 2.0 官方文档（oauth.net）](https://oauth.net/2/)
- [GitHub Docs — Authorizing OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Auth0 Docs — Authorization Code Flow with PKCE](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-proof-key-for-code-exchange-pkce)
