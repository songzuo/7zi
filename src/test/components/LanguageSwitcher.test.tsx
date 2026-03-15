/**
 * @fileoverview LanguageSwitcher 组件测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { LanguageSwitcher, LanguageSwitcherCompact } from '../../components/LanguageSwitcher';
import { useLocale } from 'next-intl';

// Mock next-intl
vi.mock('next-intl', () => ({
  useLocale: vi.fn(),
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
    vi.mocked(useLocale).mockReturnValue('zh');
  });

  afterEach(() => {
    vi.mocked(useLocale).mockReset();
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

    // Find the container and hover to open dropdown
    const container = document.querySelector('.relative');
    
    // Fire mouseEnter event to open dropdown
    fireEvent.mouseEnter(container!);

    // Wait for dropdown to appear - the dropdown uses isOpen state controlled by mouse events
    // Need to wait a bit for state update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Dropdown should show both options (English is the other option since current is zh)
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
  });

  it('shows checkmark for current locale in dropdown', async () => {
    render(<LanguageSwitcher />);

    // Open dropdown by hovering
    const container = document.querySelector('.relative');
    
    await act(async () => {
      fireEvent.mouseEnter(container!);
    });

    // Wait for dropdown and check for checkmark SVG
    await waitFor(() => {
      // Current locale is zh, so dropdown should have checkmark for 中文
      const checkmark = document.querySelector('svg[class*="ml-auto"]');
      expect(checkmark).toBeInTheDocument();
    });
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

    // Hover to open dropdown
    const container = document.querySelector('.relative');
    
    await act(async () => {
      fireEvent.mouseEnter(container!);
    });

    // Click English option
    await waitFor(async () => {
      const englishOption = screen.getByText('English').closest('button');
      if (englishOption) {
        await act(async () => {
          fireEvent.click(englishOption);
        });
      }
    });

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

    // Hover to open dropdown
    const container = document.querySelector('.relative');
    
    await act(async () => {
      fireEvent.mouseEnter(container!);
    });

    // Wait for dropdown to open
    await waitFor(() => {
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    // Click outside
    const outside = screen.getByTestId('outside');
    
    await act(async () => {
      fireEvent.mouseDown(outside);
    });

    // Dropdown should close
    await waitFor(() => {
      expect(screen.queryByText('English')).not.toBeInTheDocument();
    });
  });
});

describe('LanguageSwitcherCompact', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('renders current locale flag', () => {
    vi.mocked(useLocale).mockReturnValue('zh');
    render(<LanguageSwitcherCompact />);

    // When current locale is zh, shows US flag (toggle target)
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
  });

  it('renders as a button', () => {
    vi.mocked(useLocale).mockReturnValue('zh');
    render(<LanguageSwitcherCompact />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    vi.mocked(useLocale).mockReturnValue('zh');
    render(<LanguageSwitcherCompact />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to English');
  });

  it('has correct title attribute', () => {
    vi.mocked(useLocale).mockReturnValue('zh');
    render(<LanguageSwitcherCompact />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Switch to English');
  });

  it('applies custom className', () => {
    vi.mocked(useLocale).mockReturnValue('zh');
    const { container } = render(<LanguageSwitcherCompact className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has correct button styling', () => {
    vi.mocked(useLocale).mockReturnValue('zh');
    render(<LanguageSwitcherCompact />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-10');
    expect(button).toHaveClass('h-10');
    expect(button).toHaveClass('rounded-lg');
  });

  it('calls router.replace when clicked', async () => {
    vi.mocked(useLocale).mockReturnValue('zh');
    render(<LanguageSwitcherCompact />);

    const button = screen.getByRole('button');
    
    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockReplace).toHaveBeenCalledWith('/test-path', { locale: 'en' });
  });

  it('is a square button', () => {
    vi.mocked(useLocale).mockReturnValue('zh');
    render(<LanguageSwitcherCompact />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-10');
    expect(button).toHaveClass('h-10');
    expect(button).toHaveClass('justify-center');
  });

  it('toggles to Chinese when current locale is English', () => {
    vi.mocked(useLocale).mockReturnValue('en');
    
    render(<LanguageSwitcherCompact />);
    
    const button = screen.getByRole('button');
    // When current is English, it switches TO Chinese
    expect(button).toHaveAttribute('aria-label', 'Switch to 中文');
    expect(button).toHaveAttribute('title', '切换到中文');
    // When current is English, shows Chinese flag as toggle target
    expect(screen.getByText('🇨🇳')).toBeInTheDocument();
  });
});
