/**
 * KnowledgeFilters 组件测试
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KnowledgeFilters from '@/components/knowledge-lattice/KnowledgeFilters';
import { KnowledgeType, RelationType } from '@/lib/agents/knowledge-lattice';

// Mock Three.js
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

describe('KnowledgeFilters', () => {
  const defaultProps = {
    selectedTypes: [] as KnowledgeType[],
    selectedRelations: [] as RelationType[],
    onTypeChange: vi.fn(),
    onRelationChange: vi.fn(),
  };

  it('should render filter buttons', () => {
    render(<KnowledgeFilters {...defaultProps} />);

    // Check knowledge type buttons
    expect(screen.getByText('概念')).toBeDefined();
    expect(screen.getByText('规则')).toBeDefined();
    expect(screen.getByText('经验')).toBeDefined();
    expect(screen.getByText('技能')).toBeDefined();
  });

  it('should call onTypeChange when type button clicked', () => {
    const onTypeChange = vi.fn();
    render(<KnowledgeFilters {...defaultProps} onTypeChange={onTypeChange} />);

    const conceptButton = screen.getByText('概念');
    fireEvent.click(conceptButton);

    expect(onTypeChange).toHaveBeenCalledWith([KnowledgeType.CONCEPT]);
  });

  it('should show selected types as active', () => {
    render(
      <KnowledgeFilters
        {...defaultProps}
        selectedTypes={[KnowledgeType.CONCEPT]}
      />
    );

    const conceptButton = screen.getByText('概念');
    expect(conceptButton.className).toContain('bg-blue-600');
  });

  it('should toggle type selection', () => {
    const onTypeChange = vi.fn();
    render(
      <KnowledgeFilters
        {...defaultProps}
        selectedTypes={[KnowledgeType.CONCEPT]}
        onTypeChange={onTypeChange}
      />
    );

    const conceptButton = screen.getByText('概念');
    fireEvent.click(conceptButton);

    expect(onTypeChange).toHaveBeenCalledWith([]);
  });

  it('should call onRelationChange when relation button clicked', () => {
    const onRelationChange = vi.fn();
    render(<KnowledgeFilters {...defaultProps} onRelationChange={onRelationChange} />);

    const partialOrderButton = screen.getByText('偏序');
    fireEvent.click(partialOrderButton);

    expect(onRelationChange).toHaveBeenCalledWith([RelationType.PARTIAL_ORDER]);
  });
});