/**
 * Smart Search - 高亮器测试
 * v1.12.3
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import {
  highlightMatch,
  highlightMatches,
  getHighlightedPreview,
  highlightMultiColor,
  DEFAULT_HIGHLIGHT_STYLE,
  HIGHLIGHT_THEMES
} from '../highlighter';
import { type FuzzyMatchResult } from '../fuzzy-search';

describe('highlightMatch', () => {
  it('应该高亮匹配的字符', () => {
    const matchResult: FuzzyMatchResult = {
      matched: true,
      score: 1,
      matchedIndices: [0, 1, 2],
      distance: 0
    };

    const result = highlightMatch('hello', matchResult);
    expect(result).toBeTruthy();
  });

  it('不匹配时应该返回原始文本', () => {
    const matchResult: FuzzyMatchResult = {
      matched: false,
      score: 0,
      matchedIndices: [],
      distance: 3
    };

    const result = highlightMatch('hello', matchResult);
    const { container } = render(result as React.ReactElement);
    expect(container.textContent).toBe('hello');
  });

  it('应该使用自定义样式', () => {
    const matchResult: FuzzyMatchResult = {
      matched: true,
      score: 1,
      matchedIndices: [0, 1],
      distance: 0
    };

    const customStyle = {
      backgroundColor: '#ff0000',
      color: '#ffffff'
    };

    const result = highlightMatch('hello', matchResult, customStyle);
    expect(result).toBeTruthy();
  });
});

describe('highlightMatches', () => {
  it('应该高亮多个匹配结果', () => {
    const matchResults: FuzzyMatchResult[] = [
      { matched: true, score: 1, matchedIndices: [0, 1], distance: 0 },
      { matched: true, score: 0.8, matchedIndices: [3, 4], distance: 1 }
    ];

    const result = highlightMatches('hello', matchResults);
    expect(result).toBeTruthy();
  });

  it('空匹配结果应该返回原始文本', () => {
    const result = highlightMatches('hello', []);
    const { container } = render(result as React.ReactElement);
    expect(container.textContent).toBe('hello');
  });

  it('应该支持部分高亮模式', () => {
    const matchResults: FuzzyMatchResult[] = [
      { matched: true, score: 1, matchedIndices: [0, 1], distance: 0 }
    ];

    const result = highlightMatches('hello world test', matchResults, {
      mode: 'partial'
    });
    expect(result).toBeTruthy();
  });

  it('应该支持完整高亮模式', () => {
    const matchResults: FuzzyMatchResult[] = [
      { matched: true, score: 1, matchedIndices: [0, 1], distance: 0 }
    ];

    const result = highlightMatches('hello', matchResults, {
      mode: 'full'
    });
    expect(result).toBeTruthy();
  });

  it('应该支持所有字符高亮模式', () => {
    const matchResults: FuzzyMatchResult[] = [
      { matched: true, score: 1, matchedIndices: [0, 2, 4], distance: 0 }
    ];

    const result = highlightMatches('hello', matchResults, {
      mode: 'all'
    });
    expect(result).toBeTruthy();
  });
});

describe('getHighlightedPreview', () => {
  it('应该生成带高亮的预览', () => {
    const matchResults: FuzzyMatchResult[] = [
      { matched: true, score: 1, matchedIndices: [0, 1, 2], distance: 0 }
    ];

    const longText = 'This is a very long text that should be truncated';
    const result = getHighlightedPreview(longText, matchResults, 50);

    expect(result).toBeTruthy();
    const { container } = render(result as React.ReactElement);
    expect(container.textContent?.length).toBeLessThanOrEqual(60); // 预览长度 + ...
  });

  it('无匹配时应该返回普通预览', () => {
    const result = getHighlightedPreview('hello world', [], 10);

    const { container } = render(result as React.ReactElement);
    expect(container.textContent).toBe('hello wo');
  });

  it('短文本不应该被截断', () => {
    const matchResults: FuzzyMatchResult[] = [
      { matched: true, score: 1, matchedIndices: [0, 1], distance: 0 }
    ];

    const result = getHighlightedPreview('hello', matchResults, 100);
    const { container } = render(result as React.ReactElement);
    expect(container.textContent).toBe('hello');
  });
});

describe('highlightMultiColor', () => {
  it('应该使用不同颜色高亮', () => {
    const matchResults: FuzzyMatchResult[] = [
      { matched: true, score: 1, matchedIndices: [0, 1], distance: 0 },
      { matched: true, score: 0.8, matchedIndices: [3, 4], distance: 1 }
    ];

    const result = highlightMultiColor('hello', matchResults);
    expect(result).toBeTruthy();
  });

  it('空匹配应该返回原始文本', () => {
    const result = highlightMultiColor('hello', []);
    const { container } = render(result as React.ReactElement);
    expect(container.textContent).toBe('hello');
  });
});

describe('样式和主题', () => {
  it('默认高亮样式应该存在', () => {
    expect(DEFAULT_HIGHLIGHT_STYLE).toBeDefined();
    expect(DEFAULT_HIGHLIGHT_STYLE.backgroundColor).toBeDefined();
    expect(DEFAULT_HIGHLIGHT_STYLE.color).toBeDefined();
  });

  it('高亮主题应该包含多个选项', () => {
    expect(HIGHLIGHT_THEMES).toBeDefined();
    expect(Object.keys(HIGHLIGHT_THEMES)).toContain('default');
    expect(Object.keys(HIGHLIGHT_THEMES)).toContain('blue');
    expect(Object.keys(HIGHLIGHT_THEMES)).toContain('green');
  });

  it('所有主题应该有有效的样式', () => {
    Object.values(HIGHLIGHT_THEMES).forEach((theme) => {
      expect(theme).toHaveProperty('backgroundColor');
      expect(theme).toHaveProperty('color');
    });
  });
});

describe('边界情况', () => {
  it('应该处理空文本', () => {
    const matchResult: FuzzyMatchResult = {
      matched: true,
      score: 1,
      matchedIndices: [],
      distance: 0
    };

    const result = highlightMatch('', matchResult);
    const { container } = render(result as React.ReactElement);
    expect(container.textContent).toBe('');
  });

  it('应该处理超出范围的索引', () => {
    const matchResult: FuzzyMatchResult = {
      matched: true,
      score: 1,
      matchedIndices: [0, 100, 200], // 超出文本长度
      distance: 0
    };

    const result = highlightMatch('hello', matchResult);
    expect(result).toBeTruthy();
  });

  it('应该处理重复索引', () => {
    const matchResult: FuzzyMatchResult = {
      matched: true,
      score: 1,
      matchedIndices: [0, 0, 0, 1, 1], // 重复索引
      distance: 0
    };

    const result = highlightMatch('hello', matchResult);
    expect(result).toBeTruthy();
  });

  it('应该处理连续索引', () => {
    const matchResult: FuzzyMatchResult = {
      matched: true,
      score: 1,
      matchedIndices: [0, 1, 2, 3, 4], // 连续索引
      distance: 0
    };

    const result = highlightMatch('hello', matchResult);
    expect(result).toBeTruthy();
  });
});

describe('性能测试', () => {
  it('应该在合理时间内完成大量高亮', () => {
    const longText = 'a'.repeat(1000);
    const matchResult: FuzzyMatchResult = {
      matched: true,
      score: 1,
      matchedIndices: Array.from({ length: 100 }, (_, i) => i * 10),
      distance: 0
    };

    const start = performance.now();
    const result = highlightMatch(longText, matchResult);
    const end = performance.now();

    const duration = end - start;
    expect(duration).toBeLessThan(100); // 100ms 内完成
  });

  it('应该高效处理多个匹配结果', () => {
    const matchResults = Array.from({ length: 100 }, (_, i) => ({
      matched: true as const,
      score: 1,
      matchedIndices: [i, i + 1],
      distance: 0
    }));

    const start = performance.now();
    const result = highlightMatches('a'.repeat(200), matchResults);
    const end = performance.now();

    const duration = end - start;
    expect(duration).toBeLessThan(200); // 200ms 内完成
  });
});
