/**
 * @fileoverview LanguageSwitcher 组件测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageSwitcher, LanguageSwitcherCompact } from '../../components/LanguageSwitcher'
import { TestWrapper } from '../test-utils'

// Mock i18n routing
const mockReplace = vi.fn()
vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  usePathname: () => '/test-path',
}))

// Mock i18n config
vi.mock('@/i18n/config', () => ({
  locales: ['zh', 'en'],
}))

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    mockReplace.mockClear()
  })

  it('renders current locale flag and name', () => {
    render(TestWrapper.withIntl(<LanguageSwitcher />, 'zh'))

    // Current locale is zh, so should show zh flag and name in the button
    // getAllByText because dropdown also contains the same flag
    const zhFlags = screen.getAllByText('🇨🇳')
    const zhTexts = screen.getAllByText('中文')

    expect(zhFlags.length).toBeGreaterThan(0)
    expect(zhTexts.length).toBeGreaterThan(0)
  })

  it('renders dropdown arrow icon', () => {
    const { container } = render(TestWrapper.withIntl(<LanguageSwitcher />, 'zh'))

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('renders switch language button', () => {
    render(TestWrapper.withIntl(<LanguageSwitcher />, 'zh'))

    const button = screen.getByRole('button', { name: 'Switch language' })
    expect(button).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      TestWrapper.withIntl(<LanguageSwitcher className="custom-class" />, 'zh')
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has hover group for dropdown', () => {
    const { container } = render(TestWrapper.withIntl(<LanguageSwitcher />, 'zh'))

    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('group')
  })

  it('shows both language options', () => {
    render(TestWrapper.withIntl(<LanguageSwitcher />, 'zh'))

    // Both flags should be in the document (button + dropdown)
    const zhFlags = screen.getAllByText('🇨🇳')
    const usFlags = screen.getAllByText('🇺🇸')

    expect(zhFlags.length).toBeGreaterThan(0)
    expect(usFlags.length).toBeGreaterThan(0)
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('shows checkmark for current locale', () => {
    const { container } = render(TestWrapper.withIntl(<LanguageSwitcher />, 'zh'))

    // Find the checkmark SVG (there are two SVGs: arrow and checkmark)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(2)
  })

  it('has correct button styling', () => {
    render(TestWrapper.withIntl(<LanguageSwitcher />, 'zh'))

    const button = screen.getByRole('button', { name: 'Switch language' })
    expect(button).toHaveClass('flex')
    expect(button).toHaveClass('items-center')
    expect(button).toHaveClass('gap-2')
  })

  it('renders correctly with English locale', () => {
    render(TestWrapper.withIntl(<LanguageSwitcher />, 'en'))

    // When locale is en, should show US flag and English
    const usFlags = screen.getAllByText('🇺🇸')
    const enTexts = screen.getAllByText('English')

    expect(usFlags.length).toBeGreaterThan(0)
    expect(enTexts.length).toBeGreaterThan(0)
  })
})

describe('LanguageSwitcherCompact', () => {
  beforeEach(() => {
    mockReplace.mockClear()
  })

  it('renders current locale flag', () => {
    render(TestWrapper.withIntl(<LanguageSwitcherCompact />, 'zh'))

    // When current locale is zh, shows US flag (toggle target)
    expect(screen.getByText('🇺🇸')).toBeInTheDocument()
  })

  it('renders as a button', () => {
    render(TestWrapper.withIntl(<LanguageSwitcherCompact />, 'zh'))

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('has correct aria-label for zh locale', () => {
    render(TestWrapper.withIntl(<LanguageSwitcherCompact />, 'zh'))

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Switch to English')
  })

  it('has correct aria-label for en locale', () => {
    render(TestWrapper.withIntl(<LanguageSwitcherCompact />, 'en'))

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Switch to 中文')
  })

  it('has correct title attribute', () => {
    render(TestWrapper.withIntl(<LanguageSwitcherCompact />, 'zh'))

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', 'Switch to English')
  })

  it('applies custom className', () => {
    const { container } = render(
      TestWrapper.withIntl(<LanguageSwitcherCompact className="custom-class" />, 'zh')
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has correct button styling', () => {
    render(TestWrapper.withIntl(<LanguageSwitcherCompact />, 'zh'))

    const button = screen.getByRole('button')
    expect(button).toHaveClass('w-10')
    expect(button).toHaveClass('h-10')
    expect(button).toHaveClass('rounded-lg')
  })

  it('calls router.replace when clicked from zh to en', () => {
    render(TestWrapper.withIntl(<LanguageSwitcherCompact />, 'zh'))

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockReplace).toHaveBeenCalledWith('/test-path', { locale: 'en' })
  })

  it('calls router.replace when clicked from en to zh', () => {
    render(TestWrapper.withIntl(<LanguageSwitcherCompact />, 'en'))

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockReplace).toHaveBeenCalledWith('/test-path', { locale: 'zh' })
  })

  it('is a square button', () => {
    render(TestWrapper.withIntl(<LanguageSwitcherCompact />, 'zh'))

    const button = screen.getByRole('button')
    expect(button).toHaveClass('w-10')
    expect(button).toHaveClass('h-10')
    expect(button).toHaveClass('justify-center')
  })
})
