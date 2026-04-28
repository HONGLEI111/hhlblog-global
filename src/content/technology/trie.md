---
title: 字典树：前缀匹配的终极数据结构
published: 2026-04-26
description: '掌握 Trie 树的原理、构建与查询，用 TypeScript 实现搜索联想、单词匹配、前缀统计等高频应用。'
image: ''
tags: [字典树, Trie, TypeScript, 数据结构]
category: '算法'
draft: false
lang: ''
---

## 概述

Trie，也叫字典树或前缀树，是一种专门处理字符串前缀的数据结构。它把单词拆成字符路径，共享相同前缀的单词会共用同一段节点。

如果需要频繁做“是否存在某个单词”“是否存在某个前缀”“根据输入前缀自动补全”，Trie 比逐个字符串扫描更自然。

它的核心思想是：用树的路径表示字符串。

> 前置知识
> - **树结构**：每条边表示一个字符
> - **哈希表 / 数组**：节点子链接可用 Map 或数组存储
> - **前缀匹配**：查询过程沿字符逐层向下

---

## 问题定义

假设有三个单词：

```text
cat
car
dog
```

Trie 会把它们组织成：

```text
root
├─ c
│  └─ a
│     ├─ t (word)
│     └─ r (word)
└─ d
   └─ o
      └─ g (word)
```

这样查询前缀 `ca` 时，只需要走 `c -> a`，就能知道有哪些单词共享这个前缀。

Trie 适合的问题：

| 需求 | 普通数组 | Trie |
| --- | --- | --- |
| 判断单词是否存在 | O(n * L) | O(L) |
| 判断前缀是否存在 | O(n * L) | O(L) |
| 自动补全 | 需要扫描所有单词 | 定位前缀后遍历子树 |

其中 `L` 是单词长度，`n` 是单词数量。

---

## 核心原理：分步图解

### 插入单词

插入 `cat`：

```text
root -> c -> a -> t
```

如果路径不存在，就创建节点；如果路径已存在，就复用节点。最后在 `t` 节点标记“这里是一个完整单词”。

### 查询单词

查询 `car`：

1. 从 root 出发；
2. 依次查找 `c`、`a`、`r`；
3. 如果路径断开，单词不存在；
4. 如果路径存在，还要检查最后节点是否标记为完整单词。

### 查询前缀

查询前缀只需要路径存在，不要求最后节点是完整单词。

这就是 `search("ca")` 和 `startsWith("ca")` 的区别。

---

## 算法精细步骤

Trie 节点通常包含：

```text
children: 当前字符到子节点的映射
isWord:   是否在这里结束一个完整单词
```

插入流程：

1. 从根节点开始；
2. 遍历单词的每个字符；
3. 如果当前字符没有对应子节点，就创建；
4. 移动到子节点；
5. 遍历结束后标记 `isWord = true`。

查询流程类似，只是不创建节点；遇到缺失路径直接返回失败。

---

## TypeScript 实现

```typescript
class TrieNode {
  readonly children = new Map<string, TrieNode>();
  isWord = false;
}

class Trie {
  private readonly root = new TrieNode();

  insert(word: string): void {
    let node = this.root;

    for (const char of word) {
      let next = node.children.get(char);

      if (!next) {
        next = new TrieNode();
        node.children.set(char, next);
      }

      node = next;
    }

    node.isWord = true;
  }

  search(word: string): boolean {
    const node = this.findNode(word);
    return node?.isWord ?? false;
  }

  startsWith(prefix: string): boolean {
    return this.findNode(prefix) !== null;
  }

  suggest(prefix: string, limit = 10): string[] {
    const start = this.findNode(prefix);
    if (start === null) return [];

    const result: string[] = [];

    const dfs = (node: TrieNode, path: string): void => {
      if (result.length >= limit) return;
      if (node.isWord) result.push(path);

      for (const [char, child] of node.children) {
        dfs(child, path + char);
      }
    };

    dfs(start, prefix);
    return result;
  }

  private findNode(text: string): TrieNode | null {
    let node = this.root;

    for (const char of text) {
      const next = node.children.get(char);
      if (!next) return null;
      node = next;
    }

    return node;
  }
}
```

---

## 工程优化：压缩 Trie

标准 Trie 的节点数可能很多，尤其当字符串很长且分支较少时，会产生大量只有一个子节点的节点。

例如：

```text
root -> a -> p -> p -> l -> e
```

如果中间节点没有分叉，可以压缩成：

```text
root -> "apple"
```

这类结构叫压缩 Trie 或 Radix Tree。它减少节点数量，但实现更复杂，需要处理字符串片段的拆分和匹配。

工程中是否压缩，取决于数据规模、内存压力和查询性能要求。

---

## 应用与局限

### 典型应用

- 搜索框自动补全；
- 敏感词匹配；
- 拼写检查；
- 路由匹配；
- IP 前缀匹配；
- 单词游戏和词典查询。

### 局限性

- 相比哈希表，Trie 占用更多节点对象；
- 字符集越大，子节点映射越复杂；
- 删除单词需要清理无用节点；
- 只适合前缀相关问题，不适合任意子串匹配。

---

## 总结

```mermaid
graph LR
    A[插入字符串] --> B[逐字符建边]
    B --> C[标记单词结束]
    C --> D[查询单词或前缀]
```

- Trie 用树路径表示字符串。
- 共享前缀是 Trie 的核心优势。
- `search` 要求完整单词存在，`startsWith` 只要求路径存在。
- 自动补全可以先定位前缀节点，再遍历子树。
- 数据量大时要关注节点数量和压缩策略。
