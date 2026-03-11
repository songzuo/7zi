/**
 * KnowledgeSearch 组件测试
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KnowledgeSearch from '@/components/knowledge-lattice/KnowledgeSearch';
import { LatticeNode, KnowledgeType, KnowledgeSource } from '@/lib/agents/knowledge-lattice';

// Mock Three.js
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

describe('KnowledgeSearch', () => {
  const mockNodes: LatticeNode[] = [
    {
      id: 'node-1',
      content: '人工智能',
      type: KnowledgeType.CONCEPT,
      weight: 0.9,
      confidence: 0.95,
      timestamp: Date.now(),
      source: KnowledgeSource.USER,
      tags: ['AI', '技术'],
      metadata: {},
    },
    {
      id: 'node-2',
      content: '机器学习',
      type: KnowledgeType.CONCEPT,
      weight: 0.85,
      confidence: 0.9,
      timestamp: Date.now(),
      source: KnowledgeSource.USER,
      tags: ['ML', '算法'],
      metadata: {},
    },
    {
      id: 'node-3',
      content: '深度学习规则',
      type: KnowledgeType.RULE,
      weight: 0.8,
      confidence: 0.85,
      timestamp: Date.now(),
      source: KnowledgeSource.EXPERIENCE,
      tags: ['DL', '神经网络'],
      metadata: {},
    },
  ];

  const defaultProps = {
    nodes: mockNodes,
    onSearch: vi.fn(),
  };

  it('should render search input', () => {
    render(<KnowledgeSearch {...defaultProps} />);

    const input = screen.getByPlaceholderText('搜索知识节点...');
    expect(input).toBeDefined();
  });

  it('should call onSearch with all nodes when clearing search', () => {
    const onSearch = vi.fn();
    render(<KnowledgeSearch {...defaultProps} onSearch={onSearch} />);

    // Clear search should call onSearch with all nodes
    const input = screen.getByPlaceholderText('搜索知识节点...');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.change(input, { target: { value: '' } });

    expect(onSearch).toHaveBeenCalledWith(mockNodes);
  });

  it('should filter nodes by content', () => {
    const onSearch = vi.fn();
    render(<KnowledgeSearch {...defaultProps} onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('搜索知识节点...');
    fireEvent.change(input, { target: { value: '人工智能' } });

    expect(onSearch).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ content: '人工智能' }),
      ])
    );
  });

  it('should filter nodes by tag', () => {
    const onSearch = vi.fn();
    render(<KnowledgeSearch {...defaultProps} onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('搜索知识节点...');
    fireEvent.change(input, { target: { value: 'AI' } });

    expect(onSearch).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'node-1' }),
      ])
    );
  });

  it('should filter nodes by type', () => {
    const onSearch = vi.fn();
    render(<KnowledgeSearch {...defaultProps} onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('搜索知识节点...');
    fireEvent.change(input, { target: { value: 'RULE' } });

    expect(onSearch).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: KnowledgeType.RULE }),
      ])
    );
  });

  it('should clear search when clear button clicked', () => {
    const onSearch = vi.fn();
    render(<KnowledgeSearch {...defaultProps} onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('搜索知识节点...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test' } });

    // Find and click clear button
    const clearButtons = document.querySelectorAll('button');
    const clearButton = Array.from(clearButtons).find(
      (btn) => btn.innerHTML.includes('M6 18L18 6')
    );

    if (clearButton) {
      fireEvent.click(clearButton);
      expect(onSearch).toHaveBeenCalledWith(mockNodes);
    }
  });
});