---
title: 图：邻接表、DFS、BFS 与拓扑排序的 TypeScript 实现
published: 2026-04-26
description: '构建图的邻接表表示，用 TypeScript 实现图的深度优先搜索、广度优先搜索、拓扑排序、课程表等问题。'
image: ''
tags: [图, TypeScript, 数据结构]
category: '算法'
draft: false
lang: ''
---

## 1. 图的表示

```typescript
// 邻接表：每个节点存储它能到达的邻居
type AdjList = Map<number, number[]>;

function buildGraph(n: number, edges: number[][]): AdjList {
  const graph: AdjList = new Map();
  for (let i = 0; i < n; i++) {
    graph.set(i, []);
  }
  for (const [u, v] of edges) {
    graph.get(u)!.push(v);
    // 无向图加上：graph.get(v)!.push(u);
  }
  return graph;
}
```

---

## 2. DFS 遍历图

```typescript
function dfs(graph: AdjList, start: number): number[] {
  const visited = new Set<number>();
  const result: number[] = [];

  function explore(node: number): void {
    if (visited.has(node)) return;
    visited.add(node);
    result.push(node);
    for (const neighbor of graph.get(node) || []) {
      explore(neighbor);
    }
  }

  explore(start);
  return result;
}
```

---

## 3. BFS 遍历图

```typescript
function bfs(graph: AdjList, start: number): number[] {
  const visited = new Set<number>([start]);
  const result: number[] = [];
  const queue: number[] = [start];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return result;
}
```

---

## 4. 拓扑排序

```typescript
function topologicalSort(numCourses: number, prerequisites: number[][]): number[] {
  const graph: AdjList = buildGraph(numCourses, prerequisites);
  const indegree: number[] = new Array(numCourses).fill(0);

  for (const [, v] of prerequisites) {
    indegree[v]++;
  }

  const queue: number[] = [];
  for (let i = 0; i < numCourses; i++) {
    if (indegree[i] === 0) queue.push(i);
  }

  const result: number[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    for (const neighbor of graph.get(node) || []) {
      indegree[neighbor]--;
      if (indegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return result.length === numCourses ? result : [];
}
```

### 4.1 DFS 拓扑排序

```typescript
function topologicalSortDFS(numCourses: number, prerequisites: number[][]): number[] {
  const graph = buildGraph(numCourses, prerequisites);
  const visited = new Array(numCourses).fill(0); // 0=未访问, 1=访问中, 2=已完成
  const result: number[] = [];

  function dfs(node: number): boolean {
    if (visited[node] === 1) return false; // 有环
    if (visited[node] === 2) return true;

    visited[node] = 1;
    for (const neighbor of graph.get(node) || []) {
      if (!dfs(neighbor)) return false;
    }
    visited[node] = 2;
    result.unshift(node);
    return true;
  }

  for (let i = 0; i < numCourses; i++) {
    if (visited[i] === 0 && !dfs(i)) return [];
  }

  return result;
}
```

---

## 5. 课程表（检测环）

```typescript
function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  return topologicalSort(numCourses, prerequisites).length === numCourses;
}
```

---

## 6. 省份数量（连通分量）

```typescript
function findCircleNum(isConnected: number[][]): number {
  const n = isConnected.length;
  const visited = new Set<number>();
  let provinces = 0;

  function dfs(city: number): void {
    visited.add(city);
    for (let neighbor = 0; neighbor < n; neighbor++) {
      if (isConnected[city][neighbor] === 1 && !visited.has(neighbor)) {
        dfs(neighbor);
      }
    }
  }

  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) {
      provinces++;
      dfs(i);
    }
  }

  return provinces;
}
```

---

## 7. 图的分类

| 类型 | 特点 |
|------|------|
| 有向图 | 边有方向 |
| 无向图 | 边无方向 |
| 有权图 | 边有权重 |
| DAG | 有向无环图 |
| 连通图 | 任意两点可达 |
| 完全图 | 每对顶点都有边 |

---

## 8. 总结

1. **邻接表** 是图的最常用存储方式
2. **拓扑排序** = 入度为 0 的节点不断出队
3. **DAG** 才能拓扑排序，有环返回空
4. 连通分量用 DFS/BFS 计数

---

## 参考资料

- [LeetCode — Graph](https://leetcode.cn/tag/graph/)
