---
title: 'Famous Bugs in History: From Y2K to the Cloudflare Outage'
published: 2026-08-08
description: A look back at classic bug stories that left programmers laughing and crying—and cost companies dearly.
image: ''
tags: [Bug, History, Programming Trivia]
category: Frontend
draft: false
---
Programmers might be the only group in the world who both fear bugs and can't resist eagerly recounting them. Some bugs are so legendary that they surpass the software they once inhabited. Today, let's revisit a few "iconic moments" that have been written into computing history.

## 1. Y2K: A Global Panic Triggered by Two Digits

In the 1960s and 1970s, storage and memory were extremely expensive. To save money, programmers used two digits to represent years—`1970` was stored as `70`. At the time, this was entirely reasonable: who would have thought these COBOL programs would live until 2000?

```cobol
01  CURRENT-DATE.
    05  YY  PIC 99.   *> 只存了两位数的年份
```

As a result, when 1999 approached, the whole world panicked: when 1999 rolled over to 2000, the year would become `00`, age calculations would produce `00-70 = -70` years, loan interest would be calculated starting from 1900, and nuclear power plant monitoring systems might misjudge downtime...

The world spent about **$300 billion** fixing the problem. But interestingly, countries that "acted more slowly," such as Russia and South Korea, did almost nothing to fix it—and indeed, nothing major happened[1]. Was the millennium bug a catastrophic bug, or a marketing feast for consulting firms? It remains disputed to this day.

But there was one bug fix that genuinely persists today: people born after 2000 occasionally find, when swiping cards or filling out forms, that their birth year in the system is `1900`.

## 2. Cloudflare's "Death Hyperlink"

In February 2017, an HTML parser at Cloudflare had an bizarre bug.

```cpp
// 简化示意：解析器在遇到不平衡的 HTML 标签时
// 会把后续内存中的敏感数据当作 HTML 内容输出
if (tag == "script" && !findClosingTag()) {
    // 哦不，继续读内存直到找到 </script>
    outputRawDataFromMemory(); // 🫠
}
```

The trigger conditions for this bug were extremely tricky: a webpage needed to contain unbalanced HTML tags (such as `<script` missing a closing tag), and the parser would then frantically read data from memory to fill in the page. The consequence was that users' passwords, API keys, session tokens, and even the contents of HTTPS requests from other websites were leaked into the HTML source code of random webpages[2].

Search engine crawlers then cached the pages containing this leaked data. When Tavis Ormandy discovered the bug, Google's crawler cache still contained Uber users' ride records and OKCupid private messages. The bug existed for 5 months and affected millions of websites, making it arguably **the quietest disaster in internet history**.

Cloudflare CTO John Graham-Cumming later wrote: "A `==` written as `>=` can do this kind of thing."

## 3. Knight Capital: $440 Million Lost in 45 Minutes

On August 1, 2012, Knight Capital deployed a new trading algorithm. But an old version of the code had not been completely removed from the servers, and the deployment script also failed to deploy the new code to all 8 servers—one of them was still running the old code.

Within 45 minutes after the market opened, this "rebellious" server frantically bought and sold at a rate of $4 million per minute, executing a cumulative 4 million trades and ultimately losing **$440 million**. A company founded 17 years earlier ceased to exist 45 minutes later because of a careless deployment script[3].

```python
# 部署脚本（伪代码）
deploy_to_servers([s1, s2, s3, s4, s5, s6, s7])
# 咦，s8 呢？
# 算了，上周五赶着下班，周一再说吧（这段是虚构的）
```

## Conclusion

These stories teach us a simple lesson: **the size of a bug is not proportional to its technical complexity**. Y2K was just a two-digit problem, Cloudflare was just a boundary condition, and Knight Capital was just one server short.

But it is precisely these "small" problems that led to the most expensive repair bills in human history. So the next time you face a piece of code that "doesn't seem like a big deal," you might think of that famous line from Cloudflare's CTO—sometimes, a single character can do something enormous.

---

**References:**

[1] Robert L. Mitchell, "Y2K: The good, the bad and the ugly", Computerworld (2009)  
[2] Cloudflare, "Incident report on memory leak caused by Cloudflare parser bug", Cloudflare Blog (2017), https://blog.cloudflare.com/incident-report-on-memory-leak-caused-by-cloudflare-parser-bug/  
[3] U.S. Securities and Exchange Commission, "In the Matter of Knight Capital Americas LLC", SEC Release No. 70694 (2013), https://www.sec.gov/litigation/admin/2013/34-70694.pdf

> Happy weekend, and may your code contain only 0 bugs (and if it does, hopefully not in production).