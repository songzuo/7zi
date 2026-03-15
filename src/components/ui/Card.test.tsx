/**
 * @fileoverview Card 组件测试
 * @module src/components/ui/Card.test.tsx
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardImage,
  StatsCard,
} from './Card';

describe('Card Component', () => {
  describe('Basic Rendering', () => {
    it('should render children correctly', () => {
      render(
        <Card>
          <div data-testid="child">Card Content</div>
        </Card>
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should apply default variant and padding styles', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      
      expect(card).toHaveClass('rounded-xl');
      expect(card).toHaveClass('bg-card');
      expect(card).toHaveClass('border');
    });

    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      const { container } = render(<Card variant="default">Content</Card>);
      expect(container.querySelector('.bg-card')).toBeInTheDocument();
    });

    it('should render outlined variant', () => {
      const { container } = render(<Card variant="outlined">Content</Card>);
      expect(container.querySelector('.bg-transparent')).toBeInTheDocument();
    });

    it('should render elevated variant', () => {
      const { container } = render(<Card variant="elevated">Content</Card>);
      expect(container.querySelector('.shadow-lg')).toBeInTheDocument();
    });

    it('should render ghost variant', () => {
      const { container } = render(<Card variant="ghost">Content</Card>);
      expect(container.querySelector('.bg-transparent')).toBeInTheDocument();
    });

    it('should render gradient variant', () => {
      const { container } = render(<Card variant="gradient">Content</Card>);
      expect(container.querySelector('.bg-gradient-to-br')).toBeInTheDocument();
    });
  });

  describe('Padding', () => {
    it('should apply no padding when padding="none"', () => {
      const { container } = render(<Card padding="none">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveClass('p-3');
      expect(card).not.toHaveClass('p-4');
    });

    it('should apply sm padding', () => {
      const { container } = render(<Card padding="sm">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-3');
    });

    it('should apply md padding (default)', () => {
      const { container } = render(<Card padding="md">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-4');
    });

    it('should apply lg padding', () => {
      const { container } = render(<Card padding="lg">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-6');
    });
  });

  describe('Interactions', () => {
    it('should apply hover styles when hoverable is true', () => {
      const { container } = render(<Card hoverable>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('hover:shadow-lg');
      expect(card).toHaveClass('hover:-translate-y-1');
    });

    it('should not apply hover styles by default', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveClass('hover:shadow-lg');
    });

    it('should apply clickable styles when clickable is true', () => {
      const { container } = render(<Card clickable>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('cursor-pointer');
      expect(card).toHaveClass('active:scale-[0.99]');
    });

    it('should handle onClick events', () => {
      const handleClick = vi.fn();
      render(
        <Card onClick={handleClick} clickable>
          Clickable Card
        </Card>
      );
      
      fireEvent.click(screen.getByText('Clickable Card'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Ref forwarding', () => {
    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });
});

describe('CardHeader Component', () => {
  it('should render title', () => {
    render(<CardHeader title="Card Title" />);
    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  it('should render subtitle', () => {
    render(<CardHeader title="Title" subtitle="Subtitle text" />);
    expect(screen.getByText('Subtitle text')).toBeInTheDocument();
  });

  it('should render icon', () => {
    const { container } = render(
      <CardHeader title="Title" icon={<span data-testid="icon">🔔</span>} />
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(container.querySelector('.bg-primary\\/10')).toBeInTheDocument();
  });

  it('should render action', () => {
    render(
      <CardHeader
        title="Title"
        action={<button data-testid="action-btn">Action</button>}
      />
    );
    expect(screen.getByTestId('action-btn')).toBeInTheDocument();
  });

  it('should render children', () => {
    render(
      <CardHeader>
        <span data-testid="child">Custom content</span>
      </CardHeader>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CardHeader title="Title" className="custom-header" />
    );
    const header = container.firstChild as HTMLElement;
    expect(header).toHaveClass('custom-header');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardHeader ref={ref} title="Title" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardBody Component', () => {
  it('should render children', () => {
    render(<CardBody>Body content</CardBody>);
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<CardBody className="custom-body">Content</CardBody>);
    const body = container.firstChild as HTMLElement;
    expect(body).toHaveClass('custom-body');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardBody ref={ref}>Content</CardBody>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardFooter Component', () => {
  it('should render children', () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('should apply alignment styles - left', () => {
    const { container } = render(<CardFooter align="left">Footer</CardFooter>);
    const footer = container.firstChild as HTMLElement;
    expect(footer).toHaveClass('justify-start');
  });

  it('should apply alignment styles - center', () => {
    const { container } = render(<CardFooter align="center">Footer</CardFooter>);
    const footer = container.firstChild as HTMLElement;
    expect(footer).toHaveClass('justify-center');
  });

  it('should apply alignment styles - right (default)', () => {
    const { container } = render(<CardFooter align="right">Footer</CardFooter>);
    const footer = container.firstChild as HTMLElement;
    expect(footer).toHaveClass('justify-end');
  });

  it('should apply alignment styles - between', () => {
    const { container } = render(<CardFooter align="between">Footer</CardFooter>);
    const footer = container.firstChild as HTMLElement;
    expect(footer).toHaveClass('justify-between');
  });

  it('should have border-top style', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    const footer = container.firstChild as HTMLElement;
    expect(footer).toHaveClass('border-t');
  });

  it('should apply custom className', () => {
    const { container } = render(<CardFooter className="custom-footer">Footer</CardFooter>);
    const footer = container.firstChild as HTMLElement;
    expect(footer).toHaveClass('custom-footer');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardFooter ref={ref}>Footer</CardFooter>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardImage Component', () => {
  it('should render image with correct src and alt', () => {
    render(<CardImage src="/test.jpg" alt="Test image" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/test.jpg');
    expect(img).toHaveAttribute('alt', 'Test image');
  });

  it('should apply video aspect ratio by default', () => {
    const { container } = render(<CardImage src="/test.jpg" alt="Test" />);
    expect(container.querySelector('.aspect-video')).toBeInTheDocument();
  });

  it('should apply square aspect ratio', () => {
    const { container } = render(
      <CardImage src="/test.jpg" alt="Test" aspectRatio="square" />
    );
    expect(container.querySelector('.aspect-square')).toBeInTheDocument();
  });

  it('should apply auto aspect ratio', () => {
    const { container } = render(
      <CardImage src="/test.jpg" alt="Test" aspectRatio="auto" />
    );
    expect(container.querySelector('.aspect-video')).not.toBeInTheDocument();
  });

  it('should apply object-cover by default', () => {
    render(<CardImage src="/test.jpg" alt="Test" />);
    const img = screen.getByRole('img');
    expect(img).toHaveClass('object-cover');
  });

  it('should apply object-contain', () => {
    render(<CardImage src="/test.jpg" alt="Test" objectFit="contain" />);
    const img = screen.getByRole('img');
    expect(img).toHaveClass('object-contain');
  });

  it('should apply object-fill', () => {
    render(<CardImage src="/test.jpg" alt="Test" objectFit="fill" />);
    const img = screen.getByRole('img');
    expect(img).toHaveClass('object-fill');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CardImage src="/test.jpg" alt="Test" className="custom-image" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-image');
  });
});

describe('StatsCard Component', () => {
  it('should render label and value', () => {
    render(<StatsCard label="Total Users" value={1000} />);
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
  });

  it('should render string value', () => {
    render(<StatsCard label="Status" value="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should render positive trend', () => {
    render(
      <StatsCard
        label="Revenue"
        value="$5000"
        trend={{ value: 15, isPositive: true }}
      />
    );
    expect(screen.getByText('↑ 15%')).toBeInTheDocument();
    expect(screen.getByText('↑ 15%')).toHaveClass('text-green-500');
  });

  it('should render negative trend', () => {
    render(
      <StatsCard
        label="Expenses"
        value="$2000"
        trend={{ value: 10, isPositive: false }}
      />
    );
    expect(screen.getByText('↓ 10%')).toBeInTheDocument();
    expect(screen.getByText('↓ 10%')).toHaveClass('text-red-500');
  });

  it('should render icon', () => {
    render(
      <StatsCard
        label="Users"
        value={100}
        icon={<span data-testid="stats-icon">👥</span>}
      />
    );
    expect(screen.getByTestId('stats-icon')).toBeInTheDocument();
  });

  it('should apply custom variant', () => {
    const { container } = render(
      <StatsCard label="Users" value={100} variant="elevated" />
    );
    expect(container.querySelector('.shadow-lg')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <StatsCard label="Users" value={100} className="custom-stats" />
    );
    expect(container.querySelector('.custom-stats')).toBeInTheDocument();
  });
});

describe('Card Composition', () => {
  it('should work with all sub-components together', () => {
    const { container } = render(
      <Card variant="elevated" hoverable>
        <CardImage src="/header.jpg" alt="Header" />
        <CardHeader
          title="Card Title"
          subtitle="Card subtitle"
          icon={<span>📊</span>}
          action={<button>Action</button>}
        />
        <CardBody>
          <p>Card body content</p>
        </CardBody>
        <CardFooter align="between">
          <button>Cancel</button>
          <button>Confirm</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card subtitle')).toBeInTheDocument();
    expect(screen.getByText('Card body content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(container.querySelector('.shadow-lg')).toBeInTheDocument();
  });
});
