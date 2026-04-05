# RAG 知识库系统架构设计文档

**项目:** 7zi-frontend
**版本:** v1.13.0
**功能:** 知识库 RAG 系统（Roadmap P1）
**创建日期:** 2026-04-04
**设计者:** ⚡ Executor

---

## 📋 目录

- [执行摘要](#执行摘要)
- [系统架构](#系统架构)
- [核心模块设计](#核心模块设计)
- [API 接口规范](#api-接口规范)
- [技术选型对比](#技术选型对比)
- [分阶段实现计划](#分阶段实现计划)
- [风险评估](#风险评估)
- [性能优化](#性能优化)
- [安全考虑](#安全考虑)

---

## 执行摘要

### 目标

为 7zi-frontend 项目设计并实现企业级知识库 RAG（Retrieval-Augmented Generation）系统，支持文档上传、智能检索、语义搜索和 AI 增强问答。

### 核心能力

1. **文档处理管道** - 支持多种格式（PDF、Word、Markdown、TXT）的解析、分块和向量化
2. **智能检索系统** - 语义搜索 + 关键词搜索的混合检索，支持过滤和排序
3. **RAG 集成** - 与现有 AI 模型路由系统无缝集成，提供上下文增强的 AI 回答
4. **向量存储** - 可扩展的向量数据库方案，支持 Milvus/Pinecone/Chroma
5. **知识管理** - 完整的知识库 CRUD API，支持分类、标签、权限控制

### 技术亮点

- **混合检索** - 结合语义搜索和关键词搜索，提升召回率
- **智能分块** - 基于语义边界的自适应分块策略
- **增量更新** - 支持文档的增量索引和更新
- **缓存优化** - 多层缓存机制，提升检索性能
- **权限控制** - 集成现有权限系统，支持细粒度访问控制

---

## 系统架构

### 架构图（文字描述）

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端层 (Frontend)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 知识库管理   │  │ 文档上传     │  │ AI 问答界面  │          │
│  │ Knowledge UI │  │ Upload UI    │  │ Chat UI      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API 层 (API Layer)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              /api/knowledge/* (知识库 API)                │   │
│  │  - /documents (文档 CRUD)                                │   │
│  │  - /collections (集合管理)                               │   │
│  │  - /search (检索)                                        │   │
│  │  - /rag (RAG 问答)                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              /api/ai/chat (集成 RAG)                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       业务逻辑层 (Service Layer)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 文档处理服务 │  │ 检索服务     │  │ RAG 服务     │          │
│  │ Document     │  │ Retrieval    │  │ RAG          │          │
│  │ Processor    │  │ Service      │  │ Service      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 向量化服务   │  │ 缓存服务     │  │ 权限服务     │          │
│  │ Embedding    │  │ Cache        │  │ Permission   │          │
│  │ Service      │  │ Service      │  │ Service      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       数据层 (Data Layer)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 向量数据库   │  │ 文档存储     │  │ 元数据存储   │          │
│  │ Vector DB    │  │ Document     │  │ Metadata     │          │
│  │ (Milvus/     │  │ Storage     │  │ Storage      │          │
│  │ Pinecone)    │  │ (S3/Local)  │  │ (SQLite/PG)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流

```
文档上传流程：
用户上传 → API 验证 → 文档存储 → 解析 → 分块 → 向量化 → 索引 → 完成

检索流程：
用户查询 → 查询预处理 → 混合检索 → 重排序 → 过滤 → 返回结果

RAG 问答流程：
用户提问 → 检索相关文档 → 构建上下文 → AI 生成 → 返回答案
```

---

## 核心模块设计

### 1. 文档处理管道 (Document Processing Pipeline)

#### 1.1 文档解析器 (Document Parser)

**位置:** `src/lib/knowledge/parsers/`

**职责:** 将各种格式的文档转换为统一的文本格式

**支持的格式:**
- PDF (`pdf-parse`)
- Word (`mammoth`)
- Markdown (`marked`)
- TXT (原生)
- HTML (`cheerio`)

**接口设计:**

```typescript
// src/lib/knowledge/parsers/types.ts
export interface DocumentParser {
  parse(buffer: Buffer): Promise<ParsedDocument>
  supportedFormats: string[]
}

export interface ParsedDocument {
  content: string
  metadata: DocumentMetadata
  sections?: DocumentSection[]
}

export interface DocumentMetadata {
  title?: string
  author?: string
  createdAt?: Date
  modifiedAt?: Date
  pageCount?: number
  wordCount?: number
  language?: string
}

export interface DocumentSection {
  title: string
  content: string
  level: number
  startIndex: number
  endIndex: number
}
```

**实现示例:**

```typescript
// src/lib/knowledge/parsers/pdf-parser.ts
import pdfParse from 'pdf-parse'

export class PDFParser implements DocumentParser {
  supportedFormats = ['application/pdf']

  async parse(buffer: Buffer): Promise<ParsedDocument> {
    const data = await pdfParse(buffer)

    return {
      content: data.text,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        pageCount: data.numpages,
        wordCount: data.text.split(/\s+/).length,
      },
    }
  }
}
```

#### 1.2 文档分块器 (Document Chunker)

**位置:** `src/lib/knowledge/chunker/`

**职责:** 将文档分割成适合向量化的块

**分块策略:**
1. **固定大小分块** - 按字符数分割（默认 500-1000 字符）
2. **语义分块** - 基于段落、标题等语义边界
3. **重叠分块** - 块之间保留重叠内容（默认 50-100 字符）

**接口设计:**

```typescript
// src/lib/knowledge/chunker/types.ts
export interface ChunkStrategy {
  chunk(document: ParsedDocument): Promise<DocumentChunk[]>
}

export interface DocumentChunk {
  id: string
  content: string
  metadata: ChunkMetadata
  embedding?: number[]
}

export interface ChunkMetadata {
  documentId: string
  chunkIndex: number
  startIndex: number
  endIndex: number
  sectionTitle?: string
  sectionLevel?: number
  overlap?: number
}

export interface ChunkConfig {
  maxSize: number // 最大块大小（字符数）
  overlap: number // 重叠大小（字符数）
  strategy: 'fixed' | 'semantic' | 'hybrid'
  respectSections: boolean // 是否尊重章节边界
}
```

**实现示例:**

```typescript
// src/lib/knowledge/chunker/semantic-chunker.ts
export class SemanticChunker implements ChunkStrategy {
  constructor(private config: ChunkConfig) {}

  async chunk(document: ParsedDocument): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = []
    const { content, sections } = document

    if (sections && sections.length > 0 && this.config.respectSections) {
      // 基于章节分块
      for (const section of sections) {
        const sectionChunks = this.chunkSection(section, document)
        chunks.push(...sectionChunks)
      }
    } else {
      // 基于段落分块
      const paragraphs = content.split(/\n\n+/)
      let currentChunk = ''
      let chunkIndex = 0

      for (const paragraph of paragraphs) {
        if (currentChunk.length + paragraph.length > this.config.maxSize) {
          if (currentChunk) {
            chunks.push(this.createChunk(currentChunk, chunkIndex++, document))
          }
          currentChunk = paragraph
        } else {
          currentChunk += '\n\n' + paragraph
        }
      }

      if (currentChunk) {
        chunks.push(this.createChunk(currentChunk, chunkIndex, document))
      }
    }

    return chunks
  }

  private chunkSection(section: DocumentSection, document: ParsedDocument): DocumentChunk[] {
    // 实现章节级别的分块逻辑
    // ...
  }

  private createChunk(content: string, index: number, document: ParsedDocument): DocumentChunk {
    return {
      id: `chunk_${document.metadata.title || 'doc'}_${index}`,
      content: content.trim(),
      metadata: {
        documentId: document.metadata.title || 'unknown',
        chunkIndex: index,
        startIndex: 0,
        endIndex: content.length,
      },
    }
  }
}
```

#### 1.3 向量化服务 (Embedding Service)

**位置:** `src/lib/knowledge/embedding/`

**职责:** 将文本块转换为向量表示

**支持的模型:**
- OpenAI `text-embedding-3-small` (1536 维)
- OpenAI `text-embedding-3-large` (3072 维)
- 本地模型（可选，如 `sentence-transformers`）

**接口设计:**

```typescript
// src/lib/knowledge/embedding/types.ts
export interface EmbeddingService {
  embed(text: string | string[]): Promise<number[] | number[][]>
  embedBatch(chunks: DocumentChunk[]): Promise<DocumentChunk[]>
  getDimension(): number
  getModelName(): string
}

export interface EmbeddingConfig {
  provider: 'openai' | 'local'
  model: string
  batchSize: number
  maxRetries: number
  timeout: number
}
```

**实现示例:**

```typescript
// src/lib/knowledge/embedding/openai-embedding.ts
import OpenAI from 'openai'

export class OpenAIEmbeddingService implements EmbeddingService {
  private client: OpenAI
  private config: EmbeddingConfig

  constructor(config: EmbeddingConfig) {
    this.config = config
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  async embed(text: string | string[]): Promise<number[] | number[][]> {
    const isArray = Array.isArray(text)
    const texts = isArray ? text : [text]

    const response = await this.client.embeddings.create({
      model: this.config.model,
      input: texts,
    })

    const embeddings = response.data.map((d) => d.embedding)
    return isArray ? embeddings : embeddings[0]
  }

  async embedBatch(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    const batchSize = this.config.batchSize
    const results: DocumentChunk[] = []

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const texts = batch.map((c) => c.content)
      const embeddings = await this.embed(texts)

      for (let j = 0; j < batch.length; j++) {
        results.push({
          ...batch[j],
          embedding: embeddings[j] as number[],
        })
      }
    }

    return results
  }

  getDimension(): number {
    return this.config.model === 'text-embedding-3-large' ? 3072 : 1536
  }

  getModelName(): string {
    return this.config.model
  }
}
```

### 2. 检索系统 (Retrieval System)

#### 2.1 向量数据库适配器 (Vector DB Adapter)

**位置:** `src/lib/knowledge/vector-db/`

**职责:** 提供统一的向量数据库接口

**支持的数据库:**
- Milvus（推荐，开源自托管）
- Pinecone（托管服务）
- Chroma（轻量级本地）

**接口设计:**

```typescript
// src/lib/knowledge/vector-db/types.ts
export interface VectorDatabase {
  // 集合管理
  createCollection(name: string, dimension: number): Promise<void>
  dropCollection(name: string): Promise<void>
  collectionExists(name: string): Promise<boolean>

  // 文档操作
  insert(collection: string, chunks: DocumentChunk[]): Promise<string[]>
  delete(collection: string, ids: string[]): Promise<void>
  update(collection: string, chunks: DocumentChunk[]): Promise<void>

  // 检索
  search(
    collection: string,
    query: number[],
    topK: number,
    filter?: SearchFilter
  ): Promise<SearchResult[]>

  // 混合检索
  hybridSearch(
    collection: string,
    queryVector: number[],
    queryText: string,
    topK: number,
    filter?: SearchFilter
  ): Promise<SearchResult[]>
}

export interface SearchFilter {
  documentId?: string[]
  tags?: string[]
  author?: string[]
  dateRange?: { start: Date; end: Date }
  metadata?: Record<string, any>
}

export interface SearchResult {
  id: string
  content: string
  metadata: ChunkMetadata
  score: number
  distance?: number
}
```

**Milvus 实现示例:**

```typescript
// src/lib/knowledge/vector-db/milvus-adapter.ts
import { MilvusClient } from '@zilliz/milvus2-sdk-node'

export class MilvusAdapter implements VectorDatabase {
  private client: MilvusClient
  private collectionName: string

  constructor(config: { address: string; username?: string; password?: string }) {
    this.client = new MilvusClient({
      address: config.address,
      username: config.username,
      password: config.password,
    })
  }

  async createCollection(name: string, dimension: number): Promise<void> {
    await this.client.createCollection({
      collection_name: name,
      fields: [
        { name: 'id', data_type: DataType.VarChar, max_length: 256, is_primary_key: true },
        { name: 'content', data_type: DataType.VarChar, max_length: 65535 },
        { name: 'embedding', data_type: DataType.FloatVector, dim: dimension },
        { name: 'metadata', data_type: DataType.JSON },
      ],
      index_params: {
        index_type: 'IVF_FLAT',
        metric_type: 'COSINE',
        params: { nlist: 128 },
      },
    })
  }

  async insert(collection: string, chunks: DocumentChunk[]): Promise<string[]> {
    const ids = chunks.map((c) => c.id)
    const contents = chunks.map((c) => c.content)
    const embeddings = chunks.map((c) => c.embedding || [])
    const metadatas = chunks.map((c) => JSON.stringify(c.metadata))

    await this.client.insert({
      collection_name: collection,
      data: [
        { id: ids, content: contents, embedding: embeddings, metadata: metadatas },
      ],
    })

    await this.client.flush({ collection_names: [collection] })
    return ids
  }

  async search(
    collection: string,
    query: number[],
    topK: number,
    filter?: SearchFilter
  ): Promise<SearchResult[]> {
    const results = await this.client.search({
      collection_name: collection,
      vector: query,
      limit: topK,
      output_fields: ['content', 'metadata'],
      filter: this.buildFilter(filter),
    })

    return results.data.map((r: any) => ({
      id: r.id,
      content: r.content,
      metadata: JSON.parse(r.metadata),
      score: r.score,
      distance: r.distance,
    }))
  }

  private buildFilter(filter?: SearchFilter): string {
    if (!filter) return ''

    const conditions: string[] = []

    if (filter.documentId) {
      conditions.push(`metadata["documentId"] in [${filter.documentId.map((id) => `"${id}"`).join(',')}]`)
    }

    if (filter.tags) {
      conditions.push(`metadata["tags"] in [${filter.tags.map((t) => `"${t}"`).join(',')}]`)
    }

    return conditions.join(' && ')
  }

  // ... 其他方法实现
}
```

#### 2.2 检索服务 (Retrieval Service)

**位置:** `src/lib/knowledge/retrieval/`

**职责:** 提供统一的检索接口，支持混合检索和重排序

**接口设计:**

```typescript
// src/lib/knowledge/retrieval/types.ts
export interface RetrievalService {
  search(query: string, options: SearchOptions): Promise<SearchResult[]>
  hybridSearch(query: string, options: SearchOptions): Promise<SearchResult[]>
  rerank(results: SearchResult[], query: string): Promise<SearchResult[]>
}

export interface SearchOptions {
  collection: string
  topK: number
  filter?: SearchFilter
  minScore?: number
  useHybrid?: boolean
  rerank?: boolean
}
```

**实现示例:**

```typescript
// src/lib/knowledge/retrieval/retrieval-service.ts
export class RetrievalService {
  constructor(
    private vectorDb: VectorDatabase,
    private embeddingService: EmbeddingService,
    private cacheService: CacheService
  ) {}

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // 检查缓存
    const cacheKey = this.getCacheKey(query, options)
    const cached = await this.cacheService.get<SearchResult[]>(cacheKey)
    if (cached) return cached

    // 向量化查询
    const queryVector = await this.embeddingService.embed(query)

    // 执行检索
    let results = await this.vectorDb.search(
      options.collection,
      queryVector as number[],
      options.topK,
      options.filter
    )

    // 过滤低分结果
    if (options.minScore) {
      results = results.filter((r) => r.score >= options.minScore!)
    }

    // 重排序
    if (options.rerank) {
      results = await this.rerank(results, query)
    }

    // 缓存结果
    await this.cacheService.set(cacheKey, results, 300) // 5 分钟缓存

    return results
  }

  async hybridSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // 语义检索
    const semanticResults = await this.search(query, { ...options, useHybrid: false })

    // 关键词检索（使用全文搜索）
    const keywordResults = await this.keywordSearch(query, options)

    // 融合结果（Reciprocal Rank Fusion）
    const fusedResults = this.reciprocalRankFusion(semanticResults, keywordResults)

    return fusedResults.slice(0, options.topK)
  }

  async rerank(results: SearchResult[], query: string): Promise<SearchResult[]> {
    // 使用交叉编码器（Cross-Encoder）进行重排序
    // 这里可以使用 Cohere Rerank API 或本地模型
    return results.sort((a, b) => b.score - a.score)
  }

  private reciprocalRankFusion(
    results1: SearchResult[],
    results2: SearchResult[],
    k: number = 60
  ): SearchResult[] {
    const scores = new Map<string, number>()

    results1.forEach((r, i) => {
      scores.set(r.id, (scores.get(r.id) || 0) + 1 / (k + i + 1))
    })

    results2.forEach((r, i) => {
      scores.set(r.id, (scores.get(r.id) || 0) + 1 / (k + i + 1))
    })

    const allResults = [...results1, ...results2]
    const uniqueResults = Array.from(new Map(allResults.map((r) => [r.id, r])).values())

    return uniqueResults.sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0))
  }

  private getCacheKey(query: string, options: SearchOptions): string {
    return `search:${query}:${JSON.stringify(options)}`
  }
}
```

### 3. RAG 服务 (RAG Service)

**位置:** `src/lib/knowledge/rag/`

**职责:** 整合检索和生成，提供上下文增强的 AI 回答

**接口设计:**

```typescript
// src/lib/knowledge/rag/types.ts
export interface RAGService {
  query(question: string, options: RAGOptions): Promise<RAGResponse>
  streamQuery(question: string, options: RAGOptions): AsyncGenerator<RAGChunk>
}

export interface RAGOptions {
  collection: string
  topK: number
  contextWindow: number // 上下文窗口大小（token 数）
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  includeSources?: boolean
}

export interface RAGResponse {
  answer: string
  sources: Source[]
  usage: TokenUsage
}

export interface RAGChunk {
  delta: string
  sources?: Source[]
  done: boolean
}

export interface Source {
  documentId: string
  documentTitle?: string
  chunkId: string
  content: string
  score: number
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}
```

**实现示例:**

```typescript
// src/lib/knowledge/rag/rag-service.ts
export class RAGService {
  constructor(
    private retrievalService: RetrievalService,
    private aiService: AIService,
    private cacheService: CacheService
  ) {}

  async query(question: string, options: RAGOptions): Promise<RAGResponse> {
    // 检索相关文档
    const searchResults = await this.retrievalService.search(question, {
      collection: options.collection,
      topK: options.topK,
      useHybrid: true,
      rerank: true,
    })

    // 构建上下文
    const context = this.buildContext(searchResults, options.contextWindow)

    // 构建提示词
    const prompt = this.buildPrompt(question, context, options.systemPrompt)

    // 调用 AI 生成回答
    const response = await this.aiService.generate({
      prompt,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
    })

    // 构建来源信息
    const sources = options.includeSources
      ? searchResults.map((r) => ({
          documentId: r.metadata.documentId,
          chunkId: r.id,
          content: r.content,
          score: r.score,
        }))
      : []

    return {
      answer: response.content,
      sources,
      usage: response.usage,
    }
  }

  async *streamQuery(question: string, options: RAGOptions): AsyncGenerator<RAGChunk> {
    // 检索相关文档
    const searchResults = await this.retrievalService.search(question, {
      collection: options.collection,
      topK: options.topK,
      useHybrid: true,
      rerank: true,
    })

    // 构建上下文
    const context = this.buildContext(searchResults, options.contextWindow)

    // 构建提示词
    const prompt = this.buildPrompt(question, context, options.systemPrompt)

    // 流式生成
    const stream = await this.aiService.generateStream({
      prompt,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
    })

    let fullAnswer = ''
    for await (const chunk of stream) {
      fullAnswer += chunk.delta
      yield chunk
    }

    // 发送来源信息
    if (options.includeSources) {
      yield {
        delta: '',
        sources: searchResults.map((r) => ({
          documentId: r.metadata.documentId,
          chunkId: r.id,
          content: r.content,
          score: r.score,
        })),
        done: true,
      }
    }
  }

  private buildContext(results: SearchResult[], maxTokens: number): string {
    let context = ''
    let tokenCount = 0

    for (const result of results) {
      const chunkText = `[来源: ${result.metadata.documentId}]\n${result.content}\n\n`
      const chunkTokens = this.estimateTokens(chunkText)

      if (tokenCount + chunkTokens > maxTokens) break

      context += chunkText
      tokenCount += chunkTokens
    }

    return context.trim()
  }

  private buildPrompt(question: string, context: string, systemPrompt?: string): string {
    const defaultSystemPrompt = `你是一个专业的知识库助手。请基于以下上下文信息回答用户的问题。

上下文信息：
${context}

如果上下文中没有相关信息，请明确告知用户，不要编造答案。`

    return `${systemPrompt || defaultSystemPrompt}\n\n问题：${question}\n\n回答：`
  }

  private estimateTokens(text: string): number {
    // 粗略估算：1 token ≈ 4 字符（英文）或 2 字符（中文）
    return Math.ceil(text.length / 3)
  }
}
```

### 4. 缓存服务 (Cache Service)

**位置:** `src/lib/knowledge/cache/`

**职责:** 提供多层缓存机制，提升检索性能

**缓存层级:**
1. **内存缓存** - Redis 或 Node.js 内存缓存
2. **向量数据库缓存** - 利用向量数据库的内置缓存
3. **查询结果缓存** - 缓存常见查询的结果

**接口设计:**

```typescript
// src/lib/knowledge/cache/types.ts
export interface CacheService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(pattern?: string): Promise<void>
}
```

---

## API 接口规范

### 知识库管理 API

#### 1. 创建文档集合

```
POST /api/knowledge/collections
```

**请求体:**

```json
{
  "name": "engineering-docs",
  "description": "工程团队文档集合",
  "tags": ["engineering", "technical"],
  "metadata": {
    "department": "engineering",
    "owner": "john.doe@example.com"
  }
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "id": "col_123456",
    "name": "engineering-docs",
    "description": "工程团队文档集合",
    "tags": ["engineering", "technical"],
    "metadata": {
      "department": "engineering",
      "owner": "john.doe@example.com"
    },
    "createdAt": "2026-04-04T10:00:00Z",
    "documentCount": 0
  }
}
```

#### 2. 上传文档

```
POST /api/knowledge/documents
```

**请求体 (multipart/form-data):**

```
file: <binary>
collectionId: col_123456
title: "API 设计文档"
tags: ["api", "design"]
metadata: {"author": "john.doe", "version": "1.0"}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "id": "doc_789012",
    "collectionId": "col_123456",
    "title": "API 设计文档",
    "fileName": "api-design.pdf",
    "fileSize": 1024000,
    "fileType": "application/pdf",
    "tags": ["api", "design"],
    "metadata": {
      "author": "john.doe",
      "version": "1.0"
    },
    "status": "processing",
    "chunkCount": 0,
    "createdAt": "2026-04-04T10:00:00Z"
  }
}
```

#### 3. 查询文档列表

```
GET /api/knowledge/documents?collectionId=col_123456&page=1&limit=20
```

**响应:**

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "doc_789012",
        "collectionId": "col_123456",
        "title": "API 设计文档",
        "fileName": "api-design.pdf",
        "fileSize": 1024000,
        "fileType": "application/pdf",
        "tags": ["api", "design"],
        "status": "ready",
        "chunkCount": 15,
        "createdAt": "2026-04-04T10:00:00Z",
        "updatedAt": "2026-04-04T10:05:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

#### 4. 删除文档

```
DELETE /api/knowledge/documents/:id
```

**响应:**

```json
{
  "success": true,
  "data": {
    "id": "doc_789012",
    "deleted": true
  }
}
```

### 检索 API

#### 5. 语义搜索

```
POST /api/knowledge/search
```

**请求体:**

```json
{
  "query": "如何配置 API 认证？",
  "collectionId": "col_123456",
  "topK": 5,
  "filter": {
    "tags": ["api"],
    "dateRange": {
      "start": "2026-01-01T00:00:00Z",
      "end": "2026-04-04T23:59:59Z"
    }
  },
  "minScore": 0.7,
  "useHybrid": true
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "chunk_123",
        "content": "API 认证配置步骤：\n1. 在设置中启用 API 访问\n2. 生成 API 密钥\n3. 在请求头中添加 Authorization: Bearer <token>",
        "metadata": {
          "documentId": "doc_789012",
          "documentTitle": "API 设计文档",
          "chunkIndex": 3,
          "sectionTitle": "认证配置"
        },
        "score": 0.92,
        "distance": 0.08
      }
    ],
    "query": "如何配置 API 认证？",
    "totalResults": 5,
    "searchTime": 45
  }
}
```

### RAG 问答 API

#### 6. RAG 问答（非流式）

```
POST /api/knowledge/rag/query
```

**请求体:**

```json
{
  "question": "如何配置 API 认证？",
  "collectionId": "col_123456",
  "topK": 3,
  "contextWindow": 2000,
  "temperature": 0.7,
  "maxTokens": 500,
  "includeSources": true
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "answer": "配置 API 认证需要以下步骤：\n\n1. 在系统设置中启用 API 访问功能\n2. 生成 API 密钥（建议使用强密码）\n3. 在 HTTP 请求头中添加 Authorization 字段，格式为：Authorization: Bearer <your-token>\n\n注意事项：\n- API 密钥具有过期时间，请定期更新\n- 不要在客户端代码中硬编码密钥\n- 建议使用环境变量存储密钥",
    "sources": [
      {
        "documentId": "doc_789012",
        "documentTitle": "API 设计文档",
        "chunkId": "chunk_123",
        "content": "API 认证配置步骤：\n1. 在设置中启用 API 访问\n2. 生成 API 密钥\n3. 在请求头中添加 Authorization: Bearer <token>",
        "score": 0.92
      }
    ],
    "usage": {
      "promptTokens": 350,
      "completionTokens": 180,
      "totalTokens": 530
    }
  }
}
```

#### 7. RAG 问答（流式）

```
POST /api/knowledge/rag/stream
```

**请求体:** 同上

**响应 (Server-Sent Events):**

```
event: start
data: {"id":"msg_123","done":false}

data: {"delta":"配置","done":false}
data: {"delta":" API ","done":false}
data: {"delta":"认证","done":false}
...

data: {"delta":"","sources":[...],"done":true}
data: [DONE]
```

### 集成到现有 AI Chat API

#### 8. AI Chat with RAG

修改现有的 `/api/ai/chat` 端点，支持 RAG 模式：

```
POST /api/ai/chat
```

**请求体（新增字段）:**

```json
{
  "content": "如何配置 API 认证？",
  "rag": {
    "enabled": true,
    "collectionId": "col_123456",
    "topK": 3
  }
}
```

---

## 技术选型对比

### 向量数据库对比

| 特性 | Milvus | Pinecone | Chroma |
|------|--------|----------|--------|
| **部署方式** | 自托管 / 云服务 | 托管服务 | 自托管 / 云服务 |
| **开源** | ✅ Apache 2.0 | ❌ 闭源 | ✅ Apache 2.0 |
| **成本** | 低（自托管）<br>中（云服务） | 高（按使用量计费） | 低（自托管）<br>中（云服务） |
| **性能** | 高（亿级向量） | 高（亿级向量） | 中（百万级向量） |
| **扩展性** | 水平扩展 | 自动扩展 | 有限扩展 |
| **功能** | 丰富（混合检索、过滤） | 丰富（混合检索、过滤） | 基础 |
| **易用性** | 中（需要运维） | 高（零运维） | 高（简单 API） |
| **社区** | 活跃 | 活跃 | 活跃 |
| **适用场景** | 企业级、大规模 | 快速原型、中小规模 | 本地开发、小规模 |

### 推荐方案

#### 方案 1: Milvus（推荐用于生产环境）

**优势:**
- 开源免费，完全控制
- 高性能，支持亿级向量
- 丰富的功能（混合检索、过滤、重排序）
- 活跃的社区和文档

**劣势:**
- 需要运维和部署
- 学习曲线较陡

**适用场景:**
- 企业级应用
- 大规模知识库（百万级文档）
- 需要完全控制数据

**部署建议:**
- 使用 Docker Compose 快速部署
- 配置持久化存储
- 设置监控和告警

#### 方案 2: Pinecone（推荐用于快速原型）

**优势:**
- 零运维，开箱即用
- 高性能，自动扩展
- 简单的 API
- 优秀的文档和支持

**劣势:**
- 成本较高（按使用量计费）
- 数据托管在第三方
- 闭源，缺乏控制

**适用场景:**
- 快速原型和 MVP
- 中小规模知识库（十万级文档）
- 团队缺乏运维能力

**成本估算:**
- Starter: $70/月（1 个索引，100 万向量）
- Standard: $280/月（5 个索引，500 万向量）

#### 方案 3: Chroma（推荐用于本地开发）

**优势:**
- 极简 API，易于使用
- 轻量级，适合本地开发
- 开源免费
- 支持多种嵌入模型

**劣势:**
- 性能有限（百万级向量）
- 扩展性较差
- 功能相对基础

**适用场景:**
- 本地开发和测试
- 小规模知识库（万级文档）
- 快速验证概念

### 文档解析库对比

| 库 | 支持格式 | 性能 | 易用性 | 推荐度 |
|----|---------|------|--------|--------|
| **pdf-parse** | PDF | 高 | 高 | ⭐⭐⭐⭐⭐ |
| **mammoth** | Word (.docx) | 高 | 高 | ⭐⭐⭐⭐⭐ |
| **marked** | Markdown | 高 | 高 | ⭐⭐⭐⭐⭐ |
| **cheerio** | HTML | 高 | 高 | ⭐⭐⭐⭐ |
| **textract** | 多格式 | 中 | 中 | ⭐⭐⭐ |

### 嵌入模型对比

| 模型 | 维度 | 性能 | 成本 | 推荐度 |
|------|------|------|------|--------|
| **OpenAI text-embedding-3-small** | 1536 | 高 | 低 | ⭐⭐⭐⭐⭐ |
| **OpenAI text-embedding-3-large** | 3072 | 极高 | 中 | ⭐⭐⭐⭐ |
| **Cohere embed-english-v3.0** | 1024 | 高 | 中 | ⭐⭐⭐⭐ |
| **sentence-transformers/all-MiniLM-L6-v2** | 384 | 中 | 免费 | ⭐⭐⭐ |

---

## 分阶段实现计划

### Phase 1: 基础设施（2 周）

**目标:** 搭建核心基础设施，支持基本的文档上传和检索

**任务:**

1. **Week 1: 数据库和存储**
   - [ ] 部署向量数据库（Milvus 或 Pinecone）
   - [ ] 设计数据库 Schema（文档、集合、元数据）
   - [ ] 实现向量数据库适配器
   - [ ] 实现文档存储服务（本地文件系统或 S3）

2. **Week 2: 文档处理**
   - [ ] 实现文档解析器（PDF、Word、Markdown）
   - [ ] 实现文档分块器（固定大小 + 语义分块）
   - [ ] 集成嵌入服务（OpenAI）
   - [ ] 实现文档处理管道

**交付物:**
- 向量数据库部署完成
- 文档解析和分块功能
- 基础 API 端点（上传文档、查询文档）

### Phase 2: 检索系统（2 周）

**目标:** 实现智能检索系统，支持语义搜索和混合检索

**任务:**

1. **Week 3: 检索服务**
   - [ ] 实现语义检索
   - [ ] 实现关键词检索（全文搜索）
   - [ ] 实现混合检索（RRF 融合）
   - [ ] 实现结果过滤和排序

2. **Week 4: 优化和缓存**
   - [ ] 实现重排序（Cross-Encoder）
   - [ ] 实现多层缓存机制
   - [ ] 性能优化和测试
   - [ ] 检索 API 端点

**交付物:**
- 完整的检索服务
- 混合检索功能
- 检索 API 端点

### Phase 3: RAG 集成（2 周）

**目标:** 实现 RAG 服务，提供上下文增强的 AI 回答

**任务:**

1. **Week 5: RAG 服务**
   - [ ] 实现 RAG 服务核心逻辑
   - [ ] 集成现有 AI 模型路由系统
   - [ ] 实现上下文构建和提示词工程
   - [ ] 实现流式响应

2. **Week 6: API 和集成**
   - [ ] 实现 RAG API 端点
   - [ ] 集成到现有 AI Chat API
   - [ ] 实现来源引用功能
   - [ ] 测试和优化

**交付物:**
- RAG 服务
- RAG API 端点
- 集成到 AI Chat

### Phase 4: 前端 UI（2 周）

**目标:** 实现知识库管理界面和 RAG 问答界面

**任务:**

1. **Week 7: 知识库管理 UI**
   - [ ] 文档上传界面
   - [ ] 文档列表和详情
   - [ ] 集合管理界面
   - [ ] 文档预览功能

2. **Week 8: RAG 问答 UI**
   - [ ] RAG 问答界面
   - [ ] 检索结果展示
   - [ ] 来源引用展示
   - [ ] 流式响应支持

**交付物:**
- 知识库管理界面
- RAG 问答界面

### Phase 5: 优化和测试（1 周）

**目标:** 性能优化、安全加固、完整测试

**任务:**

- [ ] 性能优化（索引、缓存、查询）
- [ ] 安全加固（权限控制、输入验证）
- [ ] 单元测试和集成测试
- [ ] E2E 测试
- [ ] 文档完善

**交付物:**
- 性能优化报告
- 安全审计报告
- 测试报告
- 用户文档

---

## 风险评估

### 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **向量数据库性能瓶颈** | 高 | 中 | 1. 选择合适的向量数据库<br>2. 实现缓存机制<br>3. 优化索引策略 |
| **文档解析失败** | 中 | 高 | 1. 实现多种解析器<br>2. 添加错误处理和重试<br>3. 提供手动编辑功能 |
| **嵌入模型成本过高** | 中 | 中 | 1. 使用小模型（text-embedding-3-small）<br>2. 实现缓存<br>3. 考虑本地模型 |
| **检索准确率不足** | 高 | 中 | 1. 使用混合检索<br>2. 实现重排序<br>3. 优化分块策略 |
| **RAG 回答质量差** | 高 | 中 | 1. 优化提示词工程<br>2. 调整上下文窗口<br>3. 实现反馈机制 |

### 业务风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **用户接受度低** | 高 | 中 | 1. 提供清晰的 UI<br>2. 实现渐进式功能<br>3. 收集用户反馈 |
| **数据隐私问题** | 高 | 低 | 1. 实现权限控制<br>2. 数据加密<br>3. 合规性审查 |
| **维护成本高** | 中 | 中 | 1. 选择托管服务（Pinecone）<br>2. 实现自动化运维<br>3. 完善监控告警 |

### 项目风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **开发周期延长** | 中 | 中 | 1. 分阶段交付<br>2. 优先实现核心功能<br>3. 合理分配资源 |
| **技术债务积累** | 中 | 高 | 1. 代码审查<br>2. 完善测试<br>3. 定期重构 |

---

## 性能优化

### 1. 索引优化

- **选择合适的索引类型**: IVF_FLAT（平衡）、IVF_PQ（压缩）、HNSW（高性能）
- **调整索引参数**: nlist、nprobe、M、efConstruction
- **定期重建索引**: 随着数据增长，定期优化索引

### 2. 查询优化

- **批量向量化**: 减少网络请求次数
- **查询缓存**: 缓存常见查询的结果
- **并行检索**: 并行执行多个检索任务

### 3. 缓存策略

- **多层缓存**: 内存缓存 + 向量数据库缓存 + 查询结果缓存
- **缓存预热**: 预加载热门文档的向量
- **缓存失效**: 基于时间的 TTL + 基于事件的失效

### 4. 分块优化

- **自适应分块**: 根据文档类型和内容调整分块策略
- **重叠分块**: 提高检索召回率
- **语义分块**: 基于段落、标题等语义边界

---

## 安全考虑

### 1. 数据安全

- **加密存储**: 文档和向量数据加密存储
- **传输加密**: 使用 HTTPS/TLS
- **访问控制**: 基于角色的权限控制（RBAC）

### 2. API 安全

- **认证和授权**: JWT 认证 + 权限验证
- **速率限制**: 防止 API 滥用
- **输入验证**: 防止注入攻击

### 3. 隐私保护

- **数据脱敏**: 敏感信息脱敏处理
- **审计日志**: 记录所有访问和操作
- **合规性**: 符合 GDPR、CCPA 等法规

---

## 附录

### A. 目录结构

```
src/
├── lib/
│   └── knowledge/
│       ├── parsers/              # 文档解析器
│       │   ├── types.ts
│       │   ├── pdf-parser.ts
│       │   ├── word-parser.ts
│       │   └── markdown-parser.ts
│       ├── chunker/              # 文档分块器
│       │   ├── types.ts
│       │   ├── fixed-chunker.ts
│       │   └── semantic-chunker.ts
│       ├── embedding/            # 向量化服务
│       │   ├── types.ts
│       │   ├── openai-embedding.ts
│       │   └── local-embedding.ts
│       ├── vector-db/            # 向量数据库
│       │   ├── types.ts
│       │   ├── milvus-adapter.ts
│       │   ├── pinecone-adapter.ts
│       │   └── chroma-adapter.ts
│       ├── retrieval/            # 检索服务
│       │   ├── types.ts
│       │   └── retrieval-service.ts
│       ├── rag/                  # RAG 服务
│       │   ├── types.ts
│       │   └── rag-service.ts
│       ├── cache/                # 缓存服务
│       │   ├── types.ts
│       │   └── cache-service.ts
│       └── types.ts              # 共享类型
├── app/
│   └── api/
│       └── knowledge/
│           ├── collections/
│           │   └── route.ts
│           ├── documents/
│           │   ├── route.ts
│           │   └── [id]/
│           │       └── route.ts
│           ├── search/
│           │   └── route.ts
│           └── rag/
│               ├── query/
│               │   └── route.ts
│               └── stream/
│                   └── route.ts
└── components/
    └── knowledge/
        ├── document-upload.tsx
        ├── document-list.tsx
        ├── collection-manager.tsx
        └── rag-chat.tsx
```

### B. 环境变量

```bash
# 向量数据库配置
VECTOR_DB_TYPE=milvus  # milvus | pinecone | chroma
MILVUS_ADDRESS=localhost:19530
MILVUS_USERNAME=
MILVUS_PASSWORD=
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=

# OpenAI 配置
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4-turbo

# 文档存储配置
DOCUMENT_STORAGE_TYPE=local  # local | s3
DOCUMENT_STORAGE_PATH=/data/documents
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_REGION=

# 缓存配置
CACHE_TYPE=redis  # redis | memory
REDIS_URL=
CACHE_TTL=300

# RAG 配置
RAG_DEFAULT_TOP_K=3
RAG_DEFAULT_CONTEXT_WINDOW=2000
RAG_DEFAULT_TEMPERATURE=0.7
```

### C. 依赖包

```json
{
  "dependencies": {
    "@zilliz/milvus2-sdk-node": "^2.4.0",
    "@pinecone-database/pinecone": "^2.0.0",
    "chromadb": "^1.8.0",
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0",
    "marked": "^12.0.0",
    "cheerio": "^1.0.0-rc.12",
    "openai": "^4.28.0",
    "ioredis": "^5.3.2",
    "zod": "^4.3.6"
  }
}
```

---

**文档版本:** v1.0
**最后更新:** 2026-04-04
**状态:** ✅ 设计完成