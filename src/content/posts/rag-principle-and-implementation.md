---
title: RAG（检索增强生成）原理与实现：从零构建一个知识问答系统
published: 2026-08-07
description: '深入理解检索增强生成（RAG）的核心原理，并通过完整的代码示例从零构建一个基于向量检索的知识问答系统。'
image: ''
tags: [RAG, LLM, 向量数据库, Embedding, AI]
category: 'AI'
draft: false
lang: ''
---

## 什么是 RAG？

检索增强生成（Retrieval-Augmented Generation，RAG）是当前大语言模型（LLM）应用中最核心的技术模式之一。它的基本思想很简单：**在 LLM 生成回答之前，先从外部知识库中检索相关信息，将检索结果作为上下文注入提示词，让模型基于"参考资料"作答。**

为什么需要 RAG？LLM 有两个众所周知的局限：

1. **知识截止日期**：模型训练数据有截止时间，无法回答训练后发生的事件。
2. **幻觉问题**：模型有时会"编造"不存在的事实，尤其是在它不熟悉的领域。

RAG 优雅地解决了这两个问题——它让 LLM 不必记住所有知识，而是学会"查阅资料"后再回答。这就像开卷考试 vs 闭卷考试的区别。

## 核心架构

RAG 的工作流程可以分为四个步骤：

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  1. 文档处理  │ -> │  2. 向量检索  │ -> │  3. 上下文增强 │ -> │  4. 生成回答  │
│  (Chunking)  │    │  (Retrieval) │    │ (Augmentation)│    │ (Generation) │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

每一步都有其技术细节和设计权衡，下面逐一展开。

### 1. 文档处理与分块（Chunking）

文档需要被拆分成适当大小的"块"（chunk）。分块策略直接影响检索质量：

- **太小**（如 100 tokens）：丢失上下文，语义不完整
- **太大**（如 4000 tokens）：检索精度下降，噪声信息太多
- **推荐**：通常 500-1500 tokens 是一个较好的平衡点

更高级的做法包括**语义分块**（按段落/章节边界切割）和**递归分块**（先按大分隔符切，再按小分隔符切）。

### 2. 向量化与 Embedding

每个文本块需要通过 Embedding 模型转换为向量（一组浮点数）。语义相近的文本在向量空间中距离更近——这是向量检索的数学基础。

常用的 Embedding 模型：
- OpenAI：`text-embedding-3-small` / `text-embedding-3-large`
- 开源方案：`BGE`（BAAI）、`all-MiniLM-L6-v2`（Sentence-Transformers）

### 3. 向量检索

用户提问同样被 Embedding 为向量，然后在向量数据库中搜索最相似的文本块。相似度通常用**余弦相似度**或**欧氏距离**度量。

### 4. 增强生成

将检索到的相关文本块拼接在用户的原始提问之前，一起发送给 LLM。典型的 Prompt 模板：

```
你是一个知识助手。请根据以下参考资料回答用户问题。
如果你无法从参考资料中找到答案，请如实说明。

参考资料：
{retrieved_chunks}

用户问题：{user_query}
```

## 从零实现一个 Minimal RAG 系统

下面我们用 Python 实现一个最简 RAG 系统。我们使用：
- **ChromaDB** 作为向量数据库（轻量、本地运行）
- **OpenAI API** 提供 Embedding 和 Chat 能力

### 环境准备

```bash
pip install chromadb openai
```

### 完整代码

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

### 运行结果解读

运行上述代码后，你会看到：

- 对于"Python 是什么时候创建的"——系统从 `python_history` 文档中检索到相关内容，LLM 基于参考资料给出了准确答案。
- 对于"RAG 技术能解决什么问题"——系统检索到 `rag_overview` 文档，回答引用了知识库中的内容。
- 对于"今天天气怎么样"——知识库中没有相关信息，LLM 按照 System Prompt 的指示，诚实地表示无法回答。

这就是 RAG 的核心价值：**模型不会"编造"信息，而是基于实际存在的参考资料作答。**

## 进阶话题

上面的示例是一个最简版本。在实际生产环境中，RAG 系统还需要考虑以下优化：

### 分块策略优化

固定大小分块虽然简单，但可能切断句子。更好的做法：

- **递归字符分割**：先按 `\n\n` 切，再按 `\n` 切，最后按句号切（LangChain 的 `RecursiveCharacterTextSplitter` 就是这样做的）
- **语义分块**：使用 Embedding 模型检测语义边界，在语义转折处切割
- **文档结构感知**：对 Markdown、HTML 等结构化文档，保留标题层级信息

### 检索质量优化

基本的关键词匹配 + 向量检索往往不够：

- **HyDE（Hypothetical Document Embeddings）**：先用 LLM 生成一个"假设答案"，再用这个假设答案去检索——这能弥合问题和答案之间的语义鸿沟
- **Multi-Query**：用 LLM 将用户问题改写为多个不同角度的查询，分别检索后合并去重
- **Re-ranking**：粗检索（如 top-20）后用更强的模型重新排序，只保留 top-3 送入 LLM。Cohere 的 Rerank API 是常用选择

### 混合搜索

纯粹的向量搜索有时会遗漏关键词精确匹配的场景。**混合搜索**将向量搜索（语义匹配）与 BM25（关键词匹配）结合，两者加权后得到最终排序。

## 结语

RAG 是当前 AI 应用开发中性价比最高的技术模式之一。它不需要微调模型，不需要海量标注数据，却能显著提升 LLM 在特定领域的回答质量。从企业内部知识库到客服系统，从法律检索到医疗辅助诊断，RAG 的应用场景无处不在。

本文的完整代码可以在不到 100 行内实现一个可用的 RAG 问答系统，但生产环境中的 RAG 是一个系统工程——文档处理管线、分块策略、检索调优、评估体系，每一项都值得深入。

---

**参考来源：**

1. Lewis, P., et al. "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks." *NeurIPS 2020*. https://arxiv.org/abs/2005.11401
2. ChromaDB 官方文档. https://docs.trychroma.com/
3. LangChain RAG 教程. https://python.langchain.com/docs/tutorials/rag/
4. Gao, Y., et al. "Retrieval-Augmented Generation for Large Language Models: A Survey." *arXiv 2023*. https://arxiv.org/abs/2312.10997
