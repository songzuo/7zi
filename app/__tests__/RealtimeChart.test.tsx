import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import RealtimeChart, { Sparkline } from '../components/RealtimeChart';

// Mock canvas context
const mockContext = {
  clearRect: vi.fn(),
  strokeRect: vi.fn(),
  fillRect: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  arc: vi.fn(),
  quadraticCurveTo: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  measureText: vi.fn(() => ({ width: 0 })),
  fillText: vi.fn(),
  strokeText: vi.fn(),
};

HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as any;

describe('RealtimeChart Component', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders chart with title', () => {
    render(<RealtimeChart title="Test Chart" />);
    expect(screen.getByText('Test Chart')).toBeTruthy();
  });

  it('shows realtime indicator', () => {
    render(<RealtimeChart title="Test Chart" />);
    expect(screen.getByText('实时')).toBeTruthy();
  });

  it('displays current value label', () => {
    render(<RealtimeChart title="Test Chart" />);
    expect(screen.getByText('当前值')).toBeTruthy();
  });

  it('renders canvas element', () => {
    render(<RealtimeChart title="Test Chart" />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('accepts custom props', () => {
    const { container } = render(
      <RealtimeChart
        title="Custom Chart"
        maxDataPoints={30}
        updateInterval={1000}
        color="green"
        height={300}
      />
    );
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByText('Custom Chart')).toBeTruthy();
  });

  it('supports different colors', () => {
    const colors = ['blue', 'green', 'red', 'purple'] as const;
    colors.forEach((color) => {
      const { unmount } = render(<RealtimeChart title={`Chart ${color}`} color={color} />);
      expect(screen.getByText(`Chart ${color}`)).toBeTruthy();
      unmount();
    });
  });
});

describe('Sparkline Component', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders sparkline with data', () => {
    const data = [10, 20, 15, 30, 25, 40, 35];
    render(<Sparkline data={data} />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('accepts custom dimensions', () => {
    const data = [10, 20, 30];
    render(<Sparkline data={data} width={200} height={50} />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('supports different colors', () => {
    const data = [10, 20, 30];
    const colors = ['blue', 'green', 'red', 'purple'] as const;
    colors.forEach((color) => {
      const { unmount } = render(<Sparkline data={data} color={color} />);
      expect(document.querySelector('canvas')).toBeTruthy();
      unmount();
    });
  });

  it('handles empty data gracefully', () => {
    render(<Sparkline data={[]} />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('handles single data point', () => {
    render(<Sparkline data={[50]} />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });
});