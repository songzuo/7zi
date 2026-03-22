/**
 * RatingStats Component
 * Displays rating statistics including average rating and distribution chart
 */

import { Star, TrendingUp, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RatingStats as RatingStatsType } from '@/types/feedback';
import type { FC } from 'react';

export interface RatingStatsProps {
  stats: RatingStatsType;
  showDistribution?: boolean;
  showByTargetType?: boolean;
  className?: string;
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
    if (rating >= 4) return 'text-green-500';
    if (rating >= 3) return 'text-yellow-500';
    if (rating >= 2) return 'text-orange-500';
    return 'text-red-500';
  };

  /**
   * Get percentage for distribution bar
   */
  const getDistributionPercentage = (count: number) => {
    return stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
  };

  /**
   * Get percentage of a specific rating
   */
  const getRatingPercentage = (rating: number) => {
    const count = stats.rating_distribution[rating] || 0;
    return getDistributionPercentage(count);
  };

  return (
    <div className={cn('bg-white rounded-lg border border-zinc-200 p-6', className)}>
      {/* Average Rating */}
      <div className="flex items-center gap-6 mb-6">
        {/* Big Number */}
        <div className="text-center">
          <div className={cn('text-5xl font-bold', getStarColor(stats.average_rating))}>
            {stats.average_rating.toFixed(1)}
          </div>
          <div className="flex items-center justify-center gap-1 mt-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'w-4 h-4',
                  i < Math.round(stats.average_rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-zinc-300'
                )}
              />
            ))}
          </div>
          <div className="text-sm text-zinc-500 mt-1">
            {stats.total} {stats.total === 1 ? 'rating' : 'ratings'}
          </div>
        </div>

        {/* Distribution */}
        {showDistribution && (
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.rating_distribution[rating] || 0;
              const percentage = getRatingPercentage(rating);

              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12 text-sm">
                    <span className="text-zinc-600">{rating}</span>
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="flex-1 h-2 bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        rating >= 4 ? 'bg-green-500' : rating >= 3 ? 'bg-yellow-500' : 'bg-orange-500'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm text-zinc-600 text-right">{count}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-3 gap-4 pt-6 border-t border-zinc-200">
        {/* Helpful Ratio */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
            <ThumbsUp className="w-4 h-4 fill-current" />
            <span className="text-2xl font-bold">
              {(stats.helpful_ratio * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-xs text-zinc-500">Helpful</div>
        </div>

        {/* Total Ratings */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-purple-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
          <div className="text-xs text-zinc-500">Total</div>
        </div>

        {/* Average Rating (small) */}
        <div className="text-center">
          <div className={cn('flex items-center justify-center gap-1 mb-1', getStarColor(stats.average_rating))}>
            <Star className="w-4 h-4 fill-current" />
            <span className="text-2xl font-bold">{stats.average_rating.toFixed(1)}</span>
          </div>
          <div className="text-xs text-zinc-500">Average</div>
        </div>
      </div>

      {/* By Target Type */}
      {showByTargetType && Object.keys(stats.by_target_type).length > 0 && (
        <div className="mt-6 pt-6 border-t border-zinc-200">
          <h4 className="text-sm font-semibold text-zinc-900 mb-3">Ratings by Type</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(stats.by_target_type).map(([type, count]) => (
              <div key={type} className="bg-zinc-50 rounded-lg p-3">
                <div className="text-lg font-semibold text-zinc-900">{count}</div>
                <div className="text-xs text-zinc-500 capitalize">{type}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RatingStats;
