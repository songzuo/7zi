/**
 * Comments section component
 */

import type { TaskComment } from '@/lib/types/task-types';
import { CommentAvatar } from './CommentAvatar';
import { formatTimeAgo } from '../utils/format';

interface CommentsSectionProps {
  comments: TaskComment[];
  newComment: string;
  onCommentChange: (comment: string) => void;
  onSubmit: () => Promise<void>;
}

export function CommentsSection({
  comments,
  newComment,
  onCommentChange,
  onSubmit,
}: CommentsSectionProps) {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
        💬 评论 ({comments?.length || 0})
      </h3>

      <div className="space-y-4">
        {comments?.map(comment => (
          <div key={comment.id} className="flex gap-3">
            <CommentAvatar author={comment.author} size="sm" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-gray-900 dark:text-white">
                  {comment.author}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTimeAgo(comment.timestamp)}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <input
          type="text"
          value={newComment}
          onChange={e => onCommentChange(e.target.value)}
          placeholder="添加评论..."
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg text-sm bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyPress={handleKeyPress}
        />
        <button
          onClick={onSubmit}
          disabled={!newComment.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          发送
        </button>
      </div>
    </div>
  );
}
