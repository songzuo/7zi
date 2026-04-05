/**
 * 文档处理管道 - 解析、分块和嵌入生成
 */

import {
  Document,
  DocumentChunk,
  EmbeddingRequest,
  EmbeddingResponse,
  DocumentProcessorConfig,
} from './types';

export class DocumentProcessor {
  private config: Required<DocumentProcessorConfig>;

  constructor(config: DocumentProcessorConfig = {}) {
    this.config = {
      maxChunkSize: config.maxChunkSize ?? 1000,
      chunkOverlap: config.chunkOverlap ?? 200,
      chunkingStrategy: config.chunkingStrategy ?? 'recursive',
      supportedMimeTypes: config.supportedMimeTypes ?? [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/html',
        'text/markdown',
        'application/json',
      ],
    };
  }

  /**
   * 解析文档内容
   */
  async parseDocument(
    file: File | Buffer,
    mimeType: string,
    metadata?: Record<string, any>
  ): Promise<Document> {
    // 验证 MIME 类型
    if (!this.isMimeTypeSupported(mimeType)) {
      throw new Error(`Unsupported MIME type: ${mimeType}`);
    }

    let content: string;

    if (mimeType === 'application/pdf') {
      content = await this.parsePDF(file);
    } else if (
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      content = await this.parseWord(file);
    } else if (mimeType === 'text/html') {
      content = await this.parseHTML(file);
    } else if (mimeType === 'text/markdown') {
      content = await this.parseMarkdown(file);
    } else {
      // text/plain, application/json, etc.
      content = await this.parseText(file);
    }

    return {
      id: this.generateDocumentId(),
      title: metadata?.title || this.extractTitle(content, mimeType),
      content,
      mimeType,
      source: metadata?.source,
      metadata: {
        ...metadata,
        fileSize: file instanceof File ? file.size : file.length,
        processedAt: new Date().toISOString(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * 将文档分块
   */
  async chunkDocument(document: Document): Promise<DocumentChunk[]> {
    const chunks = this.chunkText(document.content, this.config);

    return chunks.map((chunk, index) => ({
      id: this.generateChunkId(document.id, index),
      documentId: document.id,
      content: chunk.text,
      metadata: {
        title: document.title,
        chunkIndex: index,
        startChar: chunk.start,
        endChar: chunk.end,
        documentSource: document.source,
        documentMimeType: document.mimeType,
        documentCreatedAt: document.createdAt?.toISOString(),
      },
    }));
  }

  /**
   * 批量生成嵌入向量
   */
  async generateEmbeddings(
    chunks: DocumentChunk[],
    model: string = 'text-embedding-3-small'
  ): Promise<DocumentChunk[]> {
    if (chunks.length === 0) return [];

    // 分批处理（每批100个文档）
    const batchSize = 100;
    const allChunks: DocumentChunk[] = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((c) => c.content);

      try {
        const embeddings = await this.callEmbeddingAPI(texts, model);

        const batchWithEmbeddings = batch.map((chunk, idx) => ({
          ...chunk,
          embedding: embeddings[idx],
        }));

        allChunks.push(...batchWithEmbeddings);
      } catch (error) {
        console.error(`Failed to generate embeddings for batch ${i / batchSize}:`, error);
        // 添加不包含嵌入的chunk，标记为失败
        allChunks.push(...batch);
      }
    }

    return allChunks;
  }

  // ==================== 私有方法 ====================

  private isMimeTypeSupported(mimeType: string): boolean {
    return this.config.supportedMimeTypes.some((type) => mimeType.startsWith(type));
  }

  private async parsePDF(file: File | Buffer): Promise<string> {
    // 在实际环境中，需要使用 pdf-parse 或类似库
    // 这里返回占位文本
    console.warn('PDF parsing not implemented - using placeholder');
    const buffer = file instanceof File ? await file.arrayBuffer() : file;
    return `[PDF Content - ${buffer.byteLength} bytes]`;
  }

  private async parseWord(file: File | Buffer): Promise<string> {
    // 在实际环境中，需要使用 mammoth 或类似库
    console.warn('Word parsing not implemented - using placeholder');
    const buffer = file instanceof File ? await file.arrayBuffer() : file;
    return `[Word Document Content - ${buffer.byteLength} bytes]`;
  }

  private async parseHTML(file: File | Buffer): Promise<string> {
    let html: string;
    if (file instanceof File) {
      html = await file.text();
    } else {
      html = file.toString('utf-8');
    }

    // 简单的HTML文本提取
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }

  private async parseMarkdown(file: File | Buffer): Promise<string> {
    if (file instanceof File) {
      return await file.text();
    }
    return file.toString('utf-8');
  }

  private async parseText(file: File | Buffer): Promise<string> {
    if (file instanceof File) {
      return await file.text();
    }
    return file.toString('utf-8');
  }

  private extractTitle(content: string, mimeType: string): string {
    if (mimeType === 'text/html') {
      const match = content.match(/<title>(.*?)<\/title>/i);
      if (match) return match[1].trim();
    }

    const lines = content.split('\n').filter((l) => l.trim());
    if (lines.length > 0) {
      return lines[0].substring(0, 100);
    }

    return 'Untitled Document';
  }

  private chunkText(text: string, config: Required<DocumentProcessorConfig>): Array<{
    text: string;
    start: number;
    end: number;
  }> {
    if (config.chunkingStrategy === 'fixed') {
      return this.fixedChunk(text, config.maxChunkSize, config.chunkOverlap);
    } else if (config.chunkingStrategy === 'semantic') {
      // 语义分块需要额外的NLP支持，这里回退到递归分块
      console.warn('Semantic chunking not implemented, falling back to recursive');
    }
    return this.recursiveChunk(text, config.maxChunkSize, config.chunkOverlap);
  }

  private recursiveChunk(
    text: string,
    maxChunkSize: number,
    overlap: number
  ): Array<{ text: string; start: number; end: number }> {
    const chunks: Array<{ text: string; start: number; end: number }> = [];

    // 递归分块分隔符（按优先级）
    const separators = ['\n\n', '\n', '. ', '! ', '? ', '; ', ' ', ''];

    let currentStart = 0;

    while (currentStart < text.length) {
      let chunkEnd = Math.min(currentStart + maxChunkSize, text.length);

      // 如果不是最后一块，尝试在分隔符处分割
      if (chunkEnd < text.length) {
        for (const separator of separators) {
          const lastSeparator = text.lastIndexOf(separator, chunkEnd);
          if (lastSeparator > currentStart + maxChunkSize * 0.5) {
            chunkEnd = lastSeparator + separator.length;
            break;
          }
        }
      }

      chunks.push({
        text: text.substring(currentStart, chunkEnd).trim(),
        start: currentStart,
        end: chunkEnd,
      });

      // 计算下一个块的起始位置（考虑重叠）
      currentStart = chunkEnd - overlap;
      if (currentStart < 0) currentStart = 0;
    }

    return chunks;
  }

  private fixedChunk(
    text: string,
    maxChunkSize: number,
    overlap: number
  ): Array<{ text: string; start: number; end: number }> {
    const chunks: Array<{ text: string; start: number; end: number }> = [];
    let currentStart = 0;

    while (currentStart < text.length) {
      const chunkEnd = Math.min(currentStart + maxChunkSize, text.length);

      chunks.push({
        text: text.substring(currentStart, chunkEnd),
        start: currentStart,
        end: chunkEnd,
      });

      currentStart = chunkEnd - overlap;
    }

    return chunks;
  }

  private async callEmbeddingAPI(
    texts: string[],
    model: string
  ): Promise<number[][]> {
    // 这里应该调用实际的嵌入API（如 OpenAI、Cohere 等）
    // 示例：调用 OpenAI embeddings API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}`,
      },
      body: JSON.stringify({
        input: texts,
        model,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding API error: ${error}`);
    }

    const data: any = await response.json();
    return data.data.map((item: any) => item.embedding);
  }

  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateChunkId(documentId: string, chunkIndex: number): string {
    return `chunk_${documentId}_${chunkIndex}`;
  }
}

// 导出分块器类
export class DocumentChunker {
  private processor: DocumentProcessor;

  constructor(config?: DocumentProcessorConfig) {
    this.processor = new DocumentProcessor(config);
  }

  async chunk(text: string, metadata?: Record<string, any>): Promise<DocumentChunk[]> {
    const document: Document = {
      id: this.processor['generateDocumentId'](),
      title: metadata?.title || 'Untitled',
      content: text,
      metadata,
    };

    return this.processor.chunkDocument(document);
  }
}
