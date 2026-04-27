---
title: 最短路径：Dijkstra、Bellman-Ford、Floyd 的 TypeScript 实现
published: 2026-04-26
description: '掌握三种经典最短路径算法的原理与 TypeScript 实现，理解适用场景（无负权图、负权边、多源）。'
image: ''
tags: [最短路径, TypeScript, 算法]
category: '算法'
draft: false
lang: ''
---

## 1. Dijkstra 算法

适用于**无负权边**的有向/无向图，单源最短路径。

```typescript
// 邻接表存储：[目标, 权重]
type Graph = [number, number][][];

function dijkstra(graph: Graph, start: number): number[] {
  const n = graph.length;
  const dist: number[] = new Array(n).fill(Infinity);
  const visited: boolean[] = new Array(n).fill(false);
  dist[start] = 0;

  for (let i = 0; i < n; i++) {
    // 找未访问中距离最小的节点
    let u = -1;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && (u === -1 || dist[j] < dist[u])) {
        u = j;
      }
    }

    if (u === -1) break;
    visited[u] = true;

    // 松弛所有邻边
    for (const [v, w] of graph[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
      }
    }
  }

  return dist;
}
```

### 1.1 堆优化 Dijkstra

```typescript
function dijkstraHeap(graph: Graph, start: number): number[] {
  const n = graph.length;
  const dist: number[] = new Array(n).fill(Infinity);
  dist[start] = 0;

  // [节点, 距离]，按距离小顶堆
  const pq: [number, number][] = [[start, 0]];

  while (pq.length > 0) {
    // 模拟堆取最小（生产环境用优先队列）
    let minIdx = 0;
    for (let i = 1; i < pq.length; i++) {
      if (pq[i][1] < pq[minIdx][1]) minIdx = i;
    }
    const [u, d] = pq.splice(minIdx, 1)[0];

    if (d > dist[u]) continue;

    for (const [v, w] of graph[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        pq.push([v, dist[v]]);
      }
    }
  }

  return dist;
}
```

---

## 2. 网络延迟时间

```typescript
function networkDelayTime(times: number[][], n: number, k: number): number {
  const graph: Graph = Array.from({ length: n + 1 }, () => []);
  for (const [u, v, w] of times) {
    graph[u].push([v, w]);
  }

  const dist = dijkstra(graph, k);
  let max = 0;
  for (let i = 1; i <= n; i++) {
    if (dist[i] === Infinity) return -1;
    max = Math.max(max, dist[i]);
  }

  return max;
}
```

---

## 3. Bellman-Ford 算法

适用于**有负权边**的图，单源最短路径。

```typescript
function bellmanFord(edges: [number, number, number][], n: number, start: number): number[] {
  const dist: number[] = new Array(n).fill(Infinity);
  dist[start] = 0;

  // 松弛 n-1 轮
  for (let i = 0; i < n - 1; i++) {
    let updated = false;
    for (const [u, v, w] of edges) {
      if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        updated = true;
      }
    }
    if (!updated) break; // 提前结束
  }

  // 第 n 轮检测负权环
  for (const [u, v, w] of edges) {
    if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
      throw new Error('存在负权环');
    }
  }

  return dist;
}
```

---

## 4. Floyd-Warshall 算法

适用于**所有点对**之间的最短路径，O(n³)。

```typescript
function floydWarshall(graph: number[][]): number[][] {
  const n = graph.length;
  const dist: number[][] = graph.map(row => [...row]);

  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
        }
      }
    }
  }

  return dist;
}
```

---

## 5. 三种算法对比

| 算法 | 复杂度 | 负权边 | 多源 | 类型 |
|------|--------|--------|------|------|
| Dijkstra | O(n²) / O(E log V) | ❌ | ❌ | 贪心 |
| Dijkstra(堆) | O(E log V) | ❌ | ❌ | 贪心 |
| Bellman-Ford | O(VE) | ✅ | ❌ | DP |
| Floyd | O(V³) | ✅ | ✅ | DP |

---

## 6. 总结

1. **无负权** → Dijkstra（堆优化）
2. **有负权边** → Bellman-Ford
3. **所有点对** → Floyd
4. 实际面试中 90% 用 Dijkstra 就够了

---

## 参考资料

- [Dijkstra's Algorithm](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm)
- [LeetCode — Graph](https://leetcode.cn/tag/graph/)
