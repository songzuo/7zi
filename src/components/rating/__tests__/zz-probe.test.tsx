import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { StarRating } from '../StarRating'

describe('probe', () => {
  it('dump half star dom', () => {
    const { container } = render(<StarRating rating={3.5} showHalfStars />)
    console.log('HTML_START')
    console.log(container.innerHTML.slice(0, 2500))
    console.log('HTML_END')
    console.log('ABSOLUTE_COUNT', container.querySelectorAll('.absolute').length)
    console.log('SVG_COUNT', container.querySelectorAll('svg').length)
    expect(true).toBe(true)
  })
})
