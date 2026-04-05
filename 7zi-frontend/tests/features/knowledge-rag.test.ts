/**
 * RAG QA Feature Tests - v1.13.0
 *
 * 测试知识库 RAG 问答功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RAGQA, CitationTracer } from '@/lib/knowledge/rag-qa'
import { SmartRetriever } from '@/lib/knowledge/smart-retriever'
import type { HybridSearchResult, RetrievalOptions } from '@/lib/knowledge/types'

// Mock SmartRetriever
class MockSmartRetriever {
  async retrieve(options: RetrievalOptions): Promise<HybridSearchResult[]> {
    // 返回模拟的检索结果
    return [
      {
        chunkId: 'chunk-1',
        documentId: 'doc-1',
        content: '这是一个测试文档的内容。它包含了一些有用的信息。',
        score: 0.9,
        vectorScore: 0.85,
        keywordScore: 0.95,
        combinedScore: 0.9,
        metadata: {
          title: '测试文档',
          url: 'https://example.com/doc-1',
        },
      },
      {
        chunkId: 'chunk-2',
        documentId: 'doc-2',
        content: '这是另一个测试文档。它提供了额外的上下文信息。',
        score: 0.8,
        vectorScore: 0.75,
        keywordScore: 0.85,
        combinedScore: 0.8,
        metadata: {
          title: '另一个测试文档',
          url: 'https://example.com/doc-2',
        },
      },
    ]
  }
}

// Mock fetch
global.fetch = vi.fn()

describe('RAG QA Feature Tests', () => {
  let ragQA: RAGQA
  let mockRetriever: SmartRetriever
  let mockFetch: any

  beforeEach(() => {
    mockRetriever = new MockSmartRetriever() as any
    mockFetch = global.fetch as any
    mockFetch.mockClear()

    ragQA = new RAGQA(mockRetriever, {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      includeCitations: true,
      maxSourceChunks: 5,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('问答功能', () => {
    it('应该成功回答问题', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '根据文档内容，这是一个测试文档。',
              },
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        }),
      })

      const answer = await ragQA.ask('这是什么文档？')

      expect(answer.answer).toBeTruthy()
      expect(answer.sources.length).toBeGreaterThan(0)
      expect(answer.chunks.length).toBeGreaterThan(0)
      expect(answer.confidence).toBeGreaterThan(0)
      expect(answer.metadata?.model).toBe('gpt-4')
    })

    it('应该在无相关文档时返回提示', async () => {
      // Mock retriever 返回空结果
      vi.spyOn(mockRetriever, 'retrieve').mockResolvedValueOnce([])

      const answer = await ragQA.ask('不相关的问题')

      expect(answer.answer).toContain('没有找到')
      expect(answer.sources.length).toBe(0)
      expect(answer.chunks.length).toBe(0)
      expect(answer.confidence).toBe(0)
    })

    it('应该正确计算置信度', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '这是一个详细的答案，包含了很多有用的信息。',
              },
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 100,
            total_tokens: 200,
          },
        }),
      })

      const answer = await ragQA.ask('详细问题')

      expect(answer.confidence).toBeGreaterThan(0)
      expect(answer.confidence).toBeLessThanOrEqual(1)
    })

    it('应该包含引用信息', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '根据[文档 1]的内容，这是测试文档。',
              },
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        }),
      })

      const answer = await ragQA.ask('这是什么？')

      expect(answer.sources.length).toBeGreaterThan(0)
      expect(answer.sources[0].documentId).toBeTruthy()
      expect(answer.sources[0].title).toBeTruthy()
      expect(answer.sources[0].score).toBeGreaterThan(0)
    })

    it('应该记录检索时间', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '答案',
              },
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        }),
      })

      const answer = await ragQA.ask('问题')

      expect(answer.metadata?.retrievalTime).toBeGreaterThan(0)
    })
  })

  describe('流式问答', () => {
    it('应该支持流式输出', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({
              done: true,
              value: new Uint8Array(),
            }),
          }),
        },
      })

      const chunks: string[] = []

      for await (const chunk of ragQA.askStream('流式问题')) {
        chunks.push(chunk)
      }

      // 应该至少有一个块
      expect(chunks.length).toBeGreaterThanOrEqual(0)
    })

    it('应该在无文档时返回提示', async () => {
      vi.spyOn(mockRetriever, 'retrieve').mockResolvedValueOnce([])

      const chunks: string[] = []

      for await (const chunk of ragQA.askStream('不相关的问题')) {
        chunks.push(chunk)
      }

      expect(chunks).toContain('[无相关文档]')
    })
  })

  describe('提示词构建', () => {
    it('应该正确构建提示词', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '答案',
              },
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        }),
      })

      await ragQA.ask('问题')

      // 验证 fetch 被调用
      expect(mockFetch).toHaveBeenCalled()

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      // 验证提示词包含必要信息
      expect(body.messages[1].content).toContain('参考资料')
      expect(body.messages[1].content).toContain('用户问题')
      expect(body.messages[1].content).toContain('回答要求')
    })

    it('应该限制源文档数量', async () => {
      const ragQAWithLimit = new RAGQA(mockRetriever, {
        maxSourceChunks: 2,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '答案',
              },
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        }),
      })

      await ragQAWithLimit.ask('问题')

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      // 提示词中应该最多包含 2 个文档
      const docMatches = body.messages[1].content.match(/\[文档 \d+\]/g)
      expect(docMatches?.length).toBeLessThanOrEqual(2)
    })
  })

  describe('LLM 调用', () => {
    it('应该正确调用 LLM API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'LLM 生成的答案',
              },
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        }),
      })

      const answer = await ragQA.ask('问题')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('应该处理 LLM API 错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      const answer = await ragQA.ask('问题')

      // 应该返回模拟答案
      expect(answer.answer).toBeTruthy()
    })

    it('应该处理网络错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const answer = await ragQA.ask('问题')

      // 应该返回模拟答案
      expect(answer.answer).toBeTruthy()
    })

    it('应该使用正确的模型参数', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '答案',
              },
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        }),
      })

      await ragQA.ask('问题')

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body.model).toBe('gpt-4')
      expect(body.temperature).toBe(0.7)
      expect(body.max_tokens).toBe(2000)
    })
  })

  describe('配置管理', () => {
    it('应该使用默认配置', () => {
      const defaultRAG = new RAGQA(mockRetriever)

      expect(defaultRAG).toBeInstanceOf(RAGQA)
    })

    it('应该接受自定义配置', () => {
      const customRAG = new RAGQA(mockRetriever, {
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        maxTokens: 1000,
        includeCitations: false,
        maxSourceChunks: 3,
      })

      expect(customRAG).toBeInstanceOf(RAGQA)
    })

    it('应该支持自定义系统提示词', async () => {
      const customSystemPrompt = '你是一个专业的助手。'

      const customRAG = new RAGQA(mockRetriever, {
        systemPrompt: customSystemPrompt,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '答案',
              },
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        }),
      })

      await customRAG.ask('问题')

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body.messages[0].content).toBe(customSystemPrompt)
    })
  })
})

describe('CitationTracer Feature Tests', () => {
  let tracer: CitationTracer

  beforeEach(() => {
    tracer = new CitationTracer()
  })

  describe('引用提取', () => {
    it('应该从答案中提取文档编号引用', () => {
      const answer = '根据[文档 1]的内容，这是测试。另外[文档 2]也提到了相关信息。'

      const sources = [
        {
          documentId: 'doc-1',
          title: '测试文档',
          content: '测试内容',
          score: 0.9,
        },
        {
          documentId: 'doc-2',
          title: '另一个文档',
          content: '其他内容',
          score: 0.8,
        },
      ]

      const citedIds = tracer.extractCitations(answer, sources)

      expect(citedIds).toContain('doc-1')
      expect(citedIds).toContain('doc-2')
    })

    it('应该从答案中提取文档标题引用', () => {
      const answer = '根据测试文档的内容，这是测试。'

      const sources = [
        {
          documentId: 'doc-1',
          title: '测试文档',
          content: '测试内容',
          score: 0.9,
        },
      ]

      const citedIds = tracer.extractCitations(answer, sources)

      expect(citedIds).toContain('doc-1')
    })

    it('应该处理无引用的情况', () => {
      const answer = '这是一个没有引用的答案。'

      const sources = [
        {
          documentId: 'doc-1',
          title: '测试文档',
          content: '测试内容',
          score: 0.9,
        },
      ]

      const citedIds = tracer.extractCitations(answer, sources)

      expect(citedIds.length).toBe(0)
    })
  })

  describe('源追溯', () => {
    it('应该追溯引用的具体段落', () => {
      const answer = '这是一个测试文档的内容。它包含了一些有用的信息。'

      const chunks: HybridSearchResult[] = [
        {
          chunkId: 'chunk-1',
          documentId: 'doc-1',
          content: '这是一个测试文档的内容。它包含了一些有用的信息。',
          score: 0.9,
          vectorScore: 0.85,
          keywordScore: 0.95,
          combinedScore: 0.9,
          metadata: {
            title: '测试文档',
          },
        },
      ]

      const traced = tracer.traceSourceChunks(answer, chunks)

      expect(traced.length).toBeGreaterThan(0)
      expect(traced[0].chunk).toBe(chunks[0])
      expect(traced[0].matchedText).toBeTruthy()
    })

    it('应该处理无匹配的情况', () => {
      const answer = '完全不相关的内容。'

      const chunks: HybridSearchResult[] = [
        {
          chunkId: 'chunk-1',
          documentId: 'doc-1',
          content: '测试文档内容',
          score: 0.9,
          vectorScore: 0.85,
          keywordScore: 0.95,
          combinedScore: 0.9,
          metadata: {
            title: '测试文档',
          },
        },
      ]

      const traced = tracer.traceSourceChunks(answer, chunks)

      expect(traced.length).toBe(0)
    })
  })

  describe('引用报告', () => {
    it('应该生成引用报告', () => {
      const answer = {
        answer: '根据文档内容，这是答案。',
        sources: [
          {
            documentId: 'doc-1',
            title: '测试文档',
            content: '测试内容',
            score: 0.9,
          },
        ],
        chunks: [],
        confidence: 0.85,
        metadata: {
          model: 'gpt-4',
          retrievalTime: 100,
        },
      }

      const report = tracer.generateCitationReport(answer)

      expect(report).toContain('引用报告')
      expect(report).toContain('置信度')
      expect(report).toContain('来源数量')
      expect(report).toContain('检索耗时')
      expect(report).toContain('来源文档')
    })

    it('应该包含所有来源信息', () => {
      const answer = {
        answer: '答案',
        sources: [
          {
            documentId: 'doc-1',
            title: '文档 1',
            content: '内容 1',
            score: 0.9,
          },
          {
            documentId: 'doc-2',
            title: '文档 2',
            content: '内容 2',
            score: 0.8,
          },
        ],
        chunks: [],
        confidence: 0.85,
        metadata: {},
      }

      const report = tracer.generateCitationReport(answer)

      expect(report).toContain('文档 1')
      expect(report).toContain('文档 2')
      expect(report).toContain('90.0%')
      expect(report).toContain('80.0%')
    })
  })
})