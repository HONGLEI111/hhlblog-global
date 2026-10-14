---
title: 向量数据库入门：从 Embedding 到相似度搜索
published: 2026-08-20
description: '从向量、Embedding 和相似度度量讲起，用 NumPy 从零实现一个最小向量数据库，再对比主流向量数据库并实战 ChromaDB。'
image: ''
tags: [向量数据库, Embedding, 相似度搜索, AI, RAG]
category: 'AI'
draft: false
lang: ''
---

## 为什么需要向量数据库？

传统数据库擅长的是「精确匹配」：`WHERE id = 42` 或 `WHERE name = '张三'`。但 AI 应用里最常见的需求恰恰是模糊的——**「找出和这句话意思最接近的那几段话」**。

比如：

- 用户问「怎么退款？」，知识库里存的却是「如何申请退货」——字面上几乎不重叠，语义上却是同一个意思。
- 给一张图片，想找到「看起来最像」的其他图片。

这类「语义相似度」检索无法用 SQL 的 `LIKE` 或倒排索引直接解决。向量数据库（Vector Database）就是为这个场景而生的：它把文本、图片、音频等内容转换为高维向量，然后专门负责「快速找出与查询向量最相似的一批向量」。

在 RAG（检索增强生成）架构中，向量数据库是承上启下的关键一环——上游接收 Embedding 模型产出的向量，下游为 LLM 提供检索结果。理解了它，也就理解了 RAG 的一半。

## 向量与 Embedding

**向量**本质上是一组浮点数数组，比如 `[0.12, -0.83, 0.45, ...]`。**Embedding** 则是「把内容转成向量」的过程，其核心思想是：**语义相近的内容，在向量空间中距离也相近**。

```
"猫"        → [0.92, 0.11, -0.03, ...]
"猫咪"      → [0.89, 0.15, -0.01, ...]   ← 与"猫"很近
"汽车引擎"   → [-0.41, 0.78, 0.62, ...]   ← 与"猫"很远
```

真实生产环境通常使用 Transformer 模型做 Embedding，例如 OpenAI 的 `text-embedding-3-small`、BAAI 的开源模型 `bge-*`、Sentence-Transformers 的 `all-MiniLM-L6-v2` 等。这类模型能捕捉深层的语义关系，而不只是关键词重合。

为了让你彻底看清向量数据库内部在做什么，下面我们先用纯 NumPy 手写一个「最小可用」的向量数据库。

## 相似度度量

在动手前，先理解如何衡量两个向量「像不像」。最常用的三种度量：

### 1. 余弦相似度（Cosine Similarity）

衡量两个向量**方向**的夹角，值域 `[-1, 1]`，越接近 1 越相似。它不受向量长度影响，因此是文本语义检索中最常用的度量：

```python
import numpy as np

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """余弦相似度 = 点积 / (模长之积)"""
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
```

### 2. 欧氏距离（Euclidean Distance）

衡量两个向量在空间中**直线距离**，值越小越相似。适合向量长度本身有语义含义的场景（如图像特征）。

### 3. 点积（Dot Product）

余弦相似度的「未归一化」版本。当向量已经过 L2 归一化时，点积就等于余弦相似度——许多向量数据库内部正是这么优化的：**提前归一化，检索时只算点积，省掉除法**。

## 从零实现一个 MiniVectorDB

下面我们用不到 60 行代码，实现一个能「写入向量 + 语义检索」的最小向量数据库。为了完全自包含（不依赖任何外部 API），我们用一个**特征哈希（Feature Hashing）**技巧来生成简易向量：对文本的字符 n-gram 做哈希，映射到固定维度，符号（正负）由哈希值的奇偶决定。

> 注意：这只是教学演示。真实语义检索应使用 Transformer Embedding 模型，而不是哈希技巧。

```python
import hashlib
import numpy as np


def simple_embed(text: str, dim: int = 128) -> np.ndarray:
    """
    简易 Embedding：用字符级 n-gram 哈希生成向量，无需外部 API。
    仅用于教学演示，真实项目请替换为 Transformer Embedding 模型。
    """
    vec = np.zeros(dim, dtype=np.float32)
    text = text.lower()
    # 1-gram 和 2-gram
    tokens = [text[i:i + 1] for i in range(len(text))]
    tokens += [text[i:i + 2] for i in range(len(text) - 1)]
    for token in tokens:
        h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if (h // dim) % 2 == 0 else -1.0
        vec[idx] += sign
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 0 else vec  # L2 归一化，之后点积即余弦相似度


class MiniVectorDB:
    """最小向量数据库：暴力检索 top-k 相似向量"""

    def __init__(self, dim: int = 128):
        self.dim = dim
        self.vectors: list[np.ndarray] = []
        self.docs: list[dict] = []

    def add(self, doc_id: str, text: str) -> None:
        self.vectors.append(simple_embed(text, self.dim))
        self.docs.append({"id": doc_id, "text": text})

    def search(self, query: str, top_k: int = 3) -> list[tuple]:
        """返回 (doc_id, 相似度分数, 文本) 列表，按相似度降序"""
        q = simple_embed(query, self.dim)
        # 向量已归一化，点积即余弦相似度
        scores = [float(np.dot(q, v)) for v in self.vectors]
        order = np.argsort(scores)[::-1][:top_k]  # 降序取 top-k
        return [
            (self.docs[i]["id"], scores[i], self.docs[i]["text"])
            for i in order
        ]


if __name__ == "__main__":
    db = MiniVectorDB()
    db.add("cat", "猫是一种常见的宠物，性格独立")
    db.add("dog", "狗是人类忠诚的朋友，喜欢外出散步")
    db.add("car", "汽车的发动机需要定期保养和更换机油")

    for q in ["小猫咪", "遛狗", "发动机故障"]:
        print(f"\n查询：{q}")
        for doc_id, score, text in db.search(q, top_k=2):
            print(f"  [{doc_id}] 相似度 {score:.3f} | {text}")
```

运行后，你会看到「小猫咪」最匹配 `cat`、「遛狗」最匹配 `dog`、「发动机故障」最匹配 `car`。这就是向量检索的基本闭环：**内容 → 向量 → 相似度排序 → top-k**。

## 暴力搜索的瓶颈与 ANN

上面的实现用的是**暴力搜索（Brute Force）**：把查询向量和库里的每一个向量都算一遍相似度。当数据量是百万、千万级别时，这显然不可行——一次查询要算几百万次点积。

于是有了**近似最近邻（Approximate Nearest Neighbor，ANN）**算法：牺牲一点点精度，换取数量级的速度提升。主流的 ANN 索引包括：

- **HNSW（Hierarchical Navigable Small World）**：构建多层「小世界」图，从高层粗粒度快速下探到低层细粒度。检索复杂度约 O(log N)，是目前工程上最广泛采用的索引之一。
- **IVF（Inverted File Index）**：先聚类把向量空间划分成若干桶，查询时只搜最近的一批桶。
- **PQ（Product Quantization）**：对向量做有损压缩，用更小的内存存储更多向量。

真实向量数据库的价值，很大程度上就体现在这些索引的工程实现上——**这正是你没必要自己重造轮子的原因。**

## 主流向量数据库对比

| 数据库 | 特点 | 适合场景 |
|--------|------|----------|
| **ChromaDB** | 开源、Python 原生、本地/内存运行、轻量 | 原型开发、小规模应用 |
| **Milvus** | 开源、高性能、分布式、支持多种 ANN 索引 | 大规模生产环境 |
| **Qdrant** | Rust 编写、高性能、过滤能力强 | 需要复杂元数据过滤的场景 |
| **Weaviate** | 开源、混合搜索（BM25 + 向量） | 既要关键词又要语义的场景 |
| **Pinecone** | 全托管云服务、免运维 | 不想管基础设施的团队 |
| **pgvector** | PostgreSQL 扩展 | 已用 PostgreSQL、想少引入一个系统 |

选型时优先考虑：**数据规模、查询延迟要求、是否需要元数据过滤、运维成本**。原型阶段用 ChromaDB，生产阶段再考虑 Milvus 或 Pinecone，是一条常见的演进路径。

## 实战：用 ChromaDB 做语义搜索

最后看一个真实向量数据库的用法。ChromaDB 的默认 Embedding 函数是 `all-MiniLM-L6-v2`，开箱即用：

```bash
pip install chromadb
```

```python
import chromadb

# 创建本地持久化客户端，数据落盘到 ./chroma_data
client = chromadb.PersistentClient(path="./chroma_data")
collection = client.get_or_create_collection(
    name="faq",
    # 不传 embedding_function 时，使用默认的 all-MiniLM-L6-v2
)

# 写入文档（ChromaDB 会自动调用 Embedding 函数转为向量）
collection.add(
    ids=["1", "2", "3", "4"],
    documents=[
        "如何申请退货？请在订单详情页点击申请退款。",
        "包裹什么时候发货？一般在付款后 24 小时内发出。",
        "怎样修改收货地址？在订单未发货前可以自助修改。",
        "优惠券在哪里领取？首页活动专区每天 10 点发放。",
    ],
)

# 语义检索：即使没有关键词重合，也能命中相关文档
results = collection.query(
    query_texts=["我想退款，怎么操作？"],
    n_results=2,
)

for doc, distance in zip(results["documents"][0], results["distances"][0]):
    print(f"[距离 {distance:.3f}] {doc}")
```

注意 ChromaDB 的 `query` 默认返回的是**距离**（越小越相似），而不是相似度分数——不同数据库对「分数」的定义可能不同，读文档时要先确认。

## 结语

向量数据库的底层原理并不神秘：**Embedding 把语义变成向量，相似度度量把「像不像」变成「数字」，ANN 索引把「全量比对」变成「近似查找」**。理解了这三件事，你就抓住了向量数据库的本质。

对于日常开发，你不必亲手实现 HNSW——先用 ChromaDB 跑通原型，再根据数据规模演进到 Milvus 或 Pinecone，是最务实的选择。向量数据库是 RAG 的基石，掌握它，你就迈出了构建 AI 应用的关键一步。

---

**参考来源：**

1. Malkov, Y., & Yashunin, D. "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs." *arXiv 2016*. https://arxiv.org/abs/1603.09320
2. ChromaDB 官方文档. https://docs.trychroma.com/
3. Milvus 官方文档. https://milvus.io/docs
4. pgvector - GitHub. https://github.com/pgvector/pgvector
5. OpenAI Embeddings 指南. https://platform.openai.com/docs/guides/embeddings
