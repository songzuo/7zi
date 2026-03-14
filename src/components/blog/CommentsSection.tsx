"use client";

import { useState, useEffect } from "react";

export interface Comment {
  id: string;
  postId: string;
  author: string;
  content: string;
  createdAt: string;
}

interface CommentsSectionProps {
  postId: string;
  locale?: string;
}

export default function CommentsSection({ postId, locale = "zh" }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch comments on mount
  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/comments?postId=${postId}`);
      const data = await res.json();
      if (data.success) {
        setComments(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !content.trim()) return;

    try {
      setSubmitting(true);
      setError("");
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, author: author.trim(), content: content.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setComments((prev) => [data.data, ...prev]);
        setContent("");
        // Keep author for convenience
      } else {
        setError(data.message || "Failed to submit comment");
      }
    } catch (err) {
      setError("Failed to submit comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const labels = {
    title: locale === "zh" ? "评论" : "Comments",
    authorPlaceholder: locale === "zh" ? "你的名字" : "Your name",
    contentPlaceholder: locale === "zh" ? "写下你的评论..." : "Write your comment...",
    submit: locale === "zh" ? "提交评论" : "Submit",
    noComments: locale === "zh" ? "暂无评论，快来抢沙发！" : "No comments yet. Be the first!",
    loading: locale === "zh" ? "加载中..." : "Loading...",
    submitting: locale === "zh" ? "提交中..." : "Submitting...",
  };

  return (
    <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
        {labels.title} ({comments.length})
      </h2>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <div>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder={labels.authorPlaceholder}
            className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            required
          />
        </div>
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={labels.contentPlaceholder}
            rows={4}
            className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !author.trim() || !content.trim()}
          className="px-6 py-2 bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? labels.submitting : labels.submit}
        </button>
      </form>

      {/* Comments List */}
      {loading ? (
        <p className="text-zinc-500">{labels.loading}</p>
      ) : comments.length === 0 ? (
        <p className="text-zinc-500 italic">{labels.noComments}</p>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {comment.author}
                </span>
                <span className="text-sm text-zinc-500">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
