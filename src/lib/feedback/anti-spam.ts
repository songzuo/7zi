/**
 * Anti-spam service for feedback and rating system
 */

import { getDatabaseAsync } from '../db/index';
import { logger } from '../logger';
import { SpamDetection, AntiSpamConfig } from '@/types/feedback';

// Default anti-spam configuration
const DEFAULT_ANTI_SPAM_CONFIG: AntiSpamConfig = {
  max_feedback_per_hour: 5,
  max_feedback_per_day: 20,
  min_time_between_feedback: 60, // 1 minute
  duplicate_threshold: 0.85, // 85% similarity
  require_email: false,
  enable_content_filter: true,
  blocked_words: [
    'test',
    '测试',
    'abc',
    '123',
    'xxx',
    'spam',
    '垃圾',
    'fake',
    '假',
    'scam',
    '骗局',
  ],
};

/**
 * Get anti-spam configuration
 */
export async function getAntiSpamConfig(): Promise<AntiSpamConfig> {
  // In a real application, this would load from database or config file
  return DEFAULT_ANTI_SPAM_CONFIG;
}

/**
 * Check if content contains blocked words
 */
function containsBlockedWords(content: string, blockedWords: string[]): boolean {
  const lowerContent = content.toLowerCase();
  return blockedWords.some(word => lowerContent.includes(word.toLowerCase()));
}

/**
 * Calculate similarity between two strings (Jaccard similarity)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Check for duplicate feedback from the same user
 */
async function checkDuplicateFeedback(
  userId: string,
  content: string,
  threshold: number
): Promise<{ is_duplicate: boolean; reason: string }> {
  const db = await getDatabaseAsync();

  // Get recent feedbacks from the same user
  const recentFeedbacks = db.queryRows(
    `SELECT description FROM feedbacks
     WHERE user_id = ? AND created_at > datetime('now', '-7 days')
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId]
  ) as Array<{ description: string }>;

  for (const feedback of recentFeedbacks) {
    const similarity = calculateSimilarity(content, feedback.description);
    if (similarity >= threshold) {
      return {
        is_duplicate: true,
        reason: `Duplicate feedback detected (similarity: ${(similarity * 100).toFixed(1)}%)`,
      };
    }
  }

  return { is_duplicate: false, reason: '' };
}

/**
 * Check if user has exceeded rate limits
 */
async function checkRateLimits(userId: string, config: AntiSpamConfig): Promise<{
  is_rate_limited: boolean;
  reason: string;
}> {
  const db = await getDatabaseAsync();

  // Check feedbacks in the last hour
  const lastHour = db.queryRows(
    `SELECT COUNT(*) as count FROM feedbacks
     WHERE user_id = ? AND created_at > datetime('now', '-1 hour')`,
    [userId]
  )[0] as { count: number };

  if (lastHour.count >= config.max_feedback_per_hour) {
    return {
      is_rate_limited: true,
      reason: `Rate limit exceeded: ${lastHour.count}/${config.max_feedback_per_hour} feedbacks per hour`,
    };
  }

  // Check feedbacks in the last 24 hours
  const lastDay = db.queryRows(
    `SELECT COUNT(*) as count FROM feedbacks
     WHERE user_id = ? AND created_at > datetime('now', '-1 day')`,
    [userId]
  )[0] as { count: number };

  if (lastDay.count >= config.max_feedback_per_day) {
    return {
      is_rate_limited: true,
      reason: `Daily limit exceeded: ${lastDay.count}/${config.max_feedback_per_day} feedbacks per day`,
    };
  }

  // Check minimum time between feedbacks
  const lastFeedback = db.queryRows(
    `SELECT created_at FROM feedbacks
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  )[0] as { created_at: string } | undefined;

  if (lastFeedback) {
    const lastFeedbackTime = new Date(lastFeedback.created_at).getTime();
    const currentTime = Date.now();
    const timeDiff = (currentTime - lastFeedbackTime) / 1000; // Convert to seconds

    if (timeDiff < config.min_time_between_feedback) {
      return {
        is_rate_limited: true,
        reason: `Too many submissions: please wait ${Math.ceil(config.min_time_between_feedback - timeDiff)} seconds`,
      };
    }
  }

  return { is_rate_limited: false, reason: '' };
}

/**
 * Analyze content for spam indicators
 */
function analyzeContent(content: string, config: AntiSpamConfig): {
  is_spam: boolean;
  reason: string;
  score: number;
} {
  let spamScore = 0;
  let reasons: string[] = [];

  // Check for blocked words
  if (config.enable_content_filter && containsBlockedWords(content, config.blocked_words)) {
    spamScore += 0.5;
    reasons.push('Contains blocked words');
  }

  // Check for excessive capitalization
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.5 && content.length > 20) {
    spamScore += 0.3;
    reasons.push('Excessive capitalization');
  }

  // Check for excessive punctuation
  const punctRatio = (content.match(/[!?]/g) || []).length / content.length;
  if (punctRatio > 0.2) {
    spamScore += 0.2;
    reasons.push('Excessive punctuation');
  }

  // Check for very short content (likely spam)
  if (content.length < 10) {
    spamScore += 0.4;
    reasons.push('Content too short');
  }

  // Check for repetitive characters
  const repetitivePattern = /(.)\1{4,}/.test(content);
  if (repetitivePattern) {
    spamScore += 0.3;
    reasons.push('Repetitive characters');
  }

  // Check for too many URLs
  const urlCount = (content.match(/https?:\/\//g) || []).length;
  if (urlCount > 2) {
    spamScore += 0.3;
    reasons.push('Too many URLs');
  }

  return {
    is_spam: spamScore >= 0.7,
    reason: reasons.join(', ') || 'No spam indicators detected',
    score: Math.min(spamScore, 1),
  };
}

/**
 * Detect spam in feedback or rating
 */
export async function detectSpam(
  userId: string,
  content: string,
  type: 'feedback' | 'rating' = 'feedback'
): Promise<SpamDetection> {
  const config = await getAntiSpamConfig();
  let spamScore = 0;
  let reasons: string[] = [];

  // Check rate limits
  const rateLimitCheck = await checkRateLimits(userId, config);
  if (rateLimitCheck.is_rate_limited) {
    return {
      is_spam: true,
      reason: rateLimitCheck.reason,
      score: 1,
      metadata: { check: 'rate_limit' },
    };
  }

  // Check for duplicates
  const duplicateCheck = await checkDuplicateFeedback(userId, content, config.duplicate_threshold);
  if (duplicateCheck.is_duplicate) {
    spamScore += 0.6;
    reasons.push(duplicateCheck.reason);
  }

  // Analyze content
  const contentAnalysis = analyzeContent(content, config);
  if (contentAnalysis.is_spam) {
    spamScore += contentAnalysis.score;
    if (contentAnalysis.reason) {
      reasons.push(contentAnalysis.reason);
    }
  }

  const isSpam = spamScore >= 0.7;

  // Log spam detection
  await logSpamDetection(userId, content, isSpam, reasons.join(', '), spamScore);

  if (isSpam) {
    logger.warn('Spam detected', {
      category: 'feedback',
      userId,
      type,
      reason: reasons.join(', '),
      score: spamScore,
    });
  }

  return {
    is_spam: isSpam,
    reason: reasons.join(', ') || 'No spam detected',
    score: spamScore,
    metadata: { type, checks: ['rate_limit', 'duplicate', 'content'] },
  };
}

/**
 * Log spam detection to database
 */
async function logSpamDetection(
  userId: string,
  content: string,
  isSpam: boolean,
  reason: string,
  score: number
): Promise<void> {
  const db = await getDatabaseAsync();

  db.exec(
    `INSERT INTO spam_detection_logs (id, user_id, content, is_spam, reason, score)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      userId,
      content,
      isSpam ? 1 : 0,
      reason,
      score,
    ]
  );
}

/**
 * Get spam statistics
 */
export async function getSpamStatistics(days: number = 7): Promise<{
  total_checks: number;
  spam_detected: number;
  spam_rate: number;
  blocked_users: number;
  recent_spam: Array<{
    id: string;
    user_id: string;
    content: string;
    reason: string;
    score: number;
    created_at: string;
  }>;
}> {
  const db = await getDatabaseAsync();

  const totalChecksResult = db.queryRows(
    `SELECT COUNT(*) as count FROM spam_detection_logs
     WHERE created_at > datetime('now', '-${days} days')`
  )[0] as { count: number };

  const spamDetectedResult = db.queryRows(
    `SELECT COUNT(*) as count FROM spam_detection_logs
     WHERE is_spam = 1 AND created_at > datetime('now', '-${days} days')`
  )[0] as { count: number };

  const blockedUsersResult = db.queryRows(
    `SELECT COUNT(DISTINCT user_id) as count FROM spam_detection_logs
     WHERE is_spam = 1 AND created_at > datetime('now', '-${days} days')`
  )[0] as { count: number };

  const recentSpam = db.queryRows(
    `SELECT id, user_id, content, reason, score, created_at
     FROM spam_detection_logs
     WHERE is_spam = 1
     ORDER BY created_at DESC
     LIMIT 20`
  ) as Array<{
    id: string;
    user_id: string;
    content: string;
    reason: string;
    score: number;
    created_at: string;
  }>;

  return {
    total_checks: totalChecksResult.count,
    spam_detected: spamDetectedResult.count,
    spam_rate: totalChecksResult.count > 0 ? spamDetectedResult.count / totalChecksResult.count : 0,
    blocked_users: blockedUsersResult.count,
    recent_spam: recentSpam,
  };
}
