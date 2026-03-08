/**
 * @fileoverview LanguageSwitcher 组件测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageSwitcher, LanguageSwitcherCompact } from '../../components/LanguageSwitcher';
import { useLocale } from 'next-intl';

// Mock next-intl
vi.mock('next-intl', () => ({
  useLocale: () => 'zh',
}));

// Mock i18n routing
const mockReplace = vi.fn();
vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  usePathname: () => '/test-path',
}));

// Mock i18n config
vi.mock('@/i18n/config', () => ({
  locales: ['zh', 'en'],
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('renders current locale flag and name', () => {
    render(<LanguageSwitcher />);

    // Current locale is zh, so should show zh flag and name in the button
    const zhFlag = screen.getByText('🇨🇳');
    const zhText = screen.getByText('中文');
    
    expect(zhFlag).toBeInTheDocument();
    expect(zhText).toBeInTheDocument();
  });

  it('renders dropdown arrow icon', () => {
    const { container } = render(<LanguageSwitcher />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders switch language button', () => {
    render(<LanguageSwitcher />);

    const button = screen.getByRole('button', { name: 'Switch language' });
    expect(button).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LanguageSwitcher className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows both language options when dropdown is open', async () => {
    render(<LanguageSwitcher />);

    // Click to open dropdown
    const button = screen.getByRole('button', { name: 'Switch language' });
    fireEvent.click(button);

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Both flags should be in the document (current in button + other in dropdown)
    expect(screen.getByText('🇨🇳')).toBeInTheDocument();
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
  });

  it('shows checkmark for current locale in dropdown', async () => {
    render(<LanguageSwitcher />);

    // Open dropdown
    const button = screen.getByRole('button', { name: 'Switch language' });
    fireEvent.click(button);

    // Wait for dropdown and check for checkmark SVG
    await waitFor(() => {
      const checkmark = screen.getByLabelText('Switch language').closest('div')?.querySelector('svg');
      expect(checkmark).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('has correct button styling', () => {
    render(<LanguageSwitcher />);

    const button = screen.getByRole('button', { name: 'Switch language' });
    expect(button).toHaveClass('flex');
    expect(button).toHaveClass('items-center');
    expect(button).toHaveClass('gap-2');
  });

  it('switches locale when option clicked', async () => {
    render(<LanguageSwitcher />);

    // Open dropdown
    const button = screen.getByRole('button', { name: 'Switch language' });
    fireEvent.click(button);

    // Click English option
    await waitFor(() => {
      const englishOption = screen.getByText('English').closest('button');
      if (englishOption) {
        fireEvent.click(englishOption);
      }
    }, { timeout: 5000 });

    // Verify router.replace was called
    expect(mockReplace).toHaveBeenCalledWith('/test-path', { locale: 'en' });
  });

  it('closes dropdown on outside click', async () => {
    render(
      <div>
        <LanguageSwitcher />
        <div data-testid="outside">Outside</div>
      </div>
    );

    // Open dropdown
    const button = screen.getByRole('button', { name: 'Switch language' });
    fireEvent.click(button);

    // Wait for dropdown to open
    await waitFor(() => {
      expect(screen.getByText('English')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Click outside
    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);

    // Dropdown should close
    await waitFor(() => {
      expect(screen.queryByText('English')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });
});

describe('LanguageSwitcherCompact', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('renders current locale flag', () => {
    render(<LanguageSwitcherCompact />);

    // When current locale is zh, shows US flag (toggle target)
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
  });

  it('renders as a button', () => {
    render(<LanguageSwitcherCompact />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    render(<LanguageSwitcherCompact />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to English');
  });

  it('has correct title attribute', () => {
    render(<LanguageSwitcherCompact />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Switch to English');
  });

  it('applies custom className', () => {
    const { container } = render(<LanguageSwitcherCompact className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has correct button styling', () => {
    render(<LanguageSwitcherCompact />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-10');
    expect(button).toHaveClass('h-10');
    expect(button).toHaveClass('rounded-lg');
  });

  it('calls router.replace when clicked', () => {
    render(<LanguageSwitcherCompact />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockReplace).toHaveBeenCalledWith('/test-path', { locale: 'en' });
  });

  it('is a square button', () => {
    render(<LanguageSwitcherCompact />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-10');
    expect(button).toHaveClass('h-10');
    expect(button).toHaveClass('justify-center');
  });

  it('toggles to Chinese when current locale is English', () => {
    // Mock English locale
    vi.mocked(useLocale).mockReturnValue('en');
    
    render(<LanguageSwitcherCompact />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', '切换到中文');
    expect(button).toHaveAttribute('title', '切换到中文');
    expect(screen.getByText('🇨🇳')).toBeInTheDocument();
  });
});