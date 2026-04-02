/**
 * @fileoverview Star rating component
 * @description Interactive star rating component (1-5 stars) for user feedback
 */

'use client'

import React, { useState } from 'react'

interface StarRatingProps {
  rating: number
  onRatingChange?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  className?: string
}

interface StarLabel {
  rating: number
  label: string
}

const STAR_LABELS: StarLabel[] = [
  { rating: 1, label: '非常不满意' },
  { rating: 2, label: '不满意' },
  { rating: 3, label: '一般' },
  { rating: 4, label: '满意' },
  { rating: 5, label: '非常满意' },
]

const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  readonly = false,
  size = 'md',
  showLabels = false,
  className = '',
}) => {
  const [hoveredRating, setHoveredRating] = useState<number>(0)

  const handleMouseEnter = (starNumber: number) => {
    if (!readonly) {
      setHoveredRating(starNumber)
    }
  }

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoveredRating(0)
    }
  }

  const handleClick = (starNumber: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(starNumber)
    }
  }

  const displayRating = hoveredRating || rating

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Stars */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(starNumber => (
          <button
            key={starNumber}
            type="button"
            disabled={readonly}
            onMouseEnter={() => handleMouseEnter(starNumber)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(starNumber)}
            className={` ${readonly ? 'cursor-default' : 'cursor-pointer transition-transform hover:scale-110 active:scale-95'} rounded focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:outline-none`}
            aria-label={`Rate ${starNumber} stars`}
            aria-pressed={rating >= starNumber}
          >
            <svg
              className={`${SIZE_CLASSES[size]} ${
                displayRating >= starNumber
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-zinc-300 dark:text-zinc-600'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>

      {/* Labels */}
      {showLabels && displayRating > 0 && (
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {STAR_LABELS.find(l => l.rating === displayRating)?.label}
        </span>
      )}

      {/* Number display */}
      {!showLabels && (
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {rating.toFixed(1)} / 5.0
        </span>
      )}
    </div>
  )
}

export default StarRating
