import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsButton } from '@/components/SettingsButton';
import { SettingsProvider } from '@/contexts/SettingsContext';

// Mock next-intl
vi.mock('next-intl', () => ({
  useLocale: () => 'zh',
}));

// Mock next/navigation
vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/test',
}));

// Mock ThemeProvider
vi.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'system',
    setTheme: vi.fn(),
  }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

describe('SettingsButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings button correctly', async () => {
    render(
      <TestWrapper>
        <SettingsButton />
      </TestWrapper>
    );
    
    expect(screen.getByLabelText('设置')).toBeInTheDocument();
  });

  it('renders compact button correctly', async () => {
    render(
      <TestWrapper>
        <SettingsButton compact />
      </TestWrapper>
    );
    
    const button = screen.getByLabelText('设置');
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveTextContent('设置'); // compact mode doesn't show text
  });

  it('renders full button with text', async () => {
    render(
      <TestWrapper>
        <SettingsButton compact={false} />
      </TestWrapper>
    );
    
    const button = screen.getByLabelText('设置');
    expect(button).toHaveTextContent('设置');
  });

  it('opens settings panel when clicked', async () => {
    render(
      <TestWrapper>
        <SettingsButton />
      </TestWrapper>
    );
    
    const button = screen.getByLabelText('设置');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('⚙️ 设置')).toBeInTheDocument();
    });
  });

  it('closes settings panel when clicked again', async () => {
    render(
      <TestWrapper>
        <SettingsButton />
      </TestWrapper>
    );
    
    const button = screen.getByLabelText('设置');
    
    // Open
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('⚙️ 设置')).toBeInTheDocument();
    });
    
    // Close
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.queryByText('⚙️ 设置')).not.toBeInTheDocument();
    });
  });

  it('closes panel when clicking outside', async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <TestWrapper>
          <SettingsButton />
        </TestWrapper>
      </div>
    );
    
    const button = screen.getByLabelText('设置');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('⚙️ 设置')).toBeInTheDocument();
    });
    
    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));
    
    await waitFor(() => {
      expect(screen.queryByText('⚙️ 设置')).not.toBeInTheDocument();
    });
  });

  it('closes panel when pressing Escape', async () => {
    render(
      <TestWrapper>
        <SettingsButton />
      </TestWrapper>
    );
    
    const button = screen.getByLabelText('设置');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('⚙️ 设置')).toBeInTheDocument();
    });
    
    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    
    await waitFor(() => {
      expect(screen.queryByText('⚙️ 设置')).not.toBeInTheDocument();
    });
  });

  it('applies custom className', async () => {
    const { container } = render(
      <TestWrapper>
        <SettingsButton className="custom-class" />
      </TestWrapper>
    );
    
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('sets aria-expanded correctly', async () => {
    render(
      <TestWrapper>
        <SettingsButton />
      </TestWrapper>
    );
    
    const button = screen.getByLabelText('设置');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });
});