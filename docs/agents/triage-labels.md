# Triage 标签

Skills 使用五个 canonical triage roles。这个文件把这些 roles 映射到此 repo issue tracker 中实际使用的 label 字符串。

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

当某个 skill 提到 role（例如 “apply the AFK-ready triage label”）时，使用此表中对应的 label 字符串。

本 repo 使用默认字符串：右侧列与左侧一致。如果将来改用其他 label 名（例如用 `bug:triage` 表示 `needs-triage`），只编辑右侧列，避免 `/triage` 创建重复 labels。
