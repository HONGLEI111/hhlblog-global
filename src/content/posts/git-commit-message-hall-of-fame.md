---
title: Git commit message 奇葩大赏：代码会忘，提交记录不会
published: 2026-08-17
description: '从“终于好了”到“别问”，看看 Git 历史里那些既好笑又令人警觉的提交信息。'
image: ''
tags: [Git, commit message, 程序员笑话]
category: '其他'
draft: false
lang: ''
---

Git 提交信息本应是项目的航海日志：谁在什么时候改了什么，以及为什么改。可当截止时间、线上告警和咖啡轮番登场，它又很容易成为程序员情绪最稳定的出口。

最经典的一类是**结果导向型**：`fix`、`fix again`、`final fix`、`final final fix`。它们像连续剧一样提醒后来者：这个问题并没有真正结束，只是暂时没有报错。还有人写下 `works on my machine`；这句话虽然诚实，却相当于在协作项目里留下了一个需要考古的路标。

第二类是**拒绝解释型**：`don't touch`、`magic`、`idk why`。它们的幽默来自一种朴素的恐惧：作者知道这段改动脆弱，却没有时间把原因写下来。真正可怕的不是信息短，而是半年后 `git blame` 指向自己时，自己也读不懂当年的自己。

下面的脚本可以在临时目录重现一段很有画面感的提交历史；运行后再决定，你是否还想把 `final-final` 留给未来的同事：

```bash
#!/usr/bin/env bash
set -euo pipefail

repo="$(mktemp -d)"
cd "$repo"
git init -q
git config user.name "Coffee Developer"
git config user.email "coffee@example.test"

printf 'feature=true\n' > app.conf
git add app.conf
git commit -qm 'add feature'

printf 'feature=false\n' > app.conf
git commit -am 'fix'
git commit --allow-empty -qm 'fix again'
git commit --allow-empty -qm 'final final fix, do not touch'

git log --oneline
```

笑话归笑话，提交信息其实是低成本的团队文档。一次好提交不必写成散文，只要补足两件事：**改了什么**和**为什么改**。例如把 `fix login` 改成 `fix(auth): refresh expired session before retrying request`，排查问题时就少了一次猜谜。

如果实在想保留一点人味，可以把幽默放在正文之外：标题保持清晰，正文说明背景，偶尔再附一句“修复原因：测试环境终于愿意配合”。这样既不会牺牲可检索性，也能让版本历史不那么冷冰冰。

## 结语

每一条奇葩 commit message 都像一个小小的时间胶囊：它记录的不只是代码，也记录了当时的压力、困惑与侥幸。笑完之后，给下一次提交多写十个字吧——未来打开历史的你会真心感谢现在的自己。

---

**参考来源**

- [Git documentation: git-commit](https://git-scm.com/docs/git-commit) — Git 官方提交命令文档
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/zh-hans/v1.0.0/) — 一种可读、可自动化处理的提交信息约定
