---
title: 技术写作心得：如何写出清晰的技术文档
published: 2026-09-18
description: '文档写不好，成本由所有读者分摊。用 Diátaxis 框架区分文档类型，配上五条能立刻上手的写作原则和一段可运行的代码块校验脚本，把「写得能看懂」变成可执行的标准。'
image: ''
tags: [技术写作, 文档, Diátaxis, 开源, 协作]
category: '后端'
draft: false
lang: ''
---

## 文档欠的债，读者替你还

一个内部 SDK，接口设计得不错，但 README 里只有一行 `npm install` 和一句「用法参考源码」。结果是什么？每个接入方都要花半天读源码，然后在群里问同样的问题。如果这个 SDK 有 20 个接入方，你少写的那 500 字，全社会付出了 40 人时的代价。

技术文档的尴尬在于：**写好它的人不直接受益，写差它的人不直接受损**。这就是为什么它总是被排在「等功能上线再说」的队列里，然后再也没被想起来。

但这恰恰意味着，写文档是一项投入产出比极高的技能。下面是我这几年写文档、也读别人文档总结出的一套东西。

## 第一步：先分清你写的是哪种文档

大多数人写文档时最大的问题不是文笔，而是**把四种目标完全不同的东西混在一起写**。Diátaxis 框架（由 Daniele Procida 提出）把这四种类型讲得很清楚：

| 类型 | 回答的问题 | 读者状态 | 例子 |
| --- | --- | --- | --- |
| Tutorial（教程） | 「带我走一遍」 | 完全新手，想获得成功体验 | 30 分钟搭一个 CRUD |
| How-to（操作指南） | 「怎么做到 X」 | 有目标，知道要什么 | 如何配置自定义域名 |
| Reference（参考） | 「这个参数是什么意思」 | 查字典，不需要通读 | API 参数表 |
| Explanation（解释） | 「为什么是这样设计的」 | 想理解，不一定动手 | 为什么用 CRDT 而不是 OT |

关键在于这四者的**写作规则互相冲突**：

- 教程要**绝对可靠**，不允许任何一步可能失败，所以它必须啰嗦、必须重复、必须一次只做一件事；
- 操作指南要**直奔主题**，跳过解释，让懂行的人快速拿到答案；
- 参考手册要**结构化、可检索**，不能有叙事；
- 解释性文档要**允许发散**，甚至可以说「这其实是个历史遗留问题」。

把它们混在一个 README 里，就会出现「教程章节里突然插入一段 API 参数表」这种四不像。读者在第 3 步迷路了，往后翻想查参数，又被大段背景介绍淹没。

**实操建议**：目录里就按这四类分文件夹，而不是按模块分。`tutorials/`、`how-to/`、`reference/`、`explanation/`。光是做这个拆分，文档的可用性就能上一个台阶。

## 五条能立刻用上的原则

### 1. 从读者的问题出发，而不是从系统结构出发

大部分技术文档的目录长这样，因为它照着代码模块树抄了一遍：

```
第一章 概述
第二章 核心模块
  2.1 Client 类
  2.2 Config 类
  2.3 Plugin 接口
```

读者的问题是「我要上传一个文件」，不是「Client 类是什么」。目录应该照着**任务**组织：

```
- 安装与初始化
- 上传你的第一个文件
- 处理上传进度
- 上传大文件时如何分片
```

一个简单的自检方法：把每个标题读一遍，如果它不能回答「我想做 X」，就该改。

### 2. 用第二人称、主动语态、现在时

这三个规则听起来像中学英语课，但它们在技术文档里效果立竿见影。对比一下：

> ❌ 配置文件的解析由 ConfigParser 完成，在解析失败的情况下，一个异常会被抛出。

> ✅ 系统用 ConfigParser 读取配置文件。如果配置文件格式有误，它会抛出 `ConfigError`。

第二句短了、具体了、指定了异常类型。**「被」字句是技术文档的头号公敌**，它让责任主体消失，读者不知道是谁在做这件事。

### 3. 代码示例必须能跑，而且必须你亲手跑过

这是底线。我见过太多文档里的示例代码是这样：

```js
import { createClient } from 'my-sdk';

const client = createClient({
  // ...其他配置
  retries: 3,
});

// 省略错误处理
await client.upload(file);
```

`// ...其他配置` 和 `// 省略错误处理` 是文档里的两颗雷。读者复制过去跑不通，然后开始怀疑自己，最后发现文档里少了一个必填的 `endpoint`。

**规则**：如果示例需要省略，就把它写成一个完整的、自洽的最小版本；如果实在放不下，就用注释明确标出「这三行必须替换成你自己的值」，而不是用一个含糊的省略号。

写文档的时候把代码复制到终端里跑一遍，这个动作花你 30 秒，可能省下读者 30 分钟。

### 4. 先给「为什么」，再给「怎么做」

纯粹的操作步骤会让人在出问题时无从下手，因为他不知道每一步的目的。

> ❌ 在 CI 中设置 `NODE_OPTIONS=--max-old-space-size=4096`。

> ✅ 构建时的类型检查会吃掉大量内存，Node 默认的堆上限（约 2GB）经常不够，表现为 `JavaScript heap out of memory`。把上限调到 4GB：

后者多花了 20 个字，但读者在遇到别的内存问题时，会知道该往哪个方向查。

### 5. 把「已知限制」写进文档，而不是留在 issue 里

新用户踩坑最多的地方，往往不是功能没实现，而是**没人告诉他这个功能有边界**。比如「只支持 UTF-8 编码」「单次请求上限 5MB」「不支持嵌套事务」——这些信息通常只存在于三个月前的某个 issue 讨论里。

在参考文档的每个条目下加一行「限制」，成本极低，收益极高。

## 把文档质量交给 CI

原则讲完了，但靠人自觉是撑不住的。真正让文档不退化的办法是**自动化检查**。最小可行的一步：把文档里的代码块抽出来，至少做语法检查。

下面这个脚本从 Markdown 中提取带语言的代码块，交给对应的解析器做语法校验（这里用 Node 的 `vm` 检查 JS，用 `python -m py_compile` 检查 Python）：

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

把它挂进 CI，PR 里改了文档就跑一遍：

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

这个检查很浅，只验证语法，不验证运行结果。但它拦住了一类最常见的低级错误——手写示例时的拼写错误、括号不配对、复制粘贴时丢了一行。**再往上一层**是真正的可执行文档（把代码块当测试跑，比如 Rust 的 doctest、Python 的 `doctest`、或者 mdBook 的 `test` 功能），那需要示例本身设计成幂等且无副作用的，成本高得多，可以等项目成熟后再做。

## 最后：把文档当成代码来对待

回头看这几条，其实都在说同一件事：**文档值得和代码享受同等待遇**。

- 代码有类型检查，文档就有代码块校验；
- 代码有 code review，文档改动也该被 review，而且 review 时应该问「一个新人能照着这个跑通吗」；
- 代码有重构，文档的目录结构也该定期按读者的使用路径重排。

衡量标准只有一个，而且很朴素：**找一个没接触过这个项目的人，让他照着文档做一遍，你在旁边看，不要说话**。他在哪里停下来，那里就是文档该改的地方。

写文档不是给项目「补作业」，它本身就是产品的一部分。

## 参考来源

- [Diátaxis — A systematic framework for technical documentation authoring](https://diataxis.fr/)：四种文档类型的划分，本文第一节的核心框架
- [Google Developer Documentation Style Guide](https://developers.google.com/style)：语气、术语、代码示例格式的行业参考，关于第二人称和主动语态的规则写得非常细
- [Docs for Developers: An Engineer's Field Guide to Technical Writing](https://docsfordevelopers.com/)（Jared Bhatti 等）：从读者研究到文档上线的完整流程
- [Microsoft Writing Style Guide](https://learn.microsoft.com/style-guide/welcome/)：另一套被广泛引用的写作规范，偏产品文档
