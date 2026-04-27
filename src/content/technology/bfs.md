---
title: 广度优先搜索：BFS 的模板与 TypeScript 实战
published: 2026-04-26
description: '掌握 BFS 的队列模板、最短路径特性和复杂度分析，用 TypeScript 解决迷宫、单词接龙、开锁问题。'
image: ''
tags: [广度优先搜索, BFS, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 1. BFS 模板

```typescript
// BFS 用队列，逐层向外扩散
function bfs(start: number, target: number): number {
  const queue: number[] = [start];
  const visited = new Set<number>([start]);
  let step = 0;

  while (queue.length > 0) {
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const cur = queue.shift()!;
      if (cur === target) return step;

      for (const next of getNeighbors(cur)) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    step++;
  }

  return -1;
}
```

---

## 2. 岛屿数量（二维 BFS）

```typescript
function numIslands(grid: string[][]): number {
  const m = grid.length;
  const n = grid[0].length;
  let count = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function bfs(i: number, j: number): void {
    const queue: [number, number][] = [[i, j]];
    grid[i][j] = '0';

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < m && ny >= 0 && ny < n && grid[nx][ny] === '1') {
          grid[nx][ny] = '0';
          queue.push([nx, ny]);
        }
      }
    }
  }

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        count++;
        bfs(i, j);
      }
    }
  }

  return count;
}
```

---

## 3. 打开转盘锁

```typescript
function openLock(deadends: string[], target: string): number {
  const dead = new Set(deadends);
  if (dead.has('0000')) return -1;

  const queue: string[] = ['0000'];
  const visited = new Set<string>(['0000']);
  let step = 0;

  while (queue.length > 0) {
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const cur = queue.shift()!;
      if (cur === target) return step;

      for (let j = 0; j < 4; j++) {
        const up = cur.slice(0, j) + ((+cur[j] + 1) % 10) + cur.slice(j + 1);
        const down = cur.slice(0, j) + ((+cur[j] + 9) % 10) + cur.slice(j + 1);

        for (const next of [up, down]) {
          if (!dead.has(next) && !visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        }
      }
    }
    step++;
  }

  return -1;
}
```

---

## 4. 单词接龙

```typescript
function ladderLength(
  beginWord: string,
  endWord: string,
  wordList: string[]
): number {
  const wordSet = new Set(wordList);
  if (!wordSet.has(endWord)) return 0;

  const queue: string[] = [beginWord];
  let step = 1;

  while (queue.length > 0) {
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const word = queue.shift()!;
      const chars = word.split('');
      for (let j = 0; j < chars.length; j++) {
        const original = chars[j];
        for (let c = 97; c <= 122; c++) { // 'a' ~ 'z'
          chars[j] = String.fromCharCode(c);
          const next = chars.join('');
          if (next === endWord) return step + 1;
          if (wordSet.has(next)) {
            wordSet.delete(next);
            queue.push(next);
          }
        }
        chars[j] = original;
      }
    }
    step++;
  }

  return 0;
}
```

---

## 5. BFS vs DFS

| 特性 | BFS | DFS |
|------|-----|-----|
| 数据结构 | 队列 | 栈/递归 |
| 最短路径 | ✅（无权图） | ❌ |
| 空间复杂度 | O(w) w=最宽层 | O(h) h=最大深度 |
| 适用场景 | 层序、最短 | 连通性、回溯 |

---

## 6. 双向 BFS（优化）

```typescript
function openLockBidirectional(deadends: string[], target: string): number {
  const dead = new Set(deadends);
  if (dead.has('0000')) return -1;

  let q1 = new Set<string>(['0000']);
  let q2 = new Set<string>([target]);
  const visited = new Set<string>(['0000']);
  let step = 0;

  while (q1.size > 0 && q2.size > 0) {
    // 选择较小的队列扩展
    if (q1.size > q2.size) [q1, q2] = [q2, q1];

    const temp = new Set<string>();
    for (const cur of q1) {
      if (q2.has(cur)) return step;

      for (let j = 0; j < 4; j++) {
        const up = cur.slice(0, j) + ((+cur[j] + 1) % 10) + cur.slice(j + 1);
        const down = cur.slice(0, j) + ((+cur[j] + 9) % 10) + cur.slice(j + 1);
        for (const next of [up, down]) {
          if (!dead.has(next) && !visited.has(next)) {
            visited.add(next);
            temp.add(next);
          }
        }
      }
    }
    q1 = temp;
    step++;
  }

  return -1;
}
```

---

## 7. 总结

1. BFS = **队列 + 逐层扩散**
2. 无权图的最短路径 = BFS
3. 双向 BFS 可将搜索空间从 O(bⁿ) 降到 O(b^(n/2))

---

## 参考资料

- [LeetCode — BFS](https://leetcode.cn/tag/breadth-first-search/)
