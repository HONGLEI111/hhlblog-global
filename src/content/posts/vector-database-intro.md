---
title: 'Getting Started with Vector Databases: From Embeddings to Similarity Search'
published: 2026-08-20
description: Start with vectors, embeddings, and similarity metrics, then build a minimal vector database from scratch with NumPy, compare mainstream vector databases, and get hands-on with ChromaDB.
image: ''
tags: [vector database, embedding, similarity search, AI, RAG]
category: 'AI'
draft: false
---
## Why Do We Need Vector Databases?

Traditional databases excel at "exact matching": `WHERE id = 42` or `WHERE name = '张三'`. But the most common need in AI applications is precisely the fuzzy kind—**"find the passages that are closest in meaning to this sentence."**

For example:

- A user asks "How do I get a refund?", but the knowledge base stores "How to apply for a return"—the wording barely overlaps, yet semantically they mean the same thing.
- Given an image, you want to find other images that "look the most similar."

This kind of "semantic similarity" retrieval cannot be solved directly with SQL's `LIKE` or an inverted index. Vector databases were born for exactly this scenario: they convert text, images, audio, and other content into high-dimensional vectors, then specialize in "quickly finding the batch of vectors most similar to a query vector."

In a RAG (Retrieval-Augmented Generation) architecture, the vector database is a key link that bridges what comes before and after—upstream it receives vectors produced by Embedding models, and downstream it provides retrieval results to the LLM. Understanding it means understanding half of RAG.

## Vectors and Embedding

A **vector** is essentially an array of floating-point numbers, such as `[0.12, -0.83, 0.45, ...]`. **Embedding** is the process of "turning content into a vector," and its core idea is: **content with similar semantics is also close together in vector space**.

```
"猫"        → [0.92, 0.11, -0.03, ...]
"猫咪"      → [0.89, 0.15, -0.01, ...]   ← 与"猫"很近
"汽车引擎"   → [-0.41, 0.78, 0.62, ...]   ← 与"猫"很远
```

Real production environments typically use Transformer models for Embedding, such as OpenAI's `text-embedding-3-small`, BAAI's open-source model `bge-*`, Sentence-Transformers' `all-MiniLM-L6-v2`, and so on. These models can capture deep semantic relationships, not just keyword overlap.

To let you see clearly what a vector database is doing internally, below we'll first hand-write a "minimal viable" vector database using pure NumPy.

## Similarity Metrics

Before getting hands-on, let's first understand how to measure whether two vectors "look alike." The three most commonly used metrics:

### 1. Cosine Similarity

Measures the angle between the **directions** of two vectors, with a range of `[-1, 1]`—the closer to 1, the more similar. It is unaffected by vector length, making it the most commonly used metric in text semantic retrieval:

```python
import numpy as np

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """余弦相似度 = 点积 / (模长之积)"""
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
```

### 2. Euclidean Distance

Measures the **straight-line distance** between two vectors in space—the smaller the value, the more similar. It suits scenarios where vector length itself carries semantic meaning (such as image features).

### 3. Dot Product

The "unnormalized" version of cosine similarity. When vectors have already been L2-normalized, the dot product equals cosine similarity—and this is exactly how many vector databases optimize internally: **normalize in advance, compute only the dot product at retrieval time, and skip the division**.

## Implementing a MiniVectorDB from Scratch

Below, in under 60 lines of code, we'll implement a minimal vector database capable of "writing vectors + semantic retrieval." To be fully self-contained (without relying on any external API), we use a **Feature Hashing** trick to generate simple vectors: hash the character n-grams of the text, map them to a fixed dimension, and let the sign (positive or negative) be determined by the parity of the hash value.

> Note: This is only a teaching demonstration. Real semantic retrieval should use Transformer Embedding models, not hashing tricks.

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

After running it, you'll see that "kitten" best matches `cat`, "walking the dog" best matches `dog`, and "engine failure" best matches `car`. This is the basic closed loop of vector retrieval: **content → vector → similarity ranking → top-k**.

## The Bottleneck of Brute-Force Search and ANN

The implementation above uses **Brute Force** search: computing the similarity between the query vector and every single vector in the database. When the data volume reaches the millions or tens of millions, this is clearly infeasible—a single query would require computing millions of dot products.

Hence **Approximate Nearest Neighbor (ANN)** algorithms: sacrificing a little accuracy in exchange for an order-of-magnitude speedup. Mainstream ANN indexes include:

- **HNSW (Hierarchical Navigable Small World)**: Builds a multi-layer "small world" graph, quickly descending from coarse-grained upper layers to fine-grained lower layers. Retrieval complexity is about O(log N), making it one of the most widely adopted indexes in engineering today.
- **IVF (Inverted File Index)**: First clusters the vector space into several buckets, and at query time searches only the nearest batch of buckets.
- **PQ (Product Quantization)**: Performs lossy compression on vectors, storing more vectors in less memory.

The value of real vector databases lies largely in the engineering implementation of these indexes—**which is exactly why you don't need to reinvent the wheel yourself.**

## Comparison of Mainstream Vector Databases

| Database | Features | Suitable Scenarios |
|--------|------|----------|
| **ChromaDB** | Open source, Python-native, runs locally/in-memory, lightweight | Prototype development, small-scale applications |
| **Milvus** | Open source, high performance, distributed, supports multiple ANN indexes | Large-scale production environments |
| **Qdrant** | Written in Rust, high performance, strong filtering capabilities | Scenarios requiring complex metadata filtering |
| **Weaviate** | Open source, hybrid search (BM25 + vectors) | Scenarios needing both keywords and semantics |
| **Pinecone** | Fully managed cloud service, zero ops | Teams that don't want to manage infrastructure |
| **pgvector** | PostgreSQL extension | Those already using PostgreSQL who want to introduce one fewer system |

When choosing, prioritize: **data scale, query latency requirements, whether metadata filtering is needed, and operational cost**. Using ChromaDB at the prototype stage and then considering Milvus or Pinecone at the production stage is a common evolution path.
## Hands-On: Semantic Search with ChromaDB

Finally, let's look at how to use a real vector database. ChromaDB's default embedding function is `all-MiniLM-L6-v2`, ready to use out of the box:

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

Note that ChromaDB's `query` returns **distance** by default (smaller means more similar), not a similarity score—different databases may define "score" differently, so always check the documentation first.

## Conclusion

The underlying principles of vector databases aren't mysterious: **embeddings turn semantics into vectors, similarity metrics turn "how alike" into "numbers," and ANN indexes turn "full comparison" into "approximate lookup."** Once you understand these three things, you've grasped the essence of vector databases.

For everyday development, you don't need to implement HNSW by hand—getting a prototype working with ChromaDB first, then evolving to Milvus or Pinecone as your data scales, is the most pragmatic choice. Vector databases are the cornerstone of RAG; master them, and you've taken a key step toward building AI applications.

---

**References:**

1. Malkov, Y., & Yashunin, D. "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs." *arXiv 2016*. https://arxiv.org/abs/1603.09320
2. ChromaDB Official Documentation. https://docs.trychroma.com/
3. Milvus Official Documentation. https://milvus.io/docs
4. pgvector - GitHub. https://github.com/pgvector/pgvector
5. OpenAI Embeddings Guide. https://platform.openai.com/docs/guides/embeddings