---
title: 'Technical Writing Notes: How to Write Clear Technical Documentation'
published: 2026-09-18
description: Poor documentation costs every reader. Use the Diátaxis framework to distinguish document types, pair it with five immediately actionable writing principles and a runnable code block validation script, and turn "writing something understandable" into an executable standard.
image: ''
tags: [Technical Writing, Documentation, Diátaxis, Open Source, Collaboration]
category: Backend
draft: false
---
## Documentation Debt Is Paid by Your Readers

An internal SDK with a decent API design, but the README contains only a single line of `npm install` and the sentence "refer to the source code for usage." What's the result? Every integrator spends half a day reading the source code, then asks the same questions in the group chat. If this SDK has 20 integrators, the 500 words you didn't write cost society 40 person-hours.

The awkward thing about technical documentation is this: **the people who write it well don't directly benefit, and the people who write it poorly don't directly suffer**. That's why it always gets queued behind "let's ship the feature first," and then never gets remembered again.

But this is exactly what makes writing documentation a skill with an extremely high return on investment. What follows is a set of things I've distilled from writing documentation and reading other people's documentation over the past few years.

## Step One: First, Figure Out What Kind of Documentation You're Writing

The biggest problem most people have when writing documentation isn't their prose—it's **mixing four things with completely different goals into one document**. The Diátaxis framework (proposed by Daniele Procida) lays out these four types very clearly:

| Type | Question It Answers | Reader's State | Example |
| --- | --- | --- | --- |
| Tutorial | "Walk me through it" | Complete beginner, wants a successful experience | Build a CRUD in 30 minutes |
| How-to | "How do I do X" | Has a goal, knows what they want | How to configure a custom domain |
| Reference | "What does this parameter mean" | Looking it up like a dictionary, doesn't need to read through | API parameter table |
| Explanation | "Why was it designed this way" | Wants to understand, not necessarily to act | Why use CRDT instead of OT |

The key point is that the **writing rules for these four conflict with each other**:

- Tutorials must be **absolutely reliable**, no step is allowed to possibly fail, so they must be verbose, must repeat themselves, and must do only one thing at a time;
- How-to guides must **get straight to the point**, skip explanations, and let knowledgeable people quickly get their answer;
- Reference manuals must be **structured and searchable**, with no narrative;
- Explanatory documentation should **allow digressions**, and can even say "this is actually a historical legacy issue."

Mix them into a single README, and you get a Frankenstein like "a section of tutorial with an API parameter table suddenly inserted into it." The reader gets lost at step 3, flips forward to look up a parameter, and gets buried by a wall of background introduction.

**Practical advice**: In your table of contents, split into folders by these four categories, not by module. `tutorials/`, `how-to/`, `reference/`, `explanation/`. Just making this split alone can take your documentation's usability up a notch.

## Five Principles You Can Put to Use Immediately

### 1. Start from the Reader's Questions, Not from the System's Structure

Most technical documentation's table of contents looks like this, because it was copied from the code module tree:

```
第一章 概述
第二章 核心模块
  2.1 Client 类
  2.2 Config 类
  2.3 Plugin 接口
```

The reader's question is "I want to upload a file," not "what is the Client class." The table of contents should be organized around **tasks**:

```
- 安装与初始化
- 上传你的第一个文件
- 处理上传进度
- 上传大文件时如何分片
```

A simple self-check method: read each heading. If it can't answer "I want to do X," it needs to change.

### 2. Use Second Person, Active Voice, Present Tense

These three rules sound like middle school English class, but in technical documentation their effect is immediate. Compare:

> ❌ The parsing of the configuration file is performed by ConfigParser, and in the event of a parsing failure, an exception will be thrown.

> ✅ The system uses ConfigParser to read the configuration file. If the configuration file is malformed, it throws `ConfigError`.

The second sentence is shorter, more specific, and names the exception type. **Passive voice is the number one public enemy of technical documentation**—it makes the responsible party disappear, and the reader doesn't know who is doing the thing.

### 3. Code Examples Must Run, and You Must Have Run Them Yourself

This is the bottom line. I've seen far too many documentation examples like this:

```js
import { createClient } from 'my-sdk';

const client = createClient({
  // ...其他配置
  retries: 3,
});

// 省略错误处理
await client.upload(file);
```

`// ...其他配置` and `// 省略错误处理` are two landmines in documentation. The reader copies it over, it doesn't run, and then they start doubting themselves, only to finally discover that a required `endpoint` was missing from the documentation.

**Rule**: If an example needs to omit something, write it as a complete, self-contained minimal version; if you really can't fit it, use a comment to explicitly mark "these three lines must be replaced with your own values," rather than using a vague ellipsis.

When writing documentation, copy the code into a terminal and run it once. This action costs you 30 seconds and might save the reader 30 minutes.

### 4. Give the "Why" First, Then the "How"

Pure operational steps leave people helpless when something goes wrong, because they don't know the purpose of each step.

> ❌ Set `NODE_OPTIONS=--max-old-space-size=4096` in CI.

> ✅ Type checking at build time consumes a lot of memory. Node's default heap limit (about 2GB) is often not enough, manifesting as `JavaScript heap out of memory`. Raise the limit to 4GB:

The latter costs 20 more characters, but when the reader encounters other memory issues, they'll know which direction to investigate.

### 5. Write "Known Limitations" into the Documentation, Not Leave Them in Issues

The places where new users stumble most are often not features that aren't implemented, but rather **no one told them this feature has boundaries**. For example, "only UTF-8 encoding is supported," "single request limit of 5MB," "nested transactions are not supported"—this information usually only exists in some issue discussion from three months ago.

Add a "Limitations" line under each entry in the reference documentation. The cost is extremely low, and the payoff is extremely high.

## Hand Documentation Quality Over to CI

The principles are laid out, but relying on people's self-discipline won't hold up. The real way to keep documentation from degrading is **automated checks**. The minimum viable step: extract the code blocks from the documentation and at least do syntax checking.

The script below extracts language-tagged code blocks from Markdown and hands them to the corresponding parser for syntax validation (here using Node's `vm` to check JS, and `python -m py_compile` to check Python):

```js
// check-docs.js —— 提取 Markdown 代码块并做语法检查（需 Node 22+）
import { readFile, glob } from 'node:fs/promises';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

// 匹配 ```lang ... ``` 代码块
const FENCE = /^```(\w+)\n([\s\S]*?)^```$/gm;

function checkJs(code) {
  // vm.Script 只做解析，不执行，正好用来做语法校验
  new vm.Script(code, { filename: 'doc-snippet.js' });
}

function checkPython(code) {
  // 用 ast.parse 只解析不执行，退出码非 0 即为语法错误
  const r = spawnSync(
    'python3',
    ['-c', 'import ast,sys; ast.parse(sys.stdin.read())'],
    { input: code, encoding: 'utf8' },
  );
  if (r.status !== 0) {
    throw new Error(r.stderr.trim().split('\n').pop());
  }
}

const files = await Array.fromAsync(glob('docs/**/*.md'));
let failed = 0;

for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const [, lang, code] of text.matchAll(FENCE)) {
    try {
      if (lang === 'js' || lang === 'javascript') checkJs(code);
      else if (lang === 'python' || lang === 'py') checkPython(code);
      else continue; // 其他语言暂不校验
    } catch (err) {
      failed++;
      console.error(`✗ ${file}\n  ${err.message.split('\n')[0]}`);
    }
  }
}

console.log(failed ? `\n${failed} 个代码块有语法错误` : '✓ 所有文档代码块语法正确');
process.exit(failed ? 1 : 0);
```

Hook it into CI, and run it whenever documentation is changed in a PR:

```yaml
# .github/workflows/docs.yml
name: Docs
on:
  pull_request:
    paths: ['docs/**', '**.md']
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: node check-docs.js
```

This check is shallow—it only validates syntax, not runtime results. But it catches the most common class of low-level errors—typos when hand-writing examples, unmatched brackets, a line lost during copy-paste. **The next level up** is truly executable documentation (running code blocks as tests, like Rust's doctest, Python's `doctest`, or mdBook's `test` feature). That requires the examples themselves to be designed to be idempotent and side-effect-free, which is much more costly, and can be done after the project matures.

## Finally: Treat Documentation Like Code

Looking back at these points, they're all really saying the same thing: **documentation deserves the same treatment as code**.

- Code has type checking, so documentation has code block validation;
- Code has code review, so documentation changes should also be reviewed, and during review you should ask "can a newcomer follow this and get it running?"
- Code has refactoring, so documentation's table of contents should also be periodically rearranged according to readers' usage paths.

There's only one metric, and it's very plain: **find someone who has never touched this project, have them follow the documentation and do it once, and you watch from the side without speaking**. Wherever they stop, that's where the documentation needs to change.

Writing documentation isn't "making up homework" for a project—it is itself part of the product.
## References

- [Diátaxis — A systematic framework for technical documentation authoring](https://diataxis.fr/): the division of the four documentation types, the core framework of the first section of this article
- [Google Developer Documentation Style Guide](https://developers.google.com/style): an industry reference for tone, terminology, and code example formatting, with very detailed rules on second person and active voice
- [Docs for Developers: An Engineer's Field Guide to Technical Writing](https://docsfordevelopers.com/) (Jared Bhatti et al.): the complete process from reader research to documentation launch
- [Microsoft Writing Style Guide](https://learn.microsoft.com/style-guide/welcome/): another widely cited writing standard, leaning toward product documentation