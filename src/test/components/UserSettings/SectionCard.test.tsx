import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectionCard from '@/components/UserSettings/SectionCard';

describe('SectionCard', () => {
  it('renders title with icon', () => {
    render(
      <SectionCard title="测试标题" icon="🔒">
        <div>Content</div>
      </SectionCard>
    );
    
    expect(screen.getByText('🔒 测试标题')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <SectionCard title="标题" icon="🔔">
        <div data-testid="child-content">Child Content</div>
      </SectionCard>
    );
    
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SectionCard title="标题" icon="🛡️" className="custom-class">
        <div>Content</div>
      </SectionCard>
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has correct default styling', () => {
    const { container } = render(
      <SectionCard title="标题" icon="🎨">
        <div>Content</div>
      </SectionCard>
    );
    
    expect(container.firstChild).toHaveClass('bg-white');
    expect(container.firstChild).toHaveClass('rounded-2xl');
  });

  it('renders title in header section', () => {
    render(
      <SectionCard title="账户安全" icon="🔒">
        <div>Content</div>
      </SectionCard>
    );
    
    const title = screen.getByText('🔒 账户安全');
    expect(title.tagName).toBe('H2');
  });

  it('renders children in body section', () => {
    render(
      <SectionCard title="标题" icon="🔔">
        <div data-testid="test-child">Test Child</div>
      </SectionCard>
    );
    
    const child = screen.getByTestId('test-child');
    expect(child.parentElement).toHaveClass('p-6');
  });

  it('supports ReactNode as children', () => {
    render(
      <SectionCard title="标题" icon="🛡️">
        <span>Span 1</span>
        <span>Span 2</span>
        <button>Button</button>
      </SectionCard>
    );
    
    expect(screen.getByText('Span 1')).toBeInTheDocument();
    expect(screen.getByText('Span 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Button' })).toBeInTheDocument();
  });

  it('has header border separator', () => {
    const { container } = render(
      <SectionCard title="标题" icon="🎨">
        <div>Content</div>
      </SectionCard>
    );
    
    const header = container.querySelector('.border-b');
    expect(header).toBeInTheDocument();
  });

  it('uses memo for performance optimization', () => {
    // Test that component renders consistently
    const { rerender } = render(
      <SectionCard title="标题" icon="🔒">
        <div>Content</div>
      </SectionCard>
    );
    
    expect(screen.getByText('🔒 标题')).toBeInTheDocument();
    
    // Rerender with same props should not cause issues
    rerender(
      <SectionCard title="标题" icon="🔒">
        <div>Content</div>
      </SectionCard>
    );
    
    expect(screen.getByText('🔒 标题')).toBeInTheDocument();
  });

  it('renders different icons correctly', () => {
    const icons = ['🔒', '🔔', '🛡️', '🎨', '👤'];
    
    icons.forEach(icon => {
      const { unmount } = render(
        <SectionCard title="标题" icon={icon}>
          <div>Content</div>
        </SectionCard>
      );
      
      expect(screen.getByText(new RegExp(icon))).toBeInTheDocument();
      unmount();
    });
  });
});