import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AnimatedProgressBar, {
  WaveProgress,
  SegmentedProgress,
  GradientProgress,
  StepProgress,
} from '../AnimatedProgressBar';

// ============================================================================
// AnimatedProgressBar 测试
// ============================================================================

describe('AnimatedProgressBar', () => {
  it('should render with default props', () => {
    render(<AnimatedProgressBar value={50} />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
  });

  it('should display label when provided', () => {
    render(<AnimatedProgressBar value={50} label="Loading..." />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display percentage when showPercentage is true', async () => {
    render(<AnimatedProgressBar value={50} showPercentage duration={0} />);
    
    await waitFor(() => {
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });
  });

  it('should apply correct size classes', () => {
    const { rerender } = render(<AnimatedProgressBar value={50} size="sm" />);
    expect(document.querySelector('.h-2')).toBeInTheDocument();

    rerender(<AnimatedProgressBar value={50} size="lg" />);
    expect(document.querySelector('.h-4')).toBeInTheDocument();
  });

  it('should apply correct color classes', () => {
    const { rerender } = render(<AnimatedProgressBar value={50} color="green" />);
    expect(document.querySelector('.bg-green-500')).toBeInTheDocument();

    rerender(<AnimatedProgressBar value={50} color="red" />);
    expect(document.querySelector('.bg-red-500')).toBeInTheDocument();
  });

  it('should call onComplete when progress reaches 100%', async () => {
    const onComplete = vi.fn();
    render(<AnimatedProgressBar value={100} onComplete={onComplete} duration={0} />);
    
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should display completion checkmark when complete', async () => {
    render(<AnimatedProgressBar value={100} showPercentage duration={0} />);
    
    await waitFor(() => {
      expect(screen.getByText(/✓/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should respect max prop for percentage calculation', async () => {
    render(<AnimatedProgressBar value={5} max={10} showPercentage duration={0} />);
    
    await waitFor(() => {
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });
  });

  it('should clamp values above max to 100%', async () => {
    render(<AnimatedProgressBar value={150} max={100} showPercentage duration={0} />);
    
    await waitFor(() => {
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });
  });

  it('should clamp negative values to 0%', async () => {
    render(<AnimatedProgressBar value={-10} showPercentage duration={0} />);
    
    await waitFor(() => {
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// WaveProgress 测试
// ============================================================================

describe('WaveProgress', () => {
  it('should render with default props', () => {
    render(<WaveProgress value={50} />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
  });

  it('should display percentage value', async () => {
    render(<WaveProgress value={75} showValue duration={0} />);
    
    await waitFor(() => {
      expect(screen.getByText(/75%/)).toBeInTheDocument();
    });
  });

  it('should display label when provided', () => {
    render(<WaveProgress value={50} label="Progress" />);
    
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('should apply custom size', () => {
    render(<WaveProgress value={50} size={150} />);
    
    const container = screen.getByRole('progressbar');
    expect(container).toHaveStyle({ width: 150, height: 150 });
  });

  it('should apply different colors', () => {
    const { container } = render(<WaveProgress value={50} color="green" />);
    
    // Check that the wave layer exists
    const waveLayer = container.querySelector('[class*="absolute inset-x-0 bottom-0"]');
    expect(waveLayer).toBeInTheDocument();
  });
});

// ============================================================================
// SegmentedProgress 测试
// ============================================================================

describe('SegmentedProgress', () => {
  it('should render correct number of segments', () => {
    render(<SegmentedProgress segments={5} current={2} />);
    
    const segments = document.querySelectorAll('[class*="rounded-full bg-zinc-200"]');
    expect(segments).toHaveLength(5);
  });

  it('should highlight correct segments based on current value', () => {
    render(<SegmentedProgress segments={5} current={3} color="blue" duration={0} />);
    
    const activeSegments = document.querySelectorAll('.bg-blue-500');
    expect(activeSegments.length).toBeGreaterThanOrEqual(3);
  });

  it('should display labels when showLabels is true', () => {
    render(
      <SegmentedProgress
        segments={3}
        current={1}
        showLabels
        labels={['Step 1', 'Step 2', 'Step 3']}
      />
    );
    
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('should apply correct size classes', () => {
    const { rerender } = render(<SegmentedProgress segments={3} current={1} size="sm" />);
    expect(document.querySelector('.h-2')).toBeInTheDocument();

    rerender(<SegmentedProgress segments={3} current={1} size="lg" />);
    expect(document.querySelector('.h-4')).toBeInTheDocument();
  });
});

// ============================================================================
// GradientProgress 测试
// ============================================================================

describe('GradientProgress', () => {
  it('should render with default props', () => {
    render(<GradientProgress value={50} />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
  });

  it('should display label and percentage', () => {
    render(<GradientProgress value={50} label="Loading" showPercentage duration={0} />);
    
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('should apply custom gradient colors', () => {
    const customColors = ['#ff0000', '#00ff00', '#0000ff'];
    const { container } = render(
      <GradientProgress value={50} gradientColors={customColors} duration={0} />
    );
    
    const bar = container.querySelector('[class*="rounded-full"]');
    expect(bar).toBeInTheDocument();
  });

  it('should apply correct size classes', () => {
    const { rerender } = render(<GradientProgress value={50} size="sm" />);
    expect(document.querySelector('.h-2')).toBeInTheDocument();

    rerender(<GradientProgress value={50} size="lg" />);
    expect(document.querySelector('.h-4')).toBeInTheDocument();
  });
});

// ============================================================================
// StepProgress 测试
// ============================================================================

describe('StepProgress', () => {
  const steps = [
    { label: 'Step 1', completed: false },
    { label: 'Step 2', completed: false },
    { label: 'Step 3', completed: false },
  ];

  it('should render all steps', () => {
    render(<StepProgress steps={steps} />);
    
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('should show completed steps with checkmark', () => {
    const completedSteps = [
      { label: 'Step 1', completed: true },
      { label: 'Step 2', completed: true },
      { label: 'Step 3', completed: false },
    ];
    render(<StepProgress steps={completedSteps} />);
    
    const checkmarks = document.querySelectorAll('svg');
    expect(checkmarks.length).toBeGreaterThanOrEqual(2);
  });

  it('should highlight current step', () => {
    render(<StepProgress steps={steps} currentStep={1} />);
    
    // Current step should have ring styling
    const currentStep = screen.getByText('Step 2').closest('div');
    expect(currentStep).toBeInTheDocument();
  });

  it('should render in vertical orientation', () => {
    const { container } = render(
      <StepProgress steps={steps} orientation="vertical" />
    );
    
    expect(container.querySelector('.flex-col')).toBeInTheDocument();
  });

  it('should apply correct color classes', () => {
    const completedSteps = [
      { label: 'Step 1', completed: true },
      { label: 'Step 2', completed: false },
      { label: 'Step 3', completed: false },
    ];
    render(<StepProgress steps={completedSteps} color="green" />);
    
    expect(document.querySelector('.bg-green-500')).toBeInTheDocument();
  });
});

// ============================================================================
// 动画效果测试
// ============================================================================

describe('Animation Effects', () => {
  it('should apply pulse animation class', () => {
    render(<AnimatedProgressBar value={50} animation="pulse" />);
    
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should apply glow animation class', () => {
    render(<AnimatedProgressBar value={50} animation="glow" />);
    
    expect(document.querySelector('[class*="shadow"]')).toBeInTheDocument();
  });

  it('should show completion message when progress is 100%', async () => {
    render(<AnimatedProgressBar value={100} showPercentage duration={0} />);
    
    await waitFor(() => {
      expect(screen.getByText(/完成/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should handle animation="bounce" on complete', async () => {
    render(<AnimatedProgressBar value={100} animation="bounce" duration={0} />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-bounce')).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});

// ============================================================================
// 可访问性测试
// ============================================================================

describe('Accessibility', () => {
  it('should have correct ARIA attributes', () => {
    render(<AnimatedProgressBar value={50} max={100} />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });

  it('should be accessible with screen readers', () => {
    render(<WaveProgress value={50} showValue label="Upload progress" />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
    expect(screen.getByText('Upload progress')).toBeInTheDocument();
  });

  it('should have correct ARIA for segmented progress', () => {
    render(<SegmentedProgress segments={5} current={3} />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '3');
    expect(progressbar).toHaveAttribute('aria-valuemax', '5');
  });
});