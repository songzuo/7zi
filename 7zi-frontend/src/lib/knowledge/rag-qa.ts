/**
 * RAG 问答器 - 基于检索结果的答案生成
 */

import {
  HybridSearchResult,
  RAGAnswer,
  RetrievalOptions,
} from './types';
import { SmartRetriever } from './smart-retriever';

export interface RAGQAConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  includeCitations?: boolean;
  maxSourceChunks?: number;
}

export class RAGQA {
  private retriever: SmartRetriever;
  private config: Required<RAGQAConfig>;

  constructor(retriever: SmartRetriever, config: RAGQAConfig = {}) {
    this.retriever = retriever;
    this.config = {
      model: config.model || 'gpt-4',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2000,
      systemPrompt: config.systemPrompt || this.getDefaultSystemPrompt(),
      includeCitations: config.includeCitations ?? true,
      maxSourceChunks: config.maxSourceChunks ?? 5,
    };
  }

  /**
   * 问答
   */
  async ask(question: string, options?: Partial<RetrievalOptions>): Promise<RAGAnswer> {
    const startTime = Date.now();

    // 1. 检索相关文档
    const retrievalOptions: RetrievalOptions = {
      query: question,
      topK: options?.topK || this.config.maxSourceChunks,
      rerank: options?.rerank ?? true,
      filters: options?.filters,
    };

    const retrievedChunks = await this.retriever.retrieve(retrievalOptions);

    if (retrievedChunks.length === 0) {
      return {
        answer: '抱歉，我没有找到与您问题相关的足够信息。请尝试重新表述您的问题。',
        sources: [],
        chunks: [],
        confidence: 0,
        metadata: {
          model: this.config.model,
          retrievalTime: Date.now() - startTime,
        },
      };
    }

    // 2. 构建提示词
    const prompt = this.buildPrompt(question, retrievedChunks);

    // 3. 调用 LLM 生成答案
    const { answer, usage } = await this.callLLM(prompt);

    // 4. 提取引用
    const sources = this.extractCitations(retrievedChunks);

    // 5. 计算置信度
    const confidence = this.calculateConfidence(retrievedChunks, answer);

    return {
      answer,
      sources,
      chunks: retrievedChunks,
      confidence,
      metadata: {
        model: this.config.model,
        tokensUsed: usage?.totalTokens,
        retrievalTime: Date.now() - startTime,
      },
    };
  }

  /**
   * 流式问答
   */
  async *askStream(
    question: string,
    options?: Partial<RetrievalOptions>
  ): AsyncGenerator<string, void, unknown> {
    const retrievalOptions: RetrievalOptions = {
      query: question,
      topK: options?.topK || this.config.maxSourceChunks,
      rerank: options?.rerank ?? true,
      filters: options?.filters,
    };

    const retrievedChunks = await this.retriever.retrieve(retrievalOptions);

    if (retrievedChunks.length === yield '[无相关文档]') {
      return;
    }

    const prompt = this.buildPrompt(question, retrievedChunks);

    // 流式调用 LLM
    const stream = await this.callLLMStream(prompt);

    for await (const chunk of stream) {
      yield chunk;
    }
  }

  /**
   * 构建提示词
   */
  private buildPrompt(question: string, chunks: HybridSearchResult[]): string {
    const context = chunks
      .slice(0, this.config.maxSourceChunks)
      .map((chunk, i) => {
        const title = chunk.metadata.title || 'Untitled';
        return `[文档 ${i + 1}] ${title}\n${chunk.content}`;
      })
      .join('\n\n---\n\n');

    return `基于以下参考资料，回答用户的问题。回答时必须引用相关文档。

## 参考资料
${context}

## 用户问题
${question}

## 回答要求
1. 只根据提供的参考资料回答，不要编造信息
2. 使用中文回答
3. 如果不确定答案，明确说明
4. 在回答中标注引用的文档来源
5. 答案要准确、简洁、有帮助`;
  }

  /**
   * 调用 LLM 生成答案
   */
  private async callLLM(prompt: string): Promise<{
    answer: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: this.config.systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM API error: ${error}`);
      }

      const data: any = await response.json();
      const choice = data.choices?.[0];

      return {
        answer: choice?.message?.content || '抱歉，无法生成答案。',
        usage: data.usage,
      };
    } catch (error) {
      console.error('LLM call failed:', error);
      // 返回模拟答案用于开发
      return {
        answer: this.getMockAnswer(),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };
    }
  }

  /**
   * 流式调用 LLM
   */
  private async callLLMStream(prompt: string): AsyncGenerator<string, void, unknown> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: this.config.systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM stream error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  }

  /**
   * 提取引用
   */
  private extractCitations(chunks: HybridSearchResult[]): RAGAnswer['sources'] {
    return chunks.slice(0, this.config.maxSourceChunks).map((chunk) => ({
      documentId: chunk.documentId,
      title: chunk.metadata.title || 'Untitled',
      content: chunk.content,
      score: chunk.combinedScore,
      url: chunk.metadata.url,
    }));
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(chunks: HybridSearchResult[], answer: string): number {
    if (chunks.length === 0) return 0;

    // 基于检索分数
    const avgScore = chunks.reduce((sum, c) => sum + c.combinedScore, 0) / chunks.length;

    // 基于结果数量（更多相关结果 = 更高置信度）
    const coverageScore = Math.min(chunks.length / 5, 1);

    // 答案长度惩罚（过短或过长的答案可能不准确）
    const answerLength = answer.length;
    let lengthScore = 1;
    if (answerLength < 50) lengthScore = 0.5;
    else if (answerLength > 2000) lengthScore = 0.8;

    // 综合置信度
    const confidence = avgScore * 0.5 + coverageScore * 0.3 + lengthScore * 0.2;
    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * 获取默认系统提示词
   */
  private getDefaultSystemPrompt(): string {
    return `你是一个知识库助手，专门帮助用户回答关于文档内容的问题。

特点：
- 基于提供的参考资料回答问题
- 回答准确、简洁、有帮助
- 适当引用文档来源
- 如果不确定答案，会明确告知用户`;
  }

  /**
   * 获取模拟答案（用于开发/测试）
   */
  private getMockAnswer(): string {
    return `根据检索到的相关文档，我无法提供确切的答案。这可能是因为：

1. 知识库中没有找到与您问题相关的内容
2. 您的问题可能需要更具体的描述

建议您：
- 尝试使用不同的关键词
- 检查文档是否已正确上传
- 扩大搜索范围`;
  }
}

/**
 * 引用追溯器
 */
export class CitationTracer {
  /**
   * 从答案中提取引用的文档 ID
   */
  extractCitations(answer: string, sources: RAGAnswer['sources']): string[] {
    const citedIds: Set<string> = new Set();

    // 尝试匹配文档编号
    const docRefPattern = /\[文档\s*(\d+)\]/gi;
    let match;

    while ((match = docRefPattern.exec(answer)) !== null) {
      const index = parseInt(match[1], 10) - 1;
      if (sources[index]) {
        citedIds.add(sources[index].documentId);
      }
    }

    // 尝试匹配文档标题
    for (const source of sources) {
      if (source.title && answer.includes(source.title)) {
        citedIds.add(source.documentId);
      }
    }

    return Array.from(citedIds);
  }

  /**
   * 追溯引用的具体段落
   */
  traceSourceChunks(
    answer: string,
    chunks: HybridSearchResult[]
  ): Array<{
    chunk: HybridSearchResult;
    matchedText: string;
  }> {
    const results: Array<{ chunk: HybridSearchResult; matchedText: string }> = [];

    // 找出答案中引用的具体内容
    for (const chunk of chunks) {
      // 简单匹配：查找答案中是否有 chunk 的内容片段
      const content = chunk.content;
      const sentences = content.split(/[。！？\n]/).filter((s) => s.trim());

      for (const sentence of sentences) {
        if (sentence.length > 20 && answer.includes(sentence.substring(0, 30))) {
          results.push({
            chunk,
            matchedText: sentence.trim(),
          });
          break;
        }
      }
    }

    return results;
  }

  /**
   * 生成引用报告
   */
  generateCitationReport(answer: RAGAnswer): string {
    const lines: string[] = ['## 引用报告\n'];

    lines.push(`**置信度**: ${(answer.confidence * 100).toFixed(1)}%`);
    lines.push(`**来源数量**: ${answer.sources.length}`);
    lines.push(`**检索耗时**: ${answer.metadata?.retrievalTime}ms\n`);

    lines.push('### 来源文档');
    for (let i = 0; i < answer.sources.length; i++) {
      const source = answer.sources[i];
      lines.push(`${i + 1}. ${source.title} (相关性: ${(source.score * 100).toFixed(1)}%)`);
    }

    return lines.join('\n');
  }
}
