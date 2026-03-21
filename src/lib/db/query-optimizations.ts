/**
 * Database Query Optimizations Module
 * Provides optimized query helpers to avoid N+1 query problems
 */

import { DatabaseConnection } from './index';

/**
 * Database table row types for query results
 */

export interface FeedbackAttachmentRow {
  id: string;
  feedback_id: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
  uploaded_at: string;
}

export interface HelpfulVoteRow {
  id: string;
  rating_id: string;
  user_id: string;
  is_helpful: number;
  created_at: string;
}

/**
 * Optimized feedback statistics query
 * Combines multiple GROUP BY queries into single query with CTEs
 */
export interface OptimizedFeedbackStats {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  average_rating: number;
  rating_distribution: Record<number, number>;
}

export async function getOptimizedFeedbackStats(db: DatabaseConnection): Promise<OptimizedFeedbackStats> {
  // Use a single query with multiple aggregate functions
  const result = db.queryRows(`
    SELECT
      COUNT(*) as total,
      AVG(rating) as avg_rating,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as status_pending,
      SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as status_reviewed,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as status_approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as status_rejected,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as status_resolved,
      SUM(CASE WHEN type = 'general' THEN 1 ELSE 0 END) as type_general,
      SUM(CASE WHEN type = 'bug' THEN 1 ELSE 0 END) as type_bug,
      SUM(CASE WHEN type = 'feature' THEN 1 ELSE 0 END) as type_feature,
      SUM(CASE WHEN type = 'suggestion' THEN 1 ELSE 0 END) as type_suggestion,
      SUM(CASE WHEN type = 'complaint' THEN 1 ELSE 0 END) as type_complaint,
      SUM(CASE WHEN type = 'compliment' THEN 1 ELSE 0 END) as type_compliment,
      SUM(CASE WHEN type = 'other' THEN 1 ELSE 0 END) as type_other,
      SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as priority_low,
      SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as priority_medium,
      SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as priority_high,
      SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as priority_urgent,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1,
      SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2,
      SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3,
      SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4,
      SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5
    FROM feedbacks
  `)[0] as {
    total: number;
    avg_rating: number | null;
    status_pending: number;
    status_reviewed: number;
    status_approved: number;
    status_rejected: number;
    status_resolved: number;
    type_general: number;
    type_bug: number;
    type_feature: number;
    type_suggestion: number;
    type_complaint: number;
    type_compliment: number;
    type_other: number;
    priority_low: number;
    priority_medium: number;
    priority_high: number;
    priority_urgent: number;
    rating_1: number;
    rating_2: number;
    rating_3: number;
    rating_4: number;
    rating_5: number;
  };

  return {
    total: result.total,
    by_status: {
      pending: result.status_pending,
      reviewed: result.status_reviewed,
      approved: result.status_approved,
      rejected: result.status_rejected,
      resolved: result.status_resolved,
    },
    by_type: {
      general: result.type_general,
      bug: result.type_bug,
      feature: result.type_feature,
      suggestion: result.type_suggestion,
      complaint: result.type_complaint,
      compliment: result.type_compliment,
      other: result.type_other,
    },
    by_priority: {
      low: result.priority_low,
      medium: result.priority_medium,
      high: result.priority_high,
      urgent: result.priority_urgent,
    },
    average_rating: result.avg_rating ? Math.round(result.avg_rating * 10) / 10 : 0,
    rating_distribution: {
      1: result.rating_1,
      2: result.rating_2,
      3: result.rating_3,
      4: result.rating_4,
      5: result.rating_5,
    },
  };
}

/**
 * Optimized rating statistics query
 * Combines multiple GROUP BY queries into single query
 */
export interface OptimizedRatingStats {
  total: number;
  average_rating: number;
  rating_distribution: Record<number, number>;
  by_target_type: Record<string, number>;
  helpful_ratio: number;
}

export async function getOptimizedRatingStats(
  db: DatabaseConnection,
  filters?: {
    target_type?: string;
    target_id?: string;
  }
): Promise<OptimizedRatingStats> {
  const whereClause = filters?.target_type
    ? `WHERE target_type = ?${filters.target_id ? ' AND target_id = ?' : ''}`
    : '';

  const params = filters?.target_type
    ? filters.target_id
      ? [filters.target_type, filters.target_id]
      : [filters.target_type]
    : [];

  // Combined query for basic stats
  const statsResult = db.queryRows(
    `
    SELECT
      COUNT(*) as total,
      AVG(rating) as avg_rating,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1,
      SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2,
      SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3,
      SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4,
      SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5
    FROM ratings ${whereClause}
    `,
    params
  )[0] as {
    total: number;
    avg_rating: number | null;
    rating_1: number;
    rating_2: number;
    rating_3: number;
    rating_4: number;
    rating_5: number;
  };

  // Separate query for target types (can't easily combine with WHERE filter)
  const targetTypeResults = db.queryRows(
    `SELECT target_type, COUNT(*) as count FROM ratings GROUP BY target_type`
  ) as Array<{ target_type: string; count: number }>;

  // Combined query for helpful votes (single query instead of two)
  const helpfulResult = db.queryRows(
    `
    SELECT
      SUM(CASE WHEN is_helpful = 1 THEN 1 ELSE 0 END) as helpful,
      SUM(CASE WHEN is_helpful = 0 THEN 1 ELSE 0 END) as not_helpful
    FROM helpful_votes
    `
  )[0] as { helpful: number; not_helpful: number };

  const helpful_count = helpfulResult.helpful || 0;
  const not_helpful_count = helpfulResult.not_helpful || 0;
  const totalVotes = helpful_count + not_helpful_count;

  return {
    total: statsResult.total,
    average_rating: statsResult.avg_rating ? Math.round(statsResult.avg_rating * 10) / 10 : 0,
    rating_distribution: {
      1: statsResult.rating_1,
      2: statsResult.rating_2,
      3: statsResult.rating_3,
      4: statsResult.rating_4,
      5: statsResult.rating_5,
    },
    by_target_type: targetTypeResults.reduce(
      (acc, row) => ({ ...acc, [row.target_type]: row.count }),
      {}
    ),
    helpful_ratio: totalVotes > 0 ? Math.round((helpful_count / totalVotes) * 100) / 100 : 0,
  };
}

/**
 * Batch query helper for loading related entities
 * Avoids N+1 queries by using IN clause with batch loading
 */
export async function batchLoad<T>(
  db: DatabaseConnection,
  tableName: string,
  ids: string[],
  idColumn: string = 'id'
): Promise<T[]> {
  if (ids.length === 0) {
    return [];
  }

  // Split into batches of 100 to avoid SQL query length limits
  const batchSize = 100;
  const results: T[] = [];

  for (let i = 0; i < ids.length; i += batchSize) {
    const batchIds = ids.slice(i, i + batchSize);
    const placeholders = batchIds.map(() => '?').join(',');

    const batch = db.queryRows(
      `SELECT * FROM ${tableName} WHERE ${idColumn} IN (${placeholders})`,
      batchIds
    ) as T[];

    results.push(...batch);
  }

  return results;
}

/**
 * Optimized pagination helper with total count in single query
 * Uses window function to get count without separate COUNT query
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export async function paginate<T>(
  db: DatabaseConnection,
  tableName: string,
  page: number = 1,
  perPage: number = 20,
  whereClause: string = '',
  params: unknown[] = [],
  orderBy: string = 'created_at DESC'
): Promise<PaginatedResult<T>> {
  const offset = (page - 1) * perPage;

  // Use window function to get count in same query
  const result = db.queryRows(
    `
    SELECT t.*, COUNT(*) OVER() as total_count
    FROM ${tableName} t
    ${whereClause ? `WHERE ${whereClause}` : ''}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
    `,
    [...params, perPage, offset]
  ) as Array<T & { total_count: number }>;

  const items = result.map(({ total_count, ...item }) => item) as T[];
  const total = result[0]?.total_count || 0;

  return {
    items,
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  };
}

/**
 * Get feedback with preloaded attachments in single query
 * Uses LEFT JOIN to avoid N+1 queries
 */
export async function getFeedbacksWithAttachments(
  db: DatabaseConnection,
  feedbackIds: string[]
): Promise<Map<string, FeedbackAttachmentRow[]>> {
  if (feedbackIds.length === 0) {
    return new Map();
  }

  const placeholders = feedbackIds.map(() => '?').join(',');

  const attachments = db.queryRows(
    `SELECT * FROM feedback_attachments WHERE feedback_id IN (${placeholders}) ORDER BY feedback_id, uploaded_at`,
    feedbackIds
  ) as Array<FeedbackAttachmentRow>;

  // Group by feedback_id
  const grouped = new Map<string, FeedbackAttachmentRow[]>();
  for (const attachment of attachments) {
    if (!grouped.has(attachment.feedback_id)) {
      grouped.set(attachment.feedback_id, []);
    }
    grouped.get(attachment.feedback_id)!.push(attachment);
  }

  return grouped;
}

/**
 * Get rating with preloaded helpful votes in single query
 * Uses LEFT JOIN to avoid N+1 queries
 */
export async function getRatingWithVotes(
  db: DatabaseConnection,
  ratingIds: string[]
): Promise<Map<string, HelpfulVoteRow[]>> {
  if (ratingIds.length === 0) {
    return new Map();
  }

  const placeholders = ratingIds.map(() => '?').join(',');

  const votes = db.queryRows(
    `SELECT * FROM helpful_votes WHERE rating_id IN (${placeholders}) ORDER BY rating_id, created_at`,
    ratingIds
  ) as Array<HelpfulVoteRow>;

  // Group by rating_id
  const grouped = new Map<string, HelpfulVoteRow[]>();
  for (const vote of votes) {
    if (!grouped.has(vote.rating_id)) {
      grouped.set(vote.rating_id, []);
    }
    grouped.get(vote.rating_id)!.push(vote);
  }

  return grouped;
}

/**
 * Optimized statistics for multiple feedback statuses
 * Single query instead of separate queries per status
 */
export async function getFeedbackStatsByStatuses(
  db: DatabaseConnection,
  statuses: string[]
): Promise<Record<string, number>> {
  if (statuses.length === 0) {
    return {};
  }

  const statusList = statuses.map(s => `'${s}'`).join(',');

  const results = db.queryRows(
    `SELECT status, COUNT(*) as count FROM feedbacks WHERE status IN (${statusList}) GROUP BY status`
  ) as Array<{ status: string; count: number }>;

  return results.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {});
}

/**
 * Optimized statistics for multiple rating values
 * Single query instead of separate queries per rating
 */
export async function getRatingStatsByValues(
  db: DatabaseConnection,
  ratings: number[]
): Promise<Record<number, number>> {
  if (ratings.length === 0) {
    return {};
  }

  const ratingList = ratings.join(',');

  const results = db.queryRows(
    `SELECT rating, COUNT(*) as count FROM ratings WHERE rating IN (${ratingList}) GROUP BY rating`
  ) as Array<{ rating: number; count: number }>;

  return results.reduce(
    (acc, row) => ({ ...acc, [row.rating]: row.count }),
    {} as Record<number, number>
  );
}
