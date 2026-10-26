import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('lucide-react', () => {
  const make = (name: string) => (props: { className?: string }) =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('react').createElement('span', { className: props?.className, 'data-icon': name })
  return { RefreshCw: make('RefreshCw') }
})

import { RefreshCw } from 'lucide-react'

describe('probe', () => {
  it('renders icon with class', () => {
    const { container } = render(<RefreshCw className="animate-spin" />)
    expect(container.innerHTML).toContain('animate-spin')
  })
})
