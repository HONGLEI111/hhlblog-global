---
title: Git 工作流最佳实践：从 rebase 到 squash
published: 2026-08-15
description: '系统梳理 Git 工作流的最佳实践：Conventional Commits 提交规范、分支模型、rebase 与 squash 的区别与正确用法，以及合并冲突的优雅处理方式。'
image: ''
tags: [Git, 工作流, rebase, squash, 版本控制, 最佳实践]
category: '后端'
draft: false
lang: ''
---

## 为什么 Git 历史值得认真对待

很多人把 Git 只当成「保存代码」的工具——提交了就行，历史乱不乱无所谓。但在协作项目中，Git 历史是团队的第二份文档：它是新人理解项目演进的入口，是排查回归时 `git bisect` 的原材料，也是 Code Review 时审阅者快速定位改动的依据。

一条混乱的历史（比如 20 条 `fix`、`update`、`tmp` 提交）会带来真实成本：

- 难以理解「这次改动到底做了什么、为什么这么做」；
- 无法用 `git blame` 快速定位某段代码的引入背景；
- 回滚一个功能时，需要在一堆零散提交里大海捞针。

本文将梳理一套可落地的 Git 工作流：从提交规范，到分支模型，再到 rebase 与 squash 的正确用法。

## 第一步：统一的提交规范

提交信息是历史可读性的基石。目前社区最主流的规范是 [Conventional Commits](https://www.conventionalcommits.org/)，它的格式如下：

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

`type` 常见取值：

| type | 含义 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 文档变更 |
| `refactor` | 重构（不改变行为） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具等杂项 |
| `style` | 代码格式（不影响逻辑） |

一条好的提交信息长这样：

```bash
git commit -m "fix(cache): 修复并发下 ETag 校验竞态导致 304 返回过期内容"
```

主体（body）用于解释**为什么**要做这个改动，而不是复述 diff 里已经看得出的「做了什么」。例如：

```
feat(payment): 支持微信支付渠道

原先只接入了支付宝，接入微信需要统一的支付网关抽象。
将渠道差异封装在 PaymentAdapter 接口后，后续新增渠道只需实现一个类。

Refs: #1234
```

规范的价值不只是「好看」：它能被工具消费。配合 [semantic-release](https://semantic-release.gitbook.io/) 或 `standard-version`，可以自动生成 CHANGELOG 并计算版本号。

## 第二步：选择合适的分支模型

分支模型没有银弹，取决于团队规模和发布节奏。两种主流模型：

**Git Flow**：`main` + `develop` + `feature/*` + `release/*` + `hotfix/*`。适合有明确版本发布周期、需要长期维护多个版本的产品（比如桌面软件、SDK）。代价是分支多、合并路径长。

**Trunk-Based Development（主干开发）**：所有人基于 `main` 短分支开发，小步快跑，通过 Feature Flag 控制未完成功能的上线。适合持续部署的 SaaS 团队，也是 GitHub Flow 背后的思想——分支生命周期尽量短，通常不超过 1~2 天。

对于大多数现代 Web 项目，我推荐从简：**一个 `main` + 短生命周期的 `feature/*` 分支**，合并用 Pull Request 完成。这套模型足够应付 90% 的场景，复杂度也最低。

## rebase vs merge：一个关键抉择

分支合并回主干时，有两种基本方式，它们产生截然不同的历史形态。

**`git merge`** 会创建一个合并提交（merge commit），保留两条分支的完整历史：

```bash
git checkout main
git merge feature/awesome
```

历史呈「网」状，能看到功能分支的起点和合并点。优点是保留了真实的时间线，缺点是长期下来历史像蜘蛛网，`git log --oneline` 难以快速扫读。

**`git rebase`** 会把你的提交「搬」到目标分支的最新提交之上，重写成一条线性历史：

```bash
git checkout feature/awesome
git rebase main
```

线性历史的好处是清晰：`git log` 一条直线看下来就是项目演进的全貌，`git bisect` 定位问题也更容易。

**我的实践建议**：

- **功能分支合并回主干时用 `--squash` 或 GitHub 的「Squash and merge」**——把一个功能的所有零散提交压缩成一条，历史干净；
- **保持功能分支与主干同步时用 `rebase`**——避免反复 merge 主干产生噪音；
- **只在私有分支上 rebase**——如果分支已被其他人拉取，rebase 会改写提交 SHA，等同于「改写历史」，会让协作者陷入混乱。

## squash：把一地的脚印合成一步

开发一个功能时，我们往往会有一堆过程提交：`wip`、`try xxx`、`fix typo`、`revert last`……这些过程足迹对未来的读者没有价值，反而制造噪音。Squash 就是把这些提交合成一条语义完整的提交。

以 GitHub 为例，合并 PR 时选择 **Squash and merge**，整个 PR 会变成一条提交，提交信息默认是 PR 标题。命令行里等价的操作是：

```bash
git checkout main
git merge --squash feature/awesome
git commit -m "feat(user): 新增用户资料页与头像上传"
```

如果希望更精细地控制（保留其中一两个独立提交、重写某个提交信息），用交互式 rebase：

```bash
git rebase -i main
```

会打开一个编辑器，列出该分支上所有提交：

```
pick 3f2a1c1 feat: 完成用户资料页骨架
pick 9b8c2d2 wip: 头像上传调试中
pick 5e1d3a3 fix: 修复上传后刷新不显示的问题
```

把想要合并的提交前面的 `pick` 改成 `squash`（或简写 `s`），它们就会被压进上一条提交：

```
pick 3f2a1c1 feat: 完成用户资料页骨架
squash 9b8c2d2 wip: 头像上传调试中
squash 5e1d3a3 fix: 修复上传后刷新不显示的问题
```

保存后 Git 会让你合并三者的提交信息，最终得到一条干净的提交。

## 处理合并冲突：rebase 时的正确姿势

合并冲突是绕不开的。用 rebase 同步主干时，冲突的处理方式和 merge 略有不同：

```bash
git checkout feature/awesome
git rebase main
# CONFLICT (content): Merge conflict in src/user.ts
```

此时 Git 会暂停 rebase，进入冲突解决状态：

```bash
# 1. 手动编辑冲突文件，解决 <<<<<<< 与 >>>>>>> 标记
# 2. 标记为已解决
git add src/user.ts

# 3. 继续 rebase（不是 commit！）
git rebase --continue
```

如果中途想放弃这次 rebase：

```bash
git rebase --abort
```

一个实用的调试命令 `git reflog` 值得记住——即使 rebase 翻车，`reflog` 里也保留了操作前的引用，可以随时恢复：

```bash
git reflog
# 找到 rebase 之前的 HEAD，例如 HEAD@{2}
git reset --hard HEAD@{2}
```

## 实用别名：让高频操作更顺手

把常用命令配成别名能显著减少敲键盘的负担：

```bash
git config --global alias.lg "log --oneline --graph --decorate --all"
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.st status
git config --global alias.unstage "reset HEAD --"
git config --global alias.last "log -1 HEAD --stat"
```

之后 `git lg` 就能以树状图查看全部分支历史，比裸的 `git log` 直观得多。

## 小结

Git 工作流的核心不是记住多少命令，而是形成一套团队共识：

1. **提交规范**：用 Conventional Commits 写清「改了什么、为什么」；
2. **分支从简**：短生命周期 feature 分支 + PR 合并，避免过度设计；
3. **历史干净**：私有分支用 rebase 同步，合并回主干用 squash 压缩；
4. **冲突淡定**：`rebase --continue` / `rebase --abort` / `reflog` 是三条保命命令。

工具是为协作服务的。在开始争论「rebase 还是 merge」之前，先和团队约定一套大家都能遵守的规则，比选哪边更重要。

## 参考来源

- [Pro Git 中文版 — 3.6 变基（Rebasing）](https://git-scm.com/book/zh/v2/Git-%E5%88%86%E6%94%AF-%E5%8F%98%E5%9F%BA)
- [Conventional Commits 规范](https://www.conventionalcommits.org/zh-hans/)
- [Atlassian Git 教程 — Merging vs. Rebasing](https://www.atlassian.com/git/tutorials/merging-vs-rebasing)
- [Trunk Based Development](https://trunkbaseddevelopment.com/)
