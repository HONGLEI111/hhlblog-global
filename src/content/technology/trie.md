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

## 1. 什么是字典树？

Trie（前缀树）是一种**多叉树**，用于高效存储和检索字符串集中的键。

```
         root
       /  |   \
      a   b    c
     /    |     \
    p*    e     a
   /     / \     \
  p*    e*  t*    t*
```

- 每个节点代表一个字符
- 根节点到某节点路径 = 一个字符串前缀
- `*` 标记一个完整单词

---

## 2. 基本实现

```typescript
class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEnd: boolean = false;
}

class Trie {
  root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  insert(word: string): void {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
      }
      node = node.children.get(ch)!;
    }
    node.isEnd = true;
  }

  search(word: string): boolean {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) return false;
      node = node.children.get(ch)!;
    }
    return node.isEnd;
  }

  startsWith(prefix: string): boolean {
    let node = this.root;
    for (const ch of prefix) {
      if (!node.children.has(ch)) return false;
      node = node.children.get(ch)!;
    }
    return true;
  }
}
```

---

## 3. 搜索联想（自动补全）

```typescript
class AutoCompleteTrie extends Trie {
  suggest(prefix: string): string[] {
    let node = this.root;
    for (const ch of prefix) {
      if (!node.children.has(ch)) return [];
      node = node.children.get(ch)!;
    }
    return this.collect(node, prefix);
  }

  private collect(node: TrieNode, prefix: string): string[] {
    const result: string[] = [];
    if (node.isEnd) result.push(prefix);
    for (const [ch, child] of node.children) {
      result.push(...this.collect(child, prefix + ch));
    }
    return result;
  }
}
```

---

## 4. 实战题目

### 4.1 实现 Trie（前缀树）

```typescript
// 见上文完整实现
const trie = new Trie();
trie.insert('apple');
console.log(trie.search('apple'));   // true
console.log(trie.search('app'));     // false
console.log(trie.startsWith('app')); // true
trie.insert('app');
console.log(trie.search('app'));     // true
```

### 4.2 添加与搜索单词（通配符）

```typescript
class WordDictionary {
  root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  addWord(word: string): void {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
      }
      node = node.children.get(ch)!;
    }
    node.isEnd = true;
  }

  search(word: string): boolean {
    return this.dfs(word, 0, this.root);
  }

  private dfs(word: string, index: number, node: TrieNode): boolean {
    if (index === word.length) return node.isEnd;

    const ch = word[index];
    if (ch === '.') {
      for (const child of node.children.values()) {
        if (this.dfs(word, index + 1, child)) return true;
      }
      return false;
    }

    if (!node.children.has(ch)) return false;
    return this.dfs(word, index + 1, node.children.get(ch)!);
  }
}
```

### 4.3 单词替换（前缀匹配替换）

```typescript
function replaceWords(dictionary: string[], sentence: string): string {
  const trie = new Trie();
  for (const root of dictionary) trie.insert(root);

  return sentence
    .split(' ')
    .map(word => {
      let node = trie.root;
      for (let i = 0; i < word.length; i++) {
        if (!node.children.has(word[i])) break;
        node = node.children.get(word[i])!;
        if (node.isEnd) return word.slice(0, i + 1);
      }
      return word;
    })
    .join(' ');
}
```

---

## 5. 复杂度分析

| 操作 | 时间 | 空间 |
|------|------|------|
| 插入 | O(L) | O(L) |
| 搜索 | O(L) | O(1) |
| 前缀搜索 | O(L) | O(1) |
| 自动补全 | O(K) | O(K) |

（L = 单词长度，K = 搜索结果总数）

---

## 6. 总结

1. Trie = **空间换时间**：用多叉树存所有公共前缀
2. **搜索联想、拼写检查、IP 路由**都是典型应用
3. 看到 **前缀匹配** 就考虑 Trie

---

## 参考资料

- [LeetCode — Trie](https://leetcode.cn/tag/trie/)
