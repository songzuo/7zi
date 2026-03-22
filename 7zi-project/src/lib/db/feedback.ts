/**
 * Database initialization for feedback and rating system
 */

import { getDatabaseAsync } from '../db/index';
import { logger } from '../logger';

/**
 * Initialize feedback tables
 */
export async function initializeFeedbackTables(): Promise<void> {
  const db = await getDatabaseAsync();

  logger.info('Initializing feedback tables', { category: 'db' });

  // Create feedbacks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedbacks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('general', 'bug', 'feature', 'suggestion', 'complaint', 'compliment', 'other')),
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      email TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'approved', 'rejected', 'resolved')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      helpful_count INTEGER NOT NULL DEFAULT 0,
      not_helpful_count INTEGER NOT NULL DEFAULT 0,
      admin_notes TEXT,
      admin_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      reviewed_at TEXT,
      resolved_at TEXT,
      metadata TEXT
    )
  `);

  // Create ratings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_type TEXT NOT NULL CHECK(target_type IN ('agent', 'task', 'feature', 'project', 'overall')),
      target_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      title TEXT,
      description TEXT,
      helpful_count INTEGER NOT NULL DEFAULT 0,
      not_helpful_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('pending', 'reviewed', 'approved', 'rejected', 'resolved')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      verified INTEGER NOT NULL DEFAULT 0,
      metadata TEXT,
      UNIQUE(user_id, target_type, target_id)
    )
  `);

  // Create feedback attachments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback_attachments (
      id TEXT PRIMARY KEY,
      feedback_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      url TEXT NOT NULL,
      size INTEGER NOT NULL,
      mimetype TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (feedback_id) REFERENCES feedbacks(id) ON DELETE CASCADE
    )
  `);

  // Create helpful votes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS helpful_votes (
      id TEXT PRIMARY KEY,
      rating_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      is_helpful INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(rating_id, user_id),
      FOREIGN KEY (rating_id) REFERENCES ratings(id) ON DELETE CASCADE
    )
  `);

  // Create spam detection logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS spam_detection_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      content TEXT NOT NULL,
      is_spam INTEGER NOT NULL,
      reason TEXT,
      score REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create feedback notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback_notifications (
      id TEXT PRIMARY KEY,
      feedback_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('new', 'updated', 'resolved', 'flagged')),
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (feedback_id) REFERENCES feedbacks(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better query performance
  db.exec('CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_feedbacks_type ON feedbacks(type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_feedbacks_rating ON feedbacks(rating)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_feedbacks_status_created ON feedbacks(status, created_at DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_ratings_target ON ratings(target_type, target_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_ratings_rating ON ratings(rating)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_feedback_attachments_feedback_id ON feedback_attachments(feedback_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_helpful_votes_rating_id ON helpful_votes(rating_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_helpful_votes_user_id ON helpful_votes(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_spam_detection_logs_user_id ON spam_detection_logs(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_spam_detection_logs_created_at ON spam_detection_logs(created_at DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_feedback_notifications_feedback_id ON feedback_notifications(feedback_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_feedback_notifications_recipient_id ON feedback_notifications(recipient_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_feedback_notifications_read_at ON feedback_notifications(read_at, created_at DESC)');

  logger.info('Feedback tables initialized successfully', { category: 'db' });
}

/**
 * Get feedback statistics
 */
export interface FeedbackStatistics {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  average_rating: number;
  rating_distribution: Record<number, number>;
}

export async function getFeedbackStatistics(): Promise<FeedbackStatistics> {
  const db = await getDatabaseAsync();

  // Total feedbacks
  const totalResult = db.queryRows('SELECT COUNT(*) as count FROM feedbacks')[0] as { count: number };
  const total = totalResult.count;

  // By status
  const statusResults = db.queryRows(
    'SELECT status, COUNT(*) as count FROM feedbacks GROUP BY status'
  ) as Array<{ status: string; count: number }>;
  const by_status = statusResults.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {});

  // By type
  const typeResults = db.queryRows(
    'SELECT type, COUNT(*) as count FROM feedbacks GROUP BY type'
  ) as Array<{ type: string; count: number }>;
  const by_type = typeResults.reduce((acc, row) => ({ ...acc, [row.type]: row.count }), {});

  // By priority
  const priorityResults = db.queryRows(
    'SELECT priority, COUNT(*) as count FROM feedbacks GROUP BY priority'
  ) as Array<{ priority: string; count: number }>;
  const by_priority = priorityResults.reduce((acc, row) => ({ ...acc, [row.priority]: row.count }), {});

  // Average rating
  const avgResult = db.queryRows('SELECT AVG(rating) as avg FROM feedbacks')[0] as { avg: number };
  const average_rating = avgResult.avg ? Math.round(avgResult.avg * 10) / 10 : 0;

  // Rating distribution
  const ratingResults = db.queryRows(
    'SELECT rating, COUNT(*) as count FROM feedbacks GROUP BY rating ORDER BY rating'
  ) as Array<{ rating: number; count: number }>;
  const rating_distribution = ratingResults.reduce((acc, row) => ({ ...acc, [row.rating]: row.count }), {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  });

  return {
    total,
    by_status,
    by_type,
    by_priority,
    average_rating,
    rating_distribution,
  };
}

/**
 * Get rating statistics
 */
export interface RatingStatistics {
  total: number;
  average_rating: number;
  rating_distribution: Record<number, number>;
  by_target_type: Record<string, number>;
  helpful_ratio: number;
}

export async function getRatingStatistics(filters?: {
  target_type?: string;
  target_id?: string;
}): Promise<RatingStatistics> {
  const db = await getDatabaseAsync();

  const whereClause = filters?.target_type
    ? `WHERE target_type = ?${filters.target_id ? ' AND target_id = ?' : ''}`
    : '';

  const params = filters?.target_type
    ? filters.target_id
      ? [filters.target_type, filters.target_id]
      : [filters.target_type]
    : [];

  // Total ratings
  const totalResult = db.queryRows(`SELECT COUNT(*) as count FROM ratings ${whereClause}`, params)[0] as {
    count: number;
  };
  const total = totalResult.count;

  // Average rating
  const avgResult = db.queryRows(`SELECT AVG(rating) as avg FROM ratings ${whereClause}`, params)[0] as {
    avg: number;
  };
  const average_rating = avgResult.avg ? Math.round(avgResult.avg * 10) / 10 : 0;

  // Rating distribution
  const ratingResults = db.queryRows(
    `SELECT rating, COUNT(*) as count FROM ratings ${whereClause} GROUP BY rating ORDER BY rating`,
    params
  ) as Array<{ rating: number; count: number }>;
  const rating_distribution = ratingResults.reduce((acc, row) => ({ ...acc, [row.rating]: row.count }), {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  });

  // By target type
  const targetTypeResults = db.queryRows(
    `SELECT target_type, COUNT(*) as count FROM ratings ${whereClause || 'WHERE true'} GROUP BY target_type`,
    params.length > 0 ? params : undefined
  ) as Array<{ target_type: string; count: number }>;
  const by_target_type = targetTypeResults.reduce(
    (acc, row) => ({ ...acc, [row.target_type]: row.count }),
    {}
  );

  // Helpful ratio
  const helpfulVotes = db.queryRows(
    'SELECT COUNT(*) as count FROM helpful_votes WHERE is_helpful = 1'
  )[0] as { count: number };
  const notHelpfulVotes = db.queryRows(
    'SELECT COUNT(*) as count FROM helpful_votes WHERE is_helpful = 0'
  )[0] as { count: number };
  const helpful_ratio = helpfulVotes.count + notHelpfulVotes.count > 0
    ? Math.round((helpfulVotes.count / (helpfulVotes.count + notHelpfulVotes.count)) * 100) / 100
    : 0;

  return {
    total,
    average_rating,
    rating_distribution,
    by_target_type,
    helpful_ratio,
  };
}
