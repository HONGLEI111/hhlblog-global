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
│  1. Document Processing  │ -> │  2. Vector Retrieval  │ -> │  3. Context Augmentation │ -> │  4. Generate Answer  │
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
You are a knowledge assistant. Please answer the user's question based on the following reference materials.
If you cannot find the answer in the reference materials, please state so honestly.

Reference materials:
{retrieved_chunks}

User question: {user_query}
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
# 1. Initialization
# ============================================================
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# Use OpenAI's Embedding function
embedding_fn = embedding_functions.OpenAIEmbeddingFunction(
    api_key=os.environ["OPENAI_API_KEY"],
    model_name="text-embedding-3-small"
)

# Create or connect to a ChromaDB collection
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(
    name="my_knowledge_base",
    embedding_function=embedding_fn
)


# ============================================================
# 2. Document chunking function
# ============================================================
def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
    """
    Simple fixed-size chunking with overlap to maintain context continuity.
    
    Args:
        text: Input text
        chunk_size: Number of characters per chunk
        overlap: Number of overlapping characters between adjacent chunks
    
    Returns:
        List of text chunks
    """
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap  # Next chunk start = current start + chunk_size - overlap
    return chunks


# ============================================================
# 3. Index documents: chunk documents and store them in the vector database
# ============================================================
def index_documents(documents: list[dict[str, str]]) -> None:
    """
    Index a list of documents into the vector database.
    
    Args:
        documents: List of documents, each containing "id", "title", "content" fields
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
    print(f"Indexed {len(documents)} documents, {collection.count()} text chunks in total")


# ============================================================
# 4. Retrieval: return the most relevant text chunks based on the query
# ============================================================
def retrieve(query: str, top_k: int = 3) -> list[str]:
    """
    Retrieve the text chunks most relevant to the query.
    
    Args:
        query: User query
        top_k: Number of text chunks to return
    
    Returns:
        List of relevant text chunks
    """
    results = collection.query(
        query_texts=[query],
        n_results=top_k
    )
    # results["documents"] is a nested list: [[chunk1, chunk2, ...]]
    return results["documents"][0] if results["documents"] else []


# ============================================================
# 5. Augmented generation: the complete RAG question-answering workflow
# ============================================================
SYSTEM_PROMPT = """You are a knowledge assistant. Please answer the user's question strictly based on the following reference materials.

Rules:
1. If the reference materials contain the answer, answer based on the materials and cite the source
2. If the reference materials are insufficient to answer the question, honestly say "My current knowledge base does not contain enough information to answer this question"
3. Do not fabricate information not present in the reference materials

Reference materials:
{context}"""


def ask(query: str, top_k: int = 3) -> str:
    """
    Execute the complete RAG question-answering pipeline.
    
    Args:
        query: User question
        top_k: Number of text chunks to retrieve
    
    Returns:
        LLM-generated answer
    """
    # Step 1: Retrieve
    retrieved_chunks = retrieve(query, top_k=top_k)
    
    if not retrieved_chunks:
        return "No relevant reference materials found; unable to answer this question."
    
    # Step 2: Concatenate context
    context = "\n\n---\n\n".join(
        f"[Source {i+1}]\n{chunk}"
        for i, chunk in enumerate(retrieved_chunks)
    )
    
    # Step 3: Call the LLM to generate an answer
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT.format(context=context)},
            {"role": "user", "content": query}
        ],
        temperature=0.3,  # Low temperature to reduce hallucinations
        max_tokens=1024
    )
    
    return response.choices[0].message.content


# ============================================================
# 6. Demo: index some documents and test question answering
# ============================================================
if __name__ == "__main__":
    # Prepare sample documents
    documents = [
        {
            "id": "python_history",
            "title": "A Brief History of the Python Language",
            "content": """
Python was started by Guido van Rossum during Christmas 1989, and the first public version was released in 1991.
Python's design philosophy emphasizes code readability, using significant whitespace indentation to delimit code blocks.
Python 2.0 was released in 2000, introducing garbage collection and Unicode support.
Python 3.0 was released in 2008 as a major backward-incompatible release.
Major changes in Python 3.0 include print changing from a statement to a function, and all strings using Unicode by default.
As of 2026, Python 3.14 is the latest stable version.
Python is widely used in web development (Django, FastAPI), data science (NumPy, Pandas), and AI/machine learning (PyTorch, TensorFlow), among other fields.
            """.strip()
        },
        {
            "id": "rag_overview",
            "title": "RAG Technology Overview",
            "content": """
RAG (Retrieval-Augmented Generation) was first proposed by Meta AI (then Facebook AI) in 2020.
RAG combines information retrieval and text generation technologies, aiming to solve two core problems of large language models: knowledge timeliness and hallucination.
A typical RAG architecture includes two stages: the indexing stage and the query stage.
Indexing stage: chunk knowledge base documents, embed them, and store them in a vector database.
Query stage: after the user's question is embedded, retrieve from the vector database, and send the retrieval results together with the question to the LLM to generate an answer.
The advantages of RAG are: knowledge can be updated in real time (no need to retrain the model), answers are traceable (with explicit citation sources), and costs are relatively low.
Common RAG optimization techniques include: HyDE (Hypothetical Document Embeddings), Multi-Query Retrieval, Re-ranking, Self-RAG, etc.
            """.strip()
        },
        {
            "id": "vector_db",
            "title": "Introduction to Vector Databases",
            "content": """
A vector database is a database system specifically designed for storing and retrieving vectors (high-dimensional floating-point arrays).
Unlike traditional databases, the core operation of a vector database is approximate nearest neighbor search (ANN), i.e., quickly finding the K vectors most similar to a query vector.
Commonly used vector databases include: ChromaDB (lightweight, suitable for prototyping), Pinecone (fully managed cloud service), Weaviate (open source, supports hybrid search), Milvus (high performance, suitable for large-scale production environments), Qdrant (written in Rust, excellent performance).
Factors to consider when choosing a vector database: data scale, query latency requirements, whether filtered search is needed, operational costs, etc.
For prototypes and small-scale applications, ChromaDB is usually the most suitable choice; for large-scale production applications, Milvus and Pinecone are more mature choices.
            """.strip()
        }
    ]
    
    # Index documents
    index_documents(documents)
    
    # Test question answering
    test_questions = [
        "When was Python created? By whom?",
        "What problems can RAG technology solve?",
        "What are some commonly used vector databases?",
        "What's the weather like today?"  # Content not in the knowledge base
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