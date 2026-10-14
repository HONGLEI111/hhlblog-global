---
title: 'RAG (Retrieval-Augmented Generation) Principles and Implementation: Building a Knowledge Q&A System from Scratch'
published: 2026-08-07
description: Gain a deep understanding of the core principles behind Retrieval-Augmented Generation (RAG) and build a vector retrieval-based knowledge Q&A system from scratch with complete code examples.
image: ''
tags: [RAG, LLM, Vector Database, Embedding, AI]
category: 'AI'
draft: false
---
## What Is RAG?

Retrieval-Augmented Generation (RAG) is one of the most central technical patterns in current large language model (LLM) applications. Its basic idea is simple: **before the LLM generates an answer, first retrieve relevant information from an external knowledge base, inject the retrieval results into the prompt as context, and let the model answer based on "reference materials."**

Why is RAG needed? LLMs have two well-known limitations:

1. **Knowledge cutoff**: Model training data has a cutoff time, so it cannot answer questions about events that occurred after training.
2. **Hallucination problem**: Models sometimes "fabricate" facts that do not exist, especially in domains they are unfamiliar with.

RAG elegantly solves both problems—it frees the LLM from having to memorize all knowledge, and instead teaches it to "look up materials" before answering. This is like the difference between an open-book exam and a closed-book exam.

## Core Architecture

The RAG workflow can be divided into four steps:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  1. 文档处理  │ -> │  2. 向量检索  │ -> │  3. 上下文增强 │ -> │  4. 生成回答  │
│  (Chunking)  │    │  (Retrieval) │    │ (Augmentation)│    │ (Generation) │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

Each step has its own technical details and design trade-offs, which are expanded on one by one below.

### 1. Document Processing and Chunking

Documents need to be split into "chunks" of appropriate size. The chunking strategy directly affects retrieval quality:

- **Too small** (e.g., 100 tokens): loses context, semantics are incomplete
- **Too large** (e.g., 4000 tokens): retrieval precision drops, too much noisy information
- **Recommended**: usually 500-1500 tokens is a good balance point

More advanced approaches include **semantic chunking** (splitting along paragraph/section boundaries) and **recursive chunking** (first split by large delimiters, then by small delimiters).

### 2. Vectorization and Embedding

Each text chunk needs to be converted into a vector (a set of floating-point numbers) through an Embedding model. Semantically similar texts are closer together in vector space—this is the mathematical foundation of vector retrieval.

Commonly used Embedding models:
- OpenAI: `text-embedding-3-small` / `text-embedding-3-large`
- Open-source options: `BGE` (BAAI), `all-MiniLM-L6-v2` (Sentence-Transformers)

### 3. Vector Retrieval

The user's question is likewise embedded as a vector, and then the most similar text chunks are searched for in the vector database. Similarity is usually measured using **cosine similarity** or **Euclidean distance**.

### 4. Augmented Generation

The retrieved relevant text chunks are concatenated before the user's original question and sent to the LLM together. A typical Prompt template:

```
你是一个知识助手。请根据以下参考资料回答用户问题。
如果你无法从参考资料中找到答案，请如实说明。

参考资料：
{retrieved_chunks}

用户问题：{user_query}
```
## Building a Minimal RAG System from Scratch

Below we use Python to implement a minimal RAG system. We use:
- **ChromaDB** as the vector database (lightweight, runs locally)
- **OpenAI API** to provide Embedding and Chat capabilities

### Environment Setup

```bash
pip install chromadb openai
```

### Complete Code

```python
import os
from openai import OpenAI
import chromadb
from chromadb.utils import embedding_functions

# ============================================================
# 1. 初始化
# ============================================================
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# 使用 OpenAI 的 Embedding 函数
embedding_fn = embedding_functions.OpenAIEmbeddingFunction(
    api_key=os.environ["OPENAI_API_KEY"],
    model_name="text-embedding-3-small"
)

# 创建或连接到 ChromaDB 集合
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(
    name="my_knowledge_base",
    embedding_function=embedding_fn
)


# ============================================================
# 2. 文档分块函数
# ============================================================
def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
    """
    简单的固定大小分块，带重叠区域以保持上下文连续性。
    
    Args:
        text: 输入文本
        chunk_size: 每块的字符数
        overlap: 相邻块之间的重叠字符数
    
    Returns:
        文本块列表
    """
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap  # 下一块起点 = 当前起点 + chunk_size - overlap
    return chunks


# ============================================================
# 3. 索引文档：将文档分块并存入向量数据库
# ============================================================
def index_documents(documents: list[dict[str, str]]) -> None:
    """
    将文档列表索引到向量数据库中。
    
    Args:
        documents: 文档列表，每个文档包含 "id", "title", "content" 字段
    """
    for doc in documents:
        chunks = chunk_text(doc["content"])
        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc['id']}_chunk_{i}"
            collection.add(
                ids=[chunk_id],
                documents=[chunk],
                metadatas=[{
                    "title": doc["title"],
                    "chunk_index": i,
                    "source": doc["id"]
                }]
            )
    print(f"已索引 {len(documents)} 篇文档，共 {collection.count()} 个文本块")


# ============================================================
# 4. 检索：根据查询返回最相关的文本块
# ============================================================
def retrieve(query: str, top_k: int = 3) -> list[str]:
    """
    检索与查询最相关的文本块。
    
    Args:
        query: 用户查询
        top_k: 返回的文本块数量
    
    Returns:
        相关文本块列表
    """
    results = collection.query(
        query_texts=[query],
        n_results=top_k
    )
    # results["documents"] 是一个嵌套列表: [[chunk1, chunk2, ...]]
    return results["documents"][0] if results["documents"] else []


# ============================================================
# 5. 增强生成：RAG 的完整问答流程
# ============================================================
SYSTEM_PROMPT = """你是一个知识助手。请严格根据以下参考资料回答用户问题。

规则：
1. 如果参考资料包含答案，请基于资料回答并引用来源
2. 如果参考资料不足以回答问题，请如实说"我目前的知识库中没有足够的信息来回答这个问题"
3. 不要编造参考资料中没有的信息

参考资料：
{context}"""


def ask(query: str, top_k: int = 3) -> str:
    """
    执行完整的 RAG 问答流程。
    
    Args:
        query: 用户问题
        top_k: 检索的文本块数量
    
    Returns:
        LLM 生成的回答
    """
    # Step 1: 检索
    retrieved_chunks = retrieve(query, top_k=top_k)
    
    if not retrieved_chunks:
        return "未找到相关参考资料，无法回答该问题。"
    
    # Step 2: 拼接上下文
    context = "\n\n---\n\n".join(
        f"[来源 {i+1}]\n{chunk}"
        for i, chunk in enumerate(retrieved_chunks)
    )
    
    # Step 3: 调用 LLM 生成回答
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT.format(context=context)},
            {"role": "user", "content": query}
        ],
        temperature=0.3,  # 低温度以减少幻觉
        max_tokens=1024
    )
    
    return response.choices[0].message.content


# ============================================================
# 6. 演示：索引一些文档并测试问答
# ============================================================
if __name__ == "__main__":
    # 准备示例文档
    documents = [
        {
            "id": "python_history",
            "title": "Python 语言简史",
            "content": """
Python 由 Guido van Rossum 于 1989 年圣诞节期间开始开发，1991 年发布第一个公开版本。
Python 的设计哲学强调代码的可读性，使用显著的空白缩进来划分代码块。
Python 2.0 于 2000 年发布，引入了垃圾回收和 Unicode 支持。
Python 3.0 于 2008 年发布，是一个不向后兼容的大版本更新。
Python 3.0 的主要变化包括 print 从语句变为函数、所有字符串默认使用 Unicode 等。
截至 2026 年，Python 3.14 是最新的稳定版本。
Python 被广泛应用于 Web 开发（Django、FastAPI）、数据科学（NumPy、Pandas）和 AI/机器学习（PyTorch、TensorFlow）等领域。
            """.strip()
        },
        {
            "id": "rag_overview",
            "title": "RAG 技术概述",
            "content": """
RAG（Retrieval-Augmented Generation）由 Meta AI（当时为 Facebook AI）在 2020 年首次提出。
RAG 结合了信息检索和文本生成两种技术，旨在解决大语言模型的两个核心问题：知识时效性和幻觉。
RAG 的典型架构包括两个阶段：索引阶段和查询阶段。
索引阶段：将知识库文档分块、Embedding 后存入向量数据库。
查询阶段：用户问题经 Embedding 后在向量数据库中检索，将检索结果与问题一起发送给 LLM 生成回答。
RAG 的优势在于：知识可实时更新（无需重新训练模型）、回答可溯源（有明确的引用来源）、成本相对较低。
常见的 RAG 优化技术包括：HyDE（假设文档嵌入）、Multi-Query Retrieval、Re-ranking、Self-RAG 等。
            """.strip()
        },
        {
            "id": "vector_db",
            "title": "向量数据库入门",
            "content": """
向量数据库是专门用于存储和检索向量（高维浮点数数组）的数据库系统。
与传统数据库不同，向量数据库的核心操作是近似最近邻搜索（ANN），即快速找到与查询向量最相似的 K 个向量。
常用的向量数据库包括：ChromaDB（轻量级，适合原型开发）、Pinecone（全托管云服务）、Weaviate（开源，支持混合搜索）、Milvus（高性能，适合大规模生产环境）、Qdrant（Rust 编写，性能优异）。
选择向量数据库时需要考虑的因素：数据规模、查询延迟要求、是否需要过滤搜索、运维成本等。
对于原型和小规模应用，ChromaDB 通常是最合适的选择；对于生产环境的大规模应用，Milvus 和 Pinecone 是更成熟的选择。
            """.strip()
        }
    ]
    
    # 索引文档
    index_documents(documents)
    
    # 测试问答
    test_questions = [
        "Python 是什么时候创建的？由谁创建的？",
        "RAG 技术能解决什么问题？",
        "有哪些常用的向量数据库？",
        "今天天气怎么样？"  # 知识库中没有的内容
    ]
    
    for q in test_questions:
        print(f"\n{'='*60}")
        print(f"Q: {q}")
        print(f"{'='*60}")
        answer = ask(q)
        print(f"A: {answer}")
```

### Interpreting the Results

After running the above code, you will see:

- For "When was Python created" — the system retrieves relevant content from the `python_history` document, and the LLM gives an accurate answer based on the reference material.
- For "What problems can RAG technology solve" — the system retrieves the `rag_overview` document, and the answer cites content from the knowledge base.
- For "How's the weather today" — there is no relevant information in the knowledge base, so the LLM, following the System Prompt's instructions, honestly states that it cannot answer.

This is the core value of RAG: **the model does not "fabricate" information, but answers based on reference material that actually exists.**
## Advanced Topics

The example above is a minimal version. In real production environments, RAG systems also need to consider the following optimizations:

### Chunking Strategy Optimization

Fixed-size chunking is simple, but it may cut sentences in half. Better approaches:

- **Recursive character splitting**: first split by `\n\n`, then by `\n`, and finally by periods (this is what LangChain's `RecursiveCharacterTextSplitter` does)
- **Semantic chunking**: use an Embedding model to detect semantic boundaries and split at semantic transitions
- **Document structure awareness**: for structured documents like Markdown and HTML, preserve heading hierarchy information

### Retrieval Quality Optimization

Basic keyword matching + vector retrieval is often not enough:

- **HyDE (Hypothetical Document Embeddings)**: first use an LLM to generate a "hypothetical answer," then use this hypothetical answer to retrieve—this can bridge the semantic gap between questions and answers
- **Multi-Query**: use an LLM to rewrite the user's question into multiple queries from different angles, retrieve separately, then merge and deduplicate
- **Re-ranking**: after coarse retrieval (such as top-20), use a stronger model to re-rank and keep only the top-3 to send to the LLM. Cohere's Rerank API is a common choice

### Hybrid Search

Pure vector search sometimes misses scenarios that require exact keyword matching. **Hybrid search** combines vector search (semantic matching) with BM25 (keyword matching), weighting the two to produce the final ranking.

## Conclusion

RAG is currently one of the most cost-effective technical patterns in AI application development. It does not require fine-tuning models or massive amounts of labeled data, yet it can significantly improve the quality of LLM responses in specific domains. From enterprise internal knowledge bases to customer service systems, from legal retrieval to medical-assisted diagnosis, the application scenarios for RAG are everywhere.

The complete code in this article can implement a usable RAG question-answering system in less than 100 lines, but RAG in production is a systems engineering effort—document processing pipelines, chunking strategies, retrieval tuning, and evaluation systems are all worth exploring in depth.

---

**References:**

1. Lewis, P., et al. "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks." *NeurIPS 2020*. https://arxiv.org/abs/2005.11401
2. ChromaDB Official Documentation. https://docs.trychroma.com/
3. LangChain RAG Tutorial. https://python.langchain.com/docs/tutorials/rag/
4. Gao, Y., et al. "Retrieval-Augmented Generation for Large Language Models: A Survey." *arXiv 2023*. https://arxiv.org/abs/2312.10997