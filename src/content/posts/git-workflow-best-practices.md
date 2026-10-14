---
title: 'Git Workflow Best Practices: From Rebase to Squash'
published: 2026-08-15
description: 'A systematic overview of Git workflow best practices: Conventional Commits conventions, branching models, the differences between rebase and squash and how to use them correctly, plus elegant ways to handle merge conflicts.'
image: ''
tags: [Git, Workflow, Rebase, Squash, Version Control, Best Practices]
category: Backend
draft: false
---
## Why Git History Deserves Serious Attention

Many people treat Git as just a tool for "saving code"—as long as you commit, it doesn't matter if the history is messy. But in collaborative projects, Git history is the team's second document: it's the entry point for newcomers to understand the project's evolution, the raw material for `git bisect` when investigating regressions, and the basis for reviewers to quickly locate changes during Code Review.

A messy history (say, 20 commits of `fix`, `update`, `tmp`) brings real costs:

- Hard to understand "what exactly did this change do, and why was it done this way";
- Unable to use `git blame` to quickly locate the background of when a piece of code was introduced;
- When rolling back a feature, you need to search through a pile of scattered commits like finding a needle in a haystack.

This article will lay out a practical Git workflow: from commit conventions, to branching models, to the correct usage of rebase and squash.

## Step 1: A Unified Commit Convention

Commit messages are the cornerstone of history readability. Currently the most mainstream convention in the community is [Conventional Commits](https://www.conventionalcommits.org/), and its format is as follows:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

Common values for `type`:

| type | meaning |
| --- | --- |
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `refactor` | Refactoring (no behavior change) |
| `perf` | Performance optimization |
| `test` | Test-related |
| `chore` | Build/tooling and other miscellaneous |
| `style` | Code formatting (doesn't affect logic) |

A good commit message looks like this:

```bash
git commit -m "fix(cache): fix race condition in ETag validation under concurrency causing 304 to return stale content"
```

The body is used to explain **why** the change is being made, rather than restating the "what" that's already visible in the diff. For example:

```
feat(payment): support WeChat Pay channel

Previously only Alipay was integrated; integrating WeChat requires a unified payment gateway abstraction.
After encapsulating channel differences behind the PaymentAdapter interface, adding new channels later only requires implementing one class.

Refs: #1234
```

The value of the convention isn't just that it "looks good": it can be consumed by tools. Combined with [semantic-release](https://semantic-release.gitbook.io/) or `standard-version`, it can automatically generate a CHANGELOG and calculate version numbers.

## Step 2: Choose an Appropriate Branching Model

There's no silver bullet for branching models—it depends on team size and release cadence. Two mainstream models:

**Git Flow**: `main` + `develop` + `feature/*` + `release/*` + `hotfix/*`. Suitable for products with a clear version release cycle and the need to maintain multiple versions long-term (such as desktop software, SDKs). The cost is many branches and long merge paths.

**Trunk-Based Development**: Everyone develops on short branches based on `main`, taking small rapid steps, and controlling the release of unfinished features through Feature Flags. Suitable for SaaS teams doing continuous deployment, and it's also the philosophy behind GitHub Flow—keep branch lifetimes as short as possible, usually no more than 1–2 days.

For most modern Web projects, I recommend keeping it simple: **one `main` + short-lived `feature/*` branches**, with merges done via Pull Request. This model is enough to handle 90% of scenarios, and has the lowest complexity.

## rebase vs merge: A Key Decision

When merging a branch back to the mainline, there are two basic approaches, and they produce completely different history shapes.

**`git merge`** creates a merge commit, preserving the full history of both branches:

```bash
git checkout main
git merge feature/awesome
```

The history takes on a "web" shape, where you can see the starting point and merge point of the feature branch. The advantage is that it preserves the real timeline; the disadvantage is that over time the history looks like a spider web, and `git log --oneline` becomes hard to scan quickly.

**`git rebase`** "moves" your commits on top of the latest commit of the target branch, rewriting them into a linear history:

```bash
git checkout feature/awesome
git rebase main
```

The benefit of linear history is clarity: `git log` following a straight line shows the full picture of the project's evolution, and `git bisect` locating problems is also easier.

**My practical recommendations**:

- **When merging a feature branch back to the mainline, use `--squash` or GitHub's "Squash and merge"**—compress all the scattered commits of a feature into one, keeping the history clean;
- **When keeping a feature branch in sync with the mainline, use `rebase`**—avoid the noise from repeatedly merging the mainline;
- **Only rebase on private branches**—if the branch has already been pulled by others, rebase will rewrite the commit SHA, which amounts to "rewriting history" and will throw collaborators into confusion.

## squash: Combining a Trail of Footprints into One Step

When developing a feature, we often end up with a bunch of process commits: `wip`, `try xxx`, `fix typo`, `revert last`… These process footprints have no value for future readers, and instead create noise. Squash is about combining these commits into one semantically complete commit.

Taking GitHub as an example, when merging a PR, choose **Squash and merge**, and the entire PR becomes one commit, with the commit message defaulting to the PR title. The equivalent operation on the command line is:

```bash
git checkout main
git merge --squash feature/awesome
git commit -m "feat(user): add user profile page and avatar upload"
```

If you want more fine-grained control (keeping one or two independent commits, rewriting a certain commit message), use interactive rebase:

```bash
git rebase -i main
```

This opens an editor listing all commits on that branch:

```
pick 3f2a1c1 feat: complete user profile page skeleton
pick 9b8c2d2 wip: debugging avatar upload
pick 5e1d3a3 fix: fix issue where refresh after upload does not display
```

Change the `pick` in front of the commits you want to combine to `squash` (or the shorthand `s`), and they will be squashed into the previous commit:

```
pick 3f2a1c1 feat: complete user profile page skeleton
squash 9b8c2d2 wip: debugging avatar upload
squash 5e1d3a3 fix: fix issue where refresh after upload does not display
```

After saving, Git will ask you to combine the commit messages of the three, ultimately producing one clean commit.

## Handling Merge Conflicts: The Right Posture During rebase

Merge conflicts are unavoidable. When using rebase to sync with the mainline, conflict handling is slightly different from merge:

```bash
git checkout feature/awesome
git rebase main
# CONFLICT (content): Merge conflict in src/user.ts
```

At this point Git will pause the rebase and enter a conflict resolution state:

```bash
# 1. Manually edit the conflicted file and resolve the <<<<<<< and >>>>>>> markers
# 2. Mark as resolved
git add src/user.ts

# 3. Continue the rebase (not commit!)
git rebase --continue
```

If you want to abandon this rebase midway:

```bash
git rebase --abort
```

One practical debugging command, `git reflog`, is worth remembering—even if the rebase goes off the rails, `reflog` retains the reference from before the operation, so you can restore at any time:

```bash
git reflog
# Find the HEAD before the rebase, e.g. HEAD@{2}
git reset --hard HEAD@{2}
```

## Practical Aliases: Making High-Frequency Operations More Convenient

Configuring aliases for commonly used commands can significantly reduce the burden of typing:

```bash
git config --global alias.lg "log --oneline --graph --decorate --all"
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.st status
git config --global alias.unstage "reset HEAD --"
git config --global alias.last "log -1 HEAD --stat"
```

After that, `git lg` lets you view the entire branch history as a tree graph, which is much more intuitive than bare `git log`.

## Summary

The core of a Git workflow isn't how many commands you memorize, but forming a set of team consensus:

1. **Commit convention**: Use Conventional Commits to clearly write "what changed and why";
2. **Keep branching simple**: Short-lived feature branches + PR merges, avoiding over-engineering;
3. **Clean history**: Use rebase to sync private branches, use squash to compress when merging back to the mainline;
4. **Stay calm with conflicts**: `rebase --continue` / `rebase --abort` / `reflog` are the three life-saving commands.

Tools serve collaboration. Before starting to argue about "rebase or merge," agreeing with your team on a set of rules everyone can follow is more important than choosing a side.

## References

- [Pro Git Chinese Edition — 3.6 Rebasing](https://git-scm.com/book/zh/v2/Git-%E5%88%86%E6%94%AF-%E5%8F%98%E5%9F%BA)
- [Conventional Commits Specification](https://www.conventionalcommits.org/zh-hans/)
- [Atlassian Git Tutorial — Merging vs. Rebasing](https://www.atlassian.com/git/tutorials/merging-vs-rebasing)
- [Trunk Based Development](https://trunkbaseddevelopment.com/)