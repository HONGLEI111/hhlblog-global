
# Contributing

Thank you for your interest in contributing!

## Before You Start

If you plan to make major changes (especially new features or design changes), please open an issue or discussion before starting work. This helps ensure your effort aligns with the project's direction.

## Submitting Code

Please keep each pull request focused on a single purpose. Avoid mixing unrelated changes in one PR, as this can make reviewing and merging code more difficult.

Please use the [Conventional Commits](https://www.conventionalcommits.org/) format for your commit messages whenever possible. This keeps our history clear and consistent.

Please write commit messages, pull request titles and pull request descriptions in **English**. The site is English-only and this repository is public, so the history and the pull request list are read by people who may not read another language. See the Language convention in [`AGENTS.md`](AGENTS.md) for the one exception (quoting non-English material the change is about).

Before submitting code, please run the appropriate commands to check for errors and format your code.

```bash
pnpm check
pnpm format
pnpm test
```

The browser smoke checks (`pnpm check:responsive`, `pnpm check:nav`, `pnpm check:chat`) run against a
served build, so start them after `pnpm build && pnpm preview`.
