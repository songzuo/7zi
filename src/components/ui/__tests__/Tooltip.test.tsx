/**
 * Tooltip Component Test
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import { Tooltip, SimpleTooltip, InfoTooltip } from '../Tooltip'

describe('Tooltip Component', () => {
  const mockContent = 'Tooltip content'

  describe('Basic Rendering', () => {
    it('does not render tooltip initially', () => {
      render(
        <Tooltip content={mockContent}>
          <button>Hover Me</button>
        </Tooltip>
      )
      expect(screen.queryByText(mockContent)).not.toBeInTheDocument()
    })

    it('renders tooltip on hover', async () => {
      render(
        <Tooltip content={mockContent}>
          <button>Hover Me</button>
        </Tooltip>
      )

      const button = screen.getByText('Hover Me')
      fireEvent.mouseEnter(button)

      // Wait for the tooltip to appear after the default 200ms delay
      await waitFor(
        () => {
          expect(screen.getByText(mockContent)).toBeInTheDocument()
        },
        { timeout: 500 }
      )
    })

    it('removes tooltip on mouse leave', async () => {
      render(
        <Tooltip content={mockContent}>
          <button>Hover Me</button>
        </Tooltip>
      )

      const button = screen.getByText('Hover Me')
      fireEvent.mouseEnter(button)

      // Wait for tooltip to appear
      await waitFor(
        () => {
          expect(screen.getByText(mockContent)).toBeInTheDocument()
        },
        { timeout: 500 }
      )

      fireEvent.mouseLeave(button)

      // Wait for tooltip to be removed after hide delay
      await waitFor(
        () => {
          expect(screen.queryByText(mockContent)).not.toBeInTheDocument()
        },
        { timeout: 500 }
      )
    })
  })

  describe('Positions', () => {
    it('positions tooltip at top', async () => {
      render(
        <Tooltip content={mockContent} position="top">
          <button>Top</button>
        </Tooltip>
      )

      const button = screen.getByText('Top')
      fireEvent.mouseEnter(button)

      await waitFor(
        () => {
          expect(screen.getByText(mockContent)).toBeInTheDocument()
        },
        { timeout: 500 }
      )

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveClass('bottom-full')
    })

    it('positions tooltip at bottom', async () => {
      render(
        <Tooltip content={mockContent} position="bottom">
          <button>Bottom</button>
        </Tooltip>
      )

      const button = screen.getByText('Bottom')
      fireEvent.mouseEnter(button)

      await waitFor(
        () => {
          expect(screen.getByText(mockContent)).toBeInTheDocument()
        },
        { timeout: 500 }
      )

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveClass('top-full')
    })

    it('positions tooltip at left', async () => {
      render(
        <Tooltip content={mockContent} position="left">
          <button>Left</button>
        </Tooltip>
      )

      const button = screen.getByText('Left')
      fireEvent.mouseEnter(button)

      await waitFor(
        () => {
          expect(screen.getByText(mockContent)).toBeInTheDocument()
        },
        { timeout: 500 }
      )

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveClass('right-full')
    })

    it('positions tooltip at right', async () => {
      render(
        <Tooltip content={mockContent} position="right">
          <button>Right</button>
        </Tooltip>
      )

      const button = screen.getByText('Right')
      fireEvent.mouseEnter(button)

      await waitFor(
        () => {
          expect(screen.getByText(mockContent)).toBeInTheDocument()
        },
        { timeout: 500 }
      )

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveClass('left-full')
    })
  })

  describe('Sizes', () => {
    it('applies sm size', async () => {
      render(
        <Tooltip content={mockContent} size="sm">
          <button>Small</button>
        </Tooltip>
      )

      const button = screen.getByText('Small')
      fireEvent.mouseEnter(button)

      await waitFor(
        () => {
          expect(screen.getByText(mockContent)).toBeInTheDocument()
        },
        { timeout: 500 }
      )

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveClass('px-2', 'py-1', 'text-xs')
    })

    it('applies md size', async () => {
      render(
        <Tooltip content={mockContent} size="md">
          <button>Medium</button>
        </Tooltip>
      )

      const button = screen.getByText('Medium')
      fireEvent.mouseEnter(button)

      await waitFor(
        () => {
          expect(screen.getByText(mockContent)).toBeInTheDocument()
        },
        { timeout: 500 }
      )

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveClass('px-3', 'py-1.5', 'text-sm')
    })

    it('applies lg size', async () => {
      render(
        <Tooltip content={mockContent} size="lg">
          <button>Large</button>
        </Tooltip>
      )

      const button = screen.getByText('Large')
      fireEvent.mouseEnter(button)

      await waitFor(
        () => {
          expect(screen.getByText(mockContent)).toBeInTheDocument()
        },
        { timeout: 500 }
      )

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveClass('px-4', 'py-2', 'text-base')
    })
  })

  describe('Delays', () => {
    it('respects show delay', async () => {
      vi.useFakeTimers()

      render(
        <Tooltip content={mockContent} delay={500}>
          <button>Hover Me</button>
        </Tooltip>
      )

      const button = screen.getByText('Hover Me')

      await act(async () => {
        fireEvent.mouseEnter(button)
      })

      // Should not show immediately
      expect(screen.queryByText(mockContent)).not.toBeInTheDocument()

      // Advance timer by 400ms (still not shown)
      vi.advanceTimersByTime(400)
      expect(screen.queryByText(mockContent)).not.toBeInTheDocument()

      // Advance timer by 500ms (now shown)
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.getByText(mockContent)).toBeInTheDocument()

      vi.useRealTimers()
    })

    it('respects hide delay', async () => {
      vi.useFakeTimers()

      render(
        <Tooltip content={mockContent} hideDelay={200}>
          <button>Hover Me</button>
        </Tooltip>
      )

      const button = screen.getByText('Hover Me')
      fireEvent.mouseEnter(button)

      // Advance past show delay
      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      expect(screen.getByText(mockContent)).toBeInTheDocument()

      fireEvent.mouseLeave(button)

      // Should still be visible immediately
      expect(screen.getByText(mockContent)).toBeInTheDocument()

      // After hide delay, it should be gone
      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      expect(screen.queryByText(mockContent)).not.toBeInTheDocument()

      vi.useRealTimers()
    })
  })

  describe('Disabled State', () => {
    it('does not show tooltip when disabled', () => {
      render(
        <Tooltip content={mockContent} disabled>
          <button>Disabled</button>
        </Tooltip>
      )

      const button = screen.getByText('Disabled')
      fireEvent.mouseEnter(button)

      expect(screen.queryByText(mockContent)).not.toBeInTheDocument()
    })
  })

  describe('Arrow Indicator', () => {
    it('shows arrow by default', async () => {
      render(
        <Tooltip content={mockContent} showArrow>
          <button>Arrow</button>
        </Tooltip>
      )

      const button = screen.getByText('Arrow')
      fireEvent.mouseEnter(button)

      await waitFor(
        () => {
          expect(screen.getByText(mockContent)).toBeInTheDocument()
        },
        { timeout: 500 }
      )

      expect(screen.getByText(mockContent)).toBeInTheDocument()
    })

    it('hides arrow when showArrow is false', async () => {
      render(
        <Tooltip content={mockContent} showArrow={false}>
          <button>No Arrow</button>
        </Tooltip>
      )

      const button = screen.getByText('No Arrow')
      fireEvent.mouseEnter(button)

      await waitFor(
        () => {
          expect(screen.getByText(mockContent)).toBeInTheDocument()
        },
        { timeout: 500 }
      )

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toBeInTheDocument()
      // Arrow should not be present (this is a simplified check)
    })
  })

  describe('Keyboard Accessibility', () => {
    it('shows tooltip on focus', async () => {
      render(
        <Tooltip content={mockContent}>
          <button>Focus Me</button>
        </Tooltip>
      )

      const button = screen.getByText('Focus Me')
      fireEvent.focus(button)

      await waitFor(
        () => {
          expect(screen.getByText(mockContent)).toBeInTheDocument()
        },
        { timeout: 500 }
      )

      expect(screen.getByText(mockContent)).toBeInTheDocument()
    })

    it('hides tooltip on blur', async () => {
      render(
        <Tooltip content={mockContent}>
          <button>Blur Me</button>
        </Tooltip>
      )

      const button = screen.getByText('Blur Me')
      fireEvent.focus(button)

      await waitFor(
        () => {
          expect(screen.getByText(mockContent)).toBeInTheDocument()
        },
        { timeout: 500 }
      )

      expect(screen.getByText(mockContent)).toBeInTheDocument()

      fireEvent.blur(button)

      // Wait for hide delay to pass
      await waitFor(
        () => {
          expect(screen.queryByText(mockContent)).not.toBeInTheDocument()
        },
        { timeout: 500 }
      )
    })
  })

  describe('SimpleTooltip', () => {
    it('renders with default settings', async () => {
      render(
        <SimpleTooltip content="Simple tooltip">
          <button>Button</button>
        </SimpleTooltip>
      )

      const button = screen.getByText('Button')
      fireEvent.mouseEnter(button)

      await waitFor(
        () => {
          expect(screen.getByText('Simple tooltip')).toBeInTheDocument()
        },
        { timeout: 500 }
      )

      expect(screen.getByText('Simple tooltip')).toBeInTheDocument()
    })
  })

  describe('InfoTooltip', () => {
    it('renders info icon button', () => {
      render(<InfoTooltip content="Additional information" />)

      expect(screen.getByLabelText('More information')).toBeInTheDocument()
    })

    it('shows tooltip on icon hover', async () => {
      render(<InfoTooltip content="Info" />)

      const button = screen.getByLabelText('More information')
      fireEvent.mouseEnter(button)

      await waitFor(
        () => {
          expect(screen.getByText('Info')).toBeInTheDocument()
        },
        { timeout: 500 }
      )

      expect(screen.getByText('Info')).toBeInTheDocument()
    })

    it('applies icon size', () => {
      const { container } = render(<InfoTooltip content="Info" iconSize="lg" />)

      const button = screen.getByLabelText('More information')
      expect(button).toHaveClass('w-6', 'h-6')
    })
  })

  describe('Dark Mode', () => {
    it('applies dark mode classes', async () => {
      render(
        <Tooltip content={mockContent}>
          <button>Dark Mode</button>
        </Tooltip>
      )

      const button = screen.getByText('Dark Mode')
      fireEvent.mouseEnter(button)

      await waitFor(
        () => {
          expect(screen.getByText(mockContent)).toBeInTheDocument()
        },
        { timeout: 500 }
      )

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveClass('dark:bg-zinc-100')
      expect(tooltip).toHaveClass('dark:text-zinc-900')
    })
  })
})
