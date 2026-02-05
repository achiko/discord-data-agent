# Search Techniques and Methodologies: A Research Perspective

A comprehensive research document exploring the theoretical foundations, algorithms, and methodologies underlying modern text search systems, with specific application to the Discord Analyzer search implementation.

---

## Table of Contents

1. [Introduction to Information Retrieval](#1-introduction-to-information-retrieval)
2. [Lexical Search Methods](#2-lexical-search-methods)
   - 2.1 [Boolean Retrieval Model](#21-boolean-retrieval-model)
   - 2.2 [Vector Space Model (VSM)](#22-vector-space-model-vsm)
   - 2.3 [TF-IDF Weighting](#23-tf-idf-weighting)
   - 2.4 [BM25: The Probabilistic Approach](#24-bm25-the-probabilistic-approach)
   - 2.5 [PostgreSQL Full-Text Search Implementation](#25-postgresql-full-text-search-implementation)
3. [Neural and Semantic Search](#3-neural-and-semantic-search)
   - 3.1 [Word Embeddings: From Words to Vectors](#31-word-embeddings-from-words-to-vectors)
   - 3.2 [Transformer Architecture and Contextual Embeddings](#32-transformer-architecture-and-contextual-embeddings)
   - 3.3 [Sentence and Document Embeddings](#33-sentence-and-document-embeddings)
   - 3.4 [OpenAI Embedding Models](#34-openai-embedding-models)
   - 3.5 [Similarity Metrics in Vector Space](#35-similarity-metrics-in-vector-space)
4. [Approximate Nearest Neighbor Search](#4-approximate-nearest-neighbor-search)
   - 4.1 [The Curse of Dimensionality](#41-the-curse-of-dimensionality)
   - 4.2 [Inverted File Index (IVF)](#42-inverted-file-index-ivf)
   - 4.3 [Hierarchical Navigable Small World (HNSW)](#43-hierarchical-navigable-small-world-hnsw)
   - 4.4 [Product Quantization](#44-product-quantization)
   - 4.5 [pgvector Implementation Details](#45-pgvector-implementation-details)
5. [Hybrid Search Strategies](#5-hybrid-search-strategies)
   - 5.1 [The Vocabulary Mismatch Problem](#51-the-vocabulary-mismatch-problem)
   - 5.2 [Score Fusion Techniques](#52-score-fusion-techniques)
   - 5.3 [Reciprocal Rank Fusion (RRF)](#53-reciprocal-rank-fusion-rrf)
   - 5.4 [Learning to Rank](#54-learning-to-rank)
6. [Text Preprocessing and Chunking](#6-text-preprocessing-and-chunking)
   - 6.1 [Tokenization Strategies](#61-tokenization-strategies)
   - 6.2 [Stemming and Lemmatization](#62-stemming-and-lemmatization)
   - 6.3 [Document Chunking for Embeddings](#63-document-chunking-for-embeddings)
7. [Evaluation Metrics](#7-evaluation-metrics)
   - 7.1 [Precision and Recall](#71-precision-and-recall)
   - 7.2 [Mean Average Precision (MAP)](#72-mean-average-precision-map)
   - 7.3 [Normalized Discounted Cumulative Gain (NDCG)](#73-normalized-discounted-cumulative-gain-ndcg)
   - 7.4 [Mean Reciprocal Rank (MRR)](#74-mean-reciprocal-rank-mrr)
8. [Advanced Topics](#8-advanced-topics)
   - 8.1 [Query Expansion](#81-query-expansion)
   - 8.2 [Re-ranking with Cross-Encoders](#82-re-ranking-with-cross-encoders)
   - 8.3 [Retrieval-Augmented Generation (RAG)](#83-retrieval-augmented-generation-rag)
9. [References](#9-references)

---

## 1. Introduction to Information Retrieval

Information Retrieval (IR) is the science of searching for information in documents, searching for documents themselves, and searching for metadata that describes data. The field has evolved significantly from early Boolean systems to modern neural approaches.

### Historical Context

The foundations of modern IR were laid by Gerard Salton at Cornell University in the 1960s-1970s with the SMART system [1]. Key developments include:

| Era | Development | Key Innovation |
|-----|-------------|----------------|
| 1960s | Boolean retrieval | Exact matching with AND/OR/NOT |
| 1970s | Vector Space Model | Documents as vectors, similarity scoring |
| 1990s | BM25/Okapi | Probabilistic ranking with term saturation |
| 2000s | PageRank, Link Analysis | Web-scale retrieval |
| 2010s | Word2Vec, neural embeddings | Semantic similarity |
| 2020s | Transformer models | Contextual understanding |

### The Retrieval Problem

Formally, given:
- A collection of documents **D** = {d₁, d₂, ..., dₙ}
- A query **q**
- A relevance function **R(q, d)** → [0, 1]

The retrieval task is to return an ordered list of documents ranked by decreasing relevance to the query.

### Relevance: The Core Challenge

Relevance is inherently subjective and multidimensional:

1. **Topical relevance**: Does the document address the query topic?
2. **User relevance**: Does it satisfy the user's actual information need?
3. **Situational relevance**: Is it appropriate for the user's context?

> "Relevance is a property that exists between a document and a person's perception of his own information need." — Saracevic (1975) [2]

---

## 2. Lexical Search Methods

Lexical (or sparse) search methods operate on the principle of exact or near-exact term matching between queries and documents.

### 2.1 Boolean Retrieval Model

The Boolean model is the simplest retrieval model, treating documents as sets of terms.

**Formal Definition:**
- Document representation: d = {t₁, t₂, ..., tₘ}
- Query: Boolean expression over terms (e.g., `python AND (tutorial OR guide)`)
- Retrieval: Documents satisfying the Boolean expression

**Limitations:**
- No ranking (documents either match or don't)
- All terms weighted equally
- Difficult for users to formulate effective queries

**Implementation in PostgreSQL:**
```sql
-- Boolean AND
SELECT * FROM documents
WHERE to_tsvector('english', content) @@
      to_tsquery('english', 'python & tutorial');

-- Boolean OR
SELECT * FROM documents
WHERE to_tsvector('english', content) @@
      to_tsquery('english', 'python | guide');
```

### 2.2 Vector Space Model (VSM)

Introduced by Salton et al. [1], VSM represents both documents and queries as vectors in a high-dimensional term space.

**Mathematical Foundation:**

Let V = {t₁, t₂, ..., tₙ} be the vocabulary of all unique terms.

Document vector: **d** = (w₁, w₂, ..., wₙ) where wᵢ is the weight of term tᵢ in document d.

Query vector: **q** = (w₁, w₂, ..., wₙ)

**Similarity Measure (Cosine Similarity):**

$$\text{sim}(\mathbf{q}, \mathbf{d}) = \frac{\mathbf{q} \cdot \mathbf{d}}{||\mathbf{q}|| \times ||\mathbf{d}||} = \frac{\sum_{i=1}^{n} q_i \times d_i}{\sqrt{\sum_{i=1}^{n} q_i^2} \times \sqrt{\sum_{i=1}^{n} d_i^2}}$$

**Properties:**
- Range: [-1, 1] for general vectors, [0, 1] for non-negative weights
- Length-normalized: Longer documents don't automatically score higher
- Efficient computation with inverted indexes

### 2.3 TF-IDF Weighting

Term Frequency-Inverse Document Frequency (TF-IDF) is a statistical measure of term importance.

**Term Frequency (TF):**
Various formulations exist:

| Variant | Formula | Description |
|---------|---------|-------------|
| Raw | f(t,d) | Count of term t in document d |
| Boolean | 1 if t ∈ d, else 0 | Binary presence |
| Log-normalized | 1 + log(f(t,d)) | Sublinear scaling |
| Augmented | 0.5 + 0.5 × f(t,d)/max(f(t',d)) | Prevents bias toward long docs |

**Inverse Document Frequency (IDF):**

$$\text{IDF}(t) = \log\frac{N}{n_t}$$

Where:
- N = total number of documents
- nₜ = number of documents containing term t

**Intuition:** Terms appearing in many documents (e.g., "the", "is") have low IDF; rare terms have high IDF.

**Combined TF-IDF:**

$$\text{TF-IDF}(t, d) = \text{TF}(t, d) \times \text{IDF}(t)$$

**Variants:**
- **TF-IDF with sublinear TF**: (1 + log(tf)) × log(N/df)
- **BM25**: Probabilistic extension (see below)

### 2.4 BM25: The Probabilistic Approach

BM25 (Best Match 25) is the culmination of the Okapi weighting scheme developed at City University London [3]. It remains one of the most effective lexical ranking functions.

**Full BM25 Formula:**

$$\text{BM25}(q, d) = \sum_{t \in q} \text{IDF}(t) \times \frac{f(t, d) \times (k_1 + 1)}{f(t, d) + k_1 \times (1 - b + b \times \frac{|d|}{avgdl})}$$

Where:
- f(t, d) = frequency of term t in document d
- |d| = length of document d (in terms)
- avgdl = average document length in the collection
- k₁ = term frequency saturation parameter (typically 1.2-2.0)
- b = length normalization parameter (typically 0.75)

**Key Innovations:**

1. **Term Frequency Saturation:**
   - As tf increases, the score contribution plateaus
   - Prevents "term stuffing" from artificially boosting scores
   - Controlled by k₁ parameter

2. **Document Length Normalization:**
   - Longer documents normalized against average length
   - Controlled by b parameter (0 = no normalization, 1 = full)

3. **IDF Formulation:**

   $$\text{IDF}(t) = \log\frac{N - n_t + 0.5}{n_t + 0.5}$$

**Parameter Tuning Guidelines:**

| Parameter | Range | Effect |
|-----------|-------|--------|
| k₁ = 0 | - | Binary model (term presence only) |
| k₁ → ∞ | - | Raw term frequency |
| k₁ ≈ 1.2-2.0 | Typical | Balanced saturation |
| b = 0 | - | No length normalization |
| b = 1 | - | Full length normalization |
| b ≈ 0.75 | Typical | Standard normalization |

**BM25 Variants:**
- **BM25+**: Addresses lower-bounding issue for long documents [4]
- **BM25L**: Modified length normalization
- **BM25F**: Field-weighted variant for structured documents

### 2.5 PostgreSQL Full-Text Search Implementation

PostgreSQL implements a ranking function similar to BM25 through `ts_rank()`.

**Text Search Vector (tsvector):**
```sql
SELECT to_tsvector('english', 'The quick brown fox jumps over the lazy dog');
-- Result: 'brown':3 'dog':9 'fox':4 'jump':5 'lazi':8 'quick':2
```

Process:
1. Tokenization (split into words)
2. Normalization (lowercase)
3. Stop word removal ("the", "over")
4. Stemming ("jumps" → "jump", "lazy" → "lazi")
5. Position recording

**Text Search Query (tsquery):**
```sql
SELECT plainto_tsquery('english', 'jumping dogs');
-- Result: 'jump' & 'dog'
```

**Ranking Function ts_rank():**

```sql
ts_rank([ weights, ] vector, query [, normalization ])
```

**Normalization Options:**

| Value | Description |
|-------|-------------|
| 0 | Default (no normalization) |
| 1 | Divides by 1 + log(document length) |
| 2 | Divides by document length |
| 4 | Divides by mean harmonic distance between extents |
| 8 | Divides by unique word count |
| 16 | Divides by 1 + log(unique word count) |
| 32 | Divides by itself + 1 |

**Our Implementation (Normalization Mode 1):**

```sql
ts_rank(to_tsvector('english', content), plainto_tsquery('english', query), 1)
```

This provides BM25-like length normalization by dividing by `1 + log(document_length)`.

**GIN Index Structure:**

The Generalized Inverted Index (GIN) stores a mapping from lexemes to document positions:

```
lexeme → [(doc_id₁, [pos₁, pos₂, ...]), (doc_id₂, [pos₁, ...]), ...]
```

**Index Creation:**
```sql
CREATE INDEX idx_content_search
ON messages USING gin(to_tsvector('english', content));
```

**Query Execution:**
1. Parse query to tsquery
2. Look up each lexeme in GIN index
3. Intersect/union posting lists based on Boolean operators
4. Calculate rank for matching documents
5. Sort and return

---

## 3. Neural and Semantic Search

Neural search methods use machine learning to capture semantic meaning beyond lexical matching.

### 3.1 Word Embeddings: From Words to Vectors

Word embeddings map discrete words to continuous vector spaces where semantic relationships are preserved.

**Word2Vec (Mikolov et al., 2013) [5]:**

Two architectures:

1. **Continuous Bag of Words (CBOW):**
   - Predicts target word from context
   - Input: Context words (window around target)
   - Output: Probability distribution over vocabulary

2. **Skip-gram:**
   - Predicts context from target word
   - Better for rare words and smaller datasets

**Training Objective (Skip-gram with Negative Sampling):**

$$J = \log \sigma(v'_{w_o} \cdot v_{w_i}) + \sum_{j=1}^{k} \mathbb{E}_{w_j \sim P_n(w)} [\log \sigma(-v'_{w_j} \cdot v_{w_i})]$$

Where:
- vᵢ = embedding of input word
- v'ₒ = embedding of output word
- σ = sigmoid function
- k = number of negative samples

**Semantic Properties:**

The famous analogy: **king - man + woman ≈ queen**

```
vec("king") - vec("man") + vec("woman") ≈ vec("queen")
```

This demonstrates that word embeddings capture relational semantics.

**Limitations:**
- Static embeddings (one vector per word regardless of context)
- Polysemy not handled ("bank" = financial institution or river bank)
- Out-of-vocabulary words problematic

**GloVe (Pennington et al., 2014) [6]:**

Global Vectors for Word Representation combines:
- Local context (like Word2Vec)
- Global co-occurrence statistics

$$J = \sum_{i,j=1}^{V} f(X_{ij})(w_i^T \tilde{w}_j + b_i + \tilde{b}_j - \log X_{ij})^2$$

Where Xᵢⱼ is the co-occurrence count of words i and j.

### 3.2 Transformer Architecture and Contextual Embeddings

The Transformer architecture (Vaswani et al., 2017) [7] revolutionized NLP by enabling contextual word representations.

**Self-Attention Mechanism:**

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

Where:
- Q = Query matrix
- K = Key matrix
- V = Value matrix
- dₖ = dimension of keys (scaling factor)

**Multi-Head Attention:**

$$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, ..., \text{head}_h)W^O$$

Where each head is:
$$\text{head}_i = \text{Attention}(QW_i^Q, KW_i^K, VW_i^V)$$

**BERT (Devlin et al., 2019) [8]:**

Bidirectional Encoder Representations from Transformers:

- Pre-trained on Masked Language Model (MLM) and Next Sentence Prediction (NSP)
- Contextual embeddings: Same word gets different vectors in different contexts
- "Bank account" vs "river bank" → different embeddings for "bank"

**Architecture:**
- BERT-base: 12 layers, 768 hidden, 12 heads, 110M parameters
- BERT-large: 24 layers, 1024 hidden, 16 heads, 340M parameters

### 3.3 Sentence and Document Embeddings

Moving from word-level to sentence/document-level representations.

**Naive Approaches:**
1. **Average pooling**: Mean of word embeddings
2. **Max pooling**: Element-wise maximum
3. **[CLS] token**: Use BERT's classification token

**Sentence-BERT (Reimers & Gurevych, 2019) [9]:**

Siamese network architecture for efficient sentence similarity:

```
                ┌──────────────────┐
    Sentence A  │      BERT        │  →  Embedding A
                └──────────────────┘
                         ↓
                   Pooling Layer
                         ↓
                ┌──────────────────┐
    Sentence B  │      BERT        │  →  Embedding B
                └──────────────────┘
                         ↓
                   Pooling Layer
                         ↓
              Cosine Similarity(A, B)
```

**Training:**
- Siamese/triplet networks
- Contrastive learning objectives
- Fine-tuned on NLI (Natural Language Inference) datasets

**Dense Passage Retrieval (Karpukhin et al., 2020) [10]:**

Separate encoders for queries and passages:

$$\text{sim}(q, p) = E_Q(q)^T E_P(p)$$

Where:
- E_Q = Query encoder
- E_P = Passage encoder

Training uses in-batch negatives for efficiency.

### 3.4 OpenAI Embedding Models

**Model Evolution:**

| Model | Dimensions | Context | Notes |
|-------|------------|---------|-------|
| text-embedding-ada-002 | 1536 | 8191 tokens | Previous generation |
| text-embedding-3-small | 1536 | 8191 tokens | Current, cost-effective |
| text-embedding-3-large | 3072 | 8191 tokens | Highest quality |

**text-embedding-3-small (Used in Discord Analyzer):**

Key characteristics:
- **Dimensions**: 1536 (configurable via `dimensions` parameter)
- **Max input**: 8191 tokens
- **Normalization**: L2-normalized (unit vectors)
- **Training**: Contrastive learning on large text corpora

**Matryoshka Representation Learning [11]:**

The v3 models support variable dimensions through Matryoshka embeddings:

```python
# Full 1536 dimensions
embedding = openai.embeddings.create(
    model="text-embedding-3-small",
    input="text",
    dimensions=1536
)

# Reduced to 512 dimensions (still effective)
embedding = openai.embeddings.create(
    model="text-embedding-3-small",
    input="text",
    dimensions=512
)
```

Lower dimensions trade accuracy for:
- Reduced storage
- Faster similarity computation
- Lower memory usage

### 3.5 Similarity Metrics in Vector Space

**Cosine Similarity:**

$$\cos(\mathbf{a}, \mathbf{b}) = \frac{\mathbf{a} \cdot \mathbf{b}}{||\mathbf{a}|| \times ||\mathbf{b}||}$$

- Range: [-1, 1]
- Invariant to vector magnitude
- Measures angular distance

**Cosine Distance:**

$$d_{cos}(\mathbf{a}, \mathbf{b}) = 1 - \cos(\mathbf{a}, \mathbf{b})$$

- Range: [0, 2]
- Used in pgvector: `embedding <=> query_embedding`

**Euclidean Distance (L2):**

$$d_{L2}(\mathbf{a}, \mathbf{b}) = \sqrt{\sum_{i=1}^{n}(a_i - b_i)^2}$$

- Range: [0, ∞)
- Sensitive to magnitude
- For normalized vectors: L2² = 2 × (1 - cos_sim)

**Inner Product (Dot Product):**

$$\mathbf{a} \cdot \mathbf{b} = \sum_{i=1}^{n} a_i \times b_i$$

- Range: (-∞, ∞)
- For normalized vectors: equivalent to cosine similarity
- pgvector operator: `embedding <#> query_embedding`

**Choosing a Metric:**

| Metric | When to Use |
|--------|-------------|
| Cosine | Normalized embeddings, semantic similarity |
| L2 | Non-normalized vectors, geometric distance |
| Inner Product | Maximum inner product search (MIPS) |

**OpenAI embeddings are L2-normalized**, so cosine similarity equals inner product.

---

## 4. Approximate Nearest Neighbor Search

Exact nearest neighbor search is O(n×d) for n vectors of dimension d, which is prohibitive for large collections.

### 4.1 The Curse of Dimensionality

As dimensionality increases:
1. **Distance concentration**: All distances become similar
2. **Volume explosion**: Data becomes sparse
3. **Computational cost**: Linear search becomes infeasible

**Empirical observation**: For uniformly distributed points in high dimensions, the ratio of nearest to farthest neighbor distances approaches 1.

### 4.2 Inverted File Index (IVF)

IVF partitions the vector space into Voronoi cells using k-means clustering.

**Index Construction:**

1. Sample vectors from dataset
2. Run k-means to find k centroids
3. Assign each vector to nearest centroid
4. Store inverted lists: centroid → [vectors in cell]

**Query Process:**

1. Find nprobe nearest centroids to query
2. Search only vectors in those cells
3. Return top-k from searched vectors

**Parameters:**

| Parameter | Effect |
|-----------|--------|
| nlist | Number of clusters (more = finer partitions) |
| nprobe | Clusters searched at query time (more = higher recall, slower) |

**Trade-offs:**

```
Recall ↑  ←→  Speed ↓
       nprobe
```

Typical settings:
- nlist = √n to 4√n where n is dataset size
- nprobe = 1-10% of nlist for good recall/speed balance

### 4.3 Hierarchical Navigable Small World (HNSW)

HNSW (Malkov & Yashunin, 2018) [12] builds a multi-layer graph where:
- Bottom layer: All vectors
- Higher layers: Increasingly sparse subsets
- Edges: Connect nearby vectors

**Structure:**

```
Layer 2:  ○───────────────○
          │               │
Layer 1:  ○───○───○───────○───○
          │   │   │       │   │
Layer 0:  ○─○─○─○─○─○─○─○─○─○─○─○─○
```

**Search Algorithm:**

1. Start at entry point in top layer
2. Greedily move to nearest neighbor
3. When no progress, descend to next layer
4. Repeat until reaching bottom layer
5. Return k nearest neighbors found

**Parameters:**

| Parameter | Description | Typical Value |
|-----------|-------------|---------------|
| M | Max edges per node | 16-64 |
| efConstruction | Search width during construction | 100-500 |
| efSearch | Search width during query | 50-200 |

**Advantages over IVF:**
- No training phase required
- Better recall at same speed
- Handles updates better

**Disadvantages:**
- Higher memory usage (graph structure)
- Slower index construction

### 4.4 Product Quantization

Product Quantization (PQ) compresses vectors for memory-efficient ANN search.

**Concept:**

1. Split d-dimensional vector into m subvectors
2. Quantize each subvector to nearest centroid (k options)
3. Store m indices instead of d floats

**Compression:**

Original: d × 4 bytes (float32)
Compressed: m × log₂(k) bits

Example: 1536-dim vector
- Original: 6144 bytes
- PQ (m=96, k=256): 96 bytes (64× compression)

**Distance Computation:**

Precompute distance tables:
- For each subvector position
- Distance from query subvector to all k centroids
- Lookup and sum during search

### 4.5 pgvector Implementation Details

pgvector is a PostgreSQL extension for vector similarity search [13].

**Supported Index Types:**

1. **IVFFLAT:**
   ```sql
   CREATE INDEX ON items USING ivfflat (embedding vector_cosine_ops)
   WITH (lists = 100);
   ```

2. **HNSW:**
   ```sql
   CREATE INDEX ON items USING hnsw (embedding vector_cosine_ops)
   WITH (m = 16, ef_construction = 64);
   ```

**Operator Classes:**

| Operator Class | Distance Metric | Operator |
|----------------|-----------------|----------|
| vector_l2_ops | Euclidean | `<->` |
| vector_ip_ops | Inner product | `<#>` |
| vector_cosine_ops | Cosine | `<=>` |

**IVFFLAT in pgvector:**

Our implementation:
```sql
CREATE INDEX message_embeddings_embedding_idx
ON message_embeddings
USING ivfflat(embedding vector_cosine_ops);
```

Default parameters:
- lists = number of vectors / 1000 (min 1)
- probes = 1 (configurable at query time)

**Setting probes:**
```sql
SET ivfflat.probes = 10;  -- Search 10 lists
```

**HNSW in pgvector (v0.5.0+):**

```sql
CREATE INDEX ON message_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Query time parameter
SET hnsw.ef_search = 100;
```

**Choosing Between IVF and HNSW:**

| Factor | IVFFLAT | HNSW |
|--------|---------|------|
| Build time | Faster | Slower |
| Memory | Lower | Higher |
| Recall at same speed | Lower | Higher |
| Handles updates | Poor (rebuild needed) | Good |

---

## 5. Hybrid Search Strategies

Hybrid search combines lexical and semantic methods to leverage their complementary strengths.

### 5.1 The Vocabulary Mismatch Problem

**Lexical search failures:**
- Query: "automobile" → Document: "car" (synonyms)
- Query: "ML" → Document: "machine learning" (abbreviations)
- Query: "how to fix errors" → Document: "debugging techniques" (paraphrase)

**Semantic search failures:**
- Rare terms or entities not in training data
- Precise keyword queries ("error code 0x80070005")
- Boolean constraints

**Complementary Strengths:**

| Scenario | Lexical | Semantic |
|----------|---------|----------|
| Exact term matching | ✓ | ✗ |
| Synonyms | ✗ | ✓ |
| Rare terms | ✓ | ✗ |
| Conceptual queries | ✗ | ✓ |
| Typos | ✗ | Sometimes |

### 5.2 Score Fusion Techniques

**Linear Combination:**

$$\text{score}_{hybrid} = \alpha \times \text{score}_{lexical} + (1-\alpha) \times \text{score}_{semantic}$$

Requires score normalization to comparable ranges.

**Normalization Methods:**

1. **Min-Max Normalization:**
   $$\text{score}_{norm} = \frac{\text{score} - \text{min}}{\text{max} - \text{min}}$$

2. **Z-Score Normalization:**
   $$\text{score}_{norm} = \frac{\text{score} - \mu}{\sigma}$$

3. **Max Normalization (Our Approach):**
   $$\text{score}_{norm} = \frac{\text{score}}{\text{max}}$$

**Our Implementation:**

```typescript
// Keyword scores normalized by max
const maxRank = Math.max(...results.map(r => r.rank || 0));
const normalizedScore = maxRank > 0 ? (rank || 0) / maxRank : 0;

// Semantic scores already in [0, 1] via 1 - cosine_distance

// Merge: sort all by score, deduplicate
const all = [...keywordResults, ...semanticResults]
    .sort((a, b) => b.score - a.score);
```

### 5.3 Reciprocal Rank Fusion (RRF)

RRF (Cormack et al., 2009) [14] combines rankings without requiring score normalization.

**Formula:**

$$\text{RRF}(d) = \sum_{r \in R} \frac{1}{k + r(d)}$$

Where:
- R = set of rankings
- r(d) = rank of document d in ranking r
- k = constant (typically 60)

**Properties:**
- Score-agnostic (uses ranks only)
- Robust to different scoring scales
- Simple and effective

**Implementation:**

```typescript
function rrf(rankings: SearchResult[][], k: number = 60): SearchResult[] {
    const scores = new Map<string, number>();

    for (const ranking of rankings) {
        for (let i = 0; i < ranking.length; i++) {
            const doc = ranking[i];
            const current = scores.get(doc.messageId) || 0;
            scores.set(doc.messageId, current + 1 / (k + i + 1));
        }
    }

    return Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([id, score]) => ({ messageId: id, score }));
}
```

### 5.4 Learning to Rank

Learning to Rank (LTR) uses machine learning to optimize ranking functions.

**Approaches:**

1. **Pointwise**: Predict relevance score for each document
2. **Pairwise**: Predict which of two documents is more relevant
3. **Listwise**: Directly optimize ranking metrics (NDCG, MAP)

**Features for LTR:**
- BM25 score
- Semantic similarity
- Document length
- Query-document overlap
- Term frequency statistics
- Click-through data

**Popular Algorithms:**
- **LambdaMART**: Gradient boosted trees optimizing NDCG
- **RankNet**: Neural network with pairwise loss
- **ListNet**: Listwise neural approach

---

## 6. Text Preprocessing and Chunking

Effective preprocessing is crucial for both lexical and semantic search.

### 6.1 Tokenization Strategies

**Word Tokenization:**
- Split on whitespace and punctuation
- Handle contractions ("don't" → "do", "n't")
- Language-specific rules

**Subword Tokenization (for neural models):**

1. **Byte-Pair Encoding (BPE):**
   - Start with character vocabulary
   - Iteratively merge most frequent pairs
   - Results in variable-length subword units

2. **WordPiece (BERT):**
   - Similar to BPE
   - Maximizes likelihood instead of frequency
   - Uses ## prefix for continuation tokens

3. **SentencePiece:**
   - Language-agnostic
   - Treats input as raw characters
   - Used by many multilingual models

**Example (WordPiece):**
```
"embedding" → ["em", "##bed", "##ding"]
"unhappiness" → ["un", "##happy", "##ness"]
```

### 6.2 Stemming and Lemmatization

**Stemming:**
- Rule-based suffix stripping
- Fast but crude
- May produce non-words

**Porter Stemmer Examples:**
```
running → run
happily → happili  (non-word)
studies → studi
```

**Lemmatization:**
- Dictionary-based normalization
- Returns actual words
- Requires POS tagging for accuracy

**Lemmatization Examples:**
```
running → run
better → good
studies → study
```

**PostgreSQL uses dictionary-based stemming** with the Snowball algorithm for the English configuration.

### 6.3 Document Chunking for Embeddings

Long documents must be split for embedding models with token limits.

**Chunking Strategies:**

1. **Fixed-size chunking:**
   ```typescript
   function fixedChunk(text: string, size: number): string[] {
       const chunks = [];
       for (let i = 0; i < text.length; i += size) {
           chunks.push(text.slice(i, i + size));
       }
       return chunks;
   }
   ```
   - Simple but may split mid-sentence

2. **Sentence-aware chunking (Our Approach):**
   ```typescript
   function chunkText(text: string, maxTokens: number = 512): string[] {
       const maxChars = maxTokens * 4;  // Approximate

       if (text.length <= maxChars) return [text];

       const chunks = [];
       let start = 0;

       while (start < text.length) {
           let end = start + maxChars;

           if (end < text.length) {
               // Find sentence boundary
               const lastPeriod = text.lastIndexOf('.', end);
               const lastNewline = text.lastIndexOf('\n', end);
               const breakPoint = Math.max(lastPeriod, lastNewline);

               if (breakPoint > start + maxChars / 2) {
                   end = breakPoint + 1;
               }
           }

           chunks.push(text.slice(start, end).trim());
           start = end;
       }

       return chunks;
   }
   ```

3. **Semantic chunking:**
   - Use topic modeling or embeddings
   - Split at semantic boundaries
   - More complex but better coherence

**Chunking Parameters:**

| Parameter | Trade-off |
|-----------|-----------|
| Smaller chunks | More precise retrieval, more storage |
| Larger chunks | More context, potential dilution |
| Overlap | Better boundary handling, more redundancy |

**Recommended chunk sizes:**
- Q&A systems: 256-512 tokens
- Document retrieval: 512-1024 tokens
- Summarization: Larger chunks or full documents

---

## 7. Evaluation Metrics

Proper evaluation is essential for comparing and improving search systems.

### 7.1 Precision and Recall

**Precision at k (P@k):**

$$P@k = \frac{\text{relevant documents in top k}}{k}$$

**Recall at k (R@k):**

$$R@k = \frac{\text{relevant documents in top k}}{\text{total relevant documents}}$$

**F1 Score:**

$$F_1 = 2 \times \frac{P \times R}{P + R}$$

**Example:**

Query returns 10 documents, 6 are relevant, total relevant = 15

- P@10 = 6/10 = 0.6
- R@10 = 6/15 = 0.4
- F1 = 2 × (0.6 × 0.4)/(0.6 + 0.4) = 0.48

### 7.2 Mean Average Precision (MAP)

Average Precision considers precision at each relevant document:

$$AP = \frac{1}{|R|} \sum_{k=1}^{n} P@k \times rel(k)$$

Where rel(k) = 1 if document at position k is relevant.

**Example:**

Ranking: [R, N, R, R, N, R] (R=relevant, N=not relevant)

- P@1 × rel(1) = 1/1 × 1 = 1.0
- P@2 × rel(2) = 1/2 × 0 = 0
- P@3 × rel(3) = 2/3 × 1 = 0.67
- P@4 × rel(4) = 3/4 × 1 = 0.75
- P@5 × rel(5) = 3/5 × 0 = 0
- P@6 × rel(6) = 4/6 × 1 = 0.67

AP = (1.0 + 0.67 + 0.75 + 0.67) / 4 = 0.77

**MAP** averages AP across all queries.

### 7.3 Normalized Discounted Cumulative Gain (NDCG)

NDCG handles graded relevance (not just binary).

**Discounted Cumulative Gain:**

$$DCG@k = \sum_{i=1}^{k} \frac{2^{rel_i} - 1}{\log_2(i + 1)}$$

**Ideal DCG (IDCG):** DCG with perfect ranking

**NDCG:**

$$NDCG@k = \frac{DCG@k}{IDCG@k}$$

**Example:**

Relevance grades: 3 (highly relevant), 2 (relevant), 1 (somewhat), 0 (not)

Ranking: [3, 2, 3, 0, 1]

DCG@5 = (2³-1)/log₂(2) + (2²-1)/log₂(3) + (2³-1)/log₂(4) + 0 + (2¹-1)/log₂(6)
      = 7/1 + 3/1.58 + 7/2 + 0 + 1/2.58
      = 7 + 1.89 + 3.5 + 0 + 0.39 = 12.

Ideal: [3, 3, 2, 1, 0]
IDCG@5 = 7 + 7/1.58 + 3/2 + 1/2 + 0 = 7 + 4.43 + 1.5 + 0.5 = 13.43

NDCG@5 = 12.78 / 13.43 = 0.95

### 7.4 Mean Reciprocal Rank (MRR)

MRR measures how early the first relevant result appears.

$$MRR = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{rank_i}$$

Where rank_i is the position of the first relevant document for query i.

**Example:**

Three queries with first relevant at positions 1, 3, 2:

MRR = (1/1 + 1/3 + 1/2) / 3 = (1 + 0.33 + 0.5) / 3 = 0.61

**Use case:** Navigational queries where users want one specific answer.

---

## 8. Advanced Topics

### 8.1 Query Expansion

Query expansion adds terms to improve recall.

**Techniques:**

1. **Synonym expansion:**
   - Thesaurus-based (WordNet)
   - "car" → "car OR automobile OR vehicle"

2. **Pseudo-relevance feedback (PRF):**
   - Assume top-k results are relevant
   - Extract frequent terms from top-k
   - Add to query and re-search

3. **Neural query expansion:**
   - Use language models to generate related terms
   - "python web framework" → "flask django fastapi"

**Rocchio Algorithm (for PRF):**

$$\vec{q}_{new} = \alpha \vec{q} + \frac{\beta}{|D_r|}\sum_{d \in D_r} \vec{d} - \frac{\gamma}{|D_{nr}|}\sum_{d \in D_{nr}} \vec{d}$$

Where:
- Dᵣ = relevant documents
- Dₙᵣ = non-relevant documents
- α, β, γ = weighting parameters

### 8.2 Re-ranking with Cross-Encoders

Cross-encoders process query and document together for more accurate scoring.

**Bi-encoder (Retrieval):**
```
Query  → Encoder → Query Embedding  ─┐
                                     ├→ Similarity
Document → Encoder → Doc Embedding ──┘
```
- Fast: Embeddings computed independently
- Used for initial retrieval

**Cross-encoder (Re-ranking):**
```
[CLS] Query [SEP] Document [SEP] → Encoder → Relevance Score
```
- Slow: Must process each query-document pair
- More accurate: Full attention between query and document
- Used to re-rank top-k from bi-encoder

**Typical Pipeline:**

1. **Retrieval stage**: Bi-encoder retrieves top-100
2. **Re-ranking stage**: Cross-encoder re-ranks to top-10

**Popular Cross-encoders:**
- ms-marco-MiniLM-L-6-v2
- cross-encoder/ms-marco-electra-base

### 8.3 Retrieval-Augmented Generation (RAG)

RAG combines retrieval with language model generation [15].

**Architecture:**

```
Query → Retriever → Relevant Documents → LLM → Response
                         ↓
              "Context: [doc1] [doc2] [doc3]
               Question: {query}
               Answer:"
```

**Benefits:**
- Grounds LLM responses in factual documents
- Reduces hallucination
- Enables knowledge updates without retraining

**RAG Components:**

1. **Retriever**: Vector search (semantic) or hybrid
2. **Generator**: Large language model (GPT-4, Claude, etc.)
3. **Prompt engineering**: Combining retrieved context with query

**Advanced RAG Patterns:**

1. **Iterative RAG**: Multiple retrieval rounds
2. **Self-RAG**: Model decides when to retrieve
3. **Corrective RAG**: Verify and correct retrieved documents

---

## 9. References

### Academic Papers

[1] Salton, G., Wong, A., & Yang, C. S. (1975). "A vector space model for automatic indexing." *Communications of the ACM*, 18(11), 613-620. https://doi.org/10.1145/361219.361220

[2] Saracevic, T. (1975). "Relevance: A review of and a framework for the thinking on the notion in information science." *Journal of the American Society for Information Science*, 26(6), 321-343.

[3] Robertson, S. E., Walker, S., Jones, S., Hancock-Beaulieu, M. M., & Gatford, M. (1995). "Okapi at TREC-3." *NIST Special Publication*, 109-126.

[4] Lv, Y., & Zhai, C. (2011). "Lower-bounding term frequency normalization." *Proceedings of CIKM*, 7-16.

[5] Mikolov, T., Chen, K., Corrado, G., & Dean, J. (2013). "Efficient estimation of word representations in vector space." *arXiv preprint arXiv:1301.3781*. https://arxiv.org/abs/1301.3781

[6] Pennington, J., Socher, R., & Manning, C. D. (2014). "GloVe: Global vectors for word representation." *Proceedings of EMNLP*, 1532-1543. https://nlp.stanford.edu/projects/glove/

[7] Vaswani, A., et al. (2017). "Attention is all you need." *Advances in Neural Information Processing Systems*, 30. https://arxiv.org/abs/1706.03762

[8] Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2019). "BERT: Pre-training of deep bidirectional transformers for language understanding." *Proceedings of NAACL-HLT*, 4171-4186. https://arxiv.org/abs/1810.04805

[9] Reimers, N., & Gurevych, I. (2019). "Sentence-BERT: Sentence embeddings using Siamese BERT-networks." *Proceedings of EMNLP-IJCNLP*, 3982-3992. https://arxiv.org/abs/1908.10084

[10] Karpukhin, V., et al. (2020). "Dense passage retrieval for open-domain question answering." *Proceedings of EMNLP*, 6769-6781. https://arxiv.org/abs/2004.04906

[11] Kusupati, A., et al. (2022). "Matryoshka representation learning." *Advances in Neural Information Processing Systems*, 35. https://arxiv.org/abs/2205.13147

[12] Malkov, Y. A., & Yashunin, D. A. (2018). "Efficient and robust approximate nearest neighbor search using hierarchical navigable small world graphs." *IEEE Transactions on Pattern Analysis and Machine Intelligence*, 42(4), 824-836. https://arxiv.org/abs/1603.09320

[13] pgvector GitHub Repository. https://github.com/pgvector/pgvector

[14] Cormack, G. V., Clarke, C. L., & Buettcher, S. (2009). "Reciprocal rank fusion outperforms condorcet and individual rank learning methods." *Proceedings of SIGIR*, 758-759.

[15] Lewis, P., et al. (2020). "Retrieval-augmented generation for knowledge-intensive NLP tasks." *Advances in Neural Information Processing Systems*, 33. https://arxiv.org/abs/2005.11401

### Technical Documentation

- **PostgreSQL Full Text Search**: https://www.postgresql.org/docs/current/textsearch.html
- **OpenAI Embeddings Guide**: https://platform.openai.com/docs/guides/embeddings
- **pgvector Documentation**: https://github.com/pgvector/pgvector/blob/master/README.md
- **Sentence-Transformers Library**: https://www.sbert.net/

### Books and Surveys

- Manning, C. D., Raghavan, P., & Schütze, H. (2008). *Introduction to Information Retrieval*. Cambridge University Press. https://nlp.stanford.edu/IR-book/

- Büttcher, S., Clarke, C. L., & Cormack, G. V. (2010). *Information Retrieval: Implementing and Evaluating Search Engines*. MIT Press.

- Croft, W. B., Metzler, D., & Strohman, T. (2010). *Search Engines: Information Retrieval in Practice*. Addison-Wesley.

### Online Resources

- **TREC (Text REtrieval Conference)**: https://trec.nist.gov/
- **MS MARCO Dataset**: https://microsoft.github.io/msmarco/
- **BEIR Benchmark**: https://github.com/beir-cellar/beir
- **Pinecone Learning Center**: https://www.pinecone.io/learn/
- **Weaviate Vector Database Concepts**: https://weaviate.io/developers/weaviate/concepts

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **ANN** | Approximate Nearest Neighbor - finding similar vectors efficiently |
| **BM25** | Best Match 25 - probabilistic ranking function |
| **Cross-encoder** | Model that processes query-document pairs together |
| **Dense retrieval** | Using learned embeddings for semantic search |
| **Embedding** | Vector representation of text capturing semantic meaning |
| **GIN** | Generalized Inverted Index - PostgreSQL index type |
| **HNSW** | Hierarchical Navigable Small World - graph-based ANN algorithm |
| **IDF** | Inverse Document Frequency - measure of term specificity |
| **IVF** | Inverted File Index - clustering-based ANN approach |
| **Lexical search** | Term-matching based search (BM25, TF-IDF) |
| **MAP** | Mean Average Precision - ranking evaluation metric |
| **NDCG** | Normalized Discounted Cumulative Gain - graded relevance metric |
| **RAG** | Retrieval-Augmented Generation - combining search with LLMs |
| **Semantic search** | Meaning-based search using embeddings |
| **TF** | Term Frequency - count of term occurrences |
| **tsquery** | PostgreSQL text search query type |
| **tsvector** | PostgreSQL text search document type |

---

## Appendix B: Implementation Checklist

For researchers implementing similar systems:

- [ ] **Lexical Search**
  - [ ] Configure language-specific stemming
  - [ ] Set up GIN indexes for full-text search
  - [ ] Tune BM25/ts_rank parameters
  - [ ] Implement score normalization

- [ ] **Semantic Search**
  - [ ] Choose embedding model (dimensions, quality, cost)
  - [ ] Implement text chunking strategy
  - [ ] Set up vector storage (pgvector, Pinecone, etc.)
  - [ ] Configure ANN index (IVF lists, HNSW parameters)

- [ ] **Hybrid Search**
  - [ ] Implement score normalization for both methods
  - [ ] Choose fusion strategy (linear, RRF)
  - [ ] Handle deduplication
  - [ ] Consider re-ranking stage

- [ ] **Evaluation**
  - [ ] Create relevance judgments (ground truth)
  - [ ] Implement evaluation metrics (MAP, NDCG, MRR)
  - [ ] Set up A/B testing framework
  - [ ] Monitor search quality in production
