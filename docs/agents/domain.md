# Domain docs

How engineering skills should consume this repo's domain documentation while exploring the codebase.

## Read these before exploring

- **`GLOSSARY.md`** at the repo root, or
- **`GLOSSARY-MAP.md`** at the repo root (if present): it points at one `GLOSSARY.md` per context. Read every file relevant to the current topic.
- **`docs/adr/`**: read the ADRs that bear on the area you are about to touch. In multi-context repos, also check context-scoped decisions under `src/<context>/docs/adr/`.

If these files do not exist, **continue silently**. Do not flag them as missing, and do not suggest creating them up front. The `/domain-modeling` skill (invoked via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily, once terms or decisions are actually settled.

## File layout

Single-context repo (most repos):

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context repo (`GLOSSARY-MAP.md` exists at the root):

```
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept — an issue title, a refactor proposal, a hypothesis, a test name — use the term defined in `GLOSSARY.md`. Do not drift to synonyms the glossary explicitly avoids.

If the concept you need is not in the glossary yet, that is a signal: either you are inventing language the project does not use (reconsider), or there is a genuine gap (record it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, say so explicitly rather than silently overriding it:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_

This repo is single-context: a root `GLOSSARY.md` plus `docs/adr/`. Neither exists yet; follow the rule above and continue silently rather than pre-checking whether they exist.
