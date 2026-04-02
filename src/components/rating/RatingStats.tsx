/**
 * RatingStats Component
 * Displays rating statistics including average rating and distribution chart
 */

import { Star, TrendingUp, ThumbsUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RatingStats as RatingStatsType } from '@/types/feedback'
import type { FC } from 'react'

export interface RatingStatsProps {
  stats: RatingStatsType
  showDistribution?: boolean
  showByTargetType?: boolean
  className?: string
}

export function RatingStats({
  stats,
  showDistribution = true,
  showByTargetType = false,
  className,
}: RatingStatsProps) {
  /**
   * Get color for star rating
   */
  const getStarColor = (rating: number) => {
    if (rating >= 4) return 'text-green-500'
    if (rating >= 3) return 'text-yellow-500'
    if (rating >= 2) return 'text-orange-500'
    return 'text-red-500'
  }

  /**
   * Get percentage for distribution bar
   */
  const getDistributionPercentage = (count: number) => {
    return stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
  }

  /**
   * Get percentage of a specific rating
   */
  const getRatingPercentage = (rating: number) => {
    const count = stats.rating_distribution[rating] || 0
    return getDistributionPercentage(count)
  }

  return (
    <div className={cn('rounded-lg border border-zinc-200 bg-white p-6', className)}>
      {/* Average Rating */}
      <div className="mb-6 flex items-center gap-6">
        {/* Big Number */}
        <div className="text-center">
          <div className={cn('text-5xl font-bold', getStarColor(stats.average_rating))}>
            {stats.average_rating.toFixed(1)}
          </div>
          <div className="mt-2 flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-4 w-4',
                  i < Math.round(stats.average_rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-zinc-300'
                )}
              />
            ))}
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            {stats.total} {stats.total === 1 ? 'rating' : 'ratings'}
          </div>
        </div>

        {/* Distribution */}
        {showDistribution && (
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = stats.rating_distribution[rating] || 0
              const percentage = getRatingPercentage(rating)

              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex w-12 items-center gap-1 text-sm">
                    <span className="text-zinc-600">{rating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        rating >= 4
                          ? 'bg-green-500'
                          : rating >= 3
                            ? 'bg-yellow-500'
                            : 'bg-orange-500'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm text-zinc-600">{count}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-3 gap-4 border-t border-zinc-200 pt-6">
        {/* Helpful Ratio */}
        <div className="text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-blue-500">
            <ThumbsUp className="h-4 w-4 fill-current" />
            <span className="text-2xl font-bold">{(stats.helpful_ratio * 100).toFixed(0)}%</span>
          </div>
          <div className="text-xs text-zinc-500">Helpful</div>
        </div>

        {/* Total Ratings */}
        <div className="text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-purple-500">
            <TrendingUp className="h-4 w-4" />
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
          <div className="text-xs text-zinc-500">Total</div>
        </div>

        {/* Average Rating (small) */}
        <div className="text-center">
          <div
            className={cn(
              'mb-1 flex items-center justify-center gap-1',
              getStarColor(stats.average_rating)
            )}
          >
            <Star className="h-4 w-4 fill-current" />
            <span className="text-2xl font-bold">{stats.average_rating.toFixed(1)}</span>
          </div>
          <div className="text-xs text-zinc-500">Average</div>
        </div>
      </div>

      {/* By Target Type */}
      {showByTargetType && Object.keys(stats.by_target_type).length > 0 && (
        <div className="mt-6 border-t border-zinc-200 pt-6">
          <h4 className="mb-3 text-sm font-semibold text-zinc-900">Ratings by Type</h4>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {Object.entries(stats.by_target_type).map(([type, count]) => (
              <div key={type} className="rounded-lg bg-zinc-50 p-3">
                <div className="text-lg font-semibold text-zinc-900">{count}</div>
                <div className="text-xs text-zinc-500 capitalize">{type}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default RatingStats
