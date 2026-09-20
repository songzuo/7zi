/**
 * StarRating Component
 * Displays 1-5 star rating with half-star support
 */

import React, { useState } from 'react'
import { Star, StarHalf } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
  interactive?: boolean
  onChange?: (rating: number) => void
  showHalfStars?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

const sizeClassesContainer = {
  sm: 'gap-0.5',
  md: 'gap-1',
  lg: 'gap-1.5',
}

/**
 * Convert rating to star representation
 * @param rating - The rating value (e.g., 3.5)
 * @param maxRating - Maximum rating (default 5)
 * @returns Array of star values (0 = empty, 0.5 = half, 1 = full)
 */
function getStarValues(rating: number, maxRating: number = 5): number[] {
  const stars: number[] = []
  for (let i = 1; i <= maxRating; i++) {
    if (rating >= i) {
      stars.push(1)
    } else if (rating >= i - 0.5) {
      stars.push(0.5)
    } else {
      stars.push(0)
    }
  }
  return stars
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  readonly = false,
  interactive = false,
  onChange,
  showHalfStars = false,
  className,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number>(0)

  const stars = getStarValues(rating, maxRating)
  const displayRating = interactive && hoverRating > 0 ? hoverRating : rating

  const handleStarClick = (starIndex: number) => {
    if (!interactive || readonly || !onChange) return

    let newRating: number
    if (showHalfStars) {
      // Allow half-star rating by clicking left or right side
      newRating = starIndex + 1
    } else {
      newRating = starIndex + 1
    }

    onChange(newRating)
  }

  const handleStarHover = (starIndex: number, event: React.MouseEvent) => {
    if (!interactive || readonly) return

    let newHoverRating: number
    if (showHalfStars) {
      // Check if click is on left or right half of the star
      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      const isLeftHalf = x < rect.width / 2

      newHoverRating = isLeftHalf ? starIndex + 0.5 : starIndex + 1
    } else {
      newHoverRating = starIndex + 1
    }

    setHoverRating(newHoverRating)
  }

  const handleMouseLeave = () => {
    setHoverRating(0)
  }

  const starColor = readonly ? 'text-yellow-500' : 'text-yellow-400'
  const emptyStarColor = readonly ? 'text-zinc-300' : 'text-zinc-200'
  const hoverColor = interactive ? 'hover:text-yellow-500 cursor-pointer' : ''

  return (
    <div
      className={cn('flex items-center', sizeClassesContainer[size], className)}
      onMouseLeave={handleMouseLeave}
    >
      {getStarValues(displayRating, maxRating).map((starValue, index) => (
        <button
          key={index}
          type="button"
          disabled={!interactive || readonly}
          className={cn(
            'relative transition-all duration-200',
            sizeClasses[size],
            interactive &&
              !readonly &&
              'rounded focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:outline-none',
            hoverColor
          )}
          onClick={() => handleStarClick(index)}
          onMouseMove={e => handleStarHover(index, e)}
          aria-label={`Rate ${index + 1} out of ${maxRating}`}
        >
          {starValue === 1 ? (
            <Star className={cn('fill-current', starColor)} aria-hidden="true" />
          ) : starValue === 0.5 ? (
            <div className="relative">
              <Star className={cn('fill-current', emptyStarColor)} aria-hidden="true" />
              <StarHalf
                className={cn('absolute top-0 left-0 fill-current', starColor)}
                aria-hidden="true"
              />
            </div>
          ) : (
            <Star className={cn('fill-current', emptyStarColor)} aria-hidden="true" />
          )}
        </button>
      ))}

      <span className={cn('ml-2 font-medium', sizeClasses[size].replace('h-', 'text-'))}>
        {showHalfStars ? rating.toFixed(1) : Math.round(rating)}
      </span>
    </div>
  )
}

export default StarRating
