/**
 * Feedback Database Storage
 *
 * SQLite-based storage for user feedback and ratings
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { logger } from '@/lib/logger';

/**
 * Feedback types
 */
export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'complaint' | 'praise' | 'other';

/**
 * Feedback priority levels
 */
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Feedback status
 */
export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'closed' | 'rejected';

/**
 * Feedback rating
 */
export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

/**
 * Feedback interface
 */
export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: FeedbackType;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  title: string;
  description: string;
  rating?: FeedbackRating;
  url?: string;
  attachments: string[];
  tags: string[];
  adminResponse?: string;
  adminId?: string;
  adminName?: string;
  resolvedAt?: number;
  closedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Feedback filter options
 */
export interface FeedbackFilter {
  type?: FeedbackType;
  priority?: FeedbackPriority;
  status?: FeedbackStatus;
  userId?: string;
  rating?: FeedbackRating;
  searchQuery?: string;
  dateFrom?: number;
  dateTo?: number;
  tags?: string[];
}

/**
 * Feedback sort options
 */
export interface FeedbackSort {
  field: 'createdAt' | 'updatedAt' | 'priority' | 'rating' | 'status';
  order: 'asc' | 'desc';
}

/**
 * Feedback statistics
 */
export interface FeedbackStats {
  total: number;
  byType: Record<FeedbackType, number>;
  byPriority: Record<FeedbackPriority, number>;
  byStatus: Record<FeedbackStatus, number>;
  averageRating: number;
  resolvedPercentage: number;
  pendingCount: number;
  inProgressCount: number;
}

/**
 * Database row interface for feedback table
 */
interface FeedbackRow {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  type: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  rating?: number;
  url?: string;
  attachments?: string;
  tags?: string;
  admin_response?: string;
  admin_id?: string;
  admin_name?: string;
  resolved_at?: number;
  closed_at?: number;
  created_at: number;
  updated_at: number;
}

/**
 * Database row interface for feedback_comments table
 */
interface FeedbackCommentRow {
  id: string;
  feedback_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  comment: string;
  is_admin: number;
  created_at: number;
}

/**
 * Feedback comment interface
 */
export interface FeedbackComment {
  id: string;
  feedbackId: string;
  userId: string;
  userName: string;
  userEmail: string;
  comment: string;
  isAdmin: boolean;
  createdAt: number;
}

/**
 * Database query result interfaces
 */
interface CountResult {
  count: number;
}

interface AvgResult {
  avg: number | null;
}

interface TypeCountResult {
  type: string;
  count: number;
}

interface PriorityCountResult {
  priority: string;
  count: number;
}

interface StatusCountResult {
  status: string;
  count: number;
}

/**
 * Feedback storage class
 */
export class FeedbackStorage {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || join(process.cwd(), 'data', 'feedback.db');
  }

  /**
   * Initialize database connection and create tables
   */
  initialize(): void {
    try {
      // Ensure data directory exists
      const fs = require('fs');
      const dir = require('path').dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new Database(this.dbPath);

      // Enable WAL mode for better performance
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      this.createTables();
      this.createIndexes();

      logger.info('[FeedbackStorage] Database initialized at:', { path: this.dbPath });
    } catch (error) {
      logger.error('[FeedbackStorage] Failed to initialize database:', error as Error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private createTables(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Feedback table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_email TEXT NOT NULL,
        type TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'pending',
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        url TEXT,
        attachments TEXT DEFAULT '[]',
        tags TEXT DEFAULT '[]',
        admin_response TEXT,
        admin_id TEXT,
        admin_name TEXT,
        resolved_at INTEGER,
        closed_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Feedback comments table (for admin-user conversation)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS feedback_comments (
        id TEXT PRIMARY KEY,
        feedback_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_email TEXT NOT NULL,
        comment TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        
        FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE
      )
    `);

    // Feedback ratings history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS feedback_ratings (
        id TEXT PRIMARY KEY,
        feedback_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        created_at INTEGER NOT NULL,
        
        FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * Create database indexes
   */
  private createIndexes(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
      CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
      CREATE INDEX IF NOT EXISTS idx_feedback_priority ON feedback(priority);
      CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
      CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
      CREATE INDEX IF NOT EXISTS idx_feedback_updated ON feedback(updated_at);
      CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);
      
      CREATE INDEX IF NOT EXISTS idx_comments_feedback ON feedback_comments(feedback_id);
      CREATE INDEX IF NOT EXISTS idx_ratings_feedback ON feedback_ratings(feedback_id);
    `);
  }

  /**
   * Generate unique feedback ID
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `FB-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Create a new feedback
   */
  createFeedback(feedback: Omit<Feedback, 'id' | 'createdAt' | 'updatedAt'>): Feedback {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const id = this.generateId();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO feedback (
        id, user_id, user_name, user_email, type, priority, status,
        title, description, rating, url, attachments, tags,
        admin_response, admin_id, admin_name, resolved_at, closed_at,
        created_at, updated_at
      ) VALUES (
        @id, @userId, @userName, @userEmail, @type, @priority, @status,
        @title, @description, @rating, @url, @attachments, @tags,
        @adminResponse, @adminId, @adminName, @resolvedAt, @closedAt,
        @createdAt, @updatedAt
      )
    `);

    stmt.run({
      id,
      userId: feedback.userId,
      userName: feedback.userName,
      userEmail: feedback.userEmail,
      type: feedback.type,
      priority: feedback.priority,
      status: feedback.status,
      title: feedback.title,
      description: feedback.description,
      rating: feedback.rating || null,
      url: feedback.url || null,
      attachments: JSON.stringify(feedback.attachments || []),
      tags: JSON.stringify(feedback.tags || []),
      adminResponse: feedback.adminResponse || null,
      adminId: feedback.adminId || null,
      adminName: feedback.adminName || null,
      resolvedAt: feedback.resolvedAt || null,
      closedAt: feedback.closedAt || null,
      createdAt: now,
      updatedAt: now,
    });

    return this.getFeedbackById(id)!;
  }

  /**
   * Get feedback by ID
   */
  getFeedbackById(id: string): Feedback | null {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      SELECT * FROM feedback WHERE id = ?
    `);

    const row = stmt.get(id) as FeedbackRow | undefined;
    if (!row) return null;

    return this.rowToFeedback(row);
  }

  /**
   * Update feedback
   */
  updateFeedback(id: string, updates: Partial<Feedback>): Feedback | null {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const allowedFields = [
      'type', 'priority', 'status', 'title', 'description',
      'rating', 'url', 'attachments', 'tags', 'adminResponse',
      'adminId', 'adminName', 'resolvedAt', 'closedAt'
    ];

    const updateFields: string[] = [];
    const updateValues: Record<string, string | number> = { id, updatedAt: Date.now() };

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${this.camelToSnake(key)} = @${key}`);
        
        // Handle JSON fields
        if (key === 'attachments' || key === 'tags') {
          updateValues[key] = JSON.stringify(value);
        } else {
          updateValues[key] = value as string | number;
        }
      }
    }

    if (updateFields.length === 0) {
      return this.getFeedbackById(id);
    }

    updateFields.push('updated_at = @updatedAt');

    const stmt = this.db.prepare(`
      UPDATE feedback 
      SET ${updateFields.join(', ')}
      WHERE id = @id
    `);

    stmt.run(updateValues);

    return this.getFeedbackById(id);
  }

  /**
   * Delete feedback
   */
  deleteFeedback(id: string): boolean {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare('DELETE FROM feedback WHERE id = ?');
    const result = stmt.run(id);

    return result.changes > 0;
  }

  /**
   * Get feedback list with filters and pagination
   */
  getFeedbacks(
    filter: FeedbackFilter = {},
    sort: FeedbackSort = { field: 'createdAt', order: 'desc' },
    page: number = 1,
    limit: number = 20
  ): { feedbacks: Feedback[]; total: number; page: number; limit: number } {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const whereConditions: string[] = [];
    const params: (string | number)[] = [];

    // Apply filters
    if (filter.type) {
      whereConditions.push('type = ?');
      params.push(filter.type);
    }

    if (filter.priority) {
      whereConditions.push('priority = ?');
      params.push(filter.priority);
    }

    if (filter.status) {
      whereConditions.push('status = ?');
      params.push(filter.status);
    }

    if (filter.userId) {
      whereConditions.push('user_id = ?');
      params.push(filter.userId);
    }

    if (filter.rating) {
      whereConditions.push('rating = ?');
      params.push(filter.rating);
    }

    if (filter.dateFrom) {
      whereConditions.push('created_at >= ?');
      params.push(filter.dateFrom);
    }

    if (filter.dateTo) {
      whereConditions.push('created_at <= ?');
      params.push(filter.dateTo);
    }

    if (filter.searchQuery) {
      whereConditions.push('(title LIKE ? OR description LIKE ?)');
      const searchPattern = `%${filter.searchQuery}%`;
      params.push(searchPattern, searchPattern);
    }

    if (filter.tags && filter.tags.length > 0) {
      const tagConditions = filter.tags.map(() => 'tags LIKE ?').join(' OR ');
      whereConditions.push(`(${tagConditions})`);
      filter.tags.forEach(tag => {
        params.push(`%"${tag}"%`);
      });
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Get total count
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM feedback ${whereClause}`);
    const countResult = countStmt.get(...params) as CountResult;
    const total = countResult.count;

    // Get feedbacks
    const offset = (page - 1) * limit;
    const sortField = this.camelToSnake(sort.field);
    const sortOrder = sort.order.toUpperCase();

    const stmt = this.db.prepare(`
      SELECT * FROM feedback 
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(...params, limit, offset) as FeedbackRow[];
    const feedbacks = rows.map(row => this.rowToFeedback(row));

    return { feedbacks, total, page, limit };
  }

  /**
   * Get feedback statistics
   */
  getStats(): FeedbackStats {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Get total count
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM feedback');
    const totalResult = totalStmt.get() as CountResult;
    const total = totalResult.count;

    // Get counts by type
    const byTypeStmt = this.db.prepare(`
      SELECT type, COUNT(*) as count 
      FROM feedback 
      GROUP BY type
    `);
    const byTypeRows = byTypeStmt.all() as TypeCountResult[];
    const byType = byTypeRows.reduce((acc, row) => {
      acc[row.type as FeedbackType] = row.count;
      return acc;
    }, {} as Record<FeedbackType, number>);

    // Get counts by priority
    const byPriorityStmt = this.db.prepare(`
      SELECT priority, COUNT(*) as count 
      FROM feedback 
      GROUP BY priority
    `);
    const byPriorityRows = byPriorityStmt.all() as PriorityCountResult[];
    const byPriority = byPriorityRows.reduce((acc, row) => {
      acc[row.priority as FeedbackPriority] = row.count;
      return acc;
    }, {} as Record<FeedbackPriority, number>);

    // Get counts by status
    const byStatusStmt = this.db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM feedback 
      GROUP BY status
    `);
    const byStatusRows = byStatusStmt.all() as StatusCountResult[];
    const byStatus = byStatusRows.reduce((acc, row) => {
      acc[row.status as FeedbackStatus] = row.count;
      return acc;
    }, {} as Record<FeedbackStatus, number>);

    // Get average rating
    const avgRatingStmt = this.db.prepare(`
      SELECT AVG(rating) as avg 
      FROM feedback 
      WHERE rating IS NOT NULL
    `);
    const avgRatingResult = avgRatingStmt.get() as AvgResult;
    const averageRating = avgRatingResult.avg || 0;

    // Get resolved percentage
    const resolvedCount = byStatus['resolved'] || 0;
    const closedCount = byStatus['closed'] || 0;
    const resolvedPercentage = total > 0 
      ? ((resolvedCount + closedCount) / total) * 100 
      : 0;

    return {
      total,
      byType: {
        bug: byType['bug'] || 0,
        feature: byType['feature'] || 0,
        improvement: byType['improvement'] || 0,
        complaint: byType['complaint'] || 0,
        praise: byType['praise'] || 0,
        other: byType['other'] || 0,
      },
      byPriority: {
        low: byPriority['low'] || 0,
        medium: byPriority['medium'] || 0,
        high: byPriority['high'] || 0,
        urgent: byPriority['urgent'] || 0,
      },
      byStatus: {
        pending: byStatus['pending'] || 0,
        in_progress: byStatus['in_progress'] || 0,
        resolved: byStatus['resolved'] || 0,
        closed: byStatus['closed'] || 0,
        rejected: byStatus['rejected'] || 0,
      },
      averageRating,
      resolvedPercentage,
      pendingCount: byStatus['pending'] || 0,
      inProgressCount: byStatus['in_progress'] || 0,
    };
  }

  /**
   * Add comment to feedback
   */
  addComment(
    feedbackId: string,
    userId: string,
    userName: string,
    userEmail: string,
    comment: string,
    isAdmin: boolean = false
  ): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const id = `CMT-${Date.now().toString(36)}`;
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO feedback_comments (
        id, feedback_id, user_id, user_name, user_email, 
        comment, is_admin, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, feedbackId, userId, userName, userEmail, comment, isAdmin ? 1 : 0, now);
  }

  /**
   * Get comments for feedback
   */
  getComments(feedbackId: string): FeedbackComment[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      SELECT * FROM feedback_comments
      WHERE feedback_id = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(feedbackId) as FeedbackCommentRow[];
    return rows.map(row => ({
      id: row.id,
      feedbackId: row.feedback_id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      comment: row.comment,
      isAdmin: row.is_admin === 1,
      createdAt: row.created_at,
    }));
  }

  /**
   * Convert database row to Feedback object
   */
  private rowToFeedback(row: FeedbackRow): Feedback {
    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      type: row.type as FeedbackType,
      priority: row.priority as FeedbackPriority,
      status: row.status as FeedbackStatus,
      title: row.title,
      description: row.description,
      rating: row.rating as FeedbackRating | undefined,
      url: row.url,
      attachments: JSON.parse(row.attachments || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      adminResponse: row.admin_response,
      adminId: row.admin_id,
      adminName: row.admin_name,
      resolvedAt: row.resolved_at,
      closedAt: row.closed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Create singleton instance
export const feedbackStorage = new FeedbackStorage();
