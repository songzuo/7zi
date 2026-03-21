/**
 * RatingList Component
 * Displays a list of ratings with pagination, filtering, and sorting
 */

import React, { useState, useEffect } from 'react';
import { Star, Filter, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReviewItem } from './ReviewItem';
import { Rating, RatingFilters, RatingListResponse } from '@/types/feedback';

export interface RatingListProps {
  targetType?: 'agent' | 'task' | 'feature' | 'project' | 'overall';
  targetId?: string;
  initialFilters?: Partial<RatingFilters>;
  onReply?: (ratingId: string, content: string) => Promise<void>;
  onHelpful?: (ratingId: string, isHelpful: boolean) => Promise<void>;
  onFlag?: (ratingId: string) => Promise<void>;
  onDelete?: (ratingId: string) => Promise<void>;
  onLike?: (ratingId: string, unlike: boolean) => Promise<void>;
  isOwner?: boolean;
  isAdmin?: boolean;
  className?: string;
}

type SortBy = 'created_at' | 'rating' | 'helpful_count';
type SortOrder = 'asc' | 'desc';

export function RatingList({
  targetType,
  targetId,
  initialFilters,
  onReply,
  onHelpful,
  onFlag,
  onDelete,
  onLike,
  isOwner = false,
  isAdmin = false,
  className,
}: RatingListProps) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [ratingMin, setRatingMin] = useState<number | undefined>(initialFilters?.rating_min);
  const [ratingMax, setRatingMax] = useState<number | undefined>(initialFilters?.rating_max);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // UI state
  const [showFilters, setShowFilters] = useState(false);

  /**
   * Fetch ratings from API
   */
  const fetchRatings = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (targetType) params.append('target_type', targetType);
      if (targetId) params.append('target_id', targetId);
      if (ratingMin !== undefined) params.append('rating_min', ratingMin.toString());
      if (ratingMax !== undefined) params.append('rating_max', ratingMax.toString());
      if (searchQuery) params.append('search', searchQuery);
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
      params.append('page', page.toString());
      params.append('per_page', perPage.toString());

      const response = await fetch(`/api/ratings?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch ratings');
      }

      const data: RatingListResponse = await response.json();
      setRatings(data.data?.ratings || data.ratings || []);
      setTotal(data.data?.meta?.total || data.meta?.total || 0);
      setTotalPages(data.data?.meta?.total_pages || data.meta?.total_pages || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [targetType, targetId, sortBy, sortOrder, ratingMin, ratingMax, searchQuery, page]);

  /**
   * Handle sort change
   */
  const handleSortChange = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      // Toggle order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
    setPage(1);
  };

  /**
   * Handle filter reset
   */
  const handleResetFilters = () => {
    setRatingMin(undefined);
    setRatingMax(undefined);
    setSearchQuery('');
    setPage(1);
  };

  /**
   * Handle rating update (after like/unlike)
   */
  const handleRatingUpdate = (updatedRating: Rating) => {
    setRatings((prev) =>
      prev.map((r) => (r.id === updatedRating.id ? updatedRating : r))
    );
  };

  /**
   * Calculate average rating
   */
  const averageRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 10) / 10
      : 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Reviews & Ratings
            {total > 0 && <span className="text-gray-500 font-normal ml-2">({total})</span>}
          </h2>
          {averageRating > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-4 h-4',
                      i < Math.round(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">{averageRating}</span>
              <span className="text-sm text-gray-500">average</span>
            </div>
          )}
        </div>

        {/* Filter Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {showFilters && (
            <ChevronLeft className="w-4 h-4 rotate-90" />
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <Input
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Rating Range */}
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Rating</label>
              <Select
                value={ratingMin?.toString() || 'all'}
                onValueChange={(value) => setRatingMin(value === 'all' ? undefined : parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="1">1★</SelectItem>
                  <SelectItem value="2">2★</SelectItem>
                  <SelectItem value="3">3★</SelectItem>
                  <SelectItem value="4">4★</SelectItem>
                  <SelectItem value="5">5★</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Rating</label>
              <Select
                value={ratingMax?.toString() || 'all'}
                onValueChange={(value) => setRatingMax(value === 'all' ? undefined : parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="1">1★</SelectItem>
                  <SelectItem value="2">2★</SelectItem>
                  <SelectItem value="3">3★</SelectItem>
                  <SelectItem value="4">4★</SelectItem>
                  <SelectItem value="5">5★</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="ghost" onClick={handleResetFilters}>
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Sort by:</span>
        <Button
          variant={sortBy === 'created_at' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleSortChange('created_at')}
          className="gap-2"
        >
          Date
          {sortBy === 'created_at' && (
            <ArrowUpDown className={cn('w-3 h-3', sortOrder === 'asc' ? 'rotate-180' : '')} />
          )}
        </Button>
        <Button
          variant={sortBy === 'rating' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleSortChange('rating')}
          className="gap-2"
        >
          Rating
          {sortBy === 'rating' && (
            <ArrowUpDown className={cn('w-3 h-3', sortOrder === 'asc' ? 'rotate-180' : '')} />
          )}
        </Button>
        <Button
          variant={sortBy === 'helpful_count' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleSortChange('helpful_count')}
          className="gap-2"
        >
          Most Helpful
          {sortBy === 'helpful_count' && (
            <ArrowUpDown className={cn('w-3 h-3', sortOrder === 'asc' ? 'rotate-180' : '')} />
          )}
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading reviews...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">Error: {error}</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && ratings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Star className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-500 max-w-md">
            Be the first to share your experience! Your feedback helps others make better decisions.
          </p>
        </div>
      )}

      {/* Ratings List */}
      {!loading && !error && ratings.length > 0 && (
        <div className="space-y-6">
          {ratings.map((rating) => (
            <ReviewItem
              key={rating.id}
              rating={rating}
              isOwner={isOwner}
              isAdmin={isAdmin}
              onReply={onReply}
              onHelpful={onHelpful}
              onFlag={onFlag}
              onDelete={onDelete}
              onLike={onLike}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, total)} of {total} reviews
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RatingList;
