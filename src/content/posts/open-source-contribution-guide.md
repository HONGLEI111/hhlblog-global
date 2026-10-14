---
title: 'A Guide to Open Source Participation: From Your First PR to Maintainer'
published: 2026-09-05
description: A practical path through open source participation, covering how to find the right project, submit your first pull request, follow code review etiquette, and grow into a maintainer, with copy-ready workflow commands and PR templates.
image: ''
tags: [Open Source, GitHub, Pull Request, Contribution Guide, Code Review, Community]
category: Backend
draft: false
---
## Why You Should Contribute to Open Source

Many people think open source contribution means "writing core code," with a high barrier to entry and slow returns, so they hesitate to start. But in the real open source world, most PRs are small: fixing a documentation typo, adding a test, updating a dependency version—all count as contributions.

The value of participating in open source is compound:

- **Hard currency for your resume**: A GitHub profile with real commits is more convincing than any self-assessment claiming "proficient in XX";
- **An accelerator for coding skills**: Writing code in someone else's codebase forces you to understand designs and conventions at a higher level than your own;
- **Connections and perspective**: Communicating with maintainers around the world, understanding how a project goes from PR to release.

This article follows the main thread of "find a project → submit a PR → pass Code Review → become a maintainer," providing specific steps and pitfalls to avoid at each stage.

## 1. Find a Suitable Project

The principle for choosing a project isn't "the bigger the better," but **"just within your reach."** Three practical entry points:

1. **Start with dependencies you already use.** The library you import every day is often the best starting point—you're familiar with its API, and you know exactly what annoys you about it.
2. **Look for issues tagged with `good first issue`.** These are tasks specifically prepared by maintainers for newcomers, with small scope and clear context. You can filter directly on GitHub using [goodfirstissue.dev](https://goodfirstissue.dev/) or GitHub's search syntax.
3. **Start with documentation and tests.** Documentation errors, typos, missing examples, uncovered test branches—all are low-risk first PRs.

```bash
# Use the gh CLI to search for issues labeled "good first issue"
gh search issues --label "good first issue" "language:typescript" --limit 20
```

After choosing a project, the first thing to do is **read `CONTRIBUTING.md`**. It usually specifies commit conventions, test commands, whether a CLA (Contributor License Agreement) needs to be signed, etc. Skip this step, and your PR will likely be rejected in the first round of review.

## 2. From Fork to Local Branch

The standard contribution workflow on GitHub is "fork first, then submit a PR." Never push directly to the main repository.

```bash
# 1. Click Fork on the GitHub web page, then use git clone to pull it to your local machine
git clone https://github.com/<你的用户名>/<项目名>.git
cd <项目名>

# 2. Add the upstream repository as a remote to make later syncing easier
git remote add upstream https://github.com/<原作者>/<项目名>.git

# 3. Always branch off the latest main
git fetch upstream
git checkout -b fix/typo-in-readme upstream/main

# 4. Regularly sync updates from upstream (to avoid your branch drifting from upstream)
git fetch upstream
git merge upstream/main
```

Name branches to describe intent as much as possible: `fix/xxx`, `feat/xxx`, `docs/xxx`, `chore/xxx`. One branch should solve only one problem—what maintainers fear most is a PR stuffed with 5 unrelated changes.

## 3. Write a Commit and PR That Can Pass Review

Many newcomers get stuck on "non-standard submissions." Most projects follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body optional, explain why, not what>
```

Write commit messages that explain "why you did this," not "what you did"—the latter is obvious from the diff, while the former is the information needed during review.

The PR description is equally important. A clear structure can significantly increase the probability of being merged:

```markdown
## Background

What is the problem in this issue? What are the reproduction conditions?

## Changes

- What was done, and why it was done this way
- Whether any breaking changes were introduced

## Testing

- Which test commands were run
- Which scenarios were manually verified

Closes #123
```

The smaller the PR, the easier it is to get through. Splitting "refactoring + new feature" into two PRs will make review much faster. Maintainers are also volunteers, and their time is equally valuable.

## 4. Code Review Etiquette

Code Review is the core of open source collaboration, and also where newcomers are most likely to get "thin-skinned." Remember three principles:

1. **Comments target the code, not the person.** `这个函数可以拆成两个` is a good comment, `你写得太烂了` is not.
2. **Don't reply defensively.** Review feedback is meant to help you improve, not to negate you. Understand the intent first, then decide whether to push back.
3. **Respond promptly but don't nag.** Maintainers usually have their own day jobs, and a few days without a reply is normal; but if there's been no activity for over a week, a polite ping is reasonable.

How to handle review feedback:

```bash
# Keep making changes on the same branch and force-push to update the PR
git add .
git commit -m "fix: 根据 review 意见拆分函数"
git push --force-with-lease
```

> Note: `--force-with-lease` is safer than `--force`, as it first checks whether the remote branch has been modified by someone else. Force-pushing to your own PR branch is **allowed and common**, but never force-push to a shared branch on the main repository.

## 5. Common Pitfalls

- **Signing a CLA**: Many corporate open source projects (such as those under Google, CNCF) require signing a CLA. If you don't sign, CI will fail directly and the PR cannot be merged. Pay attention to this item when reading `CONTRIBUTING.md`.
- **CI failure**: Works locally but fails online—usually an environment difference. Check the CI logs first, and don't rush to ask maintainers for help—contributors who can diagnose CI issues themselves immediately make a good impression.
- **License issues**: Before copying someone else's code into a project, first confirm whether the license is compatible. This is not a trivial matter.
- **Don't use `git pull` to create merge commits**: When syncing upstream, prefer `rebase` or `merge --ff-only` to keep history linear.

## 6. From Contributor to Maintainer

After contributing consistently for a while, you may be invited to become a **maintainer** or gain triage permissions. There's no fixed threshold on this path, but there are several signals:

- Your PR quality is consistently high, with review feedback generally passing on the first try;
- You start helping others review PRs and answer issues;
- You understand and identify with the project's vision and code style.

A maintainer's job is more about "gatekeeping" than "writing code": evaluating the value of issues, reviewing others' PRs, maintaining documentation and CI, participating in release decisions. This is a whole new dimension of growth—you'll learn how to make trade-offs amid uncertainty, and how to collaborate with people from different backgrounds.

## Conclusion

Open source is not the exclusive domain of a few geniuses; it's a collaboration mechanism anyone can pick up. The first PR is often the hardest, because it tests not just code, but also the patience to "understand the rules and respect others' time." But once you cross that threshold, you'll find you gain far more than just a merged label.

Start with a `good first issue`—it's really not as hard as you think.

## References

- [GitHub Open Source Guides](https://opensource.guide/) — The official open source participation guide, covering the full process from getting started to maintaining
- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/) — Specific steps for finding projects and submitting PRs
- [Conventional Commits](https://www.conventionalcommits.org/) — Commit message specification
- [First Timers Only](https://www.firsttimersonly.com/) — A collection of resources specifically for first-time contributors