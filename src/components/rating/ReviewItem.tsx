/**
 * ReviewItem Component
 * Displays a single review with reply and like functionality
 */

import React, { useState } from 'react';
import { Star, ThumbsUp, MessageCircle, Flag, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Rating, HelpfulVote } from '@/types/feedback';

export interface ReviewItemProps {
  rating: Rating;
  isOwner?: boolean;
  isAdmin?: boolean;
  onReply?: (ratingId: string, content: string) => Promise<void>;
  onHelpful?: (ratingId: string, isHelpful: boolean) => Promise<void>;
  onFlag?: (ratingId: string) => Promise<void>;
  onDelete?: (ratingId: string) => Promise<void>;
  onLike?: (ratingId: string, unlike: boolean) => Promise<void>;
  showReplies?: boolean;
  className?: string;
}

interface Reply {
  id: string;
  rating_id: string;
  user_id: string;
  user_name?: string;
  content: string;
  created_at: string;
}

export function ReviewItem({
  rating,
  isOwner = false,
  isAdmin = false,
  onReply,
  onHelpful,
  onFlag,
  onDelete,
  onLike,
  showReplies = true,
  className,
}: ReviewItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const formattedDate = new Date(rating.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const isLongText = rating.description && rating.description.length > 200;
  const displayText = !showFullText && isLongText
    ? rating.description!.substring(0, 200) + '...'
    : rating.description;

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !onReply) return;

    setIsSubmittingReply(true);
    try {
      await onReply(rating.id, replyContent);
      setReplyContent('');
      setIsReplying(false);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleHelpful = async (isHelpful: boolean) => {
    if (!onHelpful) return;
    await onHelpful(rating.id, isHelpful);
  };

  const handleLike = async () => {
    if (!onLike) return;

    // Toggle like
    if (rating.is_helpful) {
      await onLike(rating.id, true); // Unlike
    } else {
      await onLike(rating.id, false); // Like
    }
  };

  const handleFlag = async () => {
    if (!onFlag) return;
    await onFlag(rating.id);
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    const confirmed = window.confirm('Are you sure you want to delete this review?');
    if (confirmed) {
      await onDelete(rating.id);
    }
  };

  return (
    <div className={cn('border-b border-gray-200 py-6', className)}>
      {/* Review Header */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar className="w-10 h-10">
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {rating.user_id.substring(0, 2).toUpperCase()}
          </div>
        </Avatar>

        {/* Review Content */}
        <div className="flex-1 min-w-0">
          {/* User Info & Rating */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {rating.user_id.substring(0, 8)}
                </span>
                {rating.verified && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-4 h-4',
                        i < Math.floor(rating.rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500">{formattedDate}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              {!isOwner && !isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFlag}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Flag className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Title */}
          {rating.title && (
            <h4 className="font-medium text-gray-900 mb-2">{rating.title}</h4>
          )}

          {/* Description */}
          {rating.description && (
            <div className="text-gray-700 mb-4">
              {displayText}
              {isLongText && !showFullText && (
                <button
                  onClick={() => setShowFullText(true)}
                  className="text-blue-600 hover:text-blue-700 font-medium ml-1"
                >
                  Show more
                </button>
              )}
              {isLongText && showFullText && (
                <button
                  onClick={() => setShowFullText(false)}
                  className="text-blue-600 hover:text-blue-700 font-medium ml-1"
                >
                  Show less
                </button>
              )}
            </div>
          )}

          {/* Images */}
          {rating.images && rating.images.length > 0 && (
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {rating.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Review image ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                />
              ))}
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex items-center gap-4">
            {/* Helpful */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={cn(
                'gap-1.5',
                rating.is_helpful
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <ThumbsUp className={cn('w-4 h-4', rating.is_helpful && 'fill-current')} />
              <span className="text-sm">{rating.helpful_count}</span>
            </Button>

            {/* Not Helpful */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleHelpful(false)}
              className="text-gray-600 hover:text-gray-900 gap-1.5"
            >
              <ThumbsUp className="w-4 h-4 rotate-180" />
              <span className="text-sm">{rating.not_helpful_count}</span>
            </Button>

            {/* Reply */}
            {showReplies && onReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(!isReplying)}
                className="text-gray-600 hover:text-gray-900 gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">Reply</span>
              </Button>
            )}
          </div>

          {/* Reply Form */}
          {isReplying && onReply && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <Textarea
                placeholder="Write your reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={3}
                className="mb-3"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim() || isSubmittingReply}
                  size="sm"
                >
                  {isSubmittingReply ? 'Sending...' : 'Send Reply'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsReplying(false)}
                  size="sm"
                  disabled={isSubmittingReply}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Replies Section */}
          {showReplies && expanded && (
            <div className="mt-4 space-y-4">
              {/* Sample Reply - In production, this would be fetched from API */}
              <div className="flex gap-3 pl-4">
                <Avatar className="w-8 h-8">
                  <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white text-xs font-semibold">
                    AD
                  </div>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">Admin</span>
                    <span className="text-xs text-gray-500">
                      {new Date(rating.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    Thank you for your feedback! We appreciate you taking the time to share your
                    experience.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewItem;
