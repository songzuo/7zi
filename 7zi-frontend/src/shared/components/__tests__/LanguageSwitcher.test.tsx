/**
 * LanguageSwitcher 组件测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSwitcher } from '../LanguageSwitcher';

// Mock i18next
const mockI18n = {
  language: 'zh',
  changeLanguage: vi.fn(),
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: mockI18n,
    t: (key: string) => key,
  }),
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockI18n.language = 'zh';
  });

  it('should render dropdown variant by default', () => {
    render(<LanguageSwitcher />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('should render buttons variant', () => {
    render(<LanguageSwitcher variant="buttons" />);
    expect(screen.getByText('中文')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('should render compact variant', () => {
    render(<LanguageSwitcher variant="compact" />);
    expect(screen.getByText('ZH')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('should call changeLanguage when clicking button', () => {
    render(<LanguageSwitcher variant="buttons" />);
    const enButton = screen.getByText('English');
    fireEvent.click(enButton);
    expect(mockI18n.changeLanguage).toHaveBeenCalledWith('en');
  });

  it('should call onChange callback when language changes', () => {
    const onChange = vi.fn();
    render(<LanguageSwitcher variant="buttons" onChange={onChange} />);
    const enButton = screen.getByText('English');
    fireEvent.click(enButton);
    expect(onChange).toHaveBeenCalledWith('en');
  });

  it('should apply custom className', () => {
    const { container } = render(<LanguageSwitcher className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
