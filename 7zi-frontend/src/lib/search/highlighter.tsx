/**
 * Smart Search - 搜索结果高亮
 * 支持多词高亮、不同颜色标记、自定义样式
 */

import React from 'react';
import { FuzzyMatchResult } from './fuzzy-search';

export interface HighlightStyle {
  /** 高亮背景色 */
  backgroundColor?: string;
  /** 高亮文字颜色 */
  color?: string;
  /** 字体粗细 */
  fontWeight?: string;
  /** 内边距 */
  padding?: string;
  /** 圆角 */
  borderRadius?: string;
  /** 自定义类名 */
  className?: string;
}

export interface HighlighterOptions {
  /** 默认高亮样式 */
  style?: HighlightStyle;
  /** 匹配索引（从 fuzzyMatch 返回） */
  matchedIndices?: number[];
  /** 高亮模式 */
  mode?: 'full' | 'partial' | 'all';
}

/**
 * 默认高亮样式
 */
export const DEFAULT_HIGHLIGHT_STYLE: HighlightStyle = {
  backgroundColor: '#fef08a', // yellow-200
  color: '#854d0e', // yellow-900
  fontWeight: '600',
  padding: '0 2px',
  borderRadius: '2px'
};

/**
 * 不同类型的高亮主题
 */
export const HIGHLIGHT_THEMES: Record<string, HighlightStyle> = {
  default: DEFAULT_HIGHLIGHT_STYLE,
  blue: {
    backgroundColor: '#bfdbfe',
    color: '#1e40af',
    fontWeight: '600',
    padding: '0 2px',
    borderRadius: '2px'
  },
  green: {
    backgroundColor: '#bbf7d0',
    color: '#166534',
    fontWeight: '600',
    padding: '0 2px',
    borderRadius: '2px'
  },
  red: {
    backgroundColor: '#fecaca',
    color: '#991b1b',
    fontWeight: '600',
    padding: '0 2px',
    borderRadius: '2px'
  },
  purple: {
    backgroundColor: '#e9d5ff',
    color: '#6b21a8',
    fontWeight: '600',
    padding: '0 2px',
    borderRadius: '2px'
  }
};

/**
 * 将字符索引转换为位置区间
 * @param matchedIndices 匹配的字符索引数组
 * @returns 匹配区间数组（start, end）
 */
function indicesToRanges(matchedIndices: number[]): Array<{ start: number; end: number }> {
  if (matchedIndices.length === 0) return [];

  const sortedIndices = [...new Set(matchedIndices)].sort((a, b) => a - b);
  const ranges: Array<{ start: number; end: number }> = [];

  let currentStart = sortedIndices[0];
  let currentEnd = sortedIndices[0];

  for (let i = 1; i < sortedIndices.length; i++) {
    const index = sortedIndices[i];

    // 连续字符合并为同一个区间
    if (index === currentEnd + 1) {
      currentEnd = index;
    } else {
      ranges.push({ start: currentStart, end: currentEnd });
      currentStart = index;
      currentEnd = index;
    }
  }

  // 添加最后一个区间
  ranges.push({ start: currentStart, end: currentEnd });

  return ranges;
}

/**
 * 高亮单个匹配结果
 * @param text 原始文本
 * @param matchResult 匹配结果
 * @param style 高亮样式
 * @returns 高亮后的 React 节点
 */
export function highlightMatch(
  text: string,
  matchResult: FuzzyMatchResult,
  style: HighlightStyle = DEFAULT_HIGHLIGHT_STYLE
): React.ReactNode {
  if (!matchResult.matched || matchResult.matchedIndices.length === 0) {
    return <span>{text}</span>;
  }

  const ranges = indicesToRanges(matchResult.matchedIndices);
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  ranges.forEach(({ start, end }) => {
    // 添加未匹配部分
    if (start > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, start)}</span>);
    }

    // 添加匹配部分
    const highlightedText = text.slice(start, end + 1);
    parts.push(
      <mark
        key={`highlight-${start}`}
        style={style}
        className={style.className}
      >
        {highlightedText}
      </mark>
    );

    lastIndex = end + 1;
  });

  // 添加剩余未匹配部分
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

/**
 * 高亮多个匹配结果（支持多词高亮）
 * @param text 原始文本
 * @param matchResults 匹配结果数组
 * @param options 高亮选项
 * @returns 高亮后的 React 节点
 */
export function highlightMatches(
  text: string,
  matchResults: FuzzyMatchResult[],
  options: HighlighterOptions = {}
): React.ReactNode {
  const {
    style = DEFAULT_HIGHLIGHT_STYLE,
    matchedIndices,
    mode = 'full'
  } = options;

  // 如果没有匹配结果，返回原始文本
  if (matchResults.length === 0 && (!matchedIndices || matchedIndices.length === 0)) {
    return <span>{text}</span>;
  }

  // 合并所有匹配的索引
  const allIndices = matchResults
    .flatMap((m) => m.matchedIndices)
    .concat(matchedIndices || []);

  const indices = [...new Set(allIndices)].sort((a, b) => a - b);

  if (mode === 'partial') {
    // 只高亮部分文本（匹配周围上下文）
    return highlightPartial(text, indices, style);
  } else if (mode === 'all') {
    // 高亮所有匹配字符
    return highlightAll(text, indices, style);
  } else {
    // 默认：完整高亮
    return highlightFull(text, indices, style);
  }
}

/**
 * 完整高亮模式
 */
function highlightFull(
  text: string,
  indices: number[],
  style: HighlightStyle
): React.ReactNode {
  if (indices.length === 0) {
    return <span>{text}</span>;
  }

  const ranges = indicesToRanges(indices);
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  ranges.forEach(({ start, end }) => {
    if (start > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, start)}</span>);
    }

    parts.push(
      <mark
        key={`highlight-${start}`}
        style={style}
        className={style.className}
      >
        {text.slice(start, end + 1)}
      </mark>
    );

    lastIndex = end + 1;
  });

  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

/**
 * 部分高亮模式（只显示匹配周围的上下文）
 */
function highlightPartial(
  text: string,
  indices: number[],
  style: HighlightStyle,
  contextLength: number = 50
): React.ReactNode {
  if (indices.length === 0) {
    return <span>{text.slice(0, contextLength)}{text.length > contextLength ? '...' : ''}</span>;
  }

  // 找到第一个和最后一个匹配的位置
  const firstMatch = Math.min(...indices);
  const lastMatch = Math.max(...indices);

  const start = Math.max(0, firstMatch - contextLength);
  const end = Math.min(text.length, lastMatch + contextLength + 1);

  const preview = text.slice(start, end);
  const relativeIndices = indices
    .filter((i) => i >= start && i < end)
    .map((i) => i - start);

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // 添加省略号（如果开头被截断）
  if (start > 0) {
    parts.push(<span key="ellipsis-start">...</span>);
  }

  const ranges = indicesToRanges(relativeIndices);

  ranges.forEach(({ start: rangeStart, end: rangeEnd }) => {
    if (rangeStart > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{preview.slice(lastIndex, rangeStart)}</span>);
    }

    parts.push(
      <mark
        key={`highlight-${rangeStart}`}
        style={style}
        className={style.className}
      >
        {preview.slice(rangeStart, rangeEnd + 1)}
      </mark>
    );

    lastIndex = rangeEnd + 1;
  });

  if (lastIndex < preview.length) {
    parts.push(<span key={`text-${lastIndex}`}>{preview.slice(lastIndex)}</span>);
  }

  // 添加省略号（如果结尾被截断）
  if (end < text.length) {
    parts.push(<span key="ellipsis-end">...</span>);
  }

  return <>{parts}</>;
}

/**
 * 所有匹配字符独立高亮模式
 */
function highlightAll(
  text: string,
  indices: number[],
  style: HighlightStyle
): React.ReactNode {
  if (indices.length === 0) {
    return <span>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  indices.forEach((index) => {
    // 添加未匹配部分
    if (index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, index)}</span>);
    }

    // 添加匹配字符
    parts.push(
      <mark
        key={`highlight-${index}`}
        style={style}
        className={style.className}
      >
        {text[index]}
      </mark>
    );

    lastIndex = index + 1;
  });

  // 添加剩余未匹配部分
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

/**
 * 获取文本预览（带高亮）
 * @param text 原始文本
 * @param matchResults 匹配结果数组
 * @param maxLength 最大长度
 * @param style 高亮样式
 * @returns 高亮预览
 */
export function getHighlightedPreview(
  text: string,
  matchResults: FuzzyMatchResult[],
  maxLength: number = 200,
  style: HighlightStyle = DEFAULT_HIGHLIGHT_STYLE
): React.ReactNode {
  const indices = matchResults.flatMap((m) => m.matchedIndices);

  if (indices.length === 0) {
    return <span>{text.slice(0, maxLength)}{text.length > maxLength ? '...' : ''}</span>;
  }

  return highlightPartial(text, indices, style, Math.floor(maxLength / 2));
}

/**
 * 多色高亮（为不同的匹配结果使用不同颜色）
 * @param text 原始文本
 * @param matchResults 匹配结果数组（每个结果使用不同的主题）
 * @returns 高亮后的 React 节点
 */
export function highlightMultiColor(
  text: string,
  matchResults: FuzzyMatchResult[]
): React.ReactNode {
  const themes = Object.keys(HIGHLIGHT_THEMES).filter((k) => k !== 'default');
  const parts: React.ReactNode[] = [];
  const usedIndices = new Set<number>();

  matchResults.forEach((match, index) => {
    const themeKey = themes[index % themes.length];
    const theme = HIGHLIGHT_THEMES[themeKey];

    match.matchedIndices.forEach((idx) => {
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        parts.push(
          <mark
            key={`highlight-${index}-${idx}`}
            style={theme}
          >
            {text[idx]}
          </mark>
        );
      }
    });
  });

  // 填充未高亮的字符
  let lastIndex = 0;
  const sortedIndices = [...usedIndices].sort((a, b) => a - b);

  const finalParts: React.ReactNode[] = [];

  sortedIndices.forEach((idx) => {
    if (idx > lastIndex) {
      finalParts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, idx)}</span>);
    }
    // 高亮部分已经在 parts 中添加
    const highlightPart = parts.find((p) =>
      React.isValidElement(p) && p.key === `highlight-${idx}`
    );
    if (highlightPart) {
      finalParts.push(highlightPart);
    }
    lastIndex = idx + 1;
  });

  if (lastIndex < text.length) {
    finalParts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <>{finalParts}</>;
}
