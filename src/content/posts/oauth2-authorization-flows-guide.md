---
title: 'OAuth 2.0 Authorization Flows: A Complete Visual Guide'
published: 2026-09-09
description: A visual walkthrough of the four OAuth 2.0 authorization flows—from authorization code to PKCE—framed as "who is asking whom for what," with runnable code examples and guidance on choosing the right flow.
image: ''
tags: [OAuth2, Authorization, Security, Web, Internet]
category: Internet
draft: false
---
## Introduction: What Problem Does OAuth 2.0 Actually Solve

Your website wants to help users "log in with GitHub," but the prerequisite is obtaining read access to the user's GitHub account. But why should users hand over their GitHub password to you? OAuth 2.0's answer is: **don't hand over the password, hand over a token**.

Its core idea can be compressed into one sentence: **The authorization server (GitHub) issues a token (Access Token) to a third-party application (your website) that has limited permissions, a limited lifetime, and can be revoked independently, rather than handing over the account password.** Once you understand this, the differences between the four authorization flows are simply "how this token is obtained, and in what scenario."

## Four Roles: First, Distinguish Who Is Who

Any OAuth flow revolves around four roles:

| Role | Example | One-Sentence Responsibility |
|------|------|-----------|
| Resource Owner | User | The person who owns the data and can approve authorization |
| Client | Your website | The third-party application that wants to access user data |
| Authorization Server | GitHub's login page | Verifies user identity, issues tokens |
| Resource Server | GitHub API | Validates tokens, provides data |

The most common misconception is treating the "authorization server" and "resource server" as the same thing—in many scenarios they are indeed the same service (GitHub is both), but conceptually they must be separated: one issues tokens, the other validates tokens and serves data.

## Authorization Code Flow: The Standard Answer for Web Applications

This is the most commonly used and most secure flow, because it guarantees that **the Access Token only passes through the backend and never enters the browser**.

### Sequence

```
用户 ──① 点击「用 GitHub 登录」──▶ 客户端(你的后端)
用户 ◀──② 302 重定向到 GitHub 授权页── 客户端
用户 ──③ 输入账号密码、点授权──▶ GitHub 授权服务器
用户 ◀──④ 302 重定向回回调地址，URL 带 ?code=xxxx── GitHub
客户端 ──⑤ 后端用 code + client_secret 换取 token──▶ GitHub
客户端 ◀──⑥ 返回 access_token + refresh_token── GitHub
客户端 ──⑦ 携带 access_token 请求 API──▶ GitHub API
```

① The frontend directs the user to the authorization endpoint:

```
https://github.com/login/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://your-app.com/callback
  &scope=user:email
  &state=random-string
```

The `state` parameter is key to preventing CSRF: upon callback, it must be verified that it matches the one from initiation, otherwise an attacker could trick the user into completing an authorization you are unaware of.

② After the authorization server verifies the user's identity, it 302-redirects back to your callback URL, carrying a one-time `code`.

③ **The key step**: Only your backend, after receiving the `code`, uses the `client_id + client_secret` to exchange for a token. Because the `client_secret` only exists on the server, no script in the browser can forge this step:

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

### Why the `code` Is One-Time Use

The `code` typically has a validity period of only tens of seconds to a few minutes, and becomes invalid after a single use. Even if it is leaked during transmission in the callback URL, an attacker cannot obtain the `client_secret` and cannot redeem it for a token—this "two-legged" design is the foundation of the authorization code flow's security.

## PKCE: Authorization Code Without a client_secret (Native Apps / SPA)

In mobile apps or pure frontend SPAs, there is no way to securely store the `client_secret`. PKCE (RFC 7636)'s solution is: the client generates its own random key (`code_verifier`), sends its hash (`code_challenge`) to the authorization server during authorization, and hands over the original value when exchanging for a token—only the client that initiated the authorization knows this value, and it's useless even if a man-in-the-middle intercepts the `code`.

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

Today, GitHub, Google, and Auth0 all require or strongly recommend PKCE. Even if your application is a traditional web backend, adding PKCE only has benefits.

## The Other Three Flows: Know Them in Order to Avoid Them

- **Implicit Grant**: An early flow designed for pure frontends, where the Access Token appears directly in the browser's address bar, with an extremely large exposure surface. RFC 6749 was explicitly marked as **not recommended for use** by RFC 8252/9700 in 2019. For SPAs, use "Authorization Code + PKCE" instead.
- **Resource Owner Password Credentials (ROPC)**: The client directly collects the username and password to exchange for a token. This is equivalent to handing the password to a third-party application, and it has been removed in the OAuth 2.1 draft. It is only suitable for **high-trust migration scenarios within the same company**.
- **Client Credentials**: No user involvement; the client uses the `client_secret` to directly exchange for a token belonging to itself, used for **service-to-service (M2M) communication**, such as your backend calling an internal API:

```bash
curl -X POST https://auth.example.com/token \
  -d "grant_type=client_credentials" \
  -d "client_id=SERVICE_A" \
  -d "client_secret=SECRET" \
  -d "scope=internal:read"
```

## Selection Quick Reference Table

| Application Type | Recommended Flow | Reason |
|---------|---------|------|
| Traditional Web Application (with backend) | Authorization Code (optionally with PKCE) | Token doesn't enter the browser |
| SPA / Native App | Authorization Code + PKCE | Cannot securely store a secret |
| Service-to-service calls | Client Credentials | No user, machine identity |
| First-party high-trust applications | ROPC (avoid if possible) | Compatibility with legacy systems |
| Pure frontend legacy applications | ~~Implicit~~ | Deprecated, do not use |

## Conclusion

The four OAuth 2.0 flows may look complex, but in essence they are just different answers to three questions: **Who is authorizing (a user or a machine)? Can the client securely store a key? How far can the token reach?** As a beginner, remembering just one rule—"prefer Authorization Code + PKCE, use Client Credentials for M2M"—already helps you avoid 90% of the pitfalls. As for the remaining 10%, when you actually encounter refresh token rotation, token revocation, and scope minimization, it won't be too late to come back and consult the spec.

---

## References

- [RFC 6749 — The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636 — Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 9700 — Best Current Practice for OAuth 2.0 (explicitly recommends deprecating Implicit and ROPC)](https://datatracker.ietf.org/doc/html/rfc9700)
- [OAuth 2.0 Official Documentation (oauth.net)](https://oauth.net/2/)
- [GitHub Docs — Authorizing OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Auth0 Docs — Authorization Code Flow with PKCE](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-proof-key-for-code-exchange-pkce)