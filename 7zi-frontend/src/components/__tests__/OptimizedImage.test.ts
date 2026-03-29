import { describe, it, expect } from 'vitest'
import { IMAGE_PRESETS, PLACEHOLDER_COLORS } from '../components/OptimizedImage'

describe('Image Optimization', () => {
  describe('IMAGE_PRESETS', () => {
    it('should have all required presets', () => {
      expect(IMAGE_PRESETS).toHaveProperty('avatar')
      expect(IMAGE_PRESETS).toHaveProperty('thumbnail')
      expect(IMAGE_PRESETS).toHaveProperty('card')
      expect(IMAGE_PRESETS).toHaveProperty('hero')
      expect(IMAGE_PRESETS).toHaveProperty('content')
      expect(IMAGE_PRESETS).toHaveProperty('logo')
    })

    it('should have valid sizes for each preset', () => {
      Object.entries(IMAGE_PRESETS).forEach(([name, preset]) => {
        expect(preset.sizes).toBeDefined()
        expect(typeof preset.sizes).toBe('string')
        expect(preset.width).toBeGreaterThan(0)
        expect(preset.height).toBeGreaterThan(0)
      })
    })

    it('should have hero and logo with priority true', () => {
      expect(IMAGE_PRESETS.hero.priority).toBe(true)
      expect(IMAGE_PRESETS.logo.priority).toBe(true)
    })

    it('should have non-critical images with priority false', () => {
      expect(IMAGE_PRESETS.avatar.priority).toBe(false)
      expect(IMAGE_PRESETS.thumbnail.priority).toBe(false)
      expect(IMAGE_PRESETS.card.priority).toBe(false)
      expect(IMAGE_PRESETS.content.priority).toBe(false)
    })
  })

  describe('PLACEHOLDER_COLORS', () => {
    it('should have light, dark, and blur placeholders', () => {
      expect(PLACEHOLDER_COLORS).toHaveProperty('light')
      expect(PLACEHOLDER_COLORS).toHaveProperty('dark')
      expect(PLACEHOLDER_COLORS).toHaveProperty('blur')
    })

    it('should be valid SVG data URLs', () => {
      Object.entries(PLACEHOLDER_COLORS).forEach(([name, url]) => {
        expect(url).toMatch(/^data:image\/svg\+xml/)
      })
    })
  })
})
