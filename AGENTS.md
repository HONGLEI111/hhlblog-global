## Repo conventions

### Language

Write **commit messages, pull request titles and pull request descriptions in English** —
including when the conversation that produced the change was in another language.
This applies to everyone working in this repository, humans and coding agents alike.

The site is English-only (see `CONTRIBUTING.md`), this repository is public, and the
history is part of what a visitor of the project reads. A non-English commit subject
is therefore a defect to fix, not a style preference.

The one exception is quoting: when the change is *about* non-English material, cite
the original string inside an otherwise English message (for example, a translation
fix that names the string it corrected).

## Agent skills

### Issue tracker

Issues and specs live in this repo's GitHub Issues on `HONGLEI111/hhlblog-global`, driven by the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles, using the default label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: root `GLOSSARY.md` plus `docs/adr/`. See `docs/agents/domain.md`.
